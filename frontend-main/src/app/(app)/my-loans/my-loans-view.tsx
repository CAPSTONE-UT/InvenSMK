'use client';

import { useAuth } from '@/components/auth-provider';
import { LoansBrowser } from '@/components/loans-browser';
import { PageHeader } from '@/components/ui';

/** KF-12: riwayat peminjaman milik pengguna yang sedang login (semua peran). */
export function MyLoansView() {
  const { profile } = useAuth();
  return (
    <>
      <PageHeader eyebrow={profile.full_name} title="Peminjaman saya" description="Barang yang sedang dan pernah Anda pinjam." />
      <LoansBrowser source="mine" tabs={['active', 'overdue', 'returned', 'all']} initialStatus="active" emptyText="Tidak ada peminjaman" />
    </>
  );
}
