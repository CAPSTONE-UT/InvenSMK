import { z } from "zod";

import type { LoginInput, RefreshInput, RegisterInput } from "../types/auth.types.js";

export const emailFieldSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const passwordFieldSchema = z.string().min(8).max(128);
export const fullNameFieldSchema = z.string().trim().min(2).max(120);
export const staffIdFieldSchema = z.string().trim().min(3).max(50);
export const schoolUnitFieldSchema = z.string().trim().min(2).max(100);

export const loginSchema = z
  .strictObject({
    email: emailFieldSchema,
    password: z.string().min(1).max(128),
  })
  .transform(
    (value): LoginInput => ({
      email: value.email,
      password: value.password,
    }),
  );

export const registerSchema = z
  .strictObject({
    full_name: fullNameFieldSchema,
    email: emailFieldSchema,
    password: passwordFieldSchema,
    staff_id: staffIdFieldSchema,
    school_unit: schoolUnitFieldSchema,
  })
  .transform(
    (value): RegisterInput => ({
      fullName: value.full_name,
      email: value.email,
      password: value.password,
      staffId: value.staff_id,
      schoolUnit: value.school_unit,
    }),
  );

export const refreshSchema = z
  .strictObject({
    refresh_token: z.string().trim().min(1).max(4096),
  })
  .transform((value): RefreshInput => ({ refreshToken: value.refresh_token }));

export const authorizationHeaderSchema = z
  .string()
  .regex(/^Bearer\s+\S+$/i, "Authorization header harus menggunakan Bearer token")
  .transform((value) => value.replace(/^Bearer\s+/i, ""));
