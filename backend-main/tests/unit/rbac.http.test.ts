import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, it } from "node:test";

process.env.PORT = "3000";
process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const { createApp } = await import("../../src/app.js");
const { AuthenticationError, ConflictError } = await import("../../src/utils/api-error.js");

type Role = "admin" | "inventory_officer" | "staff";

const ids = {
  admin: "11111111-1111-4111-8111-111111111111",
  inventory_officer: "22222222-2222-4222-8222-222222222222",
  staff: "33333333-3333-4333-8333-333333333333",
  item: "44444444-4444-4444-8444-444444444444",
  category: "55555555-5555-4555-8555-555555555555",
  loan: "66666666-6666-4666-8666-666666666666",
} as const;

const tokens: Record<string, Role> = {
  "admin-token": "admin",
  "officer-token": "inventory_officer",
  "staff-token": "staff",
};

/** Mencatat panggilan service agar test dapat memeriksa input yang sudah divalidasi. */
const calls: { method: string; args: unknown[] }[] = [];
function record(method: string, result: unknown = {}) {
  return async (...args: unknown[]) => {
    calls.push({ method, args });
    return result;
  };
}

const emptyPage = { items: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } };

const fakeAuthService = {
  register: record("register"),
  login: record("login"),
  refresh: record("refresh", {
    session: { access_token: "new", refresh_token: "new-refresh", token_type: "bearer", expires_at: 1893456000 },
    user: {
      userId: ids.staff,
      fullName: "Budi",
      email: "staff@example.com",
      staffId: "SIS-01",
      schoolUnit: "XI RPL 1",
      role: "staff",
      accountStatus: "active",
    },
  }),
  getCurrentProfile: record("getCurrentProfile"),
  logout: record("logout"),
  async authenticate(accessToken: string) {
    const role = tokens[accessToken];
    if (role === undefined) throw new AuthenticationError();
    return {
      userId: ids[role],
      email: `${role}@example.com`,
      role,
      accountStatus: "active" as const,
      sessionId: "77777777-7777-4777-8777-777777777777",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      accessToken,
    };
  },
};

const app = createApp({
  authService: fakeAuthService,
  categoryService: {
    listCategories: record("listCategories", emptyPage),
    getCategory: record("getCategory"),
    createCategory: record("createCategory", { id: ids.category }),
    updateCategory: record("updateCategory"),
    deleteCategory: record("deleteCategory", undefined),
  },
  itemService: {
    listItems: record("listItems", emptyPage),
    getItem: record("getItem", { id: ids.item }),
    getItemByBarcode: record("getItemByBarcode", { id: ids.item }),
    getItemHistory: record("getItemHistory"),
    createItem: record("createItem", { id: ids.item }),
    updateItem: record("updateItem"),
    deleteItem: record("deleteItem", undefined),
  },
  loanService: {
    listLoans: record("listLoans", emptyPage),
    listMyLoans: record("listMyLoans", emptyPage),
    getLoan: record("getLoan", { id: ids.loan }),
    async createLoan(...args: unknown[]) {
      calls.push({ method: "createLoan", args });
      if ((args[0] as { item_id: string }).item_id === ids.loan) {
        throw new ConflictError("Barang sedang dipinjam", { item_status: "borrowed", active_loan: null });
      }
      return { id: ids.loan };
    },
    returnLoan: record("returnLoan", { id: ids.loan }),
  },
  userService: {
    listUsers: record("listUsers", emptyPage),
    getUser: record("getUser"),
    createUser: record("createUser"),
    updateUser: record("updateUser"),
  },
  dashboardService: { getSummary: record("getSummary", { items: { total: 0 } }) },
} as unknown as Parameters<typeof createApp>[0]);

let server: Server;
let baseUrl: string;

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
});

beforeEach(() => {
  calls.length = 0;
});

interface Envelope {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: { code: string; details?: unknown };
}

async function call(method: string, path: string, token?: string, body?: unknown) {
  const headers: Record<string, string> = {};
  if (token !== undefined) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: (await response.json()) as Envelope };
}

function lastCall(method: string) {
  const found = calls.filter((entry) => entry.method === method).at(-1);
  assert.ok(found, `expected ${method} to be called`);
  return found;
}

const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

