'use client';

import { useEffect, useState } from 'react';
import { LoanList } from '@/components/loan-list';
import { ReturnForm } from '@/components/return-form';
import { Alert, Card, EmptyState, LoadingState, Modal, PaginationBar, Tabs } from '@/components/ui';
import { loanService } from '@/lib/api/inventory';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Loan, LoanStatusFilter, Paginated } from '@/types/api';

const tabLabels: Record<LoanStatusFilter, string> = {
  active: 'Aktif',
  overdue: 'Terlambat',
  returned: 'Dikembalikan',
  all: 'Semua',
};

interface LoansBrowserProps {
  /** `operator` memakai GET /loans, `mine` memakai GET /loans/me. */
  source: 'operator' | 'mine';
  tabs: LoanStatusFilter[];
  initialStatus: LoanStatusFilter;
  emptyText: string;
}

export function LoansBrowser({ source, tabs, initialStatus, emptyText }: LoansBrowserProps) {
  const [status, setStatus] = useState<LoanStatusFilter>(tabs.includes(initialStatus) ? initialStatus : tabs[0] ?? 'all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Loan> | null>(null);
  const [error, setError] = useState('');
  const [returning, setReturning] = useState<Loan | null>(null);
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const request = source === 'mine' ? loanService.mine({ status, page }) : loanService.list({ status, page });
    request
      .then((result) => {
        if (!active) return;
        setData(result);
        setError('');
      })
      .catch((err: unknown) => active && setError(getApiErrorMessage(err, 'Data peminjaman tidak dapat dimuat.')));
    return () => {
      active = false;
    };
  }, [source, status, page, reloadKey]);

  return (
    <>
      {tabs.length > 1 && (
        <div className="mb-4">
          <Tabs
            label="Status peminjaman"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
              setData(null);
            }}
            options={tabs.map((value) => ({ value, label: tabLabels[value] }))}
          />
        </div>
      )}
      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}
      {error && <Alert>{error}</Alert>}
      <Card>
        {!data && !error && <LoadingState />}
        {data && data.items.length === 0 && <EmptyState title={emptyText} />}
        {data && data.items.length > 0 && (
          <LoanList
            loans={data.items}
            showBorrower={source === 'operator'}
            linkItems={source === 'operator'}
            onReturn={source === 'operator' ? setReturning : undefined}
          />
        )}
        {data && <PaginationBar meta={data.pagination} onPage={setPage} />}
      </Card>

      <Modal open={returning !== null} title={`Kembalikan ${returning?.item.name ?? 'barang'}`} onClose={() => setReturning(null)}>
        {returning && (
          <>
            <p className="mb-4 text-sm text-slate-600">
              Dipinjam oleh <span className="font-medium text-slate-900">{returning.borrower.full_name}</span>.
            </p>
            <ReturnForm
              loanId={returning.id}
              onCancel={() => setReturning(null)}
              onDone={(loan) => {
                setReturning(null);
                setNotice(`${loan.item.name} dikembalikan.`);
                setReloadKey((key) => key + 1);
              }}
            />
          </>
        )}
      </Modal>
    </>
  );
}
