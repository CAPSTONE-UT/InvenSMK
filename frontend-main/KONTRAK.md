# Kontrak API

Dokumen ini menjelaskan kontrak HTTP yang saat ini diimplementasikan oleh School Inventory Backend. Sumber utamanya adalah route, controller, schema validasi, middleware, dan service di `src/`.

## Ringkasan

- Base URL development: `http://localhost:3000`
- Format request dan response: JSON (`Content-Type: application/json` untuk request dengan body)
- Versi route API: `/api/v1`
- Autentikasi: Supabase access token dengan skema Bearer
- Endpoint dokumentasi interaktif: `/api-docs/` dan `/api-docs/openapi.json`, hanya tersedia saat `NODE_ENV=development`

| Method | Path | Auth | Sukses |
|---|---|---|---|
| `GET` | `/health` | Tidak | `200` |
| `POST` | `/api/v1/auth/register` | Tidak | `201` |
| `POST` | `/api/v1/auth/login` | Tidak | `200` |
| `POST` | `/api/v1/auth/logout` | Bearer | `200` |
| `GET` | `/api/v1/auth/profile` | Bearer | `200` |
| `POST` | `/api/v1/auth/refresh` | Tidak | `200` |
| | Endpoint inventaris (kategori, barang, peminjaman, pengguna, dashboard) | Bearer + peran | lihat bagian *Endpoint inventaris* |

## Aturan umum

### Header

Untuk request yang mengirim body, gunakan:

```http
Content-Type: application/json
```

Untuk `logout` dan `profile`, kirim access token:

```http
Authorization: Bearer <access-token>
```

Token harus valid, belum kedaluwarsa atau dicabut, serta terkait dengan profil personel berstatus `active`. API belum menerapkan pembatasan akses berbasis role; nilai `role` dikembalikan sebagai informasi profil.

### Envelope sukses

Field yang tidak relevan tidak disertakan. Dengan demikian, `data` dan `message` bersifat opsional secara umum.

```json
{
  "success": true,
  "data": {},
  "message": "Operasi berhasil"
}
```

### Envelope error

```json
{
  "success": false,
  "message": "Data permintaan tidak valid",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "path": "email", "message": "Invalid email address" }
    ]
  }
}
```

`error.details` hanya ada jika tersedia, terutama pada validasi body. Error internal tidak mengirim stack trace atau detail internal.

| HTTP | Kode | Makna |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | Body tidak sesuai schema |
| `401` | `AUTHENTICATION_ERROR` | Kredensial atau token tidak valid, session dicabut, atau profil tidak aktif |
| `404` | `NOT_FOUND_ERROR` | Route atau profil personel tidak ditemukan |
| `409` | `CONFLICT_ERROR` | Akun/email atau `staff_id` sudah digunakan |
| `503` | `DEPENDENCY_ERROR` | Supabase atau dependency autentikasi gagal |
| `500` | `INTERNAL_ERROR` | Kesalahan internal yang tidak ditangani sebagai error API tertentu |

## Endpoint

### `GET /health`

Memeriksa bahwa proses API merespons. Tidak memeriksa ketersediaan Supabase.

**Sukses — `200 OK`**

```json
{
  "success": true,
  "data": { "status": "ok" }
}
```

### `POST /api/v1/auth/register`

Membuat akun staf melalui Supabase Auth. Profil personel dibuat oleh trigger database berdasarkan metadata pendaftaran; role dan status awal ditetapkan database masing-masing menjadi `staff` dan `active`.

**Request**

```json
{
  "full_name": "Siti Aminah",
  "email": "siti@example.com",
  "password": "Rahasia123!",
  "staff_id": "STF-001",
  "school_unit": "Unit Sarana"
}
```

Semua field wajib. Field tambahan ditolak.

| Field | Tipe | Aturan |
|---|---|---|
| `full_name` | string | Setelah trim: 2–120 karakter |
| `email` | string | Email valid, maksimal 254 karakter; di-trim dan diubah menjadi huruf kecil |
| `password` | string | 8–128 karakter |
| `staff_id` | string | Setelah trim: 3–50 karakter; harus unik tanpa membedakan kapitalisasi |
| `school_unit` | string | Setelah trim: 2–100 karakter |

**Sukses — `201 Created`, email perlu diverifikasi**

Jika Supabase belum memberikan session (umumnya saat konfirmasi email diaktifkan), response tidak berisi `session`:

```json
{
  "success": true,
  "data": {
    "user_id": "00000000-0000-0000-0000-000000000000",
    "email": "siti@example.com",
    "email_verification_required": true
  },
  "message": "Pendaftaran berhasil; silakan verifikasi email"
}
```

**Sukses — `201 Created`, session tersedia**

Jika Supabase mengembalikan session (misalnya konfirmasi email dinonaktifkan), `email_verification_required` bernilai `false` dan object session disertakan:

```json
{
  "success": true,
  "data": {
    "user_id": "00000000-0000-0000-0000-000000000000",
    "email": "siti@example.com",
    "email_verification_required": false,
    "session": {
      "access_token": "<access-token>",
      "refresh_token": "<refresh-token>",
      "token_type": "bearer",
      "expires_at": 1893456000
    }
  },
  "message": "Pendaftaran berhasil"
}
```

`expires_at` adalah Unix timestamp dalam detik. Gunakan `access_token` sebagai Bearer token untuk endpoint terproteksi.

**Error yang mungkin:** `400 VALIDATION_ERROR`, `409 CONFLICT_ERROR`, `503 DEPENDENCY_ERROR`, `500 INTERNAL_ERROR`.

### `POST /api/v1/auth/login`

