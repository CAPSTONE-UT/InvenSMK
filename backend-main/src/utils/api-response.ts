import type { Response } from "express";

export interface ApiSuccess<T> {
  success: true;
  data?: T;
  message?: string;
}

export interface ApiFailure {
  success: false;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(
  response: Response,
  statusCode: number,
  data?: T,
  message?: string,
): Response<ApiSuccess<T>> {
  const body: ApiSuccess<T> = { success: true };

  if (data !== undefined) body.data = data;
  if (message !== undefined) body.message = message;

  return response.status(statusCode).json(body);
}
