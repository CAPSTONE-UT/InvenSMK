import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import "dotenv/config";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code: string };
}

interface RegisterData {
  user_id: string;
  email: string;
  email_verification_required: boolean;
  session?: LoginData["session"];
}

interface LoginData {
  session: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_at: number;
  };
  user: ProfileData;
}

interface ProfileData {
  user_id: string;
  full_name: string;
  email: string;
  staff_id: string;
  school_unit: string;
  role: string;
  account_status: string;
}

interface HttpResult<T = unknown> {
  status: number;
  body: ApiResponse<T>;
}

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = "ValidPass123!";
const mainEmail = `auth-main-${runId}@example.com`;
const concurrentEmailA = `auth-concurrent-a-${runId}@example.com`;
const concurrentEmailB = `auth-concurrent-b-${runId}@example.com`;
const mainStaffId = `MAIN-${runId}`;
const concurrentStaffId = `RACE-${runId}`;

let server: Server;
let baseUrl: string;
let adminClient: SupabaseClient;
const createdUserIds = new Set<string>();

async function apiRequest<T>(path: string, init?: RequestInit): Promise<HttpResult<T>> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = (await response.json()) as ApiResponse<T>;
  return { status: response.status, body };
}

function jsonRequest(method: string, body: unknown, token?: string): RequestInit {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token !== undefined) headers.authorization = `Bearer ${token}`;
  return { method, headers, body: JSON.stringify(body) };
}

function authorizedRequest(method: string, token: string): RequestInit {
  return { method, headers: { authorization: `Bearer ${token}` } };
}

async function confirmEmail(userId: string): Promise<void> {
  const { error } = await adminClient.auth.admin.updateUserById(userId, { email_confirm: true });
  assert.equal(error, null, `Failed to confirm test email: ${error?.message}`);
}

async function login(email: string): Promise<LoginData> {
  const result = await apiRequest<LoginData>(
    "/api/v1/auth/login",
    jsonRequest("POST", { email, password }),
  );
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.success, true);
  assert.ok(result.body.data);
  return result.body.data;
}

before(async () => {
  assert.ok(process.env.SUPABASE_URL, "SUPABASE_URL is required");
  assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY is required");

  adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { app } = await import("../../src/app.js");
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (adminClient !== undefined && createdUserIds.size > 0) {
    await adminClient.from("revoked_auth_sessions").delete().in("user_id", [...createdUserIds]);
    for (const userId of createdUserIds) {
      await adminClient.auth.admin.deleteUser(userId);
    }
  }

  if (server === undefined) return;
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
});

