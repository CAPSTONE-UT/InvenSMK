'use client';

import Link from 'next/link';
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { conditionLabels, itemStatusLabels } from '@/lib/format';
import type { ItemCondition, ItemStatus, Loan, Pagination as PaginationMeta } from '@/types/api';

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[#18345b] text-white hover:bg-[#244978]',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  danger: 'bg-red-700 text-white hover:bg-red-800',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonStyles[variant]} ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm text-slate-500">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white ${className}`}>{children}</section>;
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
  }[tone];
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border p-3.5 text-sm ${styles}`}>
      {children}
    </p>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="font-medium text-slate-900">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  );
}

export function LoadingState({ label = 'Memuat data...' }: { label?: string }) {
  return <p className="px-5 py-12 text-center text-sm text-slate-500">{label}</p>;
}

// ---------------------------------------------------------------------------
// Badges (status selalu memakai teks, bukan warna saja)
// ---------------------------------------------------------------------------

type Tone = 'green' | 'blue' | 'red' | 'amber' | 'slate';

const toneStyles: Record<Tone, string> = {
  green: 'bg-green-50 text-green-800 ring-green-600/20',
  blue: 'bg-blue-50 text-blue-800 ring-blue-600/20',
  red: 'bg-red-50 text-red-800 ring-red-600/20',
  amber: 'bg-amber-50 text-amber-900 ring-amber-600/20',
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${toneStyles[tone]}`}
    >
      {children}
    </span>
  );
}

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const tone: Record<ItemStatus, Tone> = { available: 'green', borrowed: 'blue', damaged: 'red' };
  return <Badge tone={tone[status]}>{itemStatusLabels[status]}</Badge>;
}

export function ConditionBadge({ condition }: { condition: ItemCondition }) {
  const tone: Record<ItemCondition, Tone> = { good: 'slate', minor_damage: 'amber', damaged: 'red' };
  return <Badge tone={tone[condition]}>{conditionLabels[condition]}</Badge>;
}

export function LoanStatusBadge({ loan }: { loan: Pick<Loan, 'status' | 'is_overdue' | 'overdue_days' | 'returned_late'> }) {
  if (loan.is_overdue) return <Badge tone="red">Terlambat {loan.overdue_days} hari</Badge>;
  if (loan.status === 'active') return <Badge tone="blue">Aktif</Badge>;
  if (loan.returned_late) return <Badge tone="amber">Kembali terlambat</Badge>;
  return <Badge tone="green">Dikembalikan</Badge>;
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10 disabled:bg-slate-50';

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal (native <dialog> untuk fokus dan tombol Escape)
// ---------------------------------------------------------------------------

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40"
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="-m-1 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Pagination & tabs
// ---------------------------------------------------------------------------

export function PaginationBar({ meta, onPage }: { meta: PaginationMeta; onPage: (page: number) => void }) {
  if (meta.total_pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm">
      <p className="text-slate-600">
        Halaman {meta.page} dari {meta.total_pages} · {meta.total} data
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          Sebelumnya
        </Button>
        <Button variant="secondary" disabled={meta.page >= meta.total_pages} onClick={() => onPage(meta.page + 1)}>
          Berikutnya
        </Button>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === option.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-blue-800 hover:underline">
      {children}
    </Link>
  );
}
