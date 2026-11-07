# School Inventory Backend

Backend REST API untuk sistem inventaris sekolah. Aplikasi menggunakan Node.js,
TypeScript, Express, Zod, dan Supabase.

Panduan utama full-stack ada di [README root](../README.md). Tidak ada package root;
semua perintah di dokumen ini dijalankan dari `backend-main`.

## Prasyarat

- Node.js `>=24.0.0 <25`
- pnpm `10.30.2`
- Project Supabase yang sudah dikonfigurasi untuk autentikasi dan tabel aplikasi

Versi pnpm dapat diaktifkan melalui Corepack:

```powershell
corepack enable
corepack prepare pnpm@10.30.2 --activate
```

## Instalasi

Jalankan perintah berikut dari direktori project:

```powershell
pnpm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Kemudian isi nilai environment pada `.env`. Jangan commit file `.env` atau
membagikan service role key.

```dotenv
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

`PORT` dan `NODE_ENV` memiliki default masing-masing `3000` dan `development`.
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` wajib diisi.

### Migration database

Jalankan file SQL berikut **berurutan** di Supabase (SQL Editor atau `supabase db push`):

1. [`supabase/migrations/20261008_create_auth_profiles.sql`](supabase/migrations/20261008_create_auth_profiles.sql)
   — profil personel dan registry session yang dicabut.
2. [`supabase/migrations/20261107_create_inventory_loans.sql`](supabase/migrations/20261107_create_inventory_loans.sql)
   — `categories`, `items`, `loans`, `condition_logs`, view `user_directory`, serta fungsi
   transaksi `create_loan` dan `return_loan`.

Akun yang mendaftar memiliki role `staff`. Jadikan admin pertama secara manual:

```sql
update public.school_staff_profiles set role = 'admin' where staff_id = 'STF-001';
```

Setelah itu admin dapat mengelola peran pengguna lain melalui `PUT /api/v1/users/{id}`.

### Mengisi data demo

Setelah migration selesai dijalankan, seed membuat akun untuk setiap role, kategori,
barang dengan beragam kondisi, dan contoh peminjaman aktif, terlambat, serta selesai.
Jalankan dari folder `backend-main`:

```powershell
pnpm seed:demo
```

Skrip memakai `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` dari `.env`. Semua akun
menggunakan password awal `DemoInventaris!2026`. Untuk menggantinya, tambahkan
`DEMO_PASSWORD=PasswordDemoAnda` ke `.env` sebelum menjalankan seed. Seed aman dijalankan
ulang: akun dan barang demo diperbarui, sementara data demo memakai identitas tetap.

Seed juga mengatur akun Auth agar email terkonfirmasi dan status profil aktif. Setiap
eksekusi mengatur ulang password akun demo ke `DEMO_PASSWORD` atau password awal; jangan
jalankan seed pada project produksi.

| Role | Email | Password awal |
|---|---|---|
| Admin | `admin@demo.invensmk.local` | `DemoInventaris!2026` |
| Petugas (`inventory_officer`) | `petugas@demo.invensmk.local` | `DemoInventaris!2026` |
| Peminjam guru (`staff`) | `guru@demo.invensmk.local` | `DemoInventaris!2026` |
| Peminjam siswa (`staff`) | `siswa@demo.invensmk.local` | `DemoInventaris!2026` |

Seed mengatur ulang password akun demo tersebut ke nilai `DEMO_PASSWORD` (atau password
awal di atas) setiap kali dijalankan. Gunakan hanya pada project Supabase demo/pengembangan.

## Menjalankan aplikasi

### Development

```powershell
pnpm dev
```

Server berjalan pada `http://localhost:3000` secara default.

### Production

Build dan jalankan aplikasi dengan:

```powershell
pnpm build
pnpm start
```

Gunakan `NODE_ENV=production` pada deployment production. Swagger UI tidak
dipasang ketika environment bukan `development`.

## Dokumentasi API interaktif

Pada `NODE_ENV=development`, dokumentasi tersedia di:

- Swagger UI: <http://localhost:3000/api-docs/>
- OpenAPI JSON: <http://localhost:3000/api-docs/openapi.json>

Swagger UI menggunakan dokumen OpenAPI runtime yang didefinisikan di
[`src/docs/openapi.ts`](src/docs/openapi.ts). Gunakan tombol **Try it out** untuk
mengirim request dari browser.

Endpoint `profile` dan `logout` memerlukan Bearer token:

1. Jalankan request login.
2. Salin `access_token` dari response login atau register ketika email
   confirmation dinonaktifkan.
3. Klik **Authorize** pada Swagger UI.
4. Masukkan token sesuai format Bearer yang diminta UI.
5. Jalankan request `GET /api/v1/auth/profile` atau `POST /api/v1/auth/logout`.

Contoh token pada dokumentasi hanya placeholder yang disamarkan dan bukan
credential nyata.

## Peran dan hak akses

Nilai `role` di database dipetakan ke peran pada rancangan sistem:

