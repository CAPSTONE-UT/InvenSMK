import { inventoryPaths, inventorySchemas } from "./inventory.openapi.js";
import type { OpenApiDocument, OpenApiResponse, OpenApiSchema } from "./openapi.types.js";

export type { OpenApiDocument } from "./openapi.types.js";

const json = "application/json";
const ref = (name: string): OpenApiSchema => ({ $ref: `#/components/schemas/${name}` });
const errorResponses = {
  validation: {
    description: "Data permintaan tidak valid",
    content: {
      [json]: {
        schema: ref("ErrorEnvelope"),
        example: {
          success: false,
          message: "Data permintaan tidak valid",
          error: {
            code: "VALIDATION_ERROR",
            details: [{ path: "email", message: "Invalid email address" }],
          },
        },
      },
    },
  },
  authentication: {
    description: "Autentikasi gagal",
    content: {
      [json]: {
        schema: ref("ErrorEnvelope"),
        example: {
          success: false,
          message: "Autentikasi gagal",
          error: { code: "AUTHENTICATION_ERROR" },
        },
      },
    },
  },
  authorization: {
    description: "Peran tidak diizinkan",
    content: {
      [json]: {
        schema: ref("ErrorEnvelope"),
        example: {
          success: false,
          message: "Anda tidak memiliki akses ke sumber daya ini",
          error: { code: "AUTHORIZATION_ERROR" },
        },
      },
    },
  },
  conflict: {
    description: "Data akun sudah digunakan",
    content: {
      [json]: {
        schema: ref("ErrorEnvelope"),
        example: {
          success: false,
          message: "Data akun sudah digunakan",
          error: { code: "CONFLICT_ERROR" },
        },
      },
    },
  },
  dependency: {
    description: "Layanan autentikasi sementara tidak tersedia",
    content: {
      [json]: {
        schema: ref("ErrorEnvelope"),
        example: {
          success: false,
          message: "Layanan autentikasi sementara tidak tersedia",
          error: { code: "DEPENDENCY_ERROR" },
        },
      },
    },
  },
  notFound: {
    description: "Profil atau route tidak ditemukan",
    content: {
      [json]: {
        schema: ref("ErrorEnvelope"),
        example: {
          success: false,
          message: "Profil personel tidak ditemukan",
          error: { code: "NOT_FOUND_ERROR" },
        },
      },
    },
  },
  internal: {
    description: "Kesalahan internal tanpa detail sensitif",
    content: {
      [json]: {
        schema: ref("ErrorEnvelope"),
        example: {
          success: false,
          message: "Terjadi kesalahan internal",
          error: { code: "INTERNAL_ERROR" },
        },
      },
    },
  },
} satisfies Record<string, OpenApiResponse>;

const successEnvelope = ref("SuccessEnvelope");
const bearerSecurity = [{ bearerAuth: [] }] as const;

