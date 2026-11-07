import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  authorizationHeaderSchema,
  loginSchema,
  registerSchema,
} from "../../src/schemas/auth.schema.js";

describe("authentication schemas", () => {
  it("normalizes valid register payloads and rejects privilege fields", () => {
    const valid = registerSchema.parse({
      full_name: "  Petugas Inventaris  ",
      email: " STAFF@SCHOOL.TEST ",
      password: "ValidPass123!",
      staff_id: " STF-001 ",
      school_unit: " Gudang ",
    });

    assert.deepEqual(valid, {
      fullName: "Petugas Inventaris",
      email: "staff@school.test",
      password: "ValidPass123!",
      staffId: "STF-001",
      schoolUnit: "Gudang",
    });

    assert.equal(
      registerSchema.safeParse({
        full_name: "Petugas Inventaris",
        email: "staff@school.test",
        password: "ValidPass123!",
        staff_id: "STF-001",
        school_unit: "Gudang",
        role: "admin",
      }).success,
      false,
    );
  });

  it("validates login and bearer token boundaries", () => {
    assert.equal(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success, true);
    assert.equal(loginSchema.safeParse({ email: "invalid", password: "x" }).success, false);
    assert.equal(authorizationHeaderSchema.parse("Bearer abc.def.ghi"), "abc.def.ghi");
    assert.equal(authorizationHeaderSchema.safeParse("Basic credentials").success, false);
  });
});
