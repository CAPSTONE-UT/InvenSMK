import { z } from "zod";

import { itemConditions } from "../types/inventory.types.js";
import { nullableText, paginationQuerySchema, uuidSchema } from "./common.schema.js";

const maxLoanDurationMs = 366 * 24 * 60 * 60 * 1000;

/** Zona waktu sekolah (WIB). Tanggal tanpa jam berarti akhir hari tersebut di WIB. */
export const schoolUtcOffset = "+07:00";

export const dueAtSchema = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()], {
    error: "Jatuh tempo harus berformat YYYY-MM-DD atau ISO 8601 datetime",
  })
  .transform((value) => (value.length === 10 ? `${value}T23:59:59${schoolUtcOffset}` : value))
  .refine((value) => Date.parse(value) > Date.now(), "Jatuh tempo harus setelah waktu sekarang")
  .refine(
    (value) => Date.parse(value) - Date.now() <= maxLoanDurationMs,
    "Jatuh tempo maksimal satu tahun dari sekarang",
  )
  .transform((value) => new Date(value).toISOString());

export const createLoanSchema = z.strictObject({
  item_id: uuidSchema,
  borrower_id: uuidSchema,
  due_at: dueAtSchema,
  notes: nullableText(500).default(null),
});

export const returnLoanSchema = z.strictObject({
  condition: z.enum(itemConditions),
  notes: nullableText(500).default(null),
});

export const loanStatusFilters = ["all", "active", "overdue", "returned"] as const;
export type LoanStatusFilter = (typeof loanStatusFilters)[number];

/** Menerima alias bahasa Indonesia sesuai rancangan laporan (`?status=aktif|terlambat|selesai`). */
const statusAliases: Record<string, LoanStatusFilter> = {
  semua: "all",
  aktif: "active",
  terlambat: "overdue",
  selesai: "returned",
  dikembalikan: "returned",
};

const loanStatusFilterSchema = z
  .preprocess(
    (value) => (typeof value === "string" ? (statusAliases[value.toLowerCase()] ?? value.toLowerCase()) : value),
    z.enum(loanStatusFilters),
  )
  .default("all");

export const loanListQuerySchema = paginationQuerySchema
  .extend({
    status: loanStatusFilterSchema,
    item_id: uuidSchema.optional(),
    borrower_id: uuidSchema.optional(),
    borrowed_from: z.iso.date().optional(),
    borrowed_to: z.iso.date().optional(),
  })
  .refine(
    (value) =>
      value.borrowed_from === undefined ||
      value.borrowed_to === undefined ||
      value.borrowed_from <= value.borrowed_to,
    { message: "borrowed_from harus sebelum atau sama dengan borrowed_to", path: ["borrowed_from"] },
  );

export const myLoanQuerySchema = paginationQuerySchema.extend({
  status: loanStatusFilterSchema,
});

export type CreateLoanInput = z.output<typeof createLoanSchema>;
export type ReturnLoanInput = z.output<typeof returnLoanSchema>;
export type LoanListQuery = z.output<typeof loanListQuerySchema>;
export type MyLoanQuery = z.output<typeof myLoanQuerySchema>;
