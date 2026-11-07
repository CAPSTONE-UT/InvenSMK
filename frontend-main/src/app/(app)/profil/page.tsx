'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, PageHeader } from '@/components/ui';
import { authService } from '@/lib/api/auth';
import { roleLabels } from '@/lib/format';

type ApiStatus = 'loading' | 'online' | 'offline';

export default function ProfilePage() {
  const { profile, logout } = useAuth();
  const [apiStatus, setApiStatus] = useState<ApiStatus>('loading');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    authService
      .checkHealth()
      .then((response) => setApiStatus(response.data.data?.status === 'ok' ? 'online' : 'offline'))
      .catch(() => setApiStatus('offline'));
  }, []);

  const fields = [
    { label: 'Nama lengkap', value: profile.full_name },
    { label: 'Email', value: profile.email },
    { label: 'ID personel', value: profile.staff_id },
    { label: 'Kelas / unit', value: profile.school_unit },
    { label: 'Peran', value: roleLabels[profile.role] },
    { label: 'Status akun', value: profile.account_status === 'active' ? 'Aktif' : 'Nonaktif' },
  ];

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Akun" title="Profil" description="Informasi akun yang tercatat di sistem sekolah." />
      <section aria-label="Data profil" className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className="bg-white p-5">
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">{field.label}</h2>
            <p className="mt-2 break-words text-sm font-medium text-slate-900">{field.value}</p>
          </div>
        ))}
      </section>

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-semibold">Koneksi API</h2>
          <p className="mt-1 text-sm text-slate-600">Pemeriksaan menggunakan endpoint /health.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${apiStatus === 'online' ? 'bg-green-50 text-green-800' : apiStatus === 'offline' ? 'bg-red-50 text-red-800' : 'bg-slate-100 text-slate-600'}`}>
          {apiStatus === 'online' ? 'Terhubung' : apiStatus === 'offline' ? 'Tidak terhubung' : 'Memeriksa...'}
        </span>
      </Card>

      <Button
        variant="secondary"
        className="mt-6 md:hidden"
        disabled={loggingOut}
        onClick={() => {
          setLoggingOut(true);
          void logout();
        }}
      >
        {loggingOut ? 'Keluar...' : 'Keluar'}
      </Button>
    </div>
  );
}
