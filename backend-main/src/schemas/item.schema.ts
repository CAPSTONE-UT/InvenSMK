import { z } from "zod";

import { itemConditions, itemStatuses } from "../types/inventory.types.js";
import {
  atLeastOneFieldMessage,
  hasAtLeastOneField,
  nullableText,
  paginationQuerySchema,
  searchTermSchema,
  uuidSchema,
} from "./common.schema.js";

/** Sama dengan constraint database `items.barcode`. Aman untuk Code 128 dan QR Code. */
export const barcodePattern = /^[A-Z0-9][A-Z0-9._-]{2,63}$/;

export const barcodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    barcodePattern,
    "Kode barcode 3-64 karakter: huruf, angka, titik, garis bawah, atau tanda hubung",
  );

const itemNameSchema = z.string().trim().min(2).max(150);
const acquiredAtSchema = z.iso.date("Tanggal perolehan harus berformat YYYY-MM-DD").nullable();

export const createItemSchema = z.strictObject({
  barcode: barcodeSchema.optional(),
  name: itemNameSchema,
  category_id: uuidSchema,
  location: nullableText(120).default(null),
  condition: z.enum(itemConditions).default("good"),
  acquired_at: acquiredAtSchema.default(null),
  notes: nullableText(1000).default(null),
});

export const updateItemSchema = z
  .strictObject({
    barcode: barcodeSchema.optional(),
    name: itemNameSchema.optional(),
    category_id: uuidSchema.optional(),
    location: nullableText(120).optional(),
    condition: z.enum(itemConditions).optional(),
    acquired_at: acquiredAtSchema.optional(),
    notes: nullableText(1000).optional(),
  })
  .refine(hasAtLeastOneField, atLeastOneFieldMessage);

export const itemListQuerySchema = paginationQuerySchema.extend({
  q: searchTermSchema,
  category_id: uuidSchema.optional(),
  status: z.enum(itemStatuses).optional(),
  condition: z.enum(itemConditions).optional(),
});

export const barcodeParamSchema = z.object({ code: barcodeSchema });

export type CreateItemInput = z.output<typeof createItemSchema>;
export type UpdateItemInput = z.output<typeof updateItemSchema>;
export type ItemListQuery = z.output<typeof itemListQuerySchema>;
