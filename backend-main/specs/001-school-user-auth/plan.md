# Implementation Plan: Authentication & User Management Inventaris Sekolah

**Branch**: `001-school-user-auth` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-school-user-auth/spec.md`

## Summary

Bangun empat endpoint autentikasi (`register`, `login`, `logout`, dan profil pengguna sendiri)
serta middleware pelindung route. Express menangani HTTP, Zod memvalidasi payload, service
mengisolasi seluruh interaksi Supabase Auth dan database, dan global error middleware membentuk
response konsisten. Profil personel disimpan pada tabel publik yang terhubung satu-ke-satu dengan
identitas Supabase Auth; registry pencabutan sesi memastikan token dari sesi yang logout langsung
ditolak oleh backend sampai token kedaluwarsa.

## Technical Context

**Language/Version**: TypeScript 7.0.2 dalam strict mode; Node.js 24 LTS

**Primary Dependencies**: Express.js 5.2.1, `@supabase/supabase-js` 2.117.3, Zod 4.6.5,
dotenv 18.0.6

**Storage**: Supabase Auth untuk identitas/sesi dan Supabase PostgreSQL untuk
`school_staff_profiles` serta `revoked_auth_sessions`

**Testing**: Node.js test runner melalui `tsx --test`; unit test dengan dependency fakes dan
integration/contract test terhadap project Supabase pengujian

**Target Platform**: Server Node.js 24 LTS pada lingkungan Linux/container dengan koneksi HTTPS
ke Supabase

**Project Type**: REST web service tunggal

**Performance Goals**: 99% operasi login, logout, dan profil selesai dalam 2 detik pada rangkaian
1.000 percobaan dalam kondisi dependensi normal

**Constraints**: Email confirmation wajib; akses token dikirim sebagai Bearer token; service-role
key hanya tersedia di server; logout hanya mencabut sesi saat ini; error produksi tidak boleh
membocorkan credential, stack trace, atau keberadaan akun saat login

**Scale/Scope**: Satu backend inventaris sekolah, hingga 10.000 akun personel; empat endpoint auth
dan middleware reusable, tanpa reset password, edit profil, atau administrasi role

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Gate

| Rule | Planned compliance | Status |
|------|--------------------|--------|
| Stack wajib | Node.js, Express, strict TypeScript, Supabase client, dan Zod digunakan | PASS |
| Layering | Route -> middleware/controller -> service -> Supabase; tidak ada call Supabase di controller | PASS |
| Type safety dan validasi | Zod memvalidasi body/header boundary; request identity memiliki tipe eksplisit | PASS |
| Global error handling | Semua error diteruskan ke global error middleware dan memakai response envelope | PASS |
| Naming | JSON/database snake_case; fungsi/variabel camelCase; class/interface PascalCase | PASS |
| Security | Service key server-only; response tidak mengekspos credential atau detail internal | PASS |

Tidak ada pelanggaran gate atau pengecualian konstitusi.

### Post-Design Gate

Desain data, OpenAPI contract, dan quickstart telah diperiksa ulang. Seluruh call Supabase tetap
berada di `AuthService`; auth middleware hanya mengekstrak header lalu mendelegasikan validasi ke
service. Schema database dan payload menggunakan snake_case, schema Zod berada di HTTP boundary,
dan seluruh contract response menggunakan envelope konstitusi. **Status: PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/001-school-user-auth/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── auth.openapi.yaml
└── tasks.md                 # Dibuat kemudian oleh /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── app.ts
├── server.ts
├── config/
│   ├── env.ts
│   └── supabase.ts
├── routes/
│   └── auth.routes.ts
├── controllers/
│   └── auth.controller.ts
├── services/
│   └── auth.service.ts
├── middleware/
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   └── validate.middleware.ts
├── schemas/
│   └── auth.schema.ts
├── types/
│   ├── auth.types.ts
│   └── express.d.ts
└── utils/
    ├── api-error.ts
    └── api-response.ts

supabase/
└── migrations/
    └── <timestamp>_create_auth_profiles.sql

tests/
├── contract/
│   └── auth.contract.test.ts
├── integration/
│   └── auth.integration.test.ts
└── unit/
    ├── auth.middleware.test.ts
    └── auth.service.test.ts
```

**Structure Decision**: Gunakan satu web service dengan direktori per layer karena repository
belum memiliki source code. Struktur mempertahankan jalur Routes -> Controllers -> Services ->
Supabase Client. Middleware auth berada pada HTTP boundary dan wajib memanggil service, bukan
Supabase secara langsung.

## Complexity Tracking

Tidak ada pelanggaran konstitusi yang memerlukan justifikasi.
