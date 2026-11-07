'use client';

import Link from 'next/link';
import { Button, ConditionBadge, LoanStatusBadge } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/format';
import type { Loan } from '@/types/api';

interface LoanListProps {
  loans: Loan[];
  /** Tampilkan kolom barang (disembunyikan pada riwayat per barang). */
  showItem?: boolean;
  /** Tampilkan kolom peminjam (disembunyikan pada "peminjaman saya"). */
  showBorrower?: boolean;
  /** Tautan ke detail barang (hanya untuk admin/petugas). */
  linkItems?: boolean;
  onReturn?: (loan: Loan) => void;
}

export function LoanList({ loans, showItem = true, showBorrower = true, linkItems = true, onReturn }: LoanListProps) {
  return (
    <ul className="divide-y divide-slate-100">
      {loans.map((loan) => (
        <li key={loan.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0 space-y-1">
            {showItem && (
              <p className="font-medium text-slate-900">
                {linkItems ? (
                  <Link href={`/items/${loan.item.id}`} className="hover:underline">
                    {loan.item.name}
                  </Link>
                ) : (
                  loan.item.name
                )}
                <span className="block font-mono text-xs font-normal text-slate-500">{loan.item.barcode}</span>
              </p>
            )}
            {showBorrower && (
              <p className="text-sm text-slate-700">
                {loan.borrower.full_name}
                <span className="text-slate-500"> · {loan.borrower.school_unit}</span>
              </p>
            )}
            <p className="text-xs text-slate-500">
              Dipinjam {formatDateTime(loan.borrowed_at)} · Jatuh tempo {formatDate(loan.due_at)}
              {loan.returned_at && <> · Dikembalikan {formatDateTime(loan.returned_at)}</>}
            </p>
            {loan.return_notes && <p className="text-xs text-slate-500">Catatan: {loan.return_notes}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {loan.return_condition && <ConditionBadge condition={loan.return_condition} />}
            <LoanStatusBadge loan={loan} />
            {onReturn && loan.status === 'active' && (
              <Button variant="secondary" className="py-1.5" onClick={() => onReturn(loan)}>
                Kembalikan
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
