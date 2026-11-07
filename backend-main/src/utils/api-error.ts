export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "CONFLICT_ERROR"
  | "NOT_FOUND_ERROR"
  | "DEPENDENCY_ERROR"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends ApiError {
  public constructor(message = "Data permintaan tidak valid", details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class AuthenticationError extends ApiError {
  public constructor(message = "Autentikasi gagal") {
    super(401, "AUTHENTICATION_ERROR", message);
  }
}

export class AuthorizationError extends ApiError {
  public constructor(message = "Anda tidak memiliki akses ke sumber daya ini") {
    super(403, "AUTHORIZATION_ERROR", message);
  }
}

export class ConflictError extends ApiError {
  public constructor(message = "Data akun sudah digunakan", details?: unknown) {
    super(409, "CONFLICT_ERROR", message, details);
  }
}

export class NotFoundError extends ApiError {
  public constructor(message = "Data tidak ditemukan") {
    super(404, "NOT_FOUND_ERROR", message);
  }
}

export class DependencyError extends ApiError {
  public constructor(message = "Layanan autentikasi sementara tidak tersedia") {
    super(503, "DEPENDENCY_ERROR", message);
  }
}
