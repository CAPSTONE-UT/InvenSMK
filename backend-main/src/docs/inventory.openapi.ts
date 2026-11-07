import type { OpenApiOperation, OpenApiParameter, OpenApiPathItem, OpenApiResponse, OpenApiSchema } from "./openapi.types.js";

const json = "application/json";
const ref = (name: string): OpenApiSchema => ({ $ref: `#/components/schemas/${name}` });
const bearerSecurity = [{ bearerAuth: [] }] as const;

const uuidExample = "00000000-0000-4000-8000-000000000000";
const timestampExample = "2026-11-07T08:00:00.000+00:00";

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

function errorResponse(description: string, code: string, message: string, details?: unknown): OpenApiResponse {
  return {
    description,
    content: {
      [json]: {
        schema: ref("ErrorEnvelope"),
        example: {
          success: false,
          message,
          error: details === undefined ? { code } : { code, details },
        },
      },
    },
  };
}

const errors = {
  "400": errorResponse("Data permintaan tidak valid", "VALIDATION_ERROR", "Data permintaan tidak valid", [
    { path: "id", message: "ID harus berupa UUID yang valid" },
  ]),
  "401": errorResponse("Token tidak ada atau tidak valid", "AUTHENTICATION_ERROR", "Autentikasi gagal"),
  "403": errorResponse(
    "Peran tidak diizinkan",
    "AUTHORIZATION_ERROR",
    "Anda tidak memiliki akses ke sumber daya ini",
  ),
  "404": errorResponse("Data tidak ditemukan", "NOT_FOUND_ERROR", "Data tidak ditemukan"),
  "409": errorResponse("Konflik dengan data yang ada", "CONFLICT_ERROR", "Data sudah digunakan"),
  "503": errorResponse(
    "Basis data tidak tersedia",
    "DEPENDENCY_ERROR",
    "Layanan basis data sementara tidak tersedia",
  ),
} satisfies Record<string, OpenApiResponse>;

type ErrorStatus = keyof typeof errors;

function success(description: string, data: OpenApiSchema, message?: string): OpenApiResponse {
  return {
    description,
    content: {
      [json]: {
        schema: {
          type: "object",
          required: ["success"],
          properties: {
            success: { type: "boolean", enum: [true] },
            data,
            ...(message === undefined ? {} : { message: { type: "string", example: message } }),
          },
        },
      },
    },
  };
}

function messageOnly(message: string): OpenApiResponse {
  return {
    description: message,
    content: { [json]: { schema: ref("SuccessEnvelope"), example: { success: true, message } } },
  };
}

const paginated = (itemSchema: string): OpenApiSchema => ({
  type: "object",
  required: ["items", "pagination"],
  properties: {
    items: { type: "array", items: ref(itemSchema) },
    pagination: ref("Pagination"),
  },
});

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

const idParam: OpenApiParameter = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

function queryParam(name: string, schema: OpenApiSchema, description?: string): OpenApiParameter {
  return { name, in: "query", required: false, schema, ...(description === undefined ? {} : { description }) };
}

const pageParams: OpenApiParameter[] = [
  queryParam("page", { type: "integer", minimum: 1, default: 1 }),
  queryParam("limit", { type: "integer", minimum: 1, maximum: 100, default: 20 }),
];
const searchParam = queryParam("q", { type: "string", maxLength: 100 }, "Kata kunci pencarian");

// ---------------------------------------------------------------------------
// Operation builder
// ---------------------------------------------------------------------------

interface OperationOptions {
  tag: string;
  summary: string;
  roles: string;
  description?: string;
  parameters?: OpenApiParameter[];
  body?: string;
  responses: Record<string, OpenApiResponse>;
  errors: ErrorStatus[];
}

function operation(options: OperationOptions): OpenApiOperation {
  const errorEntries = Object.fromEntries(options.errors.map((status) => [status, errors[status]]));
  return {
    tags: [options.tag],
    summary: options.summary,
    description: `Peran: ${options.roles}.${options.description === undefined ? "" : ` ${options.description}`}`,
    security: bearerSecurity,
    ...(options.parameters === undefined ? {} : { parameters: options.parameters }),
    ...(options.body === undefined
      ? {}
      : { requestBody: { required: true, content: { [json]: { schema: ref(options.body) } } } }),
    responses: { ...options.responses, ...errorEntries },
  };
}

