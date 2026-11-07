'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { RequireRole, useAuth } from '@/components/auth-provider';
import { LoanList } from '@/components/loan-list';
import { Alert, Button, Card, EmptyState, LoadingState, PageHeader } from '@/components/ui';
import { WeeklyLoansChart } from '@/components/weekly-loans-chart';
import { dashboardService, loanService } from '@/lib/api/inventory';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatDate, formatNumber } from '@/lib/format';
import type { DashboardSummary, Loan } from '@/types/api';

function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date()));
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function StatCard({ label, value, note, href }: { label: string; value: number; note: string; href?: string }) {
  const content = (
    <>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-slate-900">{formatNumber(value)}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300">
      {content}
    </Link>
  ) : (
    <div className="rounded-xl border border-slate-200 bg-white p-5">{content}</div>
  );
}

function QuickScan() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    router.push(trimmed ? `/pindai?code=${encodeURIComponent(trimmed)}` : '/pindai');
  };
  return (
    <section className="mb-6 rounded-xl bg-[#18345b] p-5 text-white md:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Pemindai barcode</p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">Pindai. Catat. Selesai.</h2>
      <p className="mt-1 text-sm text-blue-100">Pindai atau ketik kode barang untuk meminjamkan atau mengembalikan.</p>
      <form onSubmit={submit} className="mt-4 flex max-w-xl gap-2">
        <label htmlFor="quick-code" className="sr-only">Kode barang</label>
        <input
          id="quick-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Masukkan kode barang atau buka kamera"
          className="min-w-0 flex-1 rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-300"
        />
        <Button type="submit" variant="secondary" className="border-0">
          {code.trim() ? 'Cari' : 'Buka pemindai'}
        </Button>
      </form>
    </section>
  );
}

function AdminDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardService
      .summary({ weeks: 6, overdue_limit: 5 })
      .then(setSummary)
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Ringkasan dashboard tidak dapat dimuat.')));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!summary) return <LoadingState label="Memuat ringkasan..." />;

  const weekTotal = summary.weekly_loans.reduce((sum, bucket) => sum + bucket.total, 0);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total barang" value={summary.items.total} note={`Dalam ${summary.categories.total} kategori`} href="/items" />
        <StatCard label="Sedang dipinjam" value={summary.items.borrowed} note={`${formatNumber(summary.items.available)} tersedia`} href="/loans" />
        <StatCard label="Terlambat" value={summary.loans.overdue} note="Perlu ditindaklanjuti" href="/loans?status=overdue" />
        <StatCard label="Barang rusak" value={summary.items.damaged} note="Menunggu perbaikan" href="/items?status=damaged" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card className="p-5 md:p-6">
          <h2 className="font-semibold">Peminjaman per minggu</h2>
          <p className="mt-1 text-sm text-slate-500">
            {formatNumber(weekTotal)} peminjaman dalam {summary.weekly_loans.length} minggu terakhir ·{' '}
            {formatNumber(summary.loans.borrowed_this_month)} bulan ini
          </p>
          <div className="mt-5">
            <WeeklyLoansChart buckets={summary.weekly_loans} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">Perlu perhatian</h2>
            <Link href="/loans?status=overdue" className="text-sm font-medium text-blue-800 hover:underline">
              Lihat semua
            </Link>
          </div>
          {summary.overdue_loans.length === 0 ? (
            <EmptyState title="Tidak ada keterlambatan" description="Semua peminjaman aktif masih dalam jatuh tempo." />
          ) : (
            <LoanList loans={summary.overdue_loans} />
          )}
        </Card>
      </div>
    </>
  );
}

function OfficerDashboard() {
  const [counts, setCounts] = useState<{ active: number; overdue: number } | null>(null);
  const [overdue, setOverdue] = useState<Loan[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([loanService.list({ status: 'active', limit: 1 }), loanService.list({ status: 'overdue', limit: 5 })])
      .then(([active, late]) => {
        setCounts({ active: active.pagination.total, overdue: late.pagination.total });
        setOverdue(late.items);
      })
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Data peminjaman tidak dapat dimuat.')));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!counts) return <LoadingState />;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Peminjaman aktif" value={counts.active} note="Belum dikembalikan" href="/loans" />
        <StatCard label="Terlambat" value={counts.overdue} note="Melewati jatuh tempo" href="/loans?status=overdue" />
      </div>
      <Card className="mt-6">
        <h2 className="border-b border-slate-200 px-5 py-4 font-semibold">Peminjaman terlambat</h2>
        {overdue.length === 0 ? <EmptyState title="Tidak ada keterlambatan" /> : <LoanList loans={overdue} />}
      </Card>
    </>
  );
}

export default function DashboardPage() {
  const { profile, hasRole } = useAuth();
  return (
    <RequireRole roles={['admin', 'inventory_officer']}>
      <PageHeader
        eyebrow={hasRole('admin') ? 'Panel admin' : 'Panel petugas'}
        title={`${greeting()}, ${profile.full_name.split(' ')[0]}.`}
        description={`Ringkasan inventaris dan peminjaman · ${formatDate(new Date().toISOString())}`}
      />
      <QuickScan />
      {hasRole('admin') ? <AdminDashboard /> : <OfficerDashboard />}
    </RequireRole>
  );
}
