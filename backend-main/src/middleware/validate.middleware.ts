import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";

import { ValidationError } from "../utils/api-error.js";
import { toValidationIssues } from "../utils/validation.js";

export function validateBody(schema: ZodType): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(new ValidationError("Data permintaan tidak valid", toValidationIssues(result.error)));
      return;
    }

    request.body = result.data;
    next();
  };
}
