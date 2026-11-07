import type { ConditionLogEvent, ItemCondition, ItemStatus, UserRole } from '@/types/api';

const timeZone = 'Asia/Jakarta';

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = value.length === 10 ? new Date(`${value}T00:00:00+07:00`) : new Date(value);
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone }).format(date);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(
    new Date(value),
  );
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value);
}

/** Tanggal hari ini + n hari dalam format YYYY-MM-DD (WIB), untuk input type="date". */
export function dateInputFromToday(days: number) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

export const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  inventory_officer: 'Petugas',
  staff: 'Peminjam',
};

export const itemStatusLabels: Record<ItemStatus, string> = {
  available: 'Tersedia',
  borrowed: 'Dipinjam',
  damaged: 'Rusak',
};

export const conditionLabels: Record<ItemCondition, string> = {
  good: 'Baik',
  minor_damage: 'Rusak ringan',
  damaged: 'Rusak',
};

export const conditionEventLabels: Record<ConditionLogEvent, string> = {
  registered: 'Didaftarkan',
  borrowed: 'Dipinjam',
  returned: 'Dikembalikan',
  updated: 'Diperbarui',
};

/** Mengubah string kosong menjadi null untuk field opsional. */
export function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