describe("RBAC matrix (KF-01..KF-13, U-03)", () => {
  const matrix: { method: string; path: string; body?: unknown; allowed: Role[] }[] = [
    { method: "GET", path: "/api/v1/categories", allowed: ["admin", "inventory_officer", "staff"] },
    { method: "POST", path: "/api/v1/categories", body: { name: "Komputer" }, allowed: ["admin"] },
    { method: "DELETE", path: `/api/v1/categories/${ids.category}`, allowed: ["admin"] },
    { method: "GET", path: "/api/v1/items", allowed: ["admin", "inventory_officer"] },
    { method: "GET", path: "/api/v1/items/code/INV-000001", allowed: ["admin", "inventory_officer"] },
    { method: "GET", path: `/api/v1/items/${ids.item}/history`, allowed: ["admin", "inventory_officer"] },
    {
      method: "POST",
      path: "/api/v1/items",
      body: { name: "Laptop", category_id: ids.category },
      allowed: ["admin"],
    },
    { method: "PUT", path: `/api/v1/items/${ids.item}`, body: { name: "Laptop 2" }, allowed: ["admin"] },
    { method: "DELETE", path: `/api/v1/items/${ids.item}`, allowed: ["admin"] },
    { method: "GET", path: "/api/v1/loans?status=terlambat", allowed: ["admin", "inventory_officer"] },
    { method: "GET", path: "/api/v1/loans/me", allowed: ["admin", "inventory_officer", "staff"] },
    {
      method: "POST",
      path: "/api/v1/loans",
      body: { item_id: ids.item, borrower_id: ids.staff, due_at: futureDate },
      allowed: ["admin", "inventory_officer"],
    },
    {
      method: "POST",
      path: `/api/v1/loans/${ids.loan}/return`,
      body: { condition: "good" },
      allowed: ["admin", "inventory_officer"],
    },
    { method: "GET", path: "/api/v1/users", allowed: ["admin", "inventory_officer"] },
    { method: "PUT", path: `/api/v1/users/${ids.staff}`, body: { role: "inventory_officer" }, allowed: ["admin"] },
    { method: "GET", path: "/api/v1/dashboard/summary", allowed: ["admin"] },
  ];

  for (const route of matrix) {
    it(`${route.method} ${route.path}`, async () => {
      const anonymous = await call(route.method, route.path, undefined, route.body);
      assert.equal(anonymous.status, 401);
      assert.equal(anonymous.body.error?.code, "AUTHENTICATION_ERROR");

      for (const [token, role] of Object.entries(tokens)) {
        const result = await call(route.method, route.path, token, route.body);
        if (route.allowed.includes(role)) {
          assert.ok(result.status === 200 || result.status === 201, `${role} expected 2xx, got ${result.status}`);
          assert.equal(result.body.success, true);
        } else {
          assert.equal(result.status, 403, `${role} expected 403`);
          assert.equal(result.body.error?.code, "AUTHORIZATION_ERROR");
        }
      }
    });
  }
});

describe("inventory HTTP boundaries", () => {
  it("passes normalized input and the acting user to services", async () => {
    const result = await call("POST", "/api/v1/items", "admin-token", {
      barcode: " inv-rpl-0012 ",
      name: "Laptop Asus A14",
      category_id: ids.category,
    });
    assert.equal(result.status, 201);
    const [input, actor] = lastCall("createItem").args as [{ barcode: string }, { userId: string }];
    assert.equal(input.barcode, "INV-RPL-0012");
    assert.equal(actor.userId, ids.admin);
  });

  it("records the officer on loan creation and scopes /loans/me to the caller", async () => {
    await call("POST", "/api/v1/loans", "officer-token", {
      item_id: ids.item,
      borrower_id: ids.staff,
      due_at: futureDate,
    });
    assert.equal((lastCall("createLoan").args[1] as { userId: string }).userId, ids.inventory_officer);

    await call("GET", "/api/v1/loans/me?status=aktif", "staff-token");
    const [identity, query] = lastCall("listMyLoans").args as [{ userId: string }, { status: string }];
    assert.equal(identity.userId, ids.staff);
    assert.equal(query.status, "active");
  });

  it("returns 409 with active loan details when the item is already borrowed (U-09)", async () => {
    const result = await call("POST", "/api/v1/loans", "officer-token", {
      item_id: ids.loan,
      borrower_id: ids.staff,
      due_at: futureDate,
    });
    assert.equal(result.status, 409);
    assert.equal(result.body.error?.code, "CONFLICT_ERROR");
    assert.deepEqual(result.body.error?.details, { item_status: "borrowed", active_loan: null });
  });

  it("validates params, query, and body before calling services", async () => {
    const badId = await call("GET", "/api/v1/items/not-a-uuid", "admin-token");
    assert.equal(badId.status, 400);
    assert.equal(badId.body.error?.code, "VALIDATION_ERROR");

    const badQuery = await call("GET", "/api/v1/items?limit=1000", "admin-token");
    assert.equal(badQuery.status, 400);

    const badBody = await call("POST", `/api/v1/loans/${ids.loan}/return`, "admin-token", { condition: "hilang" });
    assert.equal(badBody.status, 400);

    const pastDue = await call("POST", "/api/v1/loans", "admin-token", {
      item_id: ids.item,
      borrower_id: ids.staff,
      due_at: "2020-01-01",
    });
    assert.equal(pastDue.status, 400);

    assert.equal(calls.length, 0);
  });

  it("validates refresh token payloads", async () => {
    const missing = await call("POST", "/api/v1/auth/refresh", undefined, {});
    assert.equal(missing.status, 400);

    const ok = await call("POST", "/api/v1/auth/refresh", undefined, { refresh_token: "abc" });
    assert.equal(ok.status, 200);
    assert.deepEqual(lastCall("refresh").args[0], { refreshToken: "abc" });
  });
});