const roles = {
  admin: "admin",
  operators: "admin, inventory_officer",
  everyone: "admin, inventory_officer, staff",
};

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export const inventoryPaths: Record<string, OpenApiPathItem> = {
  "/api/v1/categories": {
    get: operation({
      tag: "Categories",
      summary: "Daftar kategori",
      roles: roles.everyone,
      parameters: [
        queryParam("page", { type: "integer", minimum: 1, default: 1 }),
        queryParam("limit", { type: "integer", minimum: 1, maximum: 100, default: 100 }),
        searchParam,
      ],
      responses: { "200": success("Daftar kategori", paginated("Category")) },
      errors: ["400", "401", "403", "503"],
    }),
    post: operation({
      tag: "Categories",
      summary: "Tambah kategori",
      roles: roles.admin,
      body: "CategoryCreateRequest",
      responses: { "201": success("Kategori dibuat", ref("Category"), "Kategori berhasil dibuat") },
      errors: ["400", "401", "403", "409", "503"],
    }),
  },
  "/api/v1/categories/{id}": {
    get: operation({
      tag: "Categories",
      summary: "Detail kategori",
      roles: roles.everyone,
      parameters: [idParam],
      responses: { "200": success("Detail kategori", ref("Category")) },
      errors: ["400", "401", "403", "404", "503"],
    }),
    put: operation({
      tag: "Categories",
      summary: "Ubah kategori",
      roles: roles.admin,
      description: "Hanya field yang dikirim yang diubah.",
      parameters: [idParam],
      body: "CategoryUpdateRequest",
      responses: { "200": success("Kategori diperbarui", ref("Category"), "Kategori berhasil diperbarui") },
      errors: ["400", "401", "403", "404", "409", "503"],
    }),
    delete: operation({
      tag: "Categories",
      summary: "Hapus kategori",
      roles: roles.admin,
      description: "Ditolak (409) bila kategori masih memiliki barang.",
      parameters: [idParam],
      responses: { "200": messageOnly("Kategori berhasil dihapus") },
      errors: ["400", "401", "403", "404", "409", "503"],
    }),
  },
  "/api/v1/items": {
    get: operation({
      tag: "Items",
      summary: "Daftar barang",
      roles: roles.operators,
      parameters: [
        ...pageParams,
        queryParam("q", { type: "string", maxLength: 100 }, "Cari nama, barcode, atau lokasi"),
        queryParam("category_id", { type: "string", format: "uuid" }),
        queryParam("status", { type: "string", enum: ["available", "borrowed", "damaged"] }),
        queryParam("condition", { type: "string", enum: ["good", "minor_damage", "damaged"] }),
      ],
      responses: { "200": success("Daftar barang", paginated("Item")) },
      errors: ["400", "401", "403", "503"],
    }),
    post: operation({
      tag: "Items",
      summary: "Tambah barang (KF-03)",
      roles: roles.admin,
      description:
        "Barcode dinormalisasi ke huruf besar dan harus unik. Bila tidak dikirim, sistem membuat kode INV-000001 dan seterusnya. Status diturunkan dari kondisi.",
      body: "ItemCreateRequest",
      responses: { "201": success("Barang dibuat", ref("ItemDetail"), "Barang berhasil ditambahkan") },
      errors: ["400", "401", "403", "409", "503"],
    }),
  },
  "/api/v1/items/code/{code}": {
    get: operation({
      tag: "Items",
      summary: "Cari barang dari barcode hasil pindai atau input manual (KF-07, KF-08)",
      roles: roles.operators,
      description:
        "Respons menyertakan `active_loan` bila barang sedang dipinjam, sehingga frontend dapat memilih alur pinjam atau kembali.",
      parameters: [{ name: "code", in: "path", required: true, schema: { type: "string", example: "INV-000001" } }],
      responses: { "200": success("Barang ditemukan", ref("ItemDetail")) },
      errors: ["400", "401", "403", "404", "503"],
    }),
  },
  "/api/v1/items/{id}": {
    get: operation({
      tag: "Items",
      summary: "Detail barang",
      roles: roles.operators,
      parameters: [idParam],
      responses: { "200": success("Detail barang", ref("ItemDetail")) },
      errors: ["400", "401", "403", "404", "503"],
    }),
    put: operation({
      tag: "Items",
      summary: "Ubah barang",
      roles: roles.admin,
      description:
        "Hanya field yang dikirim yang diubah. Kondisi barang yang sedang dipinjam tidak dapat diubah (409); gunakan pengembalian.",
      parameters: [idParam],
      body: "ItemUpdateRequest",
      responses: { "200": success("Barang diperbarui", ref("ItemDetail"), "Barang berhasil diperbarui") },
      errors: ["400", "401", "403", "404", "409", "503"],
    }),
    delete: operation({
      tag: "Items",
      summary: "Hapus barang",
      roles: roles.admin,
      description: "Ditolak (409) bila barang memiliki riwayat peminjaman.",
      parameters: [idParam],
      responses: { "200": messageOnly("Barang berhasil dihapus") },
      errors: ["400", "401", "403", "404", "409", "503"],
    }),
  },
  "/api/v1/items/{id}/history": {
    get: operation({
      tag: "Items",
      summary: "Riwayat peminjaman dan kondisi per barang (KF-13)",
      roles: roles.operators,
      description: "Masing-masing maksimal 100 entri terbaru.",
      parameters: [idParam],
      responses: { "200": success("Riwayat barang", ref("ItemHistory")) },
      errors: ["400", "401", "403", "404", "503"],
    }),
  },
  "/api/v1/loans": {
    get: operation({
      tag: "Loans",
      summary: "Daftar peminjaman (KF-11)",
      roles: roles.operators,
      description:
        "`status=overdue` (alias `terlambat`) menampilkan peminjaman aktif yang melewati jatuh tempo. Aktif/terlambat diurutkan dari jatuh tempo terdekat.",
      parameters: [
        ...pageParams,
        queryParam(
          "status",
          { type: "string", enum: ["all", "active", "overdue", "returned", "aktif", "terlambat", "selesai"], default: "all" },
        ),
        queryParam("item_id", { type: "string", format: "uuid" }),
        queryParam("borrower_id", { type: "string", format: "uuid" }),
        queryParam("borrowed_from", { type: "string", format: "date" }, "Tanggal awal (WIB)"),
        queryParam("borrowed_to", { type: "string", format: "date" }, "Tanggal akhir (WIB)"),
      ],
      responses: { "200": success("Daftar peminjaman", paginated("Loan")) },
      errors: ["400", "401", "403", "503"],
    }),
    post: operation({
      tag: "Loans",
      summary: "Catat peminjaman (KF-09)",
      roles: roles.operators,
      description:
        "Transaksi atomik: status barang menjadi `borrowed`. Petugas diambil dari token. Bila barang tidak tersedia, respons 409 menyertakan `error.details.active_loan` (U-09).",
      body: "LoanCreateRequest",
      responses: { "201": success("Peminjaman dicatat", ref("Loan"), "Peminjaman berhasil dicatat") },
      errors: ["400", "401", "403", "404", "409", "503"],
    }),
  },
  "/api/v1/loans/me": {
    get: operation({
      tag: "Loans",
      summary: "Riwayat peminjaman milik sendiri (KF-12)",
      roles: roles.everyone,
      parameters: [
        ...pageParams,
        queryParam("status", { type: "string", enum: ["all", "active", "overdue", "returned"], default: "all" }),
      ],
      responses: { "200": success("Peminjaman milik pengguna", paginated("Loan")) },
      errors: ["400", "401", "403", "503"],
    }),
  },
  "/api/v1/loans/{id}": {
    get: operation({
      tag: "Loans",
      summary: "Detail peminjaman",
      roles: roles.everyone,
      description: "Peminjam (`staff`) hanya dapat melihat peminjaman miliknya; lainnya 404.",
      parameters: [idParam],
      responses: { "200": success("Detail peminjaman", ref("Loan")) },
      errors: ["400", "401", "403", "404", "503"],
    }),
  },
  "/api/v1/loans/{id}/return": {
    post: operation({
      tag: "Loans",
      summary: "Catat pengembalian dan kondisi barang (KF-10)",
      roles: roles.operators,
      description:
        "Transaksi atomik: kondisi `damaged` membuat status barang `damaged`; selain itu `available`. Riwayat kondisi dicatat.",
      parameters: [idParam],
      body: "LoanReturnRequest",
      responses: { "200": success("Pengembalian dicatat", ref("Loan"), "Pengembalian berhasil dicatat") },
      errors: ["400", "401", "403", "404", "409", "503"],
    }),
  },
  "/api/v1/users": {
    get: operation({
      tag: "Users",
      summary: "Daftar pengguna (juga untuk memilih peminjam)",
      roles: roles.operators,
      parameters: [
        ...pageParams,
        queryParam("q", { type: "string", maxLength: 100 }, "Cari nama, email, atau ID personel"),
        queryParam("role", { type: "string", enum: ["staff", "inventory_officer", "admin"] }),
        queryParam("account_status", { type: "string", enum: ["active", "inactive"] }),
      ],
      responses: { "200": success("Daftar pengguna", paginated("ManagedUser")) },
      errors: ["400", "401", "403", "503"],
    }),
    post: operation({
      tag: "Users",
      summary: "Buat akun pengguna (KF-06)",
      roles: roles.admin,
      description: "Email langsung terverifikasi; pengguna dapat login dengan password yang diberikan.",
      body: "UserCreateRequest",
      responses: { "201": success("Pengguna dibuat", ref("ManagedUser"), "Pengguna berhasil dibuat") },
      errors: ["400", "401", "403", "409", "503"],
    }),
  },
  "/api/v1/users/{id}": {
    get: operation({
      tag: "Users",
      summary: "Detail pengguna",
      roles: roles.operators,
      parameters: [idParam],
      responses: { "200": success("Detail pengguna", ref("ManagedUser")) },
      errors: ["400", "401", "403", "404", "503"],
    }),
    put: operation({
      tag: "Users",
      summary: "Ubah data, peran, atau status pengguna (KF-06)",
      roles: roles.admin,
      description:
        "Hanya field yang dikirim yang diubah. Admin tidak dapat mengubah peran atau menonaktifkan akun sendiri (403). Akun `inactive` langsung ditolak pada request berikutnya.",
      parameters: [idParam],
      body: "UserUpdateRequest",
      responses: { "200": success("Pengguna diperbarui", ref("ManagedUser"), "Pengguna berhasil diperbarui") },
      errors: ["400", "401", "403", "404", "409", "503"],
    }),
  },
  "/api/v1/dashboard/summary": {
    get: operation({
      tag: "Dashboard",
      summary: "Ringkasan dashboard admin (KF-02)",
      roles: roles.admin,
      description: "Total barang, dipinjam, terlambat, rusak, grafik mingguan (minggu Senin-Minggu WIB), dan daftar keterlambatan.",
      parameters: [
        queryParam("weeks", { type: "integer", minimum: 1, maximum: 12, default: 4 }),
        queryParam("overdue_limit", { type: "integer", minimum: 1, maximum: 20, default: 5 }),
      ],
      responses: { "200": success("Ringkasan dashboard", ref("DashboardSummary")) },
      errors: ["400", "401", "403", "503"],
    }),
  },
};

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const uuid: OpenApiSchema = { type: "string", format: "uuid", example: uuidExample };
const timestamp: OpenApiSchema = { type: "string", format: "date-time", example: timestampExample };
const nullableString = (example: string, maxLength?: number): OpenApiSchema => ({
  type: "string",
  nullable: true,
  example,
  ...(maxLength === undefined ? {} : { maxLength }),
});
const conditionEnum: OpenApiSchema = {
  type: "string",
  enum: ["good", "minor_damage", "damaged"],
  description: "good = baik, minor_damage = rusak ringan (tetap dapat dipinjam), damaged = rusak",
  example: "good",
};
const barcode: OpenApiSchema = {
  type: "string",
  pattern: "^[A-Z0-9][A-Z0-9._-]{2,63}$",
  description: "Dinormalisasi ke huruf besar",
  example: "INV-RPL-0012",
};
const officerRef: OpenApiSchema = {
  type: "object",
  required: ["user_id", "full_name"],
  properties: { user_id: uuid, full_name: { type: "string", example: "Petugas Sarana" } },
};

