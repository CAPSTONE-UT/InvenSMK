-- Inventaris, peminjaman, dan riwayat kondisi barang (KF-02 sampai KF-13).
-- Bergantung pada 20261008_create_auth_profiles.sql (school_staff_profiles, set_updated_at).
--
-- Peran (kolom school_staff_profiles.role) dipetakan ke peran laporan:
--   admin             -> Admin
--   inventory_officer -> Petugas
--   staff             -> Peminjam (siswa/guru)
--
-- Seluruh akses data dilakukan backend dengan service role. RLS diaktifkan tanpa policy
-- sehingga anon/authenticated tidak dapat membaca atau menulis tabel ini secara langsung.

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 2 and 80),
  description text check (description is null or char_length(description) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index categories_name_lower_key on public.categories (lower(name));

-- ---------------------------------------------------------------------------
-- items
-- ---------------------------------------------------------------------------
create sequence public.item_barcode_seq;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  barcode text not null
    default ('INV-' || lpad(nextval('public.item_barcode_seq')::text, 6, '0'))
    check (barcode ~ '^[A-Z0-9][A-Z0-9._-]{2,63}$'),
  name text not null check (name = btrim(name) and char_length(name) between 2 and 150),
  category_id uuid not null
    constraint items_category_id_fkey references public.categories (id) on delete restrict,
  location text check (location is null or char_length(location) <= 120),
  condition text not null default 'good'
    check (condition in ('good', 'minor_damage', 'damaged')),
  status text not null default 'available'
    check (status in ('available', 'borrowed', 'damaged')),
  acquired_at date,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Status diturunkan dari kondisi kecuali sedang dipinjam:
  -- kondisi 'damaged' <=> status 'damaged'.
  constraint items_status_matches_condition check (
    status = 'borrowed' or ((status = 'damaged') = (condition = 'damaged'))
  )
);

create unique index items_barcode_key on public.items (barcode);
create index items_category_id_idx on public.items (category_id);
create index items_status_idx on public.items (status);

-- ---------------------------------------------------------------------------
-- loans
-- ---------------------------------------------------------------------------
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null
    constraint loans_item_id_fkey references public.items (id) on delete restrict,
  borrower_id uuid not null
    constraint loans_borrower_id_fkey references public.school_staff_profiles (user_id) on delete restrict,
  officer_id uuid not null
    constraint loans_officer_id_fkey references public.school_staff_profiles (user_id) on delete restrict,
  return_officer_id uuid
    constraint loans_return_officer_id_fkey references public.school_staff_profiles (user_id) on delete restrict,
  borrowed_at timestamptz not null default now(),
  due_at timestamptz not null,
  returned_at timestamptz,
  status text not null default 'active' check (status in ('active', 'returned')),
  notes text check (notes is null or char_length(notes) <= 500),
  return_condition text check (
    return_condition is null or return_condition in ('good', 'minor_damage', 'damaged')
  ),
  return_notes text check (return_notes is null or char_length(return_notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loans_due_after_borrow check (due_at > borrowed_at),
  constraint loans_return_consistency check (
    (status = 'active'
      and returned_at is null and return_officer_id is null and return_condition is null)
    or (status = 'returned'
      and returned_at is not null and return_officer_id is not null and return_condition is not null)
  )
);

-- Satu barang hanya boleh memiliki satu peminjaman aktif (mencegah race condition).
create unique index loans_one_active_per_item on public.loans (item_id) where status = 'active';
create index loans_item_id_idx on public.loans (item_id, borrowed_at desc);
create index loans_borrower_id_idx on public.loans (borrower_id, borrowed_at desc);
create index loans_status_due_at_idx on public.loans (status, due_at);
create index loans_borrowed_at_idx on public.loans (borrowed_at desc);

-- ---------------------------------------------------------------------------
-- condition_logs
-- ---------------------------------------------------------------------------
create table public.condition_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null
    constraint condition_logs_item_id_fkey references public.items (id) on delete cascade,
  loan_id uuid
    constraint condition_logs_loan_id_fkey references public.loans (id) on delete set null,
  condition text not null check (condition in ('good', 'minor_damage', 'damaged')),
  event text not null check (event in ('registered', 'borrowed', 'returned', 'updated')),
  notes text check (notes is null or char_length(notes) <= 1000),
  recorded_by uuid
    constraint condition_logs_recorded_by_fkey references public.school_staff_profiles (user_id) on delete set null,
  recorded_at timestamptz not null default now()
);

