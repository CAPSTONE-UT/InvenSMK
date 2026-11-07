import { z } from "zod";

import { createAdminSupabaseClient } from "../config/supabase.js";
import type { CreateUserInput, UpdateUserInput, UserListQuery } from "../schemas/user.schema.js";
import { accountStatuses, type AuthenticatedUser, userRoles } from "../types/auth.types.js";
import type { ManagedUserPayload, UserService } from "../types/inventory.types.js";
import {
  AuthorizationError,
  ConflictError,
  DependencyError,
  NotFoundError,
} from "../utils/api-error.js";
import type { Paginated } from "../utils/pagination.js";
import {
  compact,
  databaseError,
  databaseUnavailableMessage,
  fetchPage,
  isPgError,
  pgErrorCodes,
} from "./supabase-helpers.js";

const userSelect =
  "user_id, full_name, email, staff_id, school_unit, role, account_status, created_at, updated_at";
const userNotFound = "Pengguna tidak ditemukan";

const userRow = z.object({
  user_id: z.string(),
  full_name: z.string(),
  email: z.string(),
  staff_id: z.string(),
  school_unit: z.string(),
  role: z.enum(userRoles),
  account_status: z.enum(accountStatuses),
  created_at: z.string(),
  updated_at: z.string(),
});

function toManagedUserPayload(row: unknown): ManagedUserPayload {
  const result = userRow.safeParse(row);
  if (!result.success) {
    console.error("[users] unexpected row shape:", result.error.issues);
    throw new DependencyError(databaseUnavailableMessage);
  }
  return result.data;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export class SupabaseUserService implements UserService {
  public async listUsers(query: UserListQuery): Promise<Paginated<ManagedUserPayload>> {
    const client = createAdminSupabaseClient();
    return fetchPage(
      "users.list",
      query.page,
      query.limit,
      (from, to) => {
        let builder = client.from("user_directory").select(userSelect, { count: "exact" });
        if (query.q !== undefined) {
          builder = builder.or(
            `full_name.ilike.%${query.q}%,email.ilike.%${query.q}%,staff_id.ilike.%${query.q}%`,
          );
        }
        if (query.role !== undefined) builder = builder.eq("role", query.role);
        if (query.account_status !== undefined) builder = builder.eq("account_status", query.account_status);
        return builder.order("full_name").order("user_id").range(from, to);
      },
      toManagedUserPayload,
    );
  }

  public async getUser(id: string): Promise<ManagedUserPayload> {
    const client = createAdminSupabaseClient();
    const { data, error } = await client
      .from("user_directory")
      .select(userSelect)
      .eq("user_id", id)
      .maybeSingle();

    if (error !== null) throw databaseError("users.get", error);
    if (data === null) throw new NotFoundError(userNotFound);
    return toManagedUserPayload(data);
  }

  /** Admin membuat akun (misalnya untuk siswa) tanpa perlu verifikasi email. */
  public async createUser(input: CreateUserInput): Promise<ManagedUserPayload> {
    const client = createAdminSupabaseClient();

    const { data: existingStaff, error: lookupError } = await client
      .from("school_staff_profiles")
      .select("user_id")
      .ilike("staff_id", escapeLikePattern(input.staff_id))
      .limit(1)
      .maybeSingle();
    if (lookupError !== null) throw databaseError("users.create.lookup", lookupError);
    if (existingStaff !== null) throw new ConflictError("ID personel sudah digunakan");

    const { data, error } = await client.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.full_name,
        staff_id: input.staff_id,
        school_unit: input.school_unit,
      },
    });

    if (error !== null) {
      console.error("[users.create] auth error:", { status: error.status, code: error.code });
      if (error.status === 422 || /already|exist|registered|database error/i.test(error.message)) {
        throw new ConflictError("Email atau ID personel sudah digunakan");
      }
      throw new DependencyError(databaseUnavailableMessage);
    }

    // Trigger database membuat profil dengan role default 'staff'.
    if (input.role !== "staff") {
      const { error: roleError } = await client
        .from("school_staff_profiles")
        .update({ role: input.role })
        .eq("user_id", data.user.id);
      if (roleError !== null) throw databaseError("users.create.role", roleError);
    }

    return this.getUser(data.user.id);
  }

  public async updateUser(
    id: string,
    input: UpdateUserInput,
    actor: AuthenticatedUser,
  ): Promise<ManagedUserPayload> {
    const isSelf = id === actor.userId;
    const demotesSelf = input.role !== undefined && input.role !== actor.role;
    const deactivatesSelf = input.account_status === "inactive";
    if (isSelf && (demotesSelf || deactivatesSelf)) {
      throw new AuthorizationError("Anda tidak dapat mengubah peran atau menonaktifkan akun sendiri");
    }

    const client = createAdminSupabaseClient();
    const { data, error } = await client
      .from("school_staff_profiles")
      .update(
        compact({
          full_name: input.full_name,
          school_unit: input.school_unit,
          role: input.role,
          account_status: input.account_status,
        }),
      )
      .eq("user_id", id)
      .select("user_id")
      .maybeSingle();

    if (error !== null) {
      if (isPgError(error, pgErrorCodes.checkViolation)) throw new ConflictError("Data pengguna tidak valid");
      throw databaseError("users.update", error);
    }
    if (data === null) throw new NotFoundError(userNotFound);
    return this.getUser(id);
  }
}
