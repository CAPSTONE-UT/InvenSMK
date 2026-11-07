'use client';

import { useSearchParams } from 'next/navigation';
import { RequireRole } from '@/components/auth-provider';
import { LoansBrowser } from '@/components/loans-browser';
import { PageHeader } from '@/components/ui';
import type { LoanStatusFilter } from '@/types/api';

/** KF-11: peminjaman aktif dan terlambat. */
export function ActiveLoansView() {
  const status = useSearchParams().get('status') === 'overdue' ? 'overdue' : 'active';
  return (
    <RequireRole roles={['admin', 'inventory_officer']}>
      <PageHeader eyebrow="Peminjaman" title="Peminjaman aktif" description="Pantau barang yang sedang dipinjam dan yang melewati jatuh tempo." />
      <LoansBrowser
        key={status}
        source="operator"
        tabs={['active', 'overdue'] satisfies LoanStatusFilter[]}
        initialStatus={status}
        emptyText={status === 'overdue' ? 'Tidak ada peminjaman terlambat' : 'Tidak ada peminjaman aktif'}
      />
    </RequireRole>
  );
}
