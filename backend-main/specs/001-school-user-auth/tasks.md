---
description: "Implementation tasks for school inventory authentication and user management"
---

# Tasks: Authentication & User Management Inventaris Sekolah

**Input**: Design documents from `specs/001-school-user-auth/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/auth.openapi.yaml`, `quickstart.md`

**Tests**: TDD atau automated test tidak diminta secara eksplisit pada feature specification.
Setiap story tetap memiliki langkah validasi independen terhadap contract dan acceptance scenario.

**Organization**: Tugas dikelompokkan berdasarkan user story agar setiap increment dapat
diimplementasikan dan divalidasi secara terpisah.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Dapat dikerjakan paralel pada file berbeda tanpa dependency task yang belum selesai.
- **[Story]**: Pemetaan task ke user story (`US1` sampai `US4`).
- Setiap task mencantumkan path file yang tepat.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Menyiapkan runtime, scripts, dan struktur TypeScript dasar.

- [X] T001 Configure Node.js 24 engine, ESM package metadata, and `dev`, `build`, `start`, and `typecheck` scripts in package.json
- [X] T002 [P] Configure `rootDir: src`, `outDir: dist`, Node types, NodeNext modules, and retain `strict: true` in tsconfig.json
- [X] T003 [P] Create the planned source and validation directory skeleton with tracked placeholders in src/.gitkeep, tests/.gitkeep, and supabase/migrations/.gitkeep

**Checkpoint**: Dependency installation and strict TypeScript commands are defined.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Menyediakan konfigurasi, model data, type contract, response envelope, dan HTTP
infrastructure yang dibutuhkan seluruh user story.

**CRITICAL**: Semua task phase ini harus selesai sebelum implementasi user story dimulai.

- [X] T004 Implement Zod-validated `PORT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` configuration in src/config/env.ts and document matching placeholders in .env.example
- [X] T005 Create stateless public and admin Supabase client factories with persistence, auto-refresh, and URL session detection disabled in src/config/supabase.ts
- [X] T006 [P] Define camelCase service DTOs, `AuthService` interface, `AuthenticatedUser`, `UserProfile`, role/status unions, and snake_case API projection types in src/types/auth.types.ts and augment Express request identity in src/types/express.d.ts
- [X] T007 [P] Create `school_staff_profiles` and `revoked_auth_sessions`, RLS policies, grants, signup trigger, updated-at trigger, and cleanup support in supabase/migrations/20261008_create_auth_profiles.sql; enforce verbatim constraints: `user_id` UUID non-null PK/FK `auth.users(id)` with `ON DELETE CASCADE`; `full_name` trimmed 2-120 characters; `staff_id` trimmed 3-50 characters with a case-insensitive unique index; `school_unit` trimmed 2-100 characters; `role` default `staff` and allowed `staff`, `inventory_officer`, `admin`; `account_status` default `active` and allowed `active`, `inactive`; `created_at` and `updated_at` non-null current timestamps; revoked `session_id` UUID primary key, `user_id` UUID non-null indexed, `expires_at` non-null timestamptz, and `revoked_at` non-null current timestamp
- [X] T008 [P] Implement typed application errors and `{ success, data?, message?, error? }` response helpers in src/utils/api-error.ts and src/utils/api-response.ts
- [X] T009 Implement reusable Zod request validation that forwards failures to the global handler in src/middleware/validate.middleware.ts
- [X] T010 Implement global error mapping for validation, authentication, conflict, not-found, and dependency failures without provider details, credentials, tokens, or stack traces in src/middleware/error.middleware.ts
- [X] T011 Create the mounted `/api/v1/auth` router shell, JSON parsing, health handling, 404 handling, global error ordering, and server bootstrap in src/routes/auth.routes.ts, src/app.ts, and src/server.ts

**Checkpoint**: Foundation compiles, database integrity is defined, and no layer outside Services
calls Supabase.

---

## Phase 3: User Story 1 - Masuk dan Mengakses Inventaris (Priority: P1) — MVP

**Goal**: Pengguna aktif dan terverifikasi dapat login; Bearer token valid menghasilkan identity
context, sedangkan token hilang, rusak, kedaluwarsa, dicabut, atau milik akun nonaktif ditolak.

