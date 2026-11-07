# Implementation Plan: Dokumentasi API Swagger dan OpenAPI

**Branch**: `002-swagger-api-docs` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-swagger-api-docs/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Menyediakan kontrak OpenAPI terpusat dan halaman Swagger UI untuk lima endpoint REST yang
sudah tersedia. Dokumentasi akan dipasang sebagai route development-only melalui Express,
menggunakan skema yang eksplisit dan pengujian kontrak yang membandingkan operasi dokumentasi
dengan route yang diwajibkan. Endpoint bisnis, middleware autentikasi, dan envelope respons
tidak diubah.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript, Node.js >=24 <25

**Primary Dependencies**: Express 5, Zod, `swagger-ui-express` untuk UI; OpenAPI 3.0
sebagai kontrak terstruktur

**Storage**: N/A; dokumentasi adalah artefak statis

**Testing**: Node test runner melalui `tsx`, pengujian HTTP integration dan typecheck TypeScript

**Target Platform**: Server Node.js pada lingkungan development yang ditandai `NODE_ENV=development`

**Project Type**: Express web service

**Performance Goals**: Halaman dokumentasi dan spesifikasi dapat dimuat tanpa request ke
Supabase. Regresi fitur diverifikasi melalui status, body, validasi, dan autentikasi endpoint;
latency bukan acceptance gate karena belum ada baseline latency proyek.

**Constraints**: Route dokumentasi tidak aktif di production; kontrak harus mencerminkan route,
schema Zod, envelope respons, status error, dan security Bearer yang aktual; tidak boleh
mengekspos credential atau detail internal.

**Scale/Scope**: Lima operasi REST yang tersedia saat ini, satu dokumen OpenAPI, satu halaman
Swagger UI, dan pengujian sinkronisasi kontrak.

**Environment and Authorization Decision**: Dokumentasi hanya dipasang ketika `NODE_ENV` bernilai
`development` dan tidak dipasang ketika `NODE_ENV=production`; pengujian juga mencakup nilai
environment lain agar tidak mengaktifkan dokumentasi secara tidak sengaja. Backend saat ini
hanya menerapkan Bearer authentication pada profile dan logout melalui `src/middleware/auth.middleware.ts`;
tidak ada middleware role-based authorization terpisah, sehingga kontrak tidak mengklaim
pembatasan role atau status akun yang belum diverifikasi.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

*GATE: PASS*

- **I. Stack Teknologi Wajib**: Perubahan tetap pada Node.js, Express, TypeScript, dan Zod;
  UI dokumentasi adalah dependensi pendukung, bukan penggantian teknologi inti.
- **II. Arsitektur Berlapis Ketat**: Dokumentasi dipasang pada route aplikasi dan tidak
  melakukan query Supabase; endpoint bisnis tetap mengikuti lapisan yang ada.
- **III. Type Safety dan Validasi Batas Sistem**: Dokumen dan helper ditipkan secara ketat;
  tidak ada payload baru yang masuk ke service.
- **IV. Respons Konsisten**: Kontrak mendokumentasikan envelope yang sudah digunakan dan
  tidak membentuk respons endpoint baru.
- **V. Konvensi Penamaan**: Skema publik mengikuti key `snake_case` yang sudah ditetapkan.
- **Batasan teknis**: Tidak ada credential atau stack trace dalam contoh produksi; typecheck
  wajib lulus.

## Project Structure

### Documentation (this feature)

```text
specs/002-swagger-api-docs/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── app.ts                         # Mount documentation route
├── config/env.ts                  # Existing environment gate
├── docs/
│   └── openapi.ts                 # OpenAPI document and schemas
├── routes/
│   └── docs.routes.ts             # Development-only Swagger UI route
├── middleware/
├── controllers/
├── services/
└── utils/

tests/
├── integration/
│   └── docs.integration.test.ts
└── unit/
    └── openapi.test.ts

README.md                           # Development URL and verification steps
package.json                        # Documentation UI dependency and scripts
```

**Structure Decision**: Single Express web service berbasis TypeScript. Object OpenAPI bertipe
di `src/docs/openapi.ts` adalah source of truth runtime karena Swagger UI dan pengujian dapat
menggunakannya langsung tanpa parser YAML. [`contracts/openapi.yaml`](./contracts/openapi.yaml)
tetap menjadi artefak kontrak yang harus merepresentasikan operasi, schema, security, response,
dan contoh yang sama; pengujian kontrak wajib memeriksa kesetaraan bagian publik yang relevan.
Route UI terpisah di `src/routes/docs.routes.ts`, dan `app.ts` hanya melakukan mounting ketika
`NODE_ENV=development`.

## Phase 0: Research

- Evaluasi cara menyajikan Swagger UI pada Express tanpa memindahkan logika endpoint.
- Evaluasi format object OpenAPI yang dapat diuji langsung oleh TypeScript tanpa parser YAML
  runtime tambahan; YAML dipertahankan sebagai artefak kontrak yang divalidasi terhadap source
  of truth runtime.
- Verifikasi pola pemisahan dokumentasi development-only berdasarkan `NODE_ENV`, termasuk
  perilaku ketika environment production.

## Phase 1: Design

- Modelkan metadata API, operasi, request body, security scheme, response envelope, dan
  error schema dalam kontrak OpenAPI.
- Tambahkan operasi untuk `/health`, `/api/v1/auth/register`, `/api/v1/auth/login`,
  `/api/v1/auth/logout`, dan `/api/v1/auth/profile`.
- Sediakan quickstart untuk membuka UI, menjalankan health check, memperoleh token melalui
  login, dan memverifikasi respons error.
- Tambahkan pengujian bahwa UI/spec hanya dapat diakses dalam development, operasi wajib tidak
  hilang, kedua representasi kontrak tetap sinkron, dan semua contoh error memiliki envelope
  `{ success: false, message, error }` tanpa rahasia.

## Constitution Check (Post-Design)

*GATE: PASS*

Desain tidak menambah alur bisnis, tidak mengakses Supabase di luar service, tidak mengubah
schema Zod atau envelope respons, menjaga strict TypeScript, dan menyamarkan seluruh contoh
credential. Dependency Swagger UI dibatasi sebagai adapter presentasi dokumentasi dan tidak
menggantikan stack inti.

## Complexity Tracking

Tidak ada pelanggaran konstitusi yang memerlukan justifikasi. Penambahan Swagger UI adalah
dependensi pendukung dokumentasi dan tidak menggantikan stack inti, arsitektur berlapis, schema
Zod, atau kontrak response yang sudah berlaku.
