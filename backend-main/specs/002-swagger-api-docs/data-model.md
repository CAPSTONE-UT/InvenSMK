# Data Model: Dokumentasi API Swagger dan OpenAPI

Dokumen ini memodelkan entitas kontrak dokumentasi; tidak ada tabel database atau perubahan
persistensi.

## Dokumen API

- `openapi`: versi spesifikasi OpenAPI 3.0.
- `info`: judul, versi, dan deskripsi School Inventory Backend.
- `servers`: base URL development yang dapat digunakan Swagger UI.
- `paths`: kumpulan operasi API yang dapat dipanggil.
- `components`: skema payload bersama dan security scheme Bearer.

## Operasi API

Setiap operasi memiliki:

- `method` dan `path`.
- ringkasan serta deskripsi.
- `requestBody` atau parameter bila diperlukan.
- `responses` untuk status sukses dan error.
- `security` hanya untuk operasi profile dan logout.

Operasi wajib:

| Method | Path | Auth | Request |
|---|---|---|---|
| GET | `/health` | Tidak | Tidak ada |
| POST | `/api/v1/auth/register` | Tidak | `full_name`, `email`, `password`, `staff_id`, `school_unit` |
| POST | `/api/v1/auth/login` | Tidak | `email`, `password` |
| POST | `/api/v1/auth/logout` | Bearer | Header Authorization |
| GET | `/api/v1/auth/profile` | Bearer | Header Authorization |

## Skema Request

- **RegisterRequest**: semua field wajib; `full_name` 2-120 karakter, `email` format email
  maksimal 254 karakter, `password` 8-128 karakter, `staff_id` 3-50 karakter, dan
  `school_unit` 2-100 karakter. Field tambahan ditolak.
- **LoginRequest**: `email` wajib dan valid maksimal 254 karakter; `password` wajib 1-128
  karakter. Field tambahan ditolak.

## Skema Response

- **SuccessEnvelope**: `success: true`, optional `data`, optional `message`.
- **ErrorEnvelope**: `success: false`, `message`, dan `error` berisi `code` serta optional
  `details`.
- **UserProfile**: `user_id`, `full_name`, `email`, `staff_id`, `school_unit`, `role`, dan
  `account_status`.
- **AuthSession**: `access_token`, `refresh_token`, `token_type`, dan `expires_at`.

## Security dan Status

Security scheme menggunakan HTTP Bearer. Profile/logout mengembalikan kegagalan autentikasi
ketika header hilang, format salah, atau token tidak valid. Implementasi saat ini tidak
memiliki middleware role-based authorization terpisah; model dokumentasi tidak boleh mengklaim
pembatasan role atau status akun yang tidak diverifikasi.

Error yang terdokumentasi mencakup 400 validation, 401 authentication, 404 not found,
409 conflict, 503 dependency, dan 500 internal bila relevan terhadap operasi. Setiap contoh
error menggunakan `{ success: false, message, error }`; `error` hanya memuat `code` dan
detail validasi yang aman, tanpa credential atau stack trace.
