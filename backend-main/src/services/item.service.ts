import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminSupabaseClient } from "../config/supabase.js";
import type { CreateItemInput, ItemListQuery, UpdateItemInput } from "../schemas/item.schema.js";
import type { AuthenticatedUser } from "../types/auth.types.js";
import {
  type ActiveLoanSummary,
  type ConditionLogEvent,
  type ItemCondition,
  type ItemDetailPayload,
  type ItemHistoryPayload,
  type ItemPayload,
  type ItemService,
  statusForCondition,
} from "../types/inventory.types.js";
import { ConflictError, NotFoundError, ValidationError } from "../utils/api-error.js";
import type { Paginated } from "../utils/pagination.js";
import {
  conditionLogSelect,
  itemSelect,
  loanSelect,
  toActiveLoanSummary,
  toConditionLogPayload,
  toItemPayload,
  toLoanPayload,
} from "./inventory.mappers.js";
import { compact, databaseError, fetchPage, isPgError, pgErrorCodes } from "./supabase-helpers.js";

const itemNotFound = "Barang tidak ditemukan";
const duplicateBarcode = "Kode barcode sudah digunakan";
const historyLimit = 100;
const autoBarcodeAttempts = 3;

function categoryMissingError(): ValidationError {
  return new ValidationError("Kategori tidak ditemukan", [
    { path: "category_id", message: "Kategori tidak ditemukan" },
  ]);
}

export class SupabaseItemService implements ItemService {
  public async listItems(query: ItemListQuery): Promise<Paginated<ItemPayload>> {
    const client = createAdminSupabaseClient();
    return fetchPage(
      "items.list",
      query.page,
      query.limit,
      (from, to) => {
        let builder = client.from("items").select(itemSelect, { count: "exact" });
        if (query.q !== undefined) {
          builder = builder.or(
            `name.ilike.%${query.q}%,barcode.ilike.%${query.q}%,location.ilike.%${query.q}%`,
          );
        }
        if (query.category_id !== undefined) builder = builder.eq("category_id", query.category_id);
        if (query.status !== undefined) builder = builder.eq("status", query.status);
        if (query.condition !== undefined) builder = builder.eq("condition", query.condition);
        return builder.order("name").order("id").range(from, to);
      },
      toItemPayload,
    );
  }

  public async getItem(id: string): Promise<ItemDetailPayload> {
    return this.findItemDetail("id", id);
  }

  public async getItemByBarcode(barcode: string): Promise<ItemDetailPayload> {
    return this.findItemDetail("barcode", barcode);
  }

  public async getItemHistory(id: string): Promise<ItemHistoryPayload> {
    const item = await this.getItem(id);
    const client = createAdminSupabaseClient();

    const [loansResult, logsResult] = await Promise.all([
      client
        .from("loans")
        .select(loanSelect)
        .eq("item_id", id)
        .order("borrowed_at", { ascending: false })
        .limit(historyLimit),
      client
        .from("condition_logs")
        .select(conditionLogSelect)
        .eq("item_id", id)
        .order("recorded_at", { ascending: false })
        .limit(historyLimit),
    ]);

    if (loansResult.error !== null) throw databaseError("items.history.loans", loansResult.error);
    if (logsResult.error !== null) throw databaseError("items.history.logs", logsResult.error);

    const nowMs = Date.now();
    return {
      item,
      loans: loansResult.data.map((row: unknown) => toLoanPayload(row, nowMs)),
      condition_logs: logsResult.data.map(toConditionLogPayload),
    };
  }

