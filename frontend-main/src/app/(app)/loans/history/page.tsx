'use client';

import { RequireRole } from '@/components/auth-provider';
import { LoansBrowser } from '@/components/loans-browser';
import { PageHeader } from '@/components/ui';

export default function LoanHistoryPage() {
  return (
    <RequireRole roles={['admin', 'inventory_officer']}>
      <PageHeader eyebrow="Peminjaman" title="Riwayat peminjaman" description="Seluruh transaksi peminjaman, terbaru di atas." />
      <LoansBrowser source="operator" tabs={['returned', 'all']} initialStatus="returned" emptyText="Belum ada riwayat peminjaman" />
    </RequireRole>
  );
}
