import type { PostgrestError } from "@supabase/supabase-js";

import { DependencyError } from "../utils/api-error.js";
import { buildPaginationMeta, type Paginated, toRange } from "../utils/pagination.js";

export const pgErrorCodes = {
  uniqueViolation: "23505",
  foreignKeyViolation: "23503",
  checkViolation: "23514",
  rangeNotSatisfiable: "PGRST103",
} as const;

export const databaseUnavailableMessage = "Layanan basis data sementara tidak tersedia";

/** Mencatat detail error di server dan mengembalikan error aman untuk klien. */
export function databaseError(context: string, error: PostgrestError | Error): DependencyError {
  console.error(`[${context}] database error:`, {
    message: error.message,
    ...("code" in error ? { code: error.code, details: error.details, hint: error.hint } : {}),
  });
  return new DependencyError(databaseUnavailableMessage);
}

export function isPgError(error: PostgrestError, code: string): boolean {
  return error.code === code;
}

interface PageResult {
  data: unknown[] | null;
  error: PostgrestError | null;
  count: number | null;
}

/**
 * Menjalankan query berhalaman. `run` dipanggil dengan rentang baris dan harus membangun
 * query baru setiap kali dipanggil (query builder Supabase hanya dapat dieksekusi sekali).
 */
export async function fetchPage<T>(
  context: string,
  page: number,
  limit: number,
  run: (from: number, to: number) => PromiseLike<PageResult>,
  mapRow: (row: unknown) => T,
): Promise<Paginated<T>> {
  const [from, to] = toRange(page, limit);
  const result = await run(from, to);

  if (result.error !== null) {
    if (!isPgError(result.error, pgErrorCodes.rangeNotSatisfiable)) {
      throw databaseError(context, result.error);
    }
    // Halaman melewati jumlah data: kembalikan halaman kosong dengan total yang benar.
    const countResult = await run(0, 0);
    if (countResult.error !== null) throw databaseError(context, countResult.error);
    return { items: [], pagination: buildPaginationMeta(page, limit, countResult.count ?? 0) };
  }

  const rows = result.data ?? [];
  return {
    items: rows.map(mapRow),
    pagination: buildPaginationMeta(page, limit, result.count ?? rows.length),
  };
}

/** Menghapus key bernilai undefined agar tidak dikirim ke database. */
export function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as Partial<T>;
}