**Independent Test**: Dengan akun aktif yang telah diverifikasi dan disiapkan di project pengujian,
login mengembalikan sesi. Token tersebut diterima oleh `authMiddleware`; kredensial salah dan token
tidak valid ditolak dengan pesan publik yang sama tanpa data inventaris.

### Implementation for User Story 1

- [X] T012 [P] [US1] Define strict login body (`email` valid and max 254 characters; `password` required, min 1 and max 128 characters; no additional fields) and Bearer Authorization schemas in src/schemas/auth.schema.ts
- [X] T013 [P] [US1] Implement password login, normalized email, active-profile lookup, generic rejection for bad credentials/unverified/inactive accounts, provider-error translation, `getUser(accessToken)` verification, verified `session_id` extraction, revocation lookup, and identity projection in src/services/auth.service.ts
- [X] T014 [P] [US1] Implement auth middleware that extracts the validated Bearer token, delegates all verification to `AuthService`, attaches typed identity, and forwards errors in src/middleware/auth.middleware.ts
- [X] T015 [P] [US1] Implement the login HTTP controller using only `AuthService` and the standard success envelope with `session` and `user` data in src/controllers/auth.controller.ts
- [X] T016 [US1] Register `POST /login` with Zod validation and controller delegation in src/routes/auth.routes.ts
- [ ] T017 [US1] Validate successful login, generic failed login, active identity context, and missing/malformed/expired/revoked/inactive session rejection against specs/001-school-user-auth/contracts/auth.openapi.yaml and record any contract correction in specs/001-school-user-auth/contracts/auth.openapi.yaml

**Checkpoint**: Login dan middleware autentikasi berfungsi sebagai MVP tanpa membutuhkan endpoint
register, profile, atau logout.

---

## Phase 4: User Story 2 - Mendaftarkan Akun Personel Sekolah (Priority: P2)

**Goal**: Personel dapat mendaftar dengan data sekolah yang valid, menerima email verification,
dan selalu memperoleh role `staff` tanpa dapat memilih privilege sendiri.

**Independent Test**: Registrasi data unik menghasilkan HTTP 201, identity belum terverifikasi,
dan satu profil `staff`; input invalid, field `role`, serta duplikasi email/staff ID ditolak tanpa
membuat profil ganda.

### Implementation for User Story 2

- [X] T018 [P] [US2] Add strict register schema with required `full_name` trimmed 2-120 characters, valid `email` max 254 characters, `password` min 8 and max 128 characters, `staff_id` trimmed 3-50 characters, and `school_unit` trimmed 2-100 characters, rejecting `role`, `account_status`, and all additional fields in src/schemas/auth.schema.ts
- [X] T019 [P] [US2] Implement registration with normalized email, case-insensitive duplicate handling, signup metadata limited to `full_name`, `staff_id`, and `school_unit`, mandatory email-confirmation result, and safe mapping of trigger/provider conflicts in src/services/auth.service.ts
- [X] T020 [P] [US2] Implement register controller response with `user_id`, `email`, dynamic `email_verification_required`, and an optional session when email confirmation is disabled, using the standard envelope in src/controllers/auth.controller.ts
- [X] T021 [US2] Register `POST /register` with Zod validation and controller delegation in src/routes/auth.routes.ts
- [ ] T022 [US2] Validate unique registration, pre-confirmation login rejection, duplicate email/staff ID, concurrent duplicate registration, invalid lengths, and privilege-field rejection using the Register section in specs/001-school-user-auth/quickstart.md

**Checkpoint**: Pendaftaran dan profile bootstrap dapat didemonstrasikan tanpa endpoint profile
atau logout.

---

## Phase 5: User Story 3 - Melihat Profil Pengguna Aktif (Priority: P3)

**Goal**: Pengguna terautentikasi dapat mengambil profilnya sendiri dan tidak pernah menerima
credential, provider metadata, revocation data, atau profil pengguna lain.

