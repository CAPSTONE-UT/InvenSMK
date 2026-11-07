# Feature Specification: Inventory, Loans, RBAC, and Dashboard API

**Feature Branch**: `003-inventory-loans-api`
**Created**: 2026-11-07
**Status**: Implemented
**Source**: Laporan Kemajuan Capstone Kelompok B (Tabel 5, Tabel 8, Lampiran VI.5–VI.7)

## Scope

Melanjutkan API setelah modul autentikasi (001) dan dokumentasi Swagger (002) agar frontend
dapat mengimplementasikan seluruh kebutuhan fungsional berprioritas Wajib:

| KF | Endpoint |
|----|----------|
| KF-01 | `POST /api/v1/auth/refresh` (melengkapi register/login/logout/profile) |
| KF-02 | `GET /api/v1/dashboard/summary` |
| KF-03 | `GET, POST /api/v1/items`, `GET, PUT, DELETE /api/v1/items/{id}` |
| KF-04 | `GET, POST /api/v1/categories`, `GET, PUT, DELETE /api/v1/categories/{id}` |
| KF-05 | Field `barcode` unik + pembuatan otomatis `INV-000001` (label dicetak frontend) |
| KF-06 | `GET, POST /api/v1/users`, `GET, PUT /api/v1/users/{id}` |
| KF-07, KF-08 | `GET /api/v1/items/code/{code}` |
| KF-09 | `POST /api/v1/loans` |
| KF-10 | `POST /api/v1/loans/{id}/return` |
| KF-11 | `GET /api/v1/loans?status=active|overdue` |
| KF-12 | `GET /api/v1/loans/me` |
| KF-13 | `GET /api/v1/items/{id}/history` |

KF-14 (laporan, opsional) dapat dibangun dari `GET /api/v1/loans` dengan filter
`borrowed_from`/`borrowed_to`. KF-15 (PWA) sepenuhnya di frontend.

## Decisions

- **Role mapping**: nilai role yang sudah ada dipertahankan agar kontrak auth tidak berubah —
  `admin` = Admin, `inventory_officer` = Petugas, `staff` = Peminjam.
- **RBAC**: `requireRole()` dipasang setelah auth middleware pada setiap route; 403
  `AUTHORIZATION_ERROR` untuk peran yang tidak diizinkan.
- **Atomicity**: pinjam dan kembali dijalankan oleh fungsi PL/pgSQL (`create_loan`,
  `return_loan`) yang mengunci baris; unique partial index menjamin satu peminjaman aktif
  per barang.
- **Item status** diturunkan oleh sistem (constraint `items_status_matches_condition`), bukan
  diisi klien.
- **Overdue** dihitung saat query (`status = 'active' and due_at < now()`), sehingga tidak
  memerlukan job terjadwal.
- **Time zone**: tanggal tanpa jam dan bucket dashboard memakai WIB (UTC+7).
- **User directory**: view `user_directory` menggabungkan profil dengan email `auth.users`,
  hanya dapat dibaca service role.
- **Testability**: `createApp(dependencies)` menerima service sehingga matriks RBAC diuji tanpa
  Supabase (`tests/unit/rbac.http.test.ts`).

## Data model

Lihat `supabase/migrations/20261107_create_inventory_loans.sql`. Tabel inti sesuai ERD
laporan (Lampiran VI.6): `categories`, `items`, `loans`, `condition_logs`, dengan
`school_staff_profiles` sebagai tabel `users`.

## Contract

`contracts/openapi.yaml` adalah ekspor dari `src/docs/openapi.ts`; test unit menjaga
keduanya tetap sinkron.
