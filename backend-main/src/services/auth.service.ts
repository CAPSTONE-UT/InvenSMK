import { z } from "zod";

import {
  createAdminSupabaseClient,
  createPublicSupabaseClient,
} from "../config/supabase.js";
import {
  accountStatuses,
  type AuthenticatedUser,
  type AuthService,
  type LoginInput,
  type LoginResult,
  type RefreshInput,
  type RegisterInput,
  type RegisterResult,
  type UserProfile,
  userRoles,
} from "../types/auth.types.js";
import {
  AuthenticationError,
  ConflictError,
  DependencyError,
  NotFoundError,
} from "../utils/api-error.js";

const profileRowSchema = z.object({
  user_id: z.uuid(),
  full_name: z.string(),
  staff_id: z.string(),
  school_unit: z.string(),
  role: z.enum(userRoles),
  account_status: z.enum(accountStatuses),
});

const tokenClaimsSchema = z.object({
  session_id: z.uuid(),
  exp: z.number().int().positive(),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function decodeVerifiedClaims(accessToken: string): {
  sessionId: string;
  expiresAt: number;
} {
  const encodedPayload = accessToken.split(".")[1];
  if (encodedPayload === undefined) throw new AuthenticationError();

  try {
    const rawClaims: unknown = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
    const claims = tokenClaimsSchema.parse(rawClaims);
    return { sessionId: claims.session_id, expiresAt: claims.exp };
  } catch {
    throw new AuthenticationError();
  }
}

export class SupabaseAuthService implements AuthService {
  public async register(input: RegisterInput): Promise<RegisterResult> {
    const adminClient = createAdminSupabaseClient();
    const normalizedEmail = normalizeEmail(input.email);

    const { data: existingStaff, error: staffLookupError } = await adminClient
      .from("school_staff_profiles")
      .select("user_id")
      .ilike("staff_id", input.staffId)
      .limit(1)
      .maybeSingle();

    if (staffLookupError !== null) {
      console.log("Staff lookup error:", staffLookupError);
      console.error("Staff lookup failed:", {
        message: staffLookupError.message,
        code: staffLookupError.code,
        details: staffLookupError.details,
        hint: staffLookupError.hint,
      });
      throw new DependencyError();
    }
    if (existingStaff !== null) throw new ConflictError();

    const publicClient = createPublicSupabaseClient();
    const { data, error } = await publicClient.auth.signUp({
      email: normalizedEmail,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName,
          staff_id: input.staffId,
          school_unit: input.schoolUnit,
        },
      },
    });

    if (error !== null) {
      console.error("Supabase registration failed:", {
        status: error.status,
        message: error.message,
        code: error.code,
      });
      if (
        error.status === 400 ||
        error.status === 422 ||
        /already|exist|saving new user/i.test(error.message)
      ) {
        console.log("Registration conflict error:", error);
        throw new ConflictError();
      }
      throw new DependencyError();
    }

    if (data.user === null) throw new DependencyError();

    const session =
      data.session === null
        ? null
        : data.session.expires_at === undefined
          ? (() => {
              throw new DependencyError();
            })()
          : {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              token_type: "bearer" as const,
              expires_at: data.session.expires_at,
            };

    return {
      userId: data.user.id,
      email: data.user.email ?? normalizedEmail,
      emailVerificationRequired: session === null,
      ...(session === null
        ? {}
        : {
            session,
          }),
    };
  }

  public async login(input: LoginInput): Promise<LoginResult> {
    const publicClient = createPublicSupabaseClient();
    const { data, error } = await publicClient.auth.signInWithPassword({
      email: normalizeEmail(input.email),
      password: input.password,
    });

    if (error !== null || data.user === null || data.session === null) {
      console.log("Login error:", error);
      throw new AuthenticationError();
    }

    const profile = await this.findProfile(
      data.user.id,
      data.user.email ?? normalizeEmail(input.email),
    );
    if (profile === null || profile.accountStatus !== "active") {
      await this.revokeProviderSession(data.session.access_token);
      throw new AuthenticationError();
    }

    if (data.session.expires_at === undefined) {
      await this.revokeProviderSession(data.session.access_token);
      throw new DependencyError();
    }

    return {
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        token_type: "bearer",
        expires_at: data.session.expires_at,
      },
      user: profile,
    };
  }

  public async refresh(input: RefreshInput): Promise<LoginResult> {
    const publicClient = createPublicSupabaseClient();
    const { data, error } = await publicClient.auth.refreshSession({
      refresh_token: input.refreshToken,
    });

    if (error !== null || data.user === null || data.session === null) {
      throw new AuthenticationError();
    }

    const profile = await this.findProfile(data.user.id, data.user.email ?? "");
    if (profile === null || profile.accountStatus !== "active") {
      await this.revokeProviderSession(data.session.access_token);
      throw new AuthenticationError();
    }

    if (data.session.expires_at === undefined) {
      await this.revokeProviderSession(data.session.access_token);
      throw new DependencyError();
    }

    return {
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        token_type: "bearer",
        expires_at: data.session.expires_at,
      },
      user: profile,
    };
  }

  public async authenticate(accessToken: string): Promise<AuthenticatedUser> {
    const publicClient = createPublicSupabaseClient();
    const { data, error } = await publicClient.auth.getUser(accessToken);
    if (error !== null || data.user === null || data.user.email === undefined) {
      throw new AuthenticationError();
    }

    const { sessionId, expiresAt } = decodeVerifiedClaims(accessToken);
    if (expiresAt <= Math.floor(Date.now() / 1000))
      throw new AuthenticationError();

    const adminClient = createAdminSupabaseClient();
    const { data: revokedSession, error: revocationError } = await adminClient
      .from("revoked_auth_sessions")
      .select("session_id")
      .eq("session_id", sessionId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (revocationError !== null) throw new DependencyError();
    if (revokedSession !== null) throw new AuthenticationError();

    const profile = await this.findProfile(data.user.id, data.user.email);
    if (profile === null)
      throw new NotFoundError("Profil personel tidak ditemukan");
    if (profile.accountStatus !== "active") throw new AuthenticationError();

    return {
      userId: data.user.id,
      email: data.user.email,
      role: profile.role,
      accountStatus: profile.accountStatus,
      sessionId,
      expiresAt,
      accessToken,
    };
  }

  public async getCurrentProfile(
    identity: AuthenticatedUser,
  ): Promise<UserProfile> {
    const profile = await this.findProfile(identity.userId, identity.email);
    if (profile === null)
      throw new NotFoundError("Profil personel tidak ditemukan");
    if (profile.accountStatus !== "active") throw new AuthenticationError();
    return profile;
  }

  public async logout(identity: AuthenticatedUser): Promise<void> {
    const adminClient = createAdminSupabaseClient();
    const now = new Date().toISOString();

    const { error: cleanupError } = await adminClient
      .from("revoked_auth_sessions")
      .delete()
      .lte("expires_at", now);
    if (cleanupError !== null) throw new DependencyError();

    const { error: revokeRecordError } = await adminClient
      .from("revoked_auth_sessions")
      .upsert(
        {
          session_id: identity.sessionId,
          user_id: identity.userId,
          expires_at: new Date(identity.expiresAt * 1000).toISOString(),
          revoked_at: now,
        },
        { onConflict: "session_id" },
      );
    if (revokeRecordError !== null) throw new DependencyError();

    const { error: signOutError } = await adminClient.auth.admin.signOut(
      identity.accessToken,
      "local",
    );
    if (signOutError !== null) throw new DependencyError();
  }

  private async findProfile(
    userId: string,
    email: string,
  ): Promise<UserProfile | null> {
    const adminClient = createAdminSupabaseClient();
    const { data, error } = await adminClient
      .from("school_staff_profiles")
      .select("user_id, full_name, staff_id, school_unit, role, account_status")
      .eq("user_id", userId)
      .maybeSingle();

    if (error !== null) throw new DependencyError();
    if (data === null) return null;

    const parsedRow = profileRowSchema.safeParse(data as unknown);
    if (!parsedRow.success) throw new DependencyError();

    return {
      userId: parsedRow.data.user_id,
      fullName: parsedRow.data.full_name,
      email,
      staffId: parsedRow.data.staff_id,
      schoolUnit: parsedRow.data.school_unit,
      role: parsedRow.data.role,
      accountStatus: parsedRow.data.account_status,
    };
  }

  private async revokeProviderSession(accessToken: string): Promise<void> {
    const adminClient = createAdminSupabaseClient();
    await adminClient.auth.admin.signOut(accessToken, "local");
  }
}