const loanProperties: Record<string, OpenApiSchema> = {
  id: uuid,
  status: { type: "string", enum: ["active", "returned"], example: "active" },
  is_overdue: { type: "boolean", example: false, description: "Aktif dan melewati jatuh tempo" },
  overdue_days: { type: "integer", example: 0 },
  returned_late: { type: "boolean", example: false },
  borrowed_at: timestamp,
  due_at: timestamp,
  returned_at: { ...timestamp, nullable: true },
  notes: nullableString("Untuk praktik"),
  return_condition: { ...conditionEnum, nullable: true },
  return_notes: nullableString("Layar tergores"),
  item: ref("ItemRef"),
  borrower: ref("PersonRef"),
  officer: officerRef,
  return_officer: { ...officerRef, nullable: true },
  created_at: timestamp,
  updated_at: timestamp,
};

const itemProperties: Record<string, OpenApiSchema> = {
  id: uuid,
  barcode,
  name: { type: "string", example: "Laptop Asus A14" },
  category: ref("CategoryRef"),
  location: nullableString("Lab RPL 1"),
  condition: conditionEnum,
  status: { type: "string", enum: ["available", "borrowed", "damaged"], example: "available" },
  acquired_at: { type: "string", format: "date", nullable: true, example: "2026-07-15" },
  notes: nullableString("Inventaris BOS 2026"),
  created_at: timestamp,
  updated_at: timestamp,
};