| `role` | Peran | Ringkasan akses |
|---|---|---|
| `admin` | Admin | Akses penuh: data master, pengguna, dashboard |
| `inventory_officer` | Petugas | Pindai barcode, catat pinjam/kembali, lihat barang dan peminjaman |
| `staff` | Peminjam (siswa/guru) | Lihat riwayat peminjaman milik sendiri |

Request tanpa token valid menerima `401 AUTHENTICATION_ERROR`; peran yang tidak diizinkan
menerima `403 AUTHORIZATION_ERROR`. Akun `inactive` ditolak pada setiap request.

## Endpoint yang tersedia

Semua path di bawah (kecuali health, register, login, refresh) memerlukan header
`Authorization: Bearer <access_token>`. Detail schema ada di Swagger UI.

| Method | Path | Peran | Keterangan |
|---|---|---|---|
| `GET` | `/health` | Publik | Status layanan |
| `POST` | `/api/v1/auth/register` | Publik | Pendaftaran akun (role `staff`) |
| `POST` | `/api/v1/auth/login` | Publik | Login, mengembalikan session dan profil |
| `POST` | `/api/v1/auth/refresh` | Publik | Tukar `refresh_token` dengan session baru |
| `POST` | `/api/v1/auth/logout` | Semua | Mencabut session aktif |
| `GET` | `/api/v1/auth/profile` | Semua | Profil pengguna aktif |
| `GET` | `/api/v1/categories` | Semua | Daftar kategori (+ `item_count`) |
| `GET` | `/api/v1/categories/{id}` | Semua | Detail kategori |
| `POST` / `PUT` / `DELETE` | `/api/v1/categories[/{id}]` | Admin | Kelola kategori (KF-04) |
| `GET` | `/api/v1/items` | Admin, Petugas | Daftar barang; filter `q`, `category_id`, `status`, `condition` |
| `GET` | `/api/v1/items/code/{code}` | Admin, Petugas | Cari barang dari barcode/kode manual (KF-07, KF-08) |
| `GET` | `/api/v1/items/{id}` | Admin, Petugas | Detail barang + `active_loan` |
| `GET` | `/api/v1/items/{id}/history` | Admin, Petugas | Riwayat peminjaman dan kondisi (KF-13) |
| `POST` / `PUT` / `DELETE` | `/api/v1/items[/{id}]` | Admin | Kelola barang (KF-03) |
| `GET` | `/api/v1/loans` | Admin, Petugas | Daftar peminjaman; filter `status`, `item_id`, `borrower_id`, tanggal (KF-11) |
| `GET` | `/api/v1/loans/me` | Semua | Peminjaman milik sendiri (KF-12) |
| `GET` | `/api/v1/loans/{id}` | Semua | Detail; peminjam hanya miliknya |
| `POST` | `/api/v1/loans` | Admin, Petugas | Catat peminjaman (KF-09) |
| `POST` | `/api/v1/loans/{id}/return` | Admin, Petugas | Catat pengembalian + kondisi (KF-10) |
| `GET` | `/api/v1/users` | Admin, Petugas | Daftar pengguna (untuk memilih peminjam) |
| `GET` | `/api/v1/users/{id}` | Admin, Petugas | Detail pengguna |
| `POST` | `/api/v1/users` | Admin | Buat akun tanpa verifikasi email (KF-06) |
| `PUT` | `/api/v1/users/{id}` | Admin | Ubah nama, unit, `role`, `account_status` (KF-06) |
| `GET` | `/api/v1/dashboard/summary` | Admin | Ringkasan, grafik mingguan, daftar terlambat (KF-02) |

Filter `status` pada `/api/v1/loans` menerima `all`, `active`, `overdue`, `returned`, serta
alias `aktif`, `terlambat`, `selesai`.

### Aturan bisnis penting

- **Status barang** (`available`, `borrowed`, `damaged`) dikelola sistem dan tidak dapat
  diubah langsung. Kondisi `damaged` membuat status `damaged`; `good` atau `minor_damage`
  membuat status `available`. Status `borrowed` hanya berasal dari peminjaman aktif.
- **Barcode** dinormalisasi ke huruf besar, unik, 3–64 karakter (`A-Z 0-9 . _ -`). Bila tidak
  dikirim saat membuat barang, sistem membuat kode `INV-000001`, `INV-000002`, dan seterusnya.
  Frontend mencetak label (KF-05) dari field `barcode`.
- **Peminjaman** dan **pengembalian** dijalankan sebagai transaksi database atomik. Satu barang
  hanya dapat memiliki satu peminjaman aktif. Petugas pencatat diambil dari token.
- **Jatuh tempo** (`due_at`) menerima `YYYY-MM-DD` (berarti 23:59:59 WIB) atau ISO datetime;
  harus di masa depan dan maksimal satu tahun.
- **Terlambat** dihitung saat request: peminjaman `active` dengan waktu sekarang melewati
  `due_at`. Respons menyertakan `is_overdue`, `overdue_days`, dan `returned_late`.
- **Penghapusan** kategori yang masih memiliki barang, atau barang yang memiliki riwayat
  peminjaman, ditolak dengan `409 CONFLICT_ERROR`.
- Admin tidak dapat mengubah peran atau menonaktifkan akunnya sendiri.