**Independent Test**: Token valid mengambil tepat `user_id`, `full_name`, `email`, `staff_id`,
`school_unit`, `role`, dan `account_status` milik pengguna; token invalid ditolak dan profil hilang
menghasilkan kegagalan terkendali.

### Implementation for User Story 3

- [X] T023 [P] [US3] Implement current-profile composition from verified Auth User email and the one-to-one `school_staff_profiles` row, with explicit snake_case projection and not-found handling in src/services/auth.service.ts
- [X] T024 [P] [US3] Implement get-current-profile controller using request identity, `AuthService`, and the standard success envelope in src/controllers/auth.controller.ts
- [X] T025 [US3] Register protected `GET /profile` with `authMiddleware` before controller execution in src/routes/auth.routes.ts
- [ ] T026 [US3] Validate own-profile projection, missing profile, inactive account, missing token, malformed token, and cross-user data isolation using the profile contract in specs/001-school-user-auth/contracts/auth.openapi.yaml

**Checkpoint**: Profil pengguna sendiri tersedia sebagai protected endpoint dan tidak membocorkan
data sensitif.

---

## Phase 6: User Story 4 - Keluar dari Sistem (Priority: P4)

**Goal**: Pengguna dapat mengakhiri sesi perangkat saat ini dan backend langsung menolak penggunaan
ulang access token dari sesi tersebut.

**Independent Test**: Setelah logout HTTP 200, token yang sama menghasilkan HTTP 401 pada profile
meskipun `expires_at` belum tercapai; sesi perangkat lain tidak ikut dicabut.

### Implementation for User Story 4

- [X] T027 [P] [US4] Implement idempotent current-session logout by upserting verified `session_id`, `user_id`, `expires_at`, and current `revoked_at` into `revoked_auth_sessions` before server-side local-scope sign-out, plus opportunistic expired-row cleanup, in src/services/auth.service.ts
- [X] T028 [P] [US4] Implement logout controller using the attached verified token/session context and standard message envelope in src/controllers/auth.controller.ts
- [X] T029 [US4] Register protected `POST /logout` with `authMiddleware` before controller execution in src/routes/auth.routes.ts
- [ ] T030 [US4] Validate immediate token reuse rejection, repeated/already-expired logout safety, and preservation of other device sessions using the logout section in specs/001-school-user-auth/quickstart.md

**Checkpoint**: Logout mencabut sesi saat ini secara langsung menurut contract.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Memastikan seluruh story terintegrasi, aman, konsisten, dan memenuhi target kualitas.

- [X] T031 Review all Supabase access for service-only placement, camelCase TypeScript names, snake_case database/JSON keys, strict Zod boundaries, and standard envelopes across src/routes/auth.routes.ts, src/controllers/auth.controller.ts, src/services/auth.service.ts, src/middleware/auth.middleware.ts, src/middleware/validate.middleware.ts, and src/middleware/error.middleware.ts
- [X] T032 Run strict compilation and resolve every type error without unsafe type weakening in package.json and tsconfig.json
- [ ] T033 Execute the complete register-to-logout validation flow and security checks, updating only inaccurate run instructions in specs/001-school-user-auth/quickstart.md
- [ ] T034 Measure 1,000 sequential login/logout/profile operations under normal dependency conditions, verify at least 99% finish within 2 seconds, check logs for secrets and stack traces, and record results in specs/001-school-user-auth/validation-results.md

**Checkpoint**: Seluruh acceptance scenario, constitution gate, security checks, dan measurable
performance outcome telah diverifikasi.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: Dapat dimulai segera.
- **Phase 2 — Foundational**: Bergantung pada Phase 1 dan memblokir semua user story.
- **Phase 3 — US1**: Bergantung pada Foundation; merupakan MVP.
- **Phase 4 — US2**: Bergantung pada Foundation; dapat dimulai tanpa US1, tetapi verifikasi login
  setelah confirmation menggunakan capability US1.
- **Phase 5 — US3**: Bergantung pada Foundation dan middleware US1.
- **Phase 6 — US4**: Bergantung pada Foundation dan middleware US1.
- **Phase 7 — Polish**: Bergantung pada semua story yang termasuk dalam release.

### User Story Dependency Graph

