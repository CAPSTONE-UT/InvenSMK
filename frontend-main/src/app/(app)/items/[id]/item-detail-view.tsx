'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RequireRole, useAuth } from '@/components/auth-provider';
import { BarcodeLabel } from '@/components/barcode-label';
import { ItemForm } from '@/components/item-form';
import { LoanList } from '@/components/loan-list';
import { ReturnForm } from '@/components/return-form';
import {
  Alert,
  Button,
  Card,
  ConditionBadge,
  EmptyState,
  ItemStatusBadge,
  LoadingState,
  LoanStatusBadge,
  Modal,
  PageHeader,
  Tabs,
} from '@/components/ui';
import { itemService } from '@/lib/api/inventory';
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/api/errors';
import { conditionEventLabels, formatDate, formatDateTime } from '@/lib/format';
import type { ItemHistory } from '@/types/api';

type Tab = 'loans' | 'conditions';

export function ItemDetailView() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { hasRole } = useAuth();
  const [history, setHistory] = useState<ItemHistory | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('loans');
  const [editing, setEditing] = useState(false);
  const [returning, setReturning] = useState(false);
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    itemService
      .history(id)
      .then((result) => {
        if (!active) return;
        setHistory(result);
        setError('');
      })
      .catch((err: unknown) => {
        if (!active) return;
        const status = getApiErrorStatus(err);
        setError(status === 404 || status === 400 ? 'Barang tidak ditemukan.' : getApiErrorMessage(err, 'Data barang tidak dapat dimuat.'));
      });
    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  return (
    <RequireRole roles={['admin', 'inventory_officer']}>
      <Link href="/items" className="mb-4 inline-block text-sm font-medium text-slate-600 hover:text-slate-900">
        ← Data barang
      </Link>
      {error && <Alert>{error}</Alert>}
      {!history && !error && <LoadingState />}
      {history && (
        <>
          <PageHeader
            eyebrow={history.item.category.name}
            title={history.item.name}
            actions={
              <>
                <Link href={`/items/labels?ids=${history.item.id}`} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  Cetak label
                </Link>
                {hasRole('admin') && <Button onClick={() => setEditing(true)}>Ubah barang</Button>}
              </>
            }
          />
          {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card className="p-5">
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-slate-500">Kode barcode</dt>
                  <dd className="mt-1 font-mono font-medium text-slate-900">{history.item.barcode}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Status</dt>
                  <dd className="mt-1"><ItemStatusBadge status={history.item.status} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Kondisi</dt>
                  <dd className="mt-1"><ConditionBadge condition={history.item.condition} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Lokasi</dt>
                  <dd className="mt-1 text-slate-900">{history.item.location ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Tanggal perolehan</dt>
                  <dd className="mt-1 text-slate-900">{formatDate(history.item.acquired_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Diperbarui</dt>
                  <dd className="mt-1 text-slate-900">{formatDateTime(history.item.updated_at)}</dd>
                </div>
                {history.item.notes && (
                  <div className="sm:col-span-3">
                    <dt className="text-xs text-slate-500">Catatan</dt>
                    <dd className="mt-1 text-slate-900">{history.item.notes}</dd>
                  </div>
                )}
              </dl>

              {history.item.active_loan && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-blue-50 p-4 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">Dipinjam oleh {history.item.active_loan.borrower.full_name}</p>
                    <p className="text-slate-600">Jatuh tempo {formatDate(history.item.active_loan.due_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <LoanStatusBadge loan={history.item.active_loan} />
                    <Button variant="secondary" className="py-1.5" onClick={() => setReturning(true)}>Kembalikan</Button>
                  </div>
                </div>
              )}
            </Card>
            <BarcodeLabel code={history.item.barcode} name={history.item.name} category={history.item.category.name} />
          </div>

          <Card className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold">Riwayat barang</h2>
              <Tabs
                label="Jenis riwayat"
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'loans', label: `Peminjaman (${history.loans.length})` },
                  { value: 'conditions', label: `Kondisi (${history.condition_logs.length})` },
                ]}
              />
            </div>
            {tab === 'loans' &&
              (history.loans.length === 0 ? <EmptyState title="Belum pernah dipinjam" /> : <LoanList loans={history.loans} showItem={false} />)}
            {tab === 'conditions' &&
              (history.condition_logs.length === 0 ? (
                <EmptyState title="Belum ada catatan kondisi" />
              ) : (
                <ol className="divide-y divide-slate-100">
                  {history.condition_logs.map((log) => (
                    <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{conditionEventLabels[log.event]}</p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(log.recorded_at)}
                          {log.recorded_by && <> · {log.recorded_by.full_name}</>}
                          {log.notes && <> · {log.notes}</>}
                        </p>
                      </div>
                      <ConditionBadge condition={log.condition} />
                    </li>
                  ))}
                </ol>
              ))}
          </Card>

          <Modal open={editing} title="Ubah barang" onClose={() => setEditing(false)}>
            <ItemForm
              item={history.item}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                setNotice('Data barang diperbarui.');
                reload();
              }}
            />
          </Modal>
          {history.item.active_loan && (
            <Modal open={returning} title="Kembalikan barang" onClose={() => setReturning(false)}>
              <ReturnForm
                loanId={history.item.active_loan.id}
                onCancel={() => setReturning(false)}
                onDone={() => {
                  setReturning(false);
                  setNotice('Pengembalian dicatat.');
                  reload();
                }}
              />
            </Modal>
          )}
        </>
      )}
    </RequireRole>
  );
}
