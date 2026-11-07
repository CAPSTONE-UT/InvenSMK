import axios from 'axios';

interface ErrorBody {
  message?: string;
  error?: { code?: string; details?: unknown };
}

function body(error: unknown): ErrorBody | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  return error.response?.data as ErrorBody | undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return error instanceof Error && error.message ? error.message : fallback;
  if (!error.response) return 'Tidak dapat terhubung ke server. Periksa koneksi Anda.';
  const response = body(error);
  const message = response?.message || fallback;
  const details = response?.error?.details;
  if (!Array.isArray(details) || details.length === 0) return message;
  const lines = details
    .filter((detail): detail is { path: string; message: string } => typeof detail?.message === 'string')
    .map((detail) => (detail.path ? `${detail.path}: ${detail.message}` : detail.message));
  return lines.length ? `${message}: ${lines.join('; ')}` : message;
}

export function getApiErrorCode(error: unknown) {
  return body(error)?.error?.code;
}

export function getApiErrorStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

/** Detail error yang bukan daftar validasi, misalnya `active_loan` pada 409 peminjaman. */
export function getApiErrorDetails<T>(error: unknown): T | undefined {
  const details = body(error)?.error?.details;
  return details && typeof details === 'object' && !Array.isArray(details) ? (details as T) : undefined;
}
