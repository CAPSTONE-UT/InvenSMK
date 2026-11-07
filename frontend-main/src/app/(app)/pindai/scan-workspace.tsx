'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { RequireRole } from '@/components/auth-provider';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { BorrowerPicker } from '@/components/borrower-picker';
import { ReturnForm } from '@/components/return-form';
import {
  Alert,
  Button,
  Card,
  ConditionBadge,
  Field,
  ItemStatusBadge,
  LoanStatusBadge,
  PageHeader,
  inputClass,
} from '@/components/ui';
import { itemService, loanService } from '@/lib/api/inventory';
import { getApiErrorDetails, getApiErrorMessage, getApiErrorStatus } from '@/lib/api/errors';
import { dateInputFromToday, formatDate, nullable } from '@/lib/format';
import type { ActiveLoan, ItemDetail, ItemUnavailableDetails, Loan, ManagedUser } from '@/types/api';

type Lookup =
  | { state: 'idle' }
  | { state: 'loading'; code: string }
  | { state: 'not_found'; code: string }
  | { state: 'error'; code: string; message: string }
  | { state: 'found'; item: ItemDetail };

function ActiveLoanInfo({ loan }: { loan: ActiveLoan }) {
  return (
    <dl className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
      <div className="col-span-2">
        <dt className="text-xs text-slate-500">Peminjam</dt>
        <dd className="font-medium text-slate-900">
          {loan.borrower.full_name} <span className="font-normal text-slate-500">· {loan.borrower.school_unit}</span>
        </dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">Jatuh tempo</dt>
        <dd className="font-medium text-slate-900">{formatDate(loan.due_at)}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">Status</dt>
        <dd>
          <LoanStatusBadge loan={loan} />
        </dd>
      </div>
      <div className="col-span-2">
        <dt className="text-xs text-slate-500">Dicatat oleh</dt>
        <dd className="text-slate-700">{loan.officer.full_name}</dd>
      </div>
    </dl>
  );
}

function BorrowForm({ item, onDone, onConflict }: { item: ItemDetail; onDone: (loan: Loan) => void; onConflict: () => void }) {
  const [borrower, setBorrower] = useState<ManagedUser | null>(null);
  const [dueDate, setDueDate] = useState(dateInputFromToday(7));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflictLoan, setConflictLoan] = useState<ActiveLoan | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!borrower) {
      setError('Pilih peminjam terlebih dahulu.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      onDone(await loanService.create({ item_id: item.id, borrower_id: borrower.user_id, due_at: dueDate, notes: nullable(notes) }));
    } catch (err) {
      // U-09: barang ternyata sudah dipinjam; tampilkan peminjaman aktifnya.
      const details = getApiErrorStatus(err) === 409 ? getApiErrorDetails<ItemUnavailableDetails>(err) : undefined;
      setConflictLoan(details?.active_loan ?? null);
      setError(getApiErrorMessage(err, 'Peminjaman gagal dicatat.'));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Peminjam" htmlFor="borrower">
        <BorrowerPicker value={borrower} onChange={setBorrower} />
      </Field>
      <Field label="Jatuh tempo" htmlFor="due-date" hint="Batas pengembalian pukul 23.59 WIB pada tanggal ini.">
        <input
          id="due-date"
          type="date"
          required
          min={dateInputFromToday(0)}
          max={dateInputFromToday(365)}
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Catatan (opsional)" htmlFor="loan-notes">
        <textarea id="loan-notes" rows={2} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} placeholder="Misalnya: untuk praktik jaringan" />
      </Field>
      {error && <Alert>{error}</Alert>}
      {conflictLoan && (
        <div className="space-y-2">
          <ActiveLoanInfo loan={conflictLoan} />
          <Button variant="secondary" onClick={onConflict} className="w-full">
            Muat ulang data barang
          </Button>
        </div>
      )}
      <Button type="submit" disabled={saving} className="w-full py-3">
        {saving ? 'Menyimpan...' : 'Pinjamkan barang'}
      </Button>
    </form>
  );
}

