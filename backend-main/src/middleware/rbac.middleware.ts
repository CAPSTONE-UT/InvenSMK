import type { NextFunction, Request, RequestHandler, Response } from "express";

import type { AuthenticatedUser, UserRole } from "../types/auth.types.js";
import { AuthenticationError, AuthorizationError } from "../utils/api-error.js";

/**
 * Middleware RBAC. Harus dipasang setelah auth middleware.
 * 401 bila identitas belum ada, 403 bila peran tidak termasuk daftar yang diizinkan.
 */
export function requireRole(...allowedRoles: readonly UserRole[]): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (request.auth === undefined) {
      next(new AuthenticationError());
      return;
    }
    if (!allowedRoles.includes(request.auth.role)) {
      next(new AuthorizationError());
      return;
    }
    next();
  };
}

export function requireAuth(request: Request): AuthenticatedUser {
  if (request.auth === undefined) throw new AuthenticationError();
  return request.auth;
}
