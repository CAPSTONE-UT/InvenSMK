import type { PostgrestError } from "@supabase/supabase-js";

import { createAdminSupabaseClient } from "../config/supabase.js";
import {
  type CreateLoanInput,
  type LoanListQuery,
  type LoanStatusFilter,
  type MyLoanQuery,
  type ReturnLoanInput,
  schoolUtcOffset,
} from "../schemas/loan.schema.js";
import { type AuthenticatedUser, roleGroups } from "../types/auth.types.js";
import type { LoanPayload, LoanService } from "../types/inventory.types.js";
import { type ApiError, ConflictError, NotFoundError, ValidationError } from "../utils/api-error.js";
import type { Paginated } from "../utils/pagination.js";
import { loanSelect, toActiveLoanSummary, toLoanPayload } from "./inventory.mappers.js";
import { databaseError, fetchPage, isPgError, pgErrorCodes } from "./supabase-helpers.js";

const loanNotFound = "Data peminjaman tidak ditemukan";

/** Peminjaman aktif/terlambat diurutkan dari jatuh tempo terdekat; lainnya dari yang terbaru. */
function sortsByDueDate(status: LoanStatusFilter): boolean {
  return status === "active" || status === "overdue";
}

export class SupabaseLoanService implements LoanService {
  public async listLoans(query: LoanListQuery): Promise<Paginated<LoanPayload>> {
    const client = createAdminSupabaseClient();
    const now = new Date();
    const nowIso = now.toISOString();

    return fetchPage(
      "loans.list",
      query.page,
      query.limit,
      (from, to) => {
        let builder = client.from("loans").select(loanSelect, { count: "exact" });
        if (query.status === "active" || query.status === "overdue") builder = builder.eq("status", "active");
        if (query.status === "overdue") builder = builder.lt("due_at", nowIso);
        if (query.status === "returned") builder = builder.eq("status", "returned");
        if (query.item_id !== undefined) builder = builder.eq("item_id", query.item_id);
        if (query.borrower_id !== undefined) builder = builder.eq("borrower_id", query.borrower_id);
        if (query.borrowed_from !== undefined) {
          builder = builder.gte("borrowed_at", `${query.borrowed_from}T00:00:00${schoolUtcOffset}`);
        }
        if (query.borrowed_to !== undefined) {
          builder = builder.lte("borrowed_at", `${query.borrowed_to}T23:59:59.999${schoolUtcOffset}`);
        }
        const ordered = sortsByDueDate(query.status)
          ? builder.order("due_at", { ascending: true })
          : builder.order("borrowed_at", { ascending: false });
        return ordered.order("id").range(from, to);
      },
      (row) => toLoanPayload(row, now.getTime()),
    );
  }

  public async listMyLoans(identity: AuthenticatedUser, query: MyLoanQuery): Promise<Paginated<LoanPayload>> {
    return this.listLoans({ ...query, borrower_id: identity.userId });
  }

  public async getLoan(id: string, identity: AuthenticatedUser): Promise<LoanPayload> {
    const loan = await this.findLoan(id);
    const isOperator = (roleGroups.operators as readonly string[]).includes(identity.role);
    // Peminjam hanya boleh melihat miliknya; 404 agar keberadaan data lain tidak bocor.
    if (!isOperator && loan.borrower.user_id !== identity.userId) throw new NotFoundError(loanNotFound);
    return loan;
  }

  public async createLoan(input: CreateLoanInput, actor: AuthenticatedUser): Promise<LoanPayload> {
    const client = createAdminSupabaseClient();
    const { data, error } = await client.rpc("create_loan", {
      p_item_id: input.item_id,
      p_borrower_id: input.borrower_id,
      p_officer_id: actor.userId,
      p_due_at: input.due_at,
      p_notes: input.notes,
    });

    if (error !== null) throw await this.mapCreateLoanError(error, input.item_id);
    if (typeof data !== "string") throw databaseError("loans.create", new Error("Unexpected RPC result"));
    return this.findLoan(data);
  }

  public async returnLoan(id: string, input: ReturnLoanInput, actor: AuthenticatedUser): Promise<LoanPayload> {
    const client = createAdminSupabaseClient();
    const { error } = await client.rpc("return_loan", {
      p_loan_id: id,
      p_officer_id: actor.userId,
      p_condition: input.condition,
      p_notes: input.notes,
    });

    if (error !== null) {
      if (error.message.includes("LOAN_NOT_FOUND")) throw new NotFoundError(loanNotFound);
      if (error.message.includes("LOAN_ALREADY_RETURNED")) {
        throw new ConflictError("Peminjaman sudah dikembalikan");
      }
      throw databaseError("loans.return", error);
    }
    return this.findLoan(id);
  }

  private async findLoan(id: string): Promise<LoanPayload> {
    const client = createAdminSupabaseClient();
    const { data, error } = await client.from("loans").select(loanSelect).eq("id", id).maybeSingle();

    if (error !== null) throw databaseError("loans.get", error);
    if (data === null) throw new NotFoundError(loanNotFound);
    return toLoanPayload(data);
  }

  private async mapCreateLoanError(error: PostgrestError, itemId: string): Promise<ApiError> {
    const message = error.message;

    if (message.includes("ITEM_NOT_FOUND")) return new NotFoundError("Barang tidak ditemukan");
    if (message.includes("ITEM_NOT_AVAILABLE") || isPgError(error, pgErrorCodes.uniqueViolation)) {
      return this.itemNotAvailableError(itemId);
    }
    if (message.includes("BORROWER_NOT_FOUND")) {
      return new ValidationError("Peminjam tidak ditemukan", [
        { path: "borrower_id", message: "Peminjam tidak ditemukan" },
      ]);
    }
    if (message.includes("BORROWER_INACTIVE")) {
      return new ValidationError("Akun peminjam tidak aktif", [
        { path: "borrower_id", message: "Akun peminjam tidak aktif" },
      ]);
    }
    if (message.includes("INVALID_DUE_DATE")) {
      return new ValidationError("Jatuh tempo tidak valid", [
        { path: "due_at", message: "Jatuh tempo harus setelah waktu sekarang" },
      ]);
    }
    return databaseError("loans.create", error);
  }

  /** U-09: penolakan menyertakan status barang dan data peminjaman aktif bila ada. */
  private async itemNotAvailableError(itemId: string): Promise<ApiError> {
    const client = createAdminSupabaseClient();
    const [itemResult, loanResult] = await Promise.all([
      client.from("items").select("status").eq("id", itemId).maybeSingle<{ status: string }>(),
      client.from("loans").select(loanSelect).eq("item_id", itemId).eq("status", "active").maybeSingle(),
    ]);

    const activeLoan =
      loanResult.error === null && loanResult.data !== null
        ? toActiveLoanSummary(toLoanPayload(loanResult.data))
        : null;

    return new ConflictError(
      activeLoan === null ? "Barang tidak tersedia untuk dipinjam" : "Barang sedang dipinjam",
      {
        item_status: itemResult.error === null ? (itemResult.data?.status ?? null) : null,
        active_loan: activeLoan,
      },
    );
  }
}
