import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";

const { computeOverdue, toLoanPayload } = await import("../../src/services/inventory.mappers.js");
const { buildWeeklyBuckets, startOfSchoolMonth, startOfSchoolWeek } = await import(
  "../../src/services/dashboard.service.js"
);
const { statusForCondition } = await import("../../src/types/inventory.types.js");

const dueAt = "2026-11-10T16:59:59.000Z"; // 2026-11-10 23:59:59 WIB
const dueMs = Date.parse(dueAt);
const dayMs = 24 * 60 * 60 * 1000;

describe("overdue calculation (U-11, BVA)", () => {
  it("is not overdue exactly at the due time or one day before", () => {
    assert.equal(computeOverdue("active", dueAt, null, dueMs).is_overdue, false);
    assert.equal(computeOverdue("active", dueAt, null, dueMs - dayMs).is_overdue, false);
  });

  it("is overdue after the due time and counts started days", () => {
    assert.deepEqual(computeOverdue("active", dueAt, null, dueMs + 1), {
      is_overdue: true,
      overdue_days: 1,
      returned_late: false,
    });
    assert.equal(computeOverdue("active", dueAt, null, dueMs + dayMs + 1).overdue_days, 2);
  });

  it("never marks returned loans as overdue but flags late returns", () => {
    const lateReturn = new Date(dueMs + 1000).toISOString();
    assert.deepEqual(computeOverdue("returned", dueAt, lateReturn, dueMs + 10 * dayMs), {
      is_overdue: false,
      overdue_days: 0,
      returned_late: true,
    });
  });
});

describe("loan row mapping", () => {
  it("maps embedded relations and computed fields", () => {
    const payload = toLoanPayload(
      {
        id: "loan-1",
        status: "active",
        borrowed_at: "2026-11-01T01:00:00+00:00",
        due_at: dueAt,
        returned_at: null,
        notes: null,
        return_condition: null,
        return_notes: null,
        created_at: "2026-11-01T01:00:00+00:00",
        updated_at: "2026-11-01T01:00:00+00:00",
        item: { id: "item-1", barcode: "INV-000001", name: "Proyektor", category: { id: "c-1", name: "Elektronik" } },
        borrower: { user_id: "u-1", full_name: "Budi", staff_id: "SIS-01", school_unit: "XI RPL 1" },
        officer: { user_id: "u-2", full_name: "Petugas" },
        return_officer: null,
      },
      dueMs + 3 * dayMs,
    );
    assert.equal(payload.is_overdue, true);
    assert.equal(payload.overdue_days, 3);
    assert.equal(payload.item.category.name, "Elektronik");
    assert.equal(payload.return_officer, null);
  });

  it("rejects unexpected row shapes as dependency errors", () => {
    assert.throws(() => toLoanPayload({ id: "x" }), { name: "DependencyError" });
  });
});

describe("dashboard time buckets (WIB)", () => {
  it("starts weeks on Monday 00:00 WIB", () => {
    // Senin 2026-11-02 06:00 WIB = 2026-11-01T23:00Z (masih Minggu dalam UTC)
    const mondayMorning = Date.parse("2026-11-01T23:00:00Z");
    assert.equal(new Date(startOfSchoolWeek(mondayMorning)).toISOString(), "2026-11-01T17:00:00.000Z");
    assert.equal(new Date(startOfSchoolMonth(mondayMorning)).toISOString(), "2026-10-31T17:00:00.000Z");
  });

  it("groups loans into the requested number of weeks", () => {
    const now = Date.parse("2026-11-07T05:00:00Z"); // Sabtu 7 Nov WIB
    const buckets = buildWeeklyBuckets(
      ["2026-11-06T03:00:00Z", "2026-11-02T00:00:00Z", "2026-10-28T10:00:00Z", "2026-09-01T00:00:00Z"],
      2,
      now,
    );
    assert.deepEqual(buckets, [
      { week_start: "2026-10-26", week_end: "2026-11-01", total: 1 },
      { week_start: "2026-11-02", week_end: "2026-11-08", total: 2 },
    ]);
  });

  it("derives item status from condition", () => {
    assert.equal(statusForCondition("damaged"), "damaged");
    assert.equal(statusForCondition("minor_damage"), "available");
    assert.equal(statusForCondition("good"), "available");
  });
});
