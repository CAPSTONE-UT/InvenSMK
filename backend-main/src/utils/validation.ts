import type { z, ZodError, ZodType } from "zod";

import { ValidationError } from "./api-error.js";

export interface ValidationIssue {
  path: string;
  message: string;
}

export function toValidationIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * Memvalidasi payload eksternal (body, params, atau query) dengan schema Zod.
 * Kegagalan dilempar sebagai ValidationError agar ditangani global error handler.
 */
export function parseInput<TSchema extends ZodType>(schema: TSchema, value: unknown): z.output<TSchema> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationError("Data permintaan tidak valid", toValidationIssues(result.error));
  }
  return result.data;
}
