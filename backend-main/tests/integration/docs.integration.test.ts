import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

process.env.NODE_ENV = "development";
process.env.PORT = "3000";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

let server: Server;
let baseUrl: string;

before(async () => {
  const { app } = await import("../../src/app.js");
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
});

describe("API documentation", () => {
  it("serves the raw OpenAPI document in development", async () => {
    const response = await fetch(`${baseUrl}/api-docs/openapi.json`);
    const document = (await response.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
    };

    assert.equal(response.status, 200);
    assert.equal(document.openapi, "3.0.3");
    assert.ok(document.paths["/api/v1/auth/profile"]);
  });

  it("serves Swagger UI without changing the health response", async () => {
    const docsResponse = await fetch(`${baseUrl}/api-docs/`);
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthBody = await healthResponse.json();

    assert.equal(docsResponse.status, 200);
    assert.match(await docsResponse.text(), /swagger-ui/);
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(healthBody, { success: true, data: { status: "ok" } });
  });

  it("preserves the standard validation error envelope", async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "invalid" }),
    });
    const body = (await response.json()) as {
      success: boolean;
      message: string;
      error: { code: string };
    };

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.message, "Data permintaan tidak valid");
    assert.equal(body.error.code, "VALIDATION_ERROR");
  });
});
