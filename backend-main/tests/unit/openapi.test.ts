import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { openapiDocument } from "../../src/docs/openapi.js";
import { parse } from "yaml";
import { httpMethods } from "../../src/docs/openapi.types.js";
import { shouldExposeDocs } from "../../src/routes/docs.routes.js";

describe("OpenAPI document", () => {
  it("only enables documentation for development", () => {
    assert.equal(shouldExposeDocs("development"), true);
    assert.equal(shouldExposeDocs("production"), false);
    assert.equal(shouldExposeDocs("test"), false);
    assert.equal(shouldExposeDocs("staging"), false);
  });

  it("documents every implemented endpoint", () => {
    assert.deepEqual(Object.keys(openapiDocument.paths).sort(), [
      "/api/v1/auth/login",
      "/api/v1/auth/logout",
      "/api/v1/auth/profile",
      "/api/v1/auth/refresh",
      "/api/v1/auth/register",
      "/api/v1/categories",
      "/api/v1/categories/{id}",
      "/api/v1/dashboard/summary",
      "/api/v1/items",
      "/api/v1/items/code/{code}",
      "/api/v1/items/{id}",
      "/api/v1/items/{id}/history",
      "/api/v1/loans",
      "/api/v1/loans/me",
      "/api/v1/loans/{id}",
      "/api/v1/loans/{id}/return",
      "/api/v1/users",
      "/api/v1/users/{id}",
      "/health",
    ]);
    assert.equal(openapiDocument.paths["/health"]?.get?.responses["200"]?.description, "Layanan tersedia");
    assert.ok(openapiDocument.paths["/api/v1/auth/register"]?.post);
    assert.ok(openapiDocument.paths["/api/v1/auth/login"]?.post);
    assert.ok(openapiDocument.paths["/api/v1/auth/logout"]?.post);
    assert.ok(openapiDocument.paths["/api/v1/auth/profile"]?.get);
    assert.ok(openapiDocument.paths["/api/v1/auth/refresh"]?.post);
  });

  it("requires bearer auth and documents 401/403 on every inventory operation", () => {
    for (const [path, item] of Object.entries(openapiDocument.paths)) {
      if (!path.startsWith("/api/v1/") || path.startsWith("/api/v1/auth/")) continue;
      for (const method of httpMethods) {
        const operation = item[method];
        if (operation === undefined) continue;
        assert.deepEqual(operation.security, [{ bearerAuth: [] }], `${method} ${path}`);
        assert.ok(operation.responses["401"], `${method} ${path} 401`);
        assert.ok(operation.responses["403"], `${method} ${path} 403`);
      }
    }
  });

  it("only references schemas that exist", () => {
    const refs = JSON.stringify(openapiDocument).match(/#\/components\/schemas\/[A-Za-z]+/g) ?? [];
    for (const reference of new Set(refs)) {
      const name = reference.split("/").at(-1) ?? "";
      assert.ok(openapiDocument.components.schemas[name], `missing schema ${name}`);
    }
  });

  it("defines request constraints, security, and standard safe error examples", () => {
    const schemas = openapiDocument.components.schemas;
    assert.equal(schemas.RegisterRequest?.additionalProperties, false);
    assert.deepEqual(schemas.RegisterRequest?.required, [
      "full_name",
      "email",
      "password",
      "staff_id",
      "school_unit",
    ]);
    assert.equal(schemas.LoginRequest?.properties?.password?.minLength, 1);
    assert.equal(openapiDocument.paths["/health"]?.get?.security, undefined);
    assert.equal(openapiDocument.paths["/api/v1/auth/register"]?.post?.security, undefined);
    assert.equal(openapiDocument.paths["/api/v1/auth/login"]?.post?.security, undefined);
    assert.deepEqual(openapiDocument.paths["/api/v1/auth/profile"]?.get?.security, [{ bearerAuth: [] }]);
    assert.deepEqual(openapiDocument.paths["/api/v1/auth/logout"]?.post?.security, [{ bearerAuth: [] }]);

    for (const path of ["/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/profile", "/api/v1/auth/logout"]) {
      const operation = openapiDocument.paths[path]?.post ?? openapiDocument.paths[path]?.get;
      assert.ok(operation);
      for (const status of ["400", "401", "404", "409", "503", "500"]) {
        const response = operation.responses[status];
        if (response === undefined) continue;
        const example = response.content?.["application/json"]?.example as
          | { success: boolean; message: string; error: { code: string } }
          | undefined;
        assert.equal(example?.success, false);
        assert.equal(typeof example?.message, "string");
        assert.equal(typeof example?.error.code, "string");
      }
    }

    const validationExample = openapiDocument.paths["/api/v1/auth/register"]?.post?.responses["400"]?.content?.[
      "application/json"
    ]?.example as { success: boolean; message: string; error: { code: string } };
    assert.deepEqual(validationExample, {
      success: false,
      message: "Data permintaan tidak valid",
      error: {
        code: "VALIDATION_ERROR",
        details: [{ path: "email", message: "Invalid email address" }],
      },
    });
    assert.doesNotMatch(JSON.stringify(openapiDocument), /stack|SUPABASE_SERVICE_ROLE_KEY/i);
  });

  it("keeps the documented path and method set synchronized with the YAML contract", async () => {
    const yamlText = await readFile(
      new URL("../../specs/003-inventory-loans-api/contracts/openapi.yaml", import.meta.url),
      "utf8",
    );
    const contract = parse(yamlText) as { paths: Record<string, Record<string, unknown>> };

    assert.deepEqual(Object.keys(openapiDocument.paths).sort(), Object.keys(contract.paths).sort());
    for (const [path, operation] of Object.entries(openapiDocument.paths)) {
      for (const method of httpMethods) {
        assert.equal(Boolean(operation[method]), Boolean(contract.paths[path]?.[method]));
      }
    }
  });
});