function ItemCard({ item, onCompleted, onReload }: { item: ItemDetail; onCompleted: (message: string) => void; onReload: () => void }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{item.name}</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            <span className="font-mono">{item.barcode}</span> · {item.category.name}
          </p>
        </div>
        <ItemStatusBadge status={item.status} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Lokasi</dt>
          <dd className="font-medium text-slate-900">{item.location ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Kondisi</dt>
          <dd>
            <ConditionBadge condition={item.condition} />
          </dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-slate-200 pt-5">
        {item.status === 'available' && (
          <>
            <h3 className="mb-3 font-semibold">Catat peminjaman</h3>
            <BorrowForm
              item={item}
              onConflict={onReload}
              onDone={(loan) => onCompleted(`${loan.item.name} dipinjamkan kepada ${loan.borrower.full_name} hingga ${formatDate(loan.due_at)}.`)}
            />
          </>
        )}
        {item.status === 'borrowed' && item.active_loan && (
          <>
            <h3 className="mb-3 font-semibold">Catat pengembalian</h3>
            <ActiveLoanInfo loan={item.active_loan} />
            <div className="mt-4">
              <ReturnForm
                loanId={item.active_loan.id}
                onDone={(loan) => onCompleted(`${loan.item.name} dikembalikan oleh ${loan.borrower.full_name}.`)}
              />
            </div>
          </>
        )}
        {item.status === 'damaged' && (
          <Alert tone="info">Barang berstatus rusak dan tidak dapat dipinjam. Admin dapat memperbarui kondisinya setelah diperbaiki.</Alert>
        )}
      </div>
    </Card>
  );
}

export function ScanWorkspace() {
  const searchParams = useSearchParams();
  const [manualCode, setManualCode] = useState('');
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' });
  const [success, setSuccess] = useState('');
  const requestId = useRef(0);

  const search = useCallback(async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;
    const id = ++requestId.current;
    setSuccess('');
    setManualCode(code);
    setLookup({ state: 'loading', code });
    try {
      const item = await itemService.getByBarcode(code);
      if (id === requestId.current) setLookup({ state: 'found', item });
    } catch (err) {
      if (id !== requestId.current) return;
      const status = getApiErrorStatus(err);
      // 400 berarti format kode tidak valid, sehingga pasti tidak terdaftar.
      if (status === 404 || status === 400) setLookup({ state: 'not_found', code });
      else setLookup({ state: 'error', code, message: getApiErrorMessage(err, 'Barang tidak dapat dicari.') });
    }
  }, []);

  const initialCode = searchParams.get('code');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pencarian awal dari tautan ?code=
    if (initialCode) void search(initialCode);
  }, [initialCode, search]);

  const reset = () => {
    requestId.current += 1;
    setLookup({ state: 'idle' });
    setManualCode('');
  };

  const submitManual = (event: FormEvent) => {
    event.preventDefault();
    void search(manualCode);
  };

  return (
    <RequireRole roles={['admin', 'inventory_officer']}>
      <div className="mx-auto max-w-xl">
        <PageHeader eyebrow="SMK Madya Depok" title="Pindai barang" description="Pindai barcode atau ketik kode barang untuk mencatat peminjaman dan pengembalian." />

        {success && (
          <div className="mb-4">
            <Alert tone="success">{success}</Alert>
          </div>
        )}

        <BarcodeScanner paused={lookup.state === 'found' || lookup.state === 'loading'} onDetected={(code) => void search(code)} />

        <form onSubmit={submitManual} className="mt-4 flex gap-2">
          <label htmlFor="manual-code" className="sr-only">Kode barang</label>
          <input
            id="manual-code"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="Atau ketik kode manual, misal INV-000001"
            autoCapitalize="characters"
            autoComplete="off"
            className={`${inputClass} font-mono`}
          />
          <Button type="submit" variant="secondary" disabled={lookup.state === 'loading'}>
            Cari
          </Button>
        </form>

        <div className="mt-5">
          {lookup.state === 'loading' && <p className="text-sm text-slate-500">Mencari {lookup.code}...</p>}
          {lookup.state === 'not_found' && (
            <Alert>
              Barang dengan kode <span className="font-mono">{lookup.code}</span> tidak ditemukan. Periksa kode lalu coba lagi, atau pindai ulang.
            </Alert>
          )}
          {lookup.state === 'error' && <Alert>{lookup.message}</Alert>}
          {lookup.state === 'found' && (
            <>
              <ItemCard
                key={`${lookup.item.id}-${lookup.item.updated_at}`}
                item={lookup.item}
                onReload={() => void search(lookup.item.barcode)}
                onCompleted={(message) => {
                  reset();
                  setSuccess(message);
                }}
              />
              <div className="mt-3 flex justify-between text-sm">
                <button type="button" onClick={reset} className="font-medium text-slate-600 hover:text-slate-900">
                  Pindai barang lain
                </button>
                <Link href={`/items/${lookup.item.id}`} className="font-medium text-blue-800 hover:underline">
                  Lihat riwayat barang
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </RequireRole>
  );
}
