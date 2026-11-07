import type { PostgrestError } from "@supabase/supabase-js";

import { createAdminSupabaseClient } from "../config/supabase.js";
import type { DashboardQuery } from "../schemas/dashboard.schema.js";
import type {
  DashboardService,
  DashboardSummaryPayload,
  WeeklyLoanBucket,
} from "../types/inventory.types.js";
import { loanSelect, toLoanPayload } from "./inventory.mappers.js";
import { databaseError } from "./supabase-helpers.js";

const schoolOffsetMs = 7 * 60 * 60 * 1000; // WIB (UTC+7)
const dayMs = 24 * 60 * 60 * 1000;
const weekMs = 7 * dayMs;

function toSchoolDate(epochMs: number): string {
  return new Date(epochMs + schoolOffsetMs).toISOString().slice(0, 10);
}

/** Awal minggu (Senin 00:00 WIB) yang memuat `nowMs`, dalam epoch ms UTC. */
export function startOfSchoolWeek(nowMs: number): number {
  const local = new Date(nowMs + schoolOffsetMs);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  const mondayLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysSinceMonday);
  return mondayLocal - schoolOffsetMs;
}

/** Awal bulan (tanggal 1 00:00 WIB) yang memuat `nowMs`, dalam epoch ms UTC. */
export function startOfSchoolMonth(nowMs: number): number {
  const local = new Date(nowMs + schoolOffsetMs);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - schoolOffsetMs;
}

/** Mengelompokkan waktu peminjaman ke dalam `weeks` minggu terakhir (termasuk minggu berjalan). */
export function buildWeeklyBuckets(borrowedAt: readonly string[], weeks: number, nowMs: number): WeeklyLoanBucket[] {
  const currentWeekStart = startOfSchoolWeek(nowMs);
  const firstWeekStart = currentWeekStart - (weeks - 1) * weekMs;
  const totals = new Array<number>(weeks).fill(0);

  for (const value of borrowedAt) {
    const index = Math.floor((Date.parse(value) - firstWeekStart) / weekMs);
    if (index >= 0 && index < weeks) totals[index] = (totals[index] ?? 0) + 1;
  }

  return totals.map((total, index) => {
    const start = firstWeekStart + index * weekMs;
    return { week_start: toSchoolDate(start), week_end: toSchoolDate(start + weekMs - dayMs), total };
  });
}

interface CountResult {
  count: number | null;
  error: PostgrestError | null;
}

function unwrapCount(context: string, result: CountResult): number {
  if (result.error !== null) throw databaseError(context, result.error);
  return result.count ?? 0;
}

export class SupabaseDashboardService implements DashboardService {
  public async getSummary(query: DashboardQuery): Promise<DashboardSummaryPayload> {
    const client = createAdminSupabaseClient();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const weeklyFromIso = new Date(startOfSchoolWeek(nowMs) - (query.weeks - 1) * weekMs).toISOString();
    const monthStartIso = new Date(startOfSchoolMonth(nowMs)).toISOString();
    const head = { count: "exact", head: true } as const;

    const [
      totalItems,
      availableItems,
      borrowedItems,
      damagedItems,
      totalCategories,
      activeLoans,
      overdueLoans,
      monthLoans,
      weeklyRows,
      overdueRows,
    ] = await Promise.all([
      client.from("items").select("id", head),
      client.from("items").select("id", head).eq("status", "available"),
      client.from("items").select("id", head).eq("status", "borrowed"),
      client.from("items").select("id", head).eq("status", "damaged"),
      client.from("categories").select("id", head),
      client.from("loans").select("id", head).eq("status", "active"),
      client.from("loans").select("id", head).eq("status", "active").lt("due_at", nowIso),
      client.from("loans").select("id", head).gte("borrowed_at", monthStartIso),
      client.from("loans").select("borrowed_at").gte("borrowed_at", weeklyFromIso).limit(10_000),
      client
        .from("loans")
        .select(loanSelect)
        .eq("status", "active")
        .lt("due_at", nowIso)
        .order("due_at", { ascending: true })
        .limit(query.overdue_limit),
    ]);

    if (weeklyRows.error !== null) throw databaseError("dashboard.weekly", weeklyRows.error);
    if (overdueRows.error !== null) throw databaseError("dashboard.overdue", overdueRows.error);

    const borrowedAt = weeklyRows.data
      .map((row: { borrowed_at?: unknown }) => row.borrowed_at)
      .filter((value): value is string => typeof value === "string");

    return {
      generated_at: nowIso,
      items: {
        total: unwrapCount("dashboard.items", totalItems),
        available: unwrapCount("dashboard.items.available", availableItems),
        borrowed: unwrapCount("dashboard.items.borrowed", borrowedItems),
        damaged: unwrapCount("dashboard.items.damaged", damagedItems),
      },
      categories: { total: unwrapCount("dashboard.categories", totalCategories) },
      loans: {
        active: unwrapCount("dashboard.loans.active", activeLoans),
        overdue: unwrapCount("dashboard.loans.overdue", overdueLoans),
        borrowed_this_month: unwrapCount("dashboard.loans.month", monthLoans),
      },
      weekly_loans: buildWeeklyBuckets(borrowedAt, query.weeks, nowMs),
      overdue_loans: overdueRows.data.map((row: unknown) => toLoanPayload(row, nowMs)),
    };
  }
}
