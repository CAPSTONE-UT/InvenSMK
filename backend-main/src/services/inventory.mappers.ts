import { z } from "zod";

import {
  type ActiveLoanSummary,
  type CategoryPayload,
  conditionLogEvents,
  type ConditionLogPayload,
  itemConditions,
  type ItemPayload,
  itemStatuses,
  type LoanPayload,
  loanStatuses,
} from "../types/inventory.types.js";
import { DependencyError } from "../utils/api-error.js";
import { databaseUnavailableMessage } from "./supabase-helpers.js";

// ---------------------------------------------------------------------------
// Select strings (PostgREST). Nama constraint FK dipakai untuk menghindari ambiguitas.
// ---------------------------------------------------------------------------

export const categorySelect = "id, name, description, created_at, updated_at, items(count)";

export const itemSelect =
  "id, barcode, name, location, condition, status, acquired_at, notes, created_at, updated_at, " +
  "category:categories!items_category_id_fkey(id, name)";

export const loanSelect =
  "id, status, borrowed_at, due_at, returned_at, notes, return_condition, return_notes, created_at, updated_at, " +
  "item:items!loans_item_id_fkey(id, barcode, name, category:categories!items_category_id_fkey(id, name)), " +
  "borrower:school_staff_profiles!loans_borrower_id_fkey(user_id, full_name, staff_id, school_unit), " +
  "officer:school_staff_profiles!loans_officer_id_fkey(user_id, full_name), " +
  "return_officer:school_staff_profiles!loans_return_officer_id_fkey(user_id, full_name)";

export const conditionLogSelect =
  "id, loan_id, condition, event, notes, recorded_at, " +
  "recorded_by:school_staff_profiles!condition_logs_recorded_by_fkey(user_id, full_name)";

// ---------------------------------------------------------------------------
// Row schemas
// ---------------------------------------------------------------------------

const categoryRefRow = z.object({ id: z.string(), name: z.string() });
const officerRefRow = z.object({ user_id: z.string(), full_name: z.string() });
const personRefRow = officerRefRow.extend({ staff_id: z.string(), school_unit: z.string() });

const categoryRow = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  items: z.array(z.object({ count: z.number() })).optional(),
});

const itemRow = z.object({
  id: z.string(),
  barcode: z.string(),
  name: z.string(),
  location: z.string().nullable(),
  condition: z.enum(itemConditions),
  status: z.enum(itemStatuses),
  acquired_at: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  category: categoryRefRow,
});

const loanRow = z.object({
  id: z.string(),
  status: z.enum(loanStatuses),
  borrowed_at: z.string(),
  due_at: z.string(),
  returned_at: z.string().nullable(),
  notes: z.string().nullable(),
  return_condition: z.enum(itemConditions).nullable(),
  return_notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  item: z.object({
    id: z.string(),
    barcode: z.string(),
    name: z.string(),
    category: categoryRefRow,
  }),
  borrower: personRefRow,
  officer: officerRefRow,
  return_officer: officerRefRow.nullable(),
});

const conditionLogRow = z.object({
  id: z.string(),
  loan_id: z.string().nullable(),
  condition: z.enum(itemConditions),
  event: z.enum(conditionLogEvents),
  notes: z.string().nullable(),
  recorded_at: z.string(),
  recorded_by: officerRefRow.nullable(),
});

function parseRow<TSchema extends z.ZodType>(schema: TSchema, row: unknown, context: string): z.output<TSchema> {
  const result = schema.safeParse(row);
  if (!result.success) {
    console.error(`[${context}] unexpected row shape:`, result.error.issues);
    throw new DependencyError(databaseUnavailableMessage);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

const dayMs = 24 * 60 * 60 * 1000;

export interface OverdueInfo {
  is_overdue: boolean;
  overdue_days: number;
  returned_late: boolean;
}

/** Peminjaman terlambat bila masih aktif dan waktu sekarang melewati jatuh tempo. */
export function computeOverdue(
  status: "active" | "returned",
  dueAt: string,
  returnedAt: string | null,
  nowMs: number = Date.now(),
): OverdueInfo {
  const dueMs = Date.parse(dueAt);
  const isOverdue = status === "active" && nowMs > dueMs;
  return {
    is_overdue: isOverdue,
    overdue_days: isOverdue ? Math.ceil((nowMs - dueMs) / dayMs) : 0,
    returned_late: status === "returned" && returnedAt !== null && Date.parse(returnedAt) > dueMs,
  };
}

export function toCategoryPayload(row: unknown): CategoryPayload {
  const parsed = parseRow(categoryRow, row, "category");
  return {
    id: parsed.id,
    name: parsed.name,
    description: parsed.description,
    item_count: parsed.items?.[0]?.count ?? 0,
    created_at: parsed.created_at,
    updated_at: parsed.updated_at,
  };
}

export function toItemPayload(row: unknown): ItemPayload {
  const parsed = parseRow(itemRow, row, "item");
  return {
    id: parsed.id,
    barcode: parsed.barcode,
    name: parsed.name,
    category: parsed.category,
    location: parsed.location,
    condition: parsed.condition,
    status: parsed.status,
    acquired_at: parsed.acquired_at,
    notes: parsed.notes,
    created_at: parsed.created_at,
    updated_at: parsed.updated_at,
  };
}

export function toLoanPayload(row: unknown, nowMs: number = Date.now()): LoanPayload {
  const parsed = parseRow(loanRow, row, "loan");
  return {
    id: parsed.id,
    status: parsed.status,
    ...computeOverdue(parsed.status, parsed.due_at, parsed.returned_at, nowMs),
    borrowed_at: parsed.borrowed_at,
    due_at: parsed.due_at,
    returned_at: parsed.returned_at,
    notes: parsed.notes,
    return_condition: parsed.return_condition,
    return_notes: parsed.return_notes,
    item: parsed.item,
    borrower: parsed.borrower,
    officer: parsed.officer,
    return_officer: parsed.return_officer,
    created_at: parsed.created_at,
    updated_at: parsed.updated_at,
  };
}

export function toActiveLoanSummary(loan: LoanPayload): ActiveLoanSummary {
  const { item: _item, ...summary } = loan;
  return summary;
}

export function toConditionLogPayload(row: unknown): ConditionLogPayload {
  return parseRow(conditionLogRow, row, "condition_log");
}
