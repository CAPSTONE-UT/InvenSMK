import type { NextFunction, Request, RequestHandler, Response } from "express";

import { authorizationHeaderSchema } from "../schemas/auth.schema.js";
import type { AuthService } from "../types/auth.types.js";
import { AuthenticationError } from "../utils/api-error.js";

export function createAuthMiddleware(authService: AuthService): RequestHandler {
  return async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
    const tokenResult = authorizationHeaderSchema.safeParse(request.headers.authorization);
    if (!tokenResult.success) {
      next(new AuthenticationError());
      return;
    }

    try {
      request.auth = await authService.authenticate(tokenResult.data);
      next();
    } catch (error: unknown) {
      next(error);
    }
  };
}