create index condition_logs_item_id_idx on public.condition_logs (item_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute procedure public.set_updated_at();

create trigger items_set_updated_at
  before update on public.items
  for each row execute procedure public.set_updated_at();

create trigger loans_set_updated_at
  before update on public.loans
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_directory: profil + email untuk manajemen pengguna (hanya service role)
-- ---------------------------------------------------------------------------
create view public.user_directory as
select
  p.user_id,
  p.full_name,
  u.email::text as email,
  p.staff_id,
  p.school_unit,
  p.role,
  p.account_status,
  p.created_at,
  p.updated_at
from public.school_staff_profiles p
join auth.users u on u.id = p.user_id;

-- ---------------------------------------------------------------------------
-- Transaksi atomik: peminjaman
-- ---------------------------------------------------------------------------
create function public.create_loan(
  p_item_id uuid,
  p_borrower_id uuid,
  p_officer_id uuid,
  p_due_at timestamptz,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item_status text;
  v_item_condition text;
  v_borrower_status text;
  v_loan_id uuid;
begin
  select status, condition into v_item_status, v_item_condition
  from public.items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'ITEM_NOT_FOUND';
  end if;
  if v_item_status <> 'available' then
    raise exception 'ITEM_NOT_AVAILABLE';
  end if;

  select account_status into v_borrower_status
  from public.school_staff_profiles
  where user_id = p_borrower_id;

  if not found then
    raise exception 'BORROWER_NOT_FOUND';
  end if;
  if v_borrower_status <> 'active' then
    raise exception 'BORROWER_INACTIVE';
  end if;
  if p_due_at <= now() then
    raise exception 'INVALID_DUE_DATE';
  end if;

  insert into public.loans (item_id, borrower_id, officer_id, due_at, notes)
  values (p_item_id, p_borrower_id, p_officer_id, p_due_at, p_notes)
  returning id into v_loan_id;

  update public.items set status = 'borrowed' where id = p_item_id;

  insert into public.condition_logs (item_id, loan_id, condition, event, notes, recorded_by)
  values (p_item_id, v_loan_id, v_item_condition, 'borrowed', p_notes, p_officer_id);

  return v_loan_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Transaksi atomik: pengembalian
-- ---------------------------------------------------------------------------
create function public.return_loan(
  p_loan_id uuid,
  p_officer_id uuid,
  p_condition text,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item_id uuid;
  v_loan_status text;
begin
  select item_id, status into v_item_id, v_loan_status
  from public.loans
  where id = p_loan_id
  for update;

  if not found then
    raise exception 'LOAN_NOT_FOUND';
  end if;
  if v_loan_status <> 'active' then
    raise exception 'LOAN_ALREADY_RETURNED';
  end if;

  update public.loans
  set status = 'returned',
      returned_at = now(),
      return_officer_id = p_officer_id,
      return_condition = p_condition,
      return_notes = p_notes
  where id = p_loan_id;

  update public.items
  set condition = p_condition,
      status = case when p_condition = 'damaged' then 'damaged' else 'available' end
  where id = v_item_id;

  insert into public.condition_logs (item_id, loan_id, condition, event, notes, recorded_by)
  values (v_item_id, p_loan_id, p_condition, 'returned', p_notes, p_officer_id);

  return p_loan_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security dan hak akses
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.loans enable row level security;
alter table public.condition_logs enable row level security;

revoke all on table public.categories, public.items, public.loans, public.condition_logs
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.categories, public.items, public.loans, public.condition_logs
  to service_role;

revoke all on sequence public.item_barcode_seq from public, anon, authenticated;
grant usage, select on sequence public.item_barcode_seq to service_role;

revoke all on table public.user_directory from public, anon, authenticated;
grant select on table public.user_directory to service_role;

revoke all on function public.create_loan(uuid, uuid, uuid, timestamptz, text)
  from public, anon, authenticated;
revoke all on function public.return_loan(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.create_loan(uuid, uuid, uuid, timestamptz, text) to service_role;
grant execute on function public.return_loan(uuid, uuid, text, text) to service_role;
