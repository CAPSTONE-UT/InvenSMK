import type { ErrorRequestHandler, RequestHandler } from "express";

import { ApiError, NotFoundError } from "../utils/api-error.js";
import type { ApiFailure } from "../utils/api-response.js";

export const notFoundHandler: RequestHandler = (request, _response, next): void => {
  next(new NotFoundError(`Route ${request.method} ${request.path} tidak ditemukan`));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next): void => {
  const isKnownError = error instanceof ApiError;
  const statusCode = isKnownError ? error.statusCode : 500;
  const code = isKnownError ? error.code : "INTERNAL_ERROR";
  const message = isKnownError ? error.message : "Terjadi kesalahan internal";

  const errorBody: ApiFailure["error"] = { code };
  if (isKnownError && error.details !== undefined) errorBody.details = error.details;

  const body: ApiFailure = {
    success: false,
    message,
    error: errorBody,
  };

  response.status(statusCode).json(body);
};
