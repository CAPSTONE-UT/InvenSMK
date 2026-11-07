# Quickstart Validation: Authentication & User Management

Panduan ini memvalidasi alur end-to-end setelah implementasi selesai. Kontrak response lengkap ada
di [contracts/auth.openapi.yaml](contracts/auth.openapi.yaml), sedangkan aturan data ada di
[data-model.md](data-model.md).

## Prerequisites

- Node.js 24 LTS dan pnpm 10.
- Supabase project lokal atau khusus pengujian; jangan gunakan project produksi.
- Email confirmation aktif dan inbox pengujian dapat diakses.
- Migration fitur telah diterapkan.
- Environment berikut tersedia tanpa dimasukkan ke source control:
  - `PORT`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Setup and automated validation

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm dev
```

Expected outcomes:

1. Strict TypeScript check selesai tanpa error.
2. Unit, contract, dan integration tests lulus.
3. Server berjalan pada port yang dikonfigurasi.
4. Log tidak menampilkan password, access token, refresh token, atau service-role key.

## End-to-end scenario

Gunakan nilai unik pada setiap run:

```bash
export BASE_URL="http://localhost:3000/api/v1"
export TEST_EMAIL="staff.$(date +%s)@school.test"
export TEST_STAFF_ID="STF-$(date +%s)"
```

### 1. Register

```bash
curl -i -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"full_name\":\"Petugas Inventaris Uji\",\"email\":\"$TEST_EMAIL\",\"password\":\"ValidPass123!\",\"staff_id\":\"$TEST_STAFF_ID\",\"school_unit\":\"Gudang\"}"
```

Expected: HTTP `201`, `success: true`, role tidak dapat dipilih dari request, dan pesan meminta
verifikasi email. Pastikan row profil dibuat dengan `role = staff`.

Ulangi request dengan `staff_id` yang sama. Expected: HTTP `409`, `success: false`, dan tidak ada
akun/profil duplikat.

### 2. Verify email

Buka email pengujian dan selesaikan link confirmation. Sebelum confirmation, percobaan login harus
menghasilkan HTTP `401` dengan pesan generik.

### 3. Login

```bash
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"ValidPass123!\"}"
```

Expected: HTTP `200`, `success: true`, data berisi `session` dan profil pengguna. Simpan
`access_token` sebagai `ACCESS_TOKEN` menggunakan alat JSON pilihan Anda; jangan mencetak atau
menyimpan token pada log bersama.

### 4. Read own profile

```bash
curl -i "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Expected: HTTP `200`; profil hanya berisi `user_id`, `full_name`, `email`, `staff_id`,
`school_unit`, `role`, dan `account_status` milik pengguna aktif.

Ulangi tanpa header atau dengan token rusak. Expected: HTTP `401` dan tidak ada profil atau data
inventaris dalam response.

### 5. Logout and prove immediate rejection

```bash
curl -i -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl -i "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Expected: logout pertama HTTP `200`. Request profil berikutnya dengan token yang sama HTTP `401`,
meskipun expiry token belum tercapai.

## Security checks

- Login dengan email tidak dikenal dan password salah menghasilkan status/pesan publik yang sama.
- Request register yang menyertakan `role: "admin"` ditolak sebagai field tambahan dan tidak
  mengubah default `staff`.
- Akun dengan `account_status = inactive` tidak dapat login atau memakai token lama.
- Semua response mengikuti `{ success, data?, message?, error? }` dan memakai key JSON snake_case.
- Error produksi tidak memuat stack trace, provider error mentah, password, atau token.
