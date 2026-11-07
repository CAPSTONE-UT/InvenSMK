import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createCategorySchema, updateCategorySchema } from "../../src/schemas/category.schema.js";
import { idParamSchema, searchTermSchema } from "../../src/schemas/common.schema.js";
import {
  barcodeParamSchema,
  createItemSchema,
  itemListQuerySchema,
  updateItemSchema,
} from "../../src/schemas/item.schema.js";
import {
  createLoanSchema,
  loanListQuerySchema,
  returnLoanSchema,
} from "../../src/schemas/loan.schema.js";
import { updateUserSchema } from "../../src/schemas/user.schema.js";

const categoryId = "6f1c2b3a-4d5e-4f60-8a71-92b3c4d5e6f7";
const itemId = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const borrowerId = "9a8b7c6d-5e4f-4a3b-9c1d-0e1f2a3b4c5d";

function isoDateFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

describe("item schemas", () => {
  it("normalizes barcode, applies defaults, and turns blank text into null", () => {
    const result = createItemSchema.parse({
      barcode: "  inv-rpl-0012 ",
      name: " Laptop Asus A14 ",
      category_id: categoryId,
      location: "   ",
    });

    assert.deepEqual(result, {
      barcode: "INV-RPL-0012",
      name: "Laptop Asus A14",
      category_id: categoryId,
      location: null,
      condition: "good",
      acquired_at: null,
      notes: null,
    });
  });

  it("rejects invalid barcodes, unknown fields, and bad category ids", () => {
    assert.equal(createItemSchema.safeParse({ barcode: "AB", name: "Laptop", category_id: categoryId }).success, false);
    assert.equal(
      createItemSchema.safeParse({ barcode: "INV 001", name: "Laptop", category_id: categoryId }).success,
      false,
    );
    assert.equal(
      createItemSchema.safeParse({ name: "Laptop", category_id: categoryId, status: "borrowed" }).success,
      false,
    );
    assert.equal(createItemSchema.safeParse({ name: "Laptop", category_id: "abc" }).success, false);
    assert.equal(barcodeParamSchema.parse({ code: "inv-000001" }).code, "INV-000001");
  });

  it("requires at least one field on update", () => {
    assert.equal(updateItemSchema.safeParse({}).success, false);
    assert.deepEqual(updateItemSchema.parse({ condition: "damaged" }), { condition: "damaged" });
    assert.equal(updateCategorySchema.safeParse({}).success, false);
    assert.equal(updateUserSchema.safeParse({}).success, false);
  });

  it("coerces list query values and enforces limits", () => {
    assert.deepEqual(itemListQuerySchema.parse({}), { page: 1, limit: 20 });
    assert.deepEqual(itemListQuerySchema.parse({ page: "2", limit: "50", status: "borrowed" }), {
      page: 2,
      limit: 50,
      status: "borrowed",
    });
    assert.equal(itemListQuerySchema.safeParse({ limit: "101" }).success, false);
    assert.equal(itemListQuerySchema.safeParse({ page: "0" }).success, false);
  });
});

describe("loan schemas", () => {
  it("accepts a date-only due date as end of day WIB", () => {
    const dueDate = isoDateFromNow(3);
    const result = createLoanSchema.parse({ item_id: itemId, borrower_id: borrowerId, due_at: dueDate });
    assert.equal(result.due_at, new Date(`${dueDate}T23:59:59+07:00`).toISOString());
    assert.equal(result.notes, null);
  });

  it("rejects past, malformed, or far-future due dates (BVA)", () => {
    const base = { item_id: itemId, borrower_id: borrowerId };
    assert.equal(createLoanSchema.safeParse({ ...base, due_at: "2020-01-01" }).success, false);
    assert.equal(
      createLoanSchema.safeParse({ ...base, due_at: new Date(Date.now() - 60_000).toISOString() }).success,
      false,
    );
    assert.equal(createLoanSchema.safeParse({ ...base, due_at: "besok" }).success, false);
    assert.equal(createLoanSchema.safeParse({ ...base, due_at: isoDateFromNow(400) }).success, false);
  });

  it("maps Indonesian status aliases", () => {
    assert.equal(loanListQuerySchema.parse({ status: "terlambat" }).status, "overdue");
    assert.equal(loanListQuerySchema.parse({ status: "aktif" }).status, "active");
    assert.equal(loanListQuerySchema.parse({ status: "selesai" }).status, "returned");
    assert.equal(loanListQuerySchema.parse({}).status, "all");
    assert.equal(loanListQuerySchema.safeParse({ status: "lost" }).success, false);
  });

  it("validates date range order", () => {
    assert.equal(
      loanListQuerySchema.safeParse({ borrowed_from: "2026-11-10", borrowed_to: "2026-11-01" }).success,
      false,
    );
    assert.equal(
      loanListQuerySchema.safeParse({ borrowed_from: "2026-11-01", borrowed_to: "2026-11-10" }).success,
      true,
    );
  });

  it("requires a valid return condition", () => {
    assert.deepEqual(returnLoanSchema.parse({ condition: "damaged" }), { condition: "damaged", notes: null });
    assert.equal(returnLoanSchema.safeParse({ condition: "broken" }).success, false);
    assert.equal(returnLoanSchema.safeParse({}).success, false);
  });
});

describe("common schemas", () => {
  it("strips PostgREST filter characters from search terms", () => {
    assert.equal(searchTermSchema.parse("laptop,name.eq.x)"), "laptopname.eq.x");
    assert.equal(searchTermSchema.parse("  %%  "), undefined);
    assert.equal(idParamSchema.safeParse({ id: "not-a-uuid" }).success, false);
  });

  it("validates category payloads", () => {
    assert.deepEqual(createCategorySchema.parse({ name: " Komputer " }), { name: "Komputer", description: null });
    assert.equal(createCategorySchema.safeParse({ name: "K" }).success, false);
  });
});