export const openapiDocument: OpenApiDocument & Record<string, unknown> = {
  openapi: "3.0.3",
  info: {
    title: "School Inventory Backend API",
    version: "1.0.0",
    description:
      "Kontrak API REST untuk School Inventory Backend. Endpoint selain health, register, login, dan refresh memerlukan Bearer access token. Otorisasi berbasis peran: admin (Admin), inventory_officer (Petugas), staff (Peminjam). Peran yang tidak diizinkan menerima 403 AUTHORIZATION_ERROR.",
  },
  servers: [{ url: "http://localhost:3000", description: "Development server" }],
  tags: [
    { name: "Auth", description: "Autentikasi dan session" },
    { name: "Categories", description: "Kategori barang (KF-04)" },
    { name: "Items", description: "Data barang, barcode, dan riwayat (KF-03, KF-05, KF-07, KF-08, KF-13)" },
    { name: "Loans", description: "Peminjaman dan pengembalian (KF-09 sampai KF-12)" },
    { name: "Users", description: "Manajemen pengguna dan peran (KF-06)" },
    { name: "Dashboard", description: "Ringkasan admin (KF-02)" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Memeriksa kesehatan layanan",
        responses: {
          "200": {
            description: "Layanan tersedia",
            content: {
              [json]: {
                schema: successEnvelope,
                example: { success: true, data: { status: "ok" } },
              },
            },
          },
          "500": errorResponses.internal,
        },
      },
    },
    "/api/v1/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Mendaftarkan akun staf",
        requestBody: {
          required: true,
          content: { [json]: { schema: ref("RegisterRequest") } },
        },
        responses: {
          "201": {
            description: "Akun berhasil dibuat",
            content: {
              [json]: {
                schema: ref("RegisterResponse"),
                example: {
                  success: true,
                  data: {
                    user_id: "00000000-0000-0000-0000-000000000000",
                    email: "siti@example.com",
                    email_verification_required: false,
                    session: {
                      access_token: "redacted-development-token",
                      refresh_token: "redacted-development-refresh-token",
                      token_type: "bearer",
                      expires_at: 1893456000,
                    },
                  },
                  message: "Pendaftaran berhasil",
                },
              },
            },
          },
          "400": errorResponses.validation,
          "409": errorResponses.conflict,
          "503": errorResponses.dependency,
          "500": errorResponses.internal,
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Masuk dan memperoleh session",
        requestBody: {
          required: true,
          content: { [json]: { schema: ref("LoginRequest") } },
        },
        responses: {
          "200": {
            description: "Login berhasil",
            content: {
              [json]: {
                schema: successEnvelope,
                example: {
                  success: true,
                  data: {
                    session: {
                      access_token: "redacted-development-token",
                      refresh_token: "redacted-development-refresh-token",
                      token_type: "bearer",
                      expires_at: 1893456000,
                    },
                    user: {
                      user_id: "00000000-0000-0000-0000-000000000000",
                      full_name: "Siti Aminah",
                      email: "siti@example.com",
                      staff_id: "STF-001",
                      school_unit: "Unit Sarana",
                      role: "staff",
                      account_status: "active",
                    },
                  },
                  message: "Login berhasil",
                },
              },
            },
          },
          "400": errorResponses.validation,
          "401": errorResponses.authentication,
          "503": errorResponses.dependency,
          "500": errorResponses.internal,
        },
      },
    },
    "/api/v1/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Memperbarui session dengan refresh token",
        description:
          "Menukar refresh_token dengan access_token baru. Refresh token dari session yang sudah logout ditolak.",
        requestBody: {
          required: true,
          content: { [json]: { schema: ref("RefreshRequest") } },
        },
        responses: {
          "200": {
            description: "Session diperbarui",
            content: {
              [json]: {
                schema: successEnvelope,
                example: {
                  success: true,
                  data: {
                    session: {
                      access_token: "redacted-development-token",
                      refresh_token: "redacted-development-refresh-token",
                      token_type: "bearer",
                      expires_at: 1893456000,
                    },
                    user: {
                      user_id: "00000000-0000-0000-0000-000000000000",
                      full_name: "Siti Aminah",
                      email: "siti@example.com",
                      staff_id: "STF-001",
                      school_unit: "Unit Sarana",
                      role: "staff",
                      account_status: "active",
                    },
                  },
                  message: "Session diperbarui",
                },
              },
            },
          },
          "400": errorResponses.validation,
          "401": errorResponses.authentication,
          "503": errorResponses.dependency,
          "500": errorResponses.internal,
        },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Mengakhiri session aktif",
        description: "Memerlukan Bearer token valid. Semua peran.",
        security: bearerSecurity,
        responses: {
          "200": {
            description: "Logout berhasil",
            content: {
              [json]: {
                schema: successEnvelope,
                example: { success: true, message: "Logout berhasil" },
              },
            },
          },
          "401": errorResponses.authentication,
          "503": errorResponses.dependency,
          "500": errorResponses.internal,
        },
      },
    },
    "/api/v1/auth/profile": {
      get: {
        tags: ["Auth"],
        summary: "Mengambil profil pengguna aktif",
        description:
          "Memerlukan Bearer token valid dan profil personel aktif. Semua peran.",
        security: bearerSecurity,
        responses: {
          "200": {
            description: "Profil pengguna",
            content: {
              [json]: {
                schema: successEnvelope,
                example: {
                  success: true,
                  data: {
                    user_id: "00000000-0000-0000-0000-000000000000",
                    full_name: "Siti Aminah",
                    email: "siti@example.com",
                    staff_id: "STF-001",
                    school_unit: "Unit Sarana",
                    role: "staff",
                    account_status: "active",
                  },
                },
              },
            },
          },
          "401": errorResponses.authentication,
          "404": errorResponses.notFound,
          "503": errorResponses.dependency,
          "500": errorResponses.internal,
        },
      },
    },
    ...inventoryPaths,
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "token" },
    },
    schemas: {
      SuccessEnvelope: {
        type: "object",
        required: ["success"],
        properties: {
          success: { type: "boolean", enum: [true], example: true },
          data: { nullable: true },
          message: { type: "string", example: "Login berhasil" },
        },
      },
      UserProfile: {
        type: "object",
        required: ["user_id", "full_name", "email", "staff_id", "school_unit", "role", "account_status"],
        properties: {
          user_id: { type: "string", format: "uuid", example: "00000000-0000-0000-0000-000000000000" },
          full_name: { type: "string", example: "Siti Aminah" },
          email: { type: "string", format: "email", example: "siti@example.com" },
          staff_id: { type: "string", example: "STF-001" },
          school_unit: { type: "string", example: "Unit Sarana" },
          role: { type: "string", enum: ["staff", "inventory_officer", "admin"], example: "staff" },
          account_status: { type: "string", enum: ["active", "inactive"], example: "active" },
        },
      },
      AuthSession: {
        type: "object",
        required: ["access_token", "refresh_token", "token_type", "expires_at"],
        properties: {
          access_token: { type: "string", format: "password", example: "redacted-development-token" },
          refresh_token: { type: "string", format: "password", example: "redacted-development-refresh-token" },
          token_type: { type: "string", enum: ["bearer"], example: "bearer" },
          expires_at: { type: "integer", example: 1893456000 },
        },
      },
      RegisterRequest: {
        type: "object",
        additionalProperties: false,
        required: ["full_name", "email", "password", "staff_id", "school_unit"],
        properties: {
          full_name: { type: "string", minLength: 2, maxLength: 120, example: "Siti Aminah" },
          email: { type: "string", format: "email", maxLength: 254, example: "siti@example.com" },
          password: { type: "string", format: "password", minLength: 8, maxLength: 128, example: "Rahasia123!" },
          staff_id: { type: "string", minLength: 3, maxLength: 50, example: "STF-001" },
          school_unit: { type: "string", minLength: 2, maxLength: 100, example: "Unit Sarana" },
        },
      },
      RegisterResponse: {
          type: "object",
          required: ["success", "data"],
          properties: {
            success: { type: "boolean", enum: [true], example: true },
            data: {
              type: "object",
              required: ["user_id", "email", "email_verification_required"],
              properties: {
                user_id: { type: "string", format: "uuid" },
                email: { type: "string", format: "email" },
                email_verification_required: { type: "boolean", example: false },
                session: { $ref: "#/components/schemas/AuthSession" },
              },
            },
            message: { type: "string", example: "Pendaftaran berhasil" },
          },
        },
      LoginRequest: {
        type: "object",
        additionalProperties: false,
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", maxLength: 254, example: "siti@example.com" },
          password: { type: "string", format: "password", minLength: 1, maxLength: 128, example: "Rahasia123!" },
        },
      },
      RefreshRequest: {
        type: "object",
        additionalProperties: false,
        required: ["refresh_token"],
        properties: {
          refresh_token: { type: "string", format: "password", minLength: 1, example: "redacted-development-refresh-token" },
        },
      },
      ...inventorySchemas,
      ErrorEnvelope: {
        type: "object",
        required: ["success", "message", "error"],
        properties: {
          success: { type: "boolean", enum: [false], example: false },
          message: { type: "string", example: "Autentikasi gagal" },
          error: {
            type: "object",
            required: ["code"],
            properties: {
              code: { type: "string", example: "AUTHENTICATION_ERROR" },
              details: { nullable: true },
            },
          },
        },
      },
    },
    responses: {
      ValidationError: errorResponses.validation,
      AuthenticationError: errorResponses.authentication,
      AuthorizationError: errorResponses.authorization,
      ConflictError: errorResponses.conflict,
      DependencyError: errorResponses.dependency,
      NotFoundError: errorResponses.notFound,
      InternalError: errorResponses.internal,
    },
  },
};
