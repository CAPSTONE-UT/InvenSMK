'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { RequireRole, useAuth } from '@/components/auth-provider';
import { Alert, Badge, Button, Card, EmptyState, Field, LoadingState, Modal, PageHeader, PaginationBar, inputClass } from '@/components/ui';
import { userService } from '@/lib/api/inventory';
import { getApiErrorMessage } from '@/lib/api/errors';
import { roleLabels } from '@/lib/format';
import { useDebouncedValue } from '@/lib/use-debounce';
import type { AccountStatus, ManagedUser, Paginated, UserRole } from '@/types/api';

const roles = Object.keys(roleLabels) as UserRole[];

function CreateUserForm({ onSaved, onCancel }: { onSaved: (user: ManagedUser) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', staff_id: '', school_unit: '', role: 'staff' as UserRole });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      onSaved(
        await userService.create({
          ...form,
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          staff_id: form.staff_id.trim(),
          school_unit: form.school_unit.trim(),
        }),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, 'Pengguna gagal dibuat.'));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama lengkap" htmlFor="user-name">
          <input id="user-name" required minLength={2} maxLength={120} value={form.full_name} onChange={(event) => update('full_name', event.target.value)} className={inputClass} />
        </Field>
        <Field label="ID personel / NIS" htmlFor="user-staff-id">
          <input id="user-staff-id" required minLength={3} maxLength={50} value={form.staff_id} onChange={(event) => update('staff_id', event.target.value)} className={inputClass} />
        </Field>
        <Field label="Kelas / unit" htmlFor="user-unit">
          <input id="user-unit" required minLength={2} maxLength={100} value={form.school_unit} onChange={(event) => update('school_unit', event.target.value)} className={inputClass} placeholder="XI RPL 1" />
        </Field>
        <Field label="Peran" htmlFor="user-role">
          <select id="user-role" value={form.role} onChange={(event) => update('role', event.target.value)} className={inputClass}>
            {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
          </select>
        </Field>
        <Field label="Email" htmlFor="user-email">
          <input id="user-email" type="email" required maxLength={254} value={form.email} onChange={(event) => update('email', event.target.value)} className={inputClass} />
        </Field>
        <Field label="Kata sandi awal" htmlFor="user-password" hint="Minimal 8 karakter.">
          <input id="user-password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} className={inputClass} />
        </Field>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Batal</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Buat akun'}</Button>
      </div>
    </form>
  );
}

function EditUserForm({ user, isSelf, onSaved, onCancel }: { user: ManagedUser; isSelf: boolean; onSaved: (user: ManagedUser) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ full_name: user.full_name, school_unit: user.school_unit, role: user.role, account_status: user.account_status });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const base = { full_name: form.full_name.trim(), school_unit: form.school_unit.trim() };
      // Backend menolak perubahan peran/status akun sendiri; jangan kirim field tersebut.
      onSaved(await userService.update(user.user_id, isSelf ? base : { ...base, role: form.role, account_status: form.account_status }));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Pengguna gagal diperbarui.'));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-600">{user.email} · {user.staff_id}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama lengkap" htmlFor="edit-name">
          <input id="edit-name" required minLength={2} maxLength={120} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} className={inputClass} />
        </Field>
        <Field label="Kelas / unit" htmlFor="edit-unit">
          <input id="edit-unit" required minLength={2} maxLength={100} value={form.school_unit} onChange={(event) => setForm({ ...form, school_unit: event.target.value })} className={inputClass} />
        </Field>
        <Field label="Peran" htmlFor="edit-role" hint={isSelf ? 'Peran akun sendiri tidak dapat diubah.' : undefined}>
          <select id="edit-role" disabled={isSelf} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })} className={inputClass}>
            {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
          </select>
        </Field>
        <Field label="Status akun" htmlFor="edit-status" hint="Akun nonaktif langsung tidak dapat masuk.">
          <select id="edit-status" disabled={isSelf} value={form.account_status} onChange={(event) => setForm({ ...form, account_status: event.target.value as AccountStatus })} className={inputClass}>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </Field>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Batal</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan perubahan'}</Button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const { profile } = useAuth();
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q.trim());
  const [role, setRole] = useState<UserRole | ''>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<ManagedUser> | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    userService
      .list({ q: debouncedQ, role: role || undefined, page })
      .then((result) => {
        if (!active) return;
        setData(result);
        setError('');
      })
      .catch((err: unknown) => active && setError(getApiErrorMessage(err, 'Daftar pengguna tidak dapat dimuat.')));
    return () => {
      active = false;
    };
  }, [debouncedQ, role, page, reloadKey]);

  const done = (message: string) => {
    setCreating(false);
    setEditing(null);
    setNotice(message);
    setReloadKey((key) => key + 1);
  };

  return (
    <RequireRole roles={['admin']}>
      <PageHeader eyebrow="Administrasi" title="Pengguna dan peran" description="Kelola akun admin, petugas, dan peminjam." actions={<Button onClick={() => setCreating(true)}>Tambah pengguna</Button>} />
      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}

      <div className="mb-4 grid gap-2 sm:grid-cols-[2fr_1fr]">
        <label htmlFor="user-search" className="sr-only">Cari pengguna</label>
        <input id="user-search" type="search" value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="Cari nama, email, atau ID" className={inputClass} />
        <label htmlFor="user-role-filter" className="sr-only">Peran</label>
        <select id="user-role-filter" value={role} onChange={(event) => { setRole(event.target.value as UserRole | ''); setPage(1); }} className={inputClass}>
          <option value="">Semua peran</option>
          {roles.map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}
        </select>
      </div>

      {error && <Alert>{error}</Alert>}
      <Card>
        {!data && !error && <LoadingState />}
        {data?.items.length === 0 && <EmptyState title="Tidak ada pengguna yang cocok" />}
        {data && data.items.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {data.items.map((user) => (
              <li key={user.user_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {user.full_name}
                    {user.user_id === profile.user_id && <span className="ml-2 text-xs font-normal text-slate-500">(Anda)</span>}
                  </p>
                  <p className="text-sm text-slate-500">{user.email} · {user.staff_id} · {user.school_unit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={user.role === 'admin' ? 'blue' : user.role === 'inventory_officer' ? 'green' : 'slate'}>{roleLabels[user.role]}</Badge>
                  {user.account_status === 'inactive' && <Badge tone="red">Nonaktif</Badge>}
                  <Button variant="ghost" className="py-1.5" onClick={() => setEditing(user)}>Ubah</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {data && <PaginationBar meta={data.pagination} onPage={setPage} />}
      </Card>

      <Modal open={creating} title="Tambah pengguna" onClose={() => setCreating(false)}>
        {creating && <CreateUserForm onCancel={() => setCreating(false)} onSaved={(user) => done(`Akun ${user.full_name} dibuat.`)} />}
      </Modal>
      <Modal open={editing !== null} title="Ubah pengguna" onClose={() => setEditing(null)}>
        {editing && (
          <EditUserForm
            key={editing.user_id}
            user={editing}
            isSelf={editing.user_id === profile.user_id}
            onCancel={() => setEditing(null)}
            onSaved={(user) => done(`Data ${user.full_name} diperbarui.`)}
          />
        )}
      </Modal>
    </RequireRole>
  );
}
