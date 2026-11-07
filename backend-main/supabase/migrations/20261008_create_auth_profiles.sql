create table public.school_staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (
    full_name = btrim(full_name) and char_length(full_name) between 2 and 120
  ),
  staff_id text not null check (
    staff_id = btrim(staff_id) and char_length(staff_id) between 3 and 50
  ),
  school_unit text not null check (
    school_unit = btrim(school_unit) and char_length(school_unit) between 2 and 100
  ),
  role text not null default 'staff' check (
    role in ('staff', 'inventory_officer', 'admin')
  ),
  account_status text not null default 'active' check (
    account_status in ('active', 'inactive')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index school_staff_profiles_staff_id_lower_key
  on public.school_staff_profiles (lower(staff_id));

create table public.revoked_auth_sessions (
  session_id uuid primary key,
  user_id uuid not null,
  expires_at timestamptz not null,
  revoked_at timestamptz not null default now()
);

create index revoked_auth_sessions_user_id_idx
  on public.revoked_auth_sessions (user_id);

alter table public.school_staff_profiles enable row level security;
alter table public.revoked_auth_sessions enable row level security;

revoke all on table public.school_staff_profiles from public, anon, authenticated;
grant select on table public.school_staff_profiles to authenticated;
grant select, insert, update, delete on table public.school_staff_profiles to service_role;

create policy "Users can read their own school profile"
  on public.school_staff_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.revoked_auth_sessions from public, anon, authenticated;
grant select, insert, update, delete on table public.revoked_auth_sessions to service_role;

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger school_staff_profiles_set_updated_at
  before update on public.school_staff_profiles
  for each row execute procedure public.set_updated_at();

create function public.handle_new_school_staff_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.school_staff_profiles (
    user_id,
    full_name,
    staff_id,
    school_unit
  ) values (
    new.id,
    btrim(new.raw_user_meta_data ->> 'full_name'),
    btrim(new.raw_user_meta_data ->> 'staff_id'),
    btrim(new.raw_user_meta_data ->> 'school_unit')
  );
  return new;
end;
$$;

create trigger on_auth_school_staff_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_school_staff_user();