```text
Setup -> Foundation -> US1 (login + auth middleware) -> US3 (profile)
                  |                              `--> US4 (logout)
                  `--> US2 (register) -------------------^
```

- **US1 (P1)**: Tidak membutuhkan story lain; gunakan akun fixture yang telah diverifikasi.
- **US2 (P2)**: Tidak membutuhkan story lain untuk register; confirmation-to-login check memakai US1.
- **US3 (P3)**: Memakai identity context dari US1.
- **US4 (P4)**: Memakai identity/session context dari US1; reuse check dapat memakai US3.

### Within Each User Story

1. Schema/service/controller tasks bertanda `[P]` dapat dimulai dari contract dan shared types.
2. Route registration dilakukan setelah handler dan schema story tersedia.
3. Independent validation dilakukan setelah endpoint story terpasang.
4. Story harus melewati checkpoint sebelum dinyatakan selesai.

## Parallel Opportunities

- T002 dan T003 dapat berjalan paralel setelah konfigurasi package dipahami.
- T006, T007, dan T008 menyentuh type, migration, dan utility yang terpisah.
- Dalam US1, T012-T015 dapat dikerjakan paralel berdasarkan shared interface dari T006.
- Dalam US2, T018-T020 dapat dikerjakan paralel.
- Dalam US3, T023 dan T024 dapat dikerjakan paralel.
- Dalam US4, T027 dan T028 dapat dikerjakan paralel.
- Setelah Foundation, US1 dan US2 dapat dikerjakan paralel; US3/US4 dimulai setelah identity
  context US1 stabil untuk menghindari rework pada middleware contract.

## Parallel Examples

### User Story 1

```text
T012: Define login and Bearer schemas in src/schemas/auth.schema.ts
T013: Implement login/token verification in src/services/auth.service.ts
T014: Implement delegation middleware in src/middleware/auth.middleware.ts
T015: Implement login controller in src/controllers/auth.controller.ts
```

### User Story 2

```text
T018: Add strict register schema in src/schemas/auth.schema.ts
T019: Implement registration service in src/services/auth.service.ts
T020: Implement register controller in src/controllers/auth.controller.ts
```

### User Story 3

```text
T023: Implement profile composition in src/services/auth.service.ts
T024: Implement profile controller in src/controllers/auth.controller.ts
```

### User Story 4

```text
T027: Implement session revocation in src/services/auth.service.ts
T028: Implement logout controller in src/controllers/auth.controller.ts
```

## Implementation Strategy

### MVP First — User Story 1

1. Selesaikan Phase 1 dan Phase 2.
2. Siapkan satu akun fixture aktif dan terverifikasi pada project pengujian.
3. Selesaikan T012-T017 untuk login dan middleware.
4. Berhenti dan validasi US1 secara independen sebelum memperluas scope.

### Incremental Delivery

1. **Foundation**: runtime, migration, error envelope, dan strict boundaries.
2. **US1 / MVP**: login dan protected-request identity.
3. **US2**: self-registration dan email confirmation.
4. **US3**: current-user profile.
5. **US4**: immediate current-session logout.
6. **Polish**: full quickstart, security review, strict compilation, dan performance evidence.

### Parallel Team Strategy

1. Tim menyelesaikan Setup dan Foundation bersama.
2. Developer A mengerjakan US1; Developer B dapat mengerjakan US2 secara paralel.
3. Setelah identity context US1 stabil, Developer C mengerjakan US3 dan Developer D mengerjakan
   US4 pada branch kerja terpisah untuk menghindari konflik file service/controller/router.
4. Integrasikan berdasarkan prioritas dan jalankan validation checkpoint setelah setiap story.

## Notes

- Semua call Supabase wajib berada di `src/services/auth.service.ts` atau service lain, bukan route,
  controller, atau middleware.
- `[P]` hanya menandai task yang dapat dimulai tanpa menunggu task lain dalam phase yang sama;
  shared-file changes tetap harus di-merge dengan hati-hati.
- Jangan menambahkan reset password, edit profile, role administration, atau account administration.
- Jangan pernah mencatat password, access token, refresh token, atau service-role key.