export const inventorySchemas: Record<string, OpenApiSchema> = {
  Pagination: {
    type: "object",
    required: ["page", "limit", "total", "total_pages"],
    properties: {
      page: { type: "integer", example: 1 },
      limit: { type: "integer", example: 20 },
      total: { type: "integer", example: 42 },
      total_pages: { type: "integer", example: 3 },
    },
  },
  CategoryRef: {
    type: "object",
    required: ["id", "name"],
    properties: { id: uuid, name: { type: "string", example: "Komputer" } },
  },
  Category: {
    type: "object",
    required: ["id", "name", "description", "item_count", "created_at", "updated_at"],
    properties: {
      id: uuid,
      name: { type: "string", example: "Komputer" },
      description: nullableString("Laptop dan PC praktik"),
      item_count: { type: "integer", example: 12 },
      created_at: timestamp,
      updated_at: timestamp,
    },
  },
  CategoryCreateRequest: {
    type: "object",
    additionalProperties: false,
    required: ["name"],
    properties: {
      name: { type: "string", minLength: 2, maxLength: 80, example: "Komputer" },
      description: nullableString("Laptop dan PC praktik", 500),
    },
  },
  CategoryUpdateRequest: {
    type: "object",
    additionalProperties: false,
    description: "Minimal satu field",
    properties: {
      name: { type: "string", minLength: 2, maxLength: 80, example: "Komputer" },
      description: nullableString("Laptop dan PC praktik", 500),
    },
  },
  ItemRef: {
    type: "object",
    required: ["id", "barcode", "name", "category"],
    properties: {
      id: uuid,
      barcode,
      name: { type: "string", example: "Laptop Asus A14" },
      category: ref("CategoryRef"),
    },
  },
  Item: { type: "object", required: Object.keys(itemProperties), properties: itemProperties },
  ItemDetail: {
    type: "object",
    required: [...Object.keys(itemProperties), "active_loan"],
    properties: {
      ...itemProperties,
      active_loan: { ...ref("ActiveLoan"), nullable: true },
    },
  },
  ItemCreateRequest: {
    type: "object",
    additionalProperties: false,
    required: ["name", "category_id"],
    properties: {
      barcode: { ...barcode, description: "Opsional; dibuat otomatis bila kosong" },
      name: { type: "string", minLength: 2, maxLength: 150, example: "Laptop Asus A14" },
      category_id: uuid,
      location: nullableString("Lab RPL 1", 120),
      condition: { ...conditionEnum, default: "good" },
      acquired_at: { type: "string", format: "date", nullable: true, example: "2026-07-15" },
      notes: nullableString("Inventaris BOS 2026", 1000),
    },
  },
  ItemUpdateRequest: {
    type: "object",
    additionalProperties: false,
    description: "Minimal satu field. Status barang tidak dapat diubah langsung.",
    properties: {
      barcode,
      name: { type: "string", minLength: 2, maxLength: 150 },
      category_id: uuid,
      location: nullableString("Lab RPL 2", 120),
      condition: conditionEnum,
      acquired_at: { type: "string", format: "date", nullable: true },
      notes: nullableString("Catatan perubahan kondisi", 1000),
    },
  },
  PersonRef: {
    type: "object",
    required: ["user_id", "full_name", "staff_id", "school_unit"],
    properties: {
      user_id: uuid,
      full_name: { type: "string", example: "Budi Santoso" },
      staff_id: { type: "string", example: "SIS-2026-001" },
      school_unit: { type: "string", example: "XI RPL 1" },
    },
  },
  Loan: { type: "object", required: Object.keys(loanProperties), properties: loanProperties },
  ActiveLoan: {
    type: "object",
    description: "Sama dengan Loan tanpa field `item`",
    properties: Object.fromEntries(Object.entries(loanProperties).filter(([key]) => key !== "item")),
  },
  LoanCreateRequest: {
    type: "object",
    additionalProperties: false,
    required: ["item_id", "borrower_id", "due_at"],
    properties: {
      item_id: uuid,
      borrower_id: { ...uuid, description: "user_id peminjam (GET /api/v1/users)" },
      due_at: {
        type: "string",
        example: "2026-11-14",
        description:
          "YYYY-MM-DD (berarti 23:59:59 WIB) atau ISO 8601 datetime dengan zona waktu. Harus di masa depan, maksimal 1 tahun.",
      },
      notes: nullableString("Untuk praktik jaringan", 500),
    },
  },
  LoanReturnRequest: {
    type: "object",
    additionalProperties: false,
    required: ["condition"],
    properties: {
      condition: conditionEnum,
      notes: nullableString("Layar tergores", 500),
    },
  },
  ConditionLog: {
    type: "object",
    required: ["id", "loan_id", "condition", "event", "notes", "recorded_at", "recorded_by"],
    properties: {
      id: uuid,
      loan_id: { ...uuid, nullable: true },
      condition: conditionEnum,
      event: { type: "string", enum: ["registered", "borrowed", "returned", "updated"], example: "returned" },
      notes: nullableString("Layar tergores"),
      recorded_at: timestamp,
      recorded_by: { ...officerRef, nullable: true },
    },
  },
  ItemHistory: {
    type: "object",
    required: ["item", "loans", "condition_logs"],
    properties: {
      item: ref("ItemDetail"),
      loans: { type: "array", items: ref("Loan") },
      condition_logs: { type: "array", items: ref("ConditionLog") },
    },
  },
  ManagedUser: {
    type: "object",
    required: [
      "user_id",
      "full_name",
      "email",
      "staff_id",
      "school_unit",
      "role",
      "account_status",
      "created_at",
      "updated_at",
    ],
    properties: {
      user_id: uuid,
      full_name: { type: "string", example: "Budi Santoso" },
      email: { type: "string", format: "email", example: "budi@example.com" },
      staff_id: { type: "string", example: "SIS-2026-001" },
      school_unit: { type: "string", example: "XI RPL 1" },
      role: { type: "string", enum: ["staff", "inventory_officer", "admin"], example: "staff" },
      account_status: { type: "string", enum: ["active", "inactive"], example: "active" },
      created_at: timestamp,
      updated_at: timestamp,
    },
  },
  UserCreateRequest: {
    type: "object",
    additionalProperties: false,
    required: ["full_name", "email", "password", "staff_id", "school_unit"],
    properties: {
      full_name: { type: "string", minLength: 2, maxLength: 120, example: "Budi Santoso" },
      email: { type: "string", format: "email", maxLength: 254, example: "budi@example.com" },
      password: { type: "string", format: "password", minLength: 8, maxLength: 128, example: "Rahasia123!" },
      staff_id: { type: "string", minLength: 3, maxLength: 50, example: "SIS-2026-001" },
      school_unit: { type: "string", minLength: 2, maxLength: 100, example: "XI RPL 1" },
      role: { type: "string", enum: ["staff", "inventory_officer", "admin"], default: "staff" },
    },
  },
  UserUpdateRequest: {
    type: "object",
    additionalProperties: false,
    description: "Minimal satu field",
    properties: {
      full_name: { type: "string", minLength: 2, maxLength: 120 },
      school_unit: { type: "string", minLength: 2, maxLength: 100 },
      role: { type: "string", enum: ["staff", "inventory_officer", "admin"], example: "inventory_officer" },
      account_status: { type: "string", enum: ["active", "inactive"] },
    },
  },
  DashboardSummary: {
    type: "object",
    required: ["generated_at", "items", "categories", "loans", "weekly_loans", "overdue_loans"],
    properties: {
      generated_at: timestamp,
      items: {
        type: "object",
        properties: {
          total: { type: "integer", example: 248 },
          available: { type: "integer", example: 208 },
          borrowed: { type: "integer", example: 37 },
          damaged: { type: "integer", example: 3 },
        },
      },
      categories: { type: "object", properties: { total: { type: "integer", example: 12 } } },
      loans: {
        type: "object",
        properties: {
          active: { type: "integer", example: 37 },
          overdue: { type: "integer", example: 5 },
          borrowed_this_month: { type: "integer", example: 62 },
        },
      },
      weekly_loans: {
        type: "array",
        items: {
          type: "object",
          properties: {
            week_start: { type: "string", format: "date", example: "2026-11-02" },
            week_end: { type: "string", format: "date", example: "2026-11-08" },
            total: { type: "integer", example: 18 },
          },
        },
      },
      overdue_loans: { type: "array", items: ref("Loan") },
    },
  },
};