  public async createItem(input: CreateItemInput, actor: AuthenticatedUser): Promise<ItemDetailPayload> {
    const client = createAdminSupabaseClient();
    const row = {
      name: input.name,
      category_id: input.category_id,
      location: input.location,
      condition: input.condition,
      status: statusForCondition(input.condition),
      acquired_at: input.acquired_at,
      notes: input.notes,
      ...(input.barcode === undefined ? {} : { barcode: input.barcode }),
    };

    // Barcode otomatis (INV-000001) dapat bentrok dengan kode yang diketik manual; coba ulang.
    const attempts = input.barcode === undefined ? autoBarcodeAttempts : 1;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const { data, error } = await client.from("items").insert(row).select(itemSelect).single();

      if (error === null) {
        const item = toItemPayload(data);
        await this.recordCondition(client, item.id, item.condition, "registered", input.notes, actor);
        return { ...item, active_loan: null };
      }
      if (isPgError(error, pgErrorCodes.foreignKeyViolation)) throw categoryMissingError();
      if (!isPgError(error, pgErrorCodes.uniqueViolation)) throw databaseError("items.create", error);
      if (input.barcode !== undefined) throw new ConflictError(duplicateBarcode);
    }
    throw new ConflictError("Gagal membuat kode barcode unik; silakan isi barcode secara manual");
  }

  public async updateItem(
    id: string,
    input: UpdateItemInput,
    actor: AuthenticatedUser,
  ): Promise<ItemDetailPayload> {
    const client = createAdminSupabaseClient();
    const { data: current, error: currentError } = await client
      .from("items")
      .select("id, status, condition")
      .eq("id", id)
      .maybeSingle<{ id: string; status: string; condition: ItemCondition }>();

    if (currentError !== null) throw databaseError("items.update.lookup", currentError);
    if (current === null) throw new NotFoundError(itemNotFound);

    const changesCondition = input.condition !== undefined && input.condition !== current.condition;
    if (changesCondition && current.status === "borrowed") {
      throw new ConflictError(
        "Kondisi barang yang sedang dipinjam hanya dapat diubah melalui pengembalian",
      );
    }

    const patch = compact({
      barcode: input.barcode,
      name: input.name,
      category_id: input.category_id,
      location: input.location,
      acquired_at: input.acquired_at,
      notes: input.notes,
      ...(changesCondition && input.condition !== undefined
        ? { condition: input.condition, status: statusForCondition(input.condition) }
        : {}),
    });

    if (Object.keys(patch).length > 0) {
      let builder = client.from("items").update(patch).eq("id", id);
      // Cegah race: barang dipinjam di antara lookup dan update.
      if (changesCondition) builder = builder.neq("status", "borrowed");
      const { data, error } = await builder.select("id").maybeSingle();

      if (error !== null) {
        if (isPgError(error, pgErrorCodes.uniqueViolation)) throw new ConflictError(duplicateBarcode);
        if (isPgError(error, pgErrorCodes.foreignKeyViolation)) throw categoryMissingError();
        throw databaseError("items.update", error);
      }
      if (data === null) {
        throw changesCondition
          ? new ConflictError("Barang sedang dipinjam; kondisi tidak dapat diubah")
          : new NotFoundError(itemNotFound);
      }
    }

    if (changesCondition && input.condition !== undefined) {
      await this.recordCondition(client, id, input.condition, "updated", input.notes ?? null, actor);
    }

    return this.getItem(id);
  }

  public async deleteItem(id: string): Promise<void> {
    const client = createAdminSupabaseClient();
    const { data, error } = await client.from("items").delete().eq("id", id).select("id").maybeSingle();

    if (error !== null) {
      if (isPgError(error, pgErrorCodes.foreignKeyViolation)) {
        throw new ConflictError("Barang memiliki riwayat peminjaman dan tidak dapat dihapus");
      }
      throw databaseError("items.delete", error);
    }
    if (data === null) throw new NotFoundError(itemNotFound);
  }

  private async findItemDetail(column: "id" | "barcode", value: string): Promise<ItemDetailPayload> {
    const client = createAdminSupabaseClient();
    const { data, error } = await client.from("items").select(itemSelect).eq(column, value).maybeSingle();

    if (error !== null) throw databaseError("items.get", error);
    if (data === null) throw new NotFoundError(itemNotFound);

    const item = toItemPayload(data);
    return { ...item, active_loan: await this.findActiveLoan(client, item.id) };
  }

  private async findActiveLoan(client: SupabaseClient, itemId: string): Promise<ActiveLoanSummary | null> {
    const { data, error } = await client
      .from("loans")
      .select(loanSelect)
      .eq("item_id", itemId)
      .eq("status", "active")
      .maybeSingle();

    if (error !== null) throw databaseError("items.activeLoan", error);
    return data === null ? null : toActiveLoanSummary(toLoanPayload(data));
  }

  private async recordCondition(
    client: SupabaseClient,
    itemId: string,
    condition: ItemCondition,
    event: ConditionLogEvent,
    notes: string | null,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const { error } = await client.from("condition_logs").insert({
      item_id: itemId,
      condition,
      event,
      notes,
      recorded_by: actor.userId,
    });
    if (error !== null) throw databaseError("items.conditionLog", error);
  }
}