describe("Authentication and user management integration", () => {
  it("validates registration, login, profile, logout, isolation, and performance", async () => {
    const privilegeInjection = await apiRequest(
      "/api/v1/auth/register",
      jsonRequest("POST", {
        full_name: "Privilege Attempt",
        email: `privilege-${runId}@example.com`,
        password,
        staff_id: `PRIV-${runId}`,
        school_unit: "Gudang",
        role: "admin",
      }),
    );
    assert.equal(privilegeInjection.status, 400);
    assert.equal(privilegeInjection.body.error?.code, "VALIDATION_ERROR");

    const invalidLength = await apiRequest(
      "/api/v1/auth/register",
      jsonRequest("POST", {
        full_name: "A",
        email: `invalid-${runId}@example.com`,
        password: "short",
        staff_id: "X",
        school_unit: "Y",
      }),
    );
    assert.equal(invalidLength.status, 400);

    const registration = await apiRequest<RegisterData>(
      "/api/v1/auth/register",
      jsonRequest("POST", {
        full_name: "Petugas Inventaris Utama",
        email: mainEmail,
        password,
        staff_id: mainStaffId,
        school_unit: "Gudang",
      }),
    );
    assert.equal(registration.status, 201, JSON.stringify(registration.body));
    assert.ok(registration.body.data);
    assert.equal(registration.body.data.email_verification_required, false);
    assert.ok(registration.body.data.session);
    createdUserIds.add(registration.body.data.user_id);
    const mainUserId = registration.body.data.user_id;

    const unverifiedLogin = await apiRequest(
      "/api/v1/auth/login",
      jsonRequest("POST", { email: mainEmail, password }),
    );
    assert.equal(unverifiedLogin.status, 401);
    assert.equal(unverifiedLogin.body.error?.code, "AUTHENTICATION_ERROR");

    const unknownLogin = await apiRequest(
      "/api/v1/auth/login",
      jsonRequest("POST", { email: `unknown-${runId}@example.com`, password }),
    );
    assert.equal(unknownLogin.status, unverifiedLogin.status);
    assert.equal(unknownLogin.body.message, unverifiedLogin.body.message);

    const duplicateEmail = await apiRequest(
      "/api/v1/auth/register",
      jsonRequest("POST", {
        full_name: "Duplicate Email",
        email: mainEmail.toUpperCase(),
        password,
        staff_id: `DUP-${runId}`,
        school_unit: "Laboratorium",
      }),
    );
    assert.equal(duplicateEmail.status, 409, JSON.stringify(duplicateEmail.body));

    const concurrentPayload = (email: string) => ({
      full_name: "Concurrent User",
      email,
      password,
      staff_id: concurrentStaffId,
      school_unit: "Perpustakaan",
    });
    const concurrentResults = await Promise.all([
      apiRequest<RegisterData>(
        "/api/v1/auth/register",
        jsonRequest("POST", concurrentPayload(concurrentEmailA)),
      ),
      apiRequest<RegisterData>(
        "/api/v1/auth/register",
        jsonRequest("POST", concurrentPayload(concurrentEmailB)),
      ),
    ]);
    assert.deepEqual(
      concurrentResults.map((result) => result.status).sort(),
      [201, 409],
      JSON.stringify(concurrentResults.map((result) => result.body)),
    );
    const concurrentWinner = concurrentResults.find((result) => result.status === 201);
    assert.ok(concurrentWinner?.body.data);
    const secondaryUserId = concurrentWinner.body.data.user_id;
    const secondaryEmail = concurrentWinner.body.data.email;
    createdUserIds.add(secondaryUserId);

    await confirmEmail(mainUserId);
    await confirmEmail(secondaryUserId);

    const mainSessionA = await login(mainEmail);
    const mainSessionB = await login(mainEmail);
    const secondarySession = await login(secondaryEmail);

    const mainProfile = await apiRequest<ProfileData>(
      "/api/v1/auth/profile",
      authorizedRequest("GET", mainSessionA.session.access_token),
    );
    assert.equal(mainProfile.status, 200);
    assert.deepEqual(Object.keys(mainProfile.body.data ?? {}).sort(), [
      "account_status",
      "email",
      "full_name",
      "role",
      "school_unit",
      "staff_id",
      "user_id",
    ]);
    assert.equal(mainProfile.body.data?.user_id, mainUserId);
    assert.equal(mainProfile.body.data?.staff_id, mainStaffId);
    assert.equal(mainProfile.body.data?.role, "staff");

    const secondaryProfile = await apiRequest<ProfileData>(
      "/api/v1/auth/profile",
      authorizedRequest("GET", secondarySession.session.access_token),
    );
    assert.equal(secondaryProfile.status, 200);
    assert.equal(secondaryProfile.body.data?.user_id, secondaryUserId);
    assert.notEqual(secondaryProfile.body.data?.user_id, mainProfile.body.data?.user_id);

    const missingToken = await apiRequest("/api/v1/auth/profile");
    assert.equal(missingToken.status, 401);
    const malformedToken = await apiRequest(
      "/api/v1/auth/profile",
      authorizedRequest("GET", "malformed.token.value"),
    );
    assert.equal(malformedToken.status, 401);
    const tamperedExpiredToken = `${mainSessionA.session.access_token.split(".")[0]}.${Buffer.from(
      JSON.stringify({ session_id: crypto.randomUUID(), exp: 1 }),
    ).toString("base64url")}.invalid-signature`;
    const expiredToken = await apiRequest(
      "/api/v1/auth/profile",
      authorizedRequest("GET", tamperedExpiredToken),
    );
    assert.equal(expiredToken.status, 401);

    const { error: deactivateError } = await adminClient
      .from("school_staff_profiles")
      .update({ account_status: "inactive" })
      .eq("user_id", mainUserId);
    assert.equal(deactivateError, null);
    const inactiveProfile = await apiRequest(
      "/api/v1/auth/profile",
      authorizedRequest("GET", mainSessionA.session.access_token),
    );
    assert.equal(inactiveProfile.status, 401);
    const inactiveLogin = await apiRequest(
      "/api/v1/auth/login",
      jsonRequest("POST", { email: mainEmail, password }),
    );
    assert.equal(inactiveLogin.status, 401);
    const { error: reactivateError } = await adminClient
      .from("school_staff_profiles")
      .update({ account_status: "active" })
      .eq("user_id", mainUserId);
    assert.equal(reactivateError, null);

    const { error: deleteProfileError } = await adminClient
      .from("school_staff_profiles")
      .delete()
      .eq("user_id", secondaryUserId);
    assert.equal(deleteProfileError, null);
    const missingProfile = await apiRequest(
      "/api/v1/auth/profile",
      authorizedRequest("GET", secondarySession.session.access_token),
    );
    assert.equal(missingProfile.status, 404);

    const logout = await apiRequest(
      "/api/v1/auth/logout",
      authorizedRequest("POST", mainSessionA.session.access_token),
    );
    assert.equal(logout.status, 200, JSON.stringify(logout.body));
    const revokedReuse = await apiRequest(
      "/api/v1/auth/profile",
      authorizedRequest("GET", mainSessionA.session.access_token),
    );
    assert.equal(revokedReuse.status, 401);
    const repeatedLogout = await apiRequest(
      "/api/v1/auth/logout",
      authorizedRequest("POST", mainSessionA.session.access_token),
    );
    assert.equal(repeatedLogout.status, 401);
    const otherDevice = await apiRequest(
      "/api/v1/auth/profile",
      authorizedRequest("GET", mainSessionB.session.access_token),
    );
    assert.equal(otherDevice.status, 200);

    const performanceSession = await login(mainEmail);
    const durations: number[] = [];
    const loginStartedAt = performance.now();
    const performanceLogin = await login(mainEmail);
    durations.push(performance.now() - loginStartedAt);

    for (let index = 0; index < 998; index += 1) {
      const startedAt = performance.now();
      const profile = await apiRequest(
        "/api/v1/auth/profile",
        authorizedRequest("GET", performanceSession.session.access_token),
      );
      durations.push(performance.now() - startedAt);
      assert.equal(profile.status, 200, `Performance request ${index + 1} failed`);
    }

    const logoutStartedAt = performance.now();
    const performanceLogout = await apiRequest(
      "/api/v1/auth/logout",
      authorizedRequest("POST", performanceLogin.session.access_token),
    );
    durations.push(performance.now() - logoutStartedAt);
    assert.equal(performanceLogout.status, 200);

    const sortedDurations = [...durations].sort((left, right) => left - right);
    const withinTarget = durations.filter((duration) => duration < 2_000).length;
    const withinTargetPercent = (withinTarget / durations.length) * 100;
    const p99Index = Math.min(Math.ceil(sortedDurations.length * 0.99) - 1, sortedDurations.length - 1);
    const p99 = sortedDurations[p99Index] ?? 0;
    const max = sortedDurations.at(-1) ?? 0;
    assert.ok(withinTargetPercent >= 99, `Only ${withinTargetPercent.toFixed(2)}% completed under 2s`);

    const report = `# Authentication Validation Results\n\n` +
      `**Executed**: ${new Date().toISOString()}\n\n` +
      `## Functional Validation\n\n` +
      `- Register, unverified login rejection, duplicate email/staff ID, and privilege injection: PASS\n` +
      `- Login, profile projection, inactive/missing profile, and cross-user isolation: PASS\n` +
      `- Current-session logout, immediate token rejection, and other-device preservation: PASS\n\n` +
      `## Performance Validation\n\n` +
      `- Sequential operations: ${durations.length}\n` +
      `- Operations under 2 seconds: ${withinTarget} (${withinTargetPercent.toFixed(2)}%)\n` +
      `- p99: ${p99.toFixed(2)} ms\n` +
      `- Maximum: ${max.toFixed(2)} ms\n` +
      `- Target (at least 99% under 2 seconds): ${withinTargetPercent >= 99 ? "PASS" : "FAIL"}\n`;
    await writeFile("specs/001-school-user-auth/validation-results.md", report, "utf8");
  });
});
