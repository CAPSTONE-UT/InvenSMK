import { z } from "zod";

export const uuidSchema = z.uuid("ID harus berupa UUID yang valid");

export const idParamSchema = z.object({ id: uuidSchema });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Teks opsional; string kosong setelah trim disimpan sebagai null. */
export function nullableText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value === null || value.length === 0 ? null : value));
}

/**
 * Kata kunci pencarian. Karakter yang memiliki arti khusus pada filter PostgREST
 * (koma, kurung, kutip, wildcard) dibuang agar tidak dapat menyisipkan filter lain.
 */
export const searchTermSchema = z
  .string()
  .trim()
  .max(100)
  .transform((value) => value.replace(/[,()"'\\%*:]/g, "").trim())
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

export function hasAtLeastOneField(value: Record<string, unknown>): boolean {
  return Object.values(value).some((field) => field !== undefined);
}

export const atLeastOneFieldMessage = { message: "Minimal satu field harus diisi" } as const;