Memverifikasi kredensial dan mengembalikan session serta profil pengguna. Akun tanpa profil aktif ditolak.

**Request**

```json
{
  "email": "siti@example.com",
  "password": "Rahasia123!"
}
```

Kedua field wajib. Field tambahan ditolak. `email` harus valid, maksimal 254 karakter, lalu di-trim dan diubah menjadi huruf kecil. `password` harus 1–128 karakter.

**Sukses — `200 OK`**

```json
{
  "success": true,
  "data": {
    "session": {
      "access_token": "<access-token>",
      "refresh_token": "<refresh-token>",
      "token_type": "bearer",
      "expires_at": 1893456000
    },
    "user": {
      "user_id": "00000000-0000-0000-0000-000000000000",
      "full_name": "Siti Aminah",
      "email": "siti@example.com",
      "staff_id": "STF-001",
      "school_unit": "Unit Sarana",
      "role": "staff",
      "account_status": "active"
    }
  },
  "message": "Login berhasil"
}
```

Nilai `role`: `staff`, `inventory_officer`, `admin`. Nilai `account_status`: `active`, `inactive` (login hanya berhasil untuk `active`).

**Error yang mungkin:** `400 VALIDATION_ERROR`, `401 AUTHENTICATION_ERROR`, `503 DEPENDENCY_ERROR`, `500 INTERNAL_ERROR`.

### `POST /api/v1/auth/logout`

Mencabut session yang terkait dengan access token aktif. Refresh token tidak diterima sebagai pengganti access token.

**Header:** `Authorization: Bearer <access-token>`

**Sukses — `200 OK`**

```json
{
  "success": true,
  "message": "Logout berhasil"
}
```

**Error yang mungkin:** `401 AUTHENTICATION_ERROR`, `503 DEPENDENCY_ERROR`, `500 INTERNAL_ERROR`.

### `GET /api/v1/auth/profile`

Mengambil profil personel yang terhubung dengan access token aktif.

**Header:** `Authorization: Bearer <access-token>`

**Sukses — `200 OK`**

```json
{
  "success": true,
  "data": {
    "user_id": "00000000-0000-0000-0000-000000000000",
    "full_name": "Siti Aminah",
    "email": "siti@example.com",
    "staff_id": "STF-001",
    "school_unit": "Unit Sarana",
    "role": "staff",
    "account_status": "active"
  }
}
```

**Error yang mungkin:** `401 AUTHENTICATION_ERROR`, `404 NOT_FOUND_ERROR` (profil tidak ditemukan), `503 DEPENDENCY_ERROR`, `500 INTERNAL_ERROR`.

## Endpoint inventaris

Ringkasan endpoint yang dipakai frontend. Skema request/response lengkap ada di Swagger backend
(`/api-docs/`) dan tipe TypeScript di [`src/types/api.ts`](src/types/api.ts).

Peran: `admin` = Admin, `inventory_officer` = Petugas, `staff` = Peminjam. Peran yang tidak
diizinkan menerima `403 AUTHORIZATION_ERROR`.

| Method | Path | Peran | Dipakai di |
|---|---|---|---|
| `POST` | `/api/v1/auth/refresh` | Publik | Interceptor Axios (refresh otomatis saat 401) |
| `GET` | `/api/v1/categories` | Semua | `/categories`, filter `/items`, form barang |
| `POST` / `PUT` / `DELETE` | `/api/v1/categories[/{id}]` | Admin | `/categories` |
| `GET` | `/api/v1/items` | Admin, Petugas | `/items` (filter `q`, `category_id`, `status`) |
| `GET` | `/api/v1/items/code/{code}` | Admin, Petugas | `/pindai` |
| `GET` | `/api/v1/items/{id}` | Admin, Petugas | `/items/labels` |
| `GET` | `/api/v1/items/{id}/history` | Admin, Petugas | `/items/[id]` |
| `POST` / `PUT` / `DELETE` | `/api/v1/items[/{id}]` | Admin | `/items`, `/items/[id]` |
| `GET` | `/api/v1/loans?status=active\|overdue\|returned\|all` | Admin, Petugas | `/loans`, `/loans/history`, dashboard petugas |
| `GET` | `/api/v1/loans/me` | Semua | `/my-loans` |
| `POST` | `/api/v1/loans` | Admin, Petugas | `/pindai` (barang tersedia) |
| `POST` | `/api/v1/loans/{id}/return` | Admin, Petugas | `/pindai`, `/loans`, `/items/[id]` |
| `GET` | `/api/v1/users` | Admin, Petugas | `/users`, pencarian peminjam di `/pindai` |
| `POST` / `PUT` | `/api/v1/users[/{id}]` | Admin | `/users` |
| `GET` | `/api/v1/dashboard/summary` | Admin | `/dashboard` |

Endpoint daftar mengembalikan `data: { items, pagination: { page, limit, total, total_pages } }`.
`POST /api/v1/loans` yang ditolak karena barang sudah dipinjam mengembalikan `409` dengan
`error.details.active_loan`.

## Catatan perilaku

- Body JSON dibatasi hingga 100 KB.
- Route yang tidak terdaftar menghasilkan `404 NOT_FOUND_ERROR` dengan pesan yang menyebut method dan path.
- Access token dan refresh token disimpan di `localStorage`. Saat API mengembalikan `401`, frontend mencoba `POST /api/v1/auth/refresh` satu kali, lalu mengulang request; bila gagal, pengguna diarahkan ke halaman masuk.
- OpenAPI runtime tersedia di `GET /api-docs/openapi.json` dan Swagger UI di `GET /api-docs/` hanya pada environment development. Dokumen ini merangkum route aplikasi, bukan menggantikan spesifikasi OpenAPI runtime.