### Alur pindai untuk frontend

1. Petugas memindai barcode atau mengetik kode → `GET /api/v1/items/code/{code}`.
   `404` berarti barang tidak ditemukan (tampilkan input manual / pindai ulang).
2. Jika `status = available` → pilih peminjam dari `GET /api/v1/users?q=...` →
   `POST /api/v1/loans` dengan `item_id`, `borrower_id`, `due_at`.
3. Jika `status = borrowed` → tampilkan `active_loan` → pilih kondisi →
   `POST /api/v1/loans/{active_loan.id}/return`.
4. Jika `status = damaged` → barang tidak dapat dipinjam.

Bila peminjaman ditolak karena barang sudah dipinjam, respons `409` menyertakan
`error.details.active_loan`.

### Pagination

Endpoint daftar menerima `page` (default 1) dan `limit` (default 20, maksimal 100) dan
mengembalikan:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": { "page": 1, "limit": 20, "total": 0, "total_pages": 0 }
  }
}
```

## Contoh request

### Health check

```powershell
curl http://localhost:3000/health
```

Response sukses:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

### Register

```powershell
curl -X POST http://localhost:3000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"full_name\":\"Siti Aminah\",\"email\":\"siti@example.com\",\"password\":\"Rahasia123!\",\"staff_id\":\"STF-001\",\"school_unit\":\"Unit Sarana\"}'
```

### Login

```powershell
curl -X POST http://localhost:3000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"siti@example.com\",\"password\":\"Rahasia123!\"}'
```

Jika **Confirm email** dinonaktifkan di Supabase, response register juga
menyertakan `session` dan `email_verification_required: false`, sehingga token
tersebut dapat digunakan untuk endpoint yang memerlukan authentication.

### Profile dengan Bearer token

```powershell
curl http://localhost:3000/api/v1/auth/profile `
  -H "Authorization: Bearer <access-token>"
```

## Validasi request

Request body menggunakan JSON dan menolak field tambahan.

### Register

- `full_name`: string, 2–120 karakter
- `email`: email valid, maksimal 254 karakter
- `password`: 8–128 karakter
- `staff_id`: 3–50 karakter
- `school_unit`: 2–100 karakter

### Login

- `email`: email valid, maksimal 254 karakter
- `password`: 1–128 karakter

## Format response

Response sukses menggunakan envelope berikut:

```json
{
  "success": true,
  "data": {},
  "message": "Operasi berhasil"
}
```

`data` dan `message` hanya dikirim jika endpoint memiliki nilai untuk field
tersebut.

Response error menggunakan envelope berikut:

```json
{
  "success": false,
  "message": "Autentikasi gagal",
  "error": {
    "code": "AUTHENTICATION_ERROR"
  }
}
```

Kode error yang digunakan aplikasi:

| HTTP | Kode | Keterangan |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Body, params, atau query tidak valid |
| 401 | `AUTHENTICATION_ERROR` | Token atau kredensial tidak valid |
| 403 | `AUTHORIZATION_ERROR` | Peran tidak diizinkan mengakses endpoint |
| 404 | `NOT_FOUND_ERROR` | Route atau data tidak ditemukan |
| 409 | `CONFLICT_ERROR` | Data bentrok (duplikat, barang sedang dipinjam, dsb.) |
| 503 | `DEPENDENCY_ERROR` | Layanan autentikasi/dependency tidak tersedia |
| 500 | `INTERNAL_ERROR` | Kesalahan internal generik |

Response error tidak mengekspos stack trace, password, service role key, atau
credential sensitif lainnya.

## Perintah development dan verifikasi

```powershell
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

`pnpm test` menjalankan unit test schema, logika keterlambatan/dashboard, matriks RBAC
per endpoint (dengan service palsu, tanpa Supabase), HTTP boundary, dan OpenAPI.
`pnpm test:integration` menjalankan integration test autentikasi dan
dokumentasi. Integration test autentikasi memerlukan konfigurasi Supabase yang
sesuai.

Untuk verifikasi manual dokumentasi:

1. Pastikan `NODE_ENV=development`.
2. Jalankan `pnpm dev`.
3. Buka <http://localhost:3000/api-docs/>.
4. Pastikan seluruh endpoint pada tabel di atas terlihat.
5. Buka endpoint `/api-docs/openapi.json` dan pastikan dokumen dapat dibaca.
6. Jalankan `GET /health` dari Swagger UI.
7. Uji response validasi dengan request register yang tidak lengkap.
8. Pastikan `/api-docs/` tidak tersedia ketika `NODE_ENV=production`.

## Struktur direktori utama

```text
seed.ts
src/
├── config/          # Validasi environment dan konfigurasi Supabase
├── controllers/     # Handler HTTP
├── docs/            # OpenAPI runtime document
├── middleware/      # Validasi, authentication, dan error handler
├── routes/          # Route API dan route dokumentasi
├── schemas/         # Schema validasi Zod
├── services/        # Logika bisnis dan integrasi Supabase
└── utils/           # Response dan error helper
tests/
├── unit/
└── integration/
```
