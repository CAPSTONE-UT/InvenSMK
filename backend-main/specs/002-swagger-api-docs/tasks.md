---

description: "Task list for interactive Swagger UI and OpenAPI documentation"
---

# Tasks: Dokumentasi API Swagger dan OpenAPI

**Input**: Design documents from `/specs/002-swagger-api-docs/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: Test tasks are included because the specification explicitly requires documentation accessibility, contract synchronization, and regression verification.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after foundational work.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Menyiapkan dependency dan struktur dokumentasi tanpa mengubah perilaku endpoint bisnis.

- [ ] T001 Add `swagger-ui-express` and its TypeScript types to `package.json` while preserving the existing Node.js >=24 <25 and pnpm toolchain
- [ ] T002 [P] Create the documentation source directory and placeholder module at `src/docs/openapi.ts` following the planned single-project structure
- [ ] T003 [P] Create the documentation route module at `src/routes/docs.routes.ts` without mounting it yet
- [ ] T004 [P] Add documentation test file scaffolding at `tests/unit/openapi.test.ts` and `tests/integration/docs.integration.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Menyediakan kontrak dasar yang dipakai semua user story.

**⚠️ CRITICAL**: User story work depends on this phase.

- [ ] T005 Define strict TypeScript types for the OpenAPI 3.0 document, operation paths, schemas, responses, and Bearer security scheme in `src/docs/openapi.ts` without using `any`, `as any`, or weakening `strict` compiler checks
- [ ] T006 Define reusable `SuccessEnvelope` and `ErrorEnvelope` schemas in `src/docs/openapi.ts` with `success`, optional `data`, optional `message`, `error.code`, and optional `error.details`, matching `src/utils/api-response.ts`
- [ ] T007 [P] Define reusable `RegisterRequest` and `LoginRequest` schemas in `src/docs/openapi.ts` with the exact constraints from `src/schemas/auth.schema.ts`: register fields `full_name` 2-120, `email` valid and max 254, `password` 8-128, `staff_id` 3-50, `school_unit` 2-100; login `email` valid and max 254, `password` 1-128; all fields required and additional properties rejected
- [ ] T008 [P] Define reusable `UserProfile` and `AuthSession` response schemas in `src/docs/openapi.ts` using the existing snake_case payload keys and session fields from `src/types/auth.types.ts`
- [ ] T009 Define the HTTP Bearer security scheme and reusable validation, authentication, conflict, dependency, not-found, and internal error responses in `src/docs/openapi.ts`, using the exact envelope `{ success: false, message, error }` and safe examples with no credential or stack trace

**Checkpoint**: OpenAPI document primitives and shared schemas are ready for all stories.

---

## Phase 3: User Story 1 - Menjelajahi Kontrak API (Priority: P1) 🎯 MVP

**Goal**: Developer dapat membuka dokumentasi interaktif dan melihat seluruh lima endpoint dengan kontrak request/response yang lengkap.

**Independent Test**: Jalankan server development, buka URL dokumentasi, lalu pastikan operasi `GET /health`, `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, dan `GET /api/v1/auth/profile` terlihat dengan method, path, input, contoh, response, serta status error.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add OpenAPI structure tests in `tests/unit/openapi.test.ts` that fail when any of the five required method/path pairs is missing or has an invalid operation shape
- [ ] T011 [P] [US1] Add schema and response tests in `tests/unit/openapi.test.ts` that verify request constraints, standard success/error envelope fields, safe examples, and relevant status codes
- [ ] T012 [P] [US1] Add integration coverage in `tests/integration/docs.integration.test.ts` for the development documentation route and OpenAPI document response, including the expected HTML/spec content

### Implementation for User Story 1

- [ ] T013 [US1] Implement the complete OpenAPI metadata, server definition, and `GET /health` operation in `src/docs/openapi.ts` with HTTP 200 success response and `{ success: true, data: { status: "ok" } }` example
- [ ] T014 [US1] Implement the `POST /api/v1/auth/register` operation in `src/docs/openapi.ts` with `RegisterRequest`, HTTP 201 success response, and relevant 400, 409, and 503 error responses
- [ ] T015 [US1] Implement the `POST /api/v1/auth/login` operation in `src/docs/openapi.ts` with `LoginRequest`, HTTP 200 session/profile response, and relevant 400, 401, and 503 error responses
- [ ] T016 [US1] Implement the `POST /api/v1/auth/logout` and `GET /api/v1/auth/profile` operations in `src/docs/openapi.ts` with Bearer security, response schemas, and relevant authentication/not-found statuses
- [ ] T017 [US1] Implement Swagger UI and raw OpenAPI serving in `src/routes/docs.routes.ts` using the exported document, with a stable development URL and no Supabase calls
- [ ] T018 [US1] Mount the documentation router in `src/app.ts` only when `NODE_ENV=development` (with an explicit local-development default if project config requires one), never when `NODE_ENV=production`, preserving the existing health/auth route order and response behavior

**Checkpoint**: User Story 1 is independently usable; all five implemented endpoints are discoverable and their contract is inspectable.

---

## Phase 4: User Story 2 - Mencoba Endpoint Secara Interaktif (Priority: P1)

**Goal**: Developer atau QA dapat menjalankan request melalui Swagger UI, termasuk health check, body JSON, Bearer token, dan melihat response aktual.

**Independent Test**: Dari Swagger UI pada development, jalankan `GET /health`, jalankan register/login dengan body, gunakan `access_token` untuk authorize, lalu jalankan profile/logout dan lihat status serta body response.

### Tests for User Story 2

- [ ] T019 [P] [US2] Add integration assertions in `tests/integration/docs.integration.test.ts` that Swagger UI exposes the configured API document and Try it out target without changing existing endpoint routes
- [ ] T020 [P] [US2] Add integration regression assertions in `tests/integration/docs.integration.test.ts` that `GET /health` keeps HTTP 200 and the existing standard response envelope when documentation is mounted
- [ ] T021 [P] [US2] Add development-gating tests in `tests/integration/docs.integration.test.ts` that documentation is available with `NODE_ENV=development`, absent or rejected with `NODE_ENV=production`, and cannot be enabled accidentally by an unrelated environment value

### Implementation for User Story 2

- [ ] T022 [US2] Configure the Swagger UI route in `src/routes/docs.routes.ts` to use the OpenAPI document as its source, support interactive request execution, and expose no real credentials in defaults or examples
- [ ] T023 [US2] Configure the OpenAPI `servers` URL and route mounting in `src/docs/openapi.ts` and `src/app.ts` so Try it out targets the active development server without hard-coding production access or exposing documentation when `NODE_ENV=production`
- [ ] T024 [US2] Add safe request/response examples for health, register, login, profile, logout, and invalid input in `src/docs/openapi.ts`, ensuring examples remain compatible with the actual envelope and snake_case payloads
- [ ] T025 [US2] Update `README.md` with the development documentation URL, `pnpm dev` startup, Bearer authorization steps, and the health/error verification workflow from `specs/002-swagger-api-docs/quickstart.md`

**Checkpoint**: User Story 2 is independently usable; interactive calls can be launched safely from development documentation.

---

## Phase 5: User Story 3 - Memahami Keamanan dan Penanganan Error (Priority: P2)

**Goal**: Developer dan reviewer dapat memahami kebutuhan Bearer auth, penolakan akses, validasi input, status error, serta bentuk error standar.

**Independent Test**: Tinjau security requirement pada profile/logout, aturan field request, dan contoh error 400/401/404/409/503/500; cocokkan dengan middleware, schema, dan global error handler aktual.

### Tests for User Story 3

- [ ] T026 [P] [US3] Add security contract tests in `tests/unit/openapi.test.ts` that require Bearer security on profile/logout and no security requirement on health/register/login
- [ ] T027 [P] [US3] Add error documentation tests in `tests/unit/openapi.test.ts` that require safe examples and standard `ErrorEnvelope` references for validation, authentication, not-found, dependency, conflict, and internal errors
- [ ] T028 [P] [US3] Add regression coverage in `tests/integration/docs.integration.test.ts` that invalid register input still returns HTTP 400 with `VALIDATION_ERROR` through the global error handler

### Implementation for User Story 3

- [ ] T029 [US3] Document Bearer authentication behavior and missing/malformed/invalid token failures in `src/docs/openapi.ts`; explicitly state that the current implementation has no separate role-based authorization middleware and do not claim account-status/role restrictions not enforced by `src/middleware/auth.middleware.ts` or `src/services/auth.service.ts`
- [ ] T030 [US3] Document exact validation limits, rejected additional fields, and validation error detail examples in `src/docs/openapi.ts` based on `src/schemas/auth.schema.ts` and `src/middleware/validate.middleware.ts`
- [ ] T031 [US3] Document safe error responses and status mappings in `src/docs/openapi.ts` based on `src/utils/api-error.ts` and `src/middleware/error.middleware.ts`, including explicit 400/401/404/409/503/500 examples that all contain `success: false`, `message`, and `error` with no internal details, stack traces, or credentials

**Checkpoint**: User Story 3 is independently usable; security and error handling are explicit, accurate, and safe.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize synchronization, regression protection, and validation across all stories.

- [ ] T032 [P] Add a route-to-documentation synchronization test in `tests/unit/openapi.test.ts` that compares the required route inventory from `src/routes/auth.routes.ts` and `src/app.ts` with documented operations and fails on missing or mismatched method/path entries
- [ ] T033 [P] Add a contract validation test in `tests/unit/openapi.test.ts` that treats the typed runtime document in `src/docs/openapi.ts` as the source of truth, checks it has no unresolved references and valid metadata, and compares required paths, methods, security requirements, response status codes, schema names, and safe error examples with `specs/002-swagger-api-docs/contracts/openapi.yaml`
- [ ] T034 Run `pnpm typecheck` and resolve any strict TypeScript issues in `src/docs/openapi.ts`, `src/routes/docs.routes.ts`, and `src/app.ts` without weakening compiler settings
- [ ] T035 Run `pnpm test`, `pnpm test:integration`, and the scenarios in `specs/002-swagger-api-docs/quickstart.md`; fix only documentation-related failures and confirm existing endpoint status, payload, validation, authentication, and authorization behavior is unchanged
- [ ] T036 Review `src/docs/openapi.ts`, `src/routes/docs.routes.ts`, `src/app.ts`, and `README.md` for credential leakage, stack traces, production exposure, naming consistency, and alignment with `specs/002-swagger-api-docs/contracts/openapi.yaml`
- [ ] T037 [P] Add explicit `NODE_ENV` configuration and test coverage in `src/config/env.ts` and `tests/integration/docs.integration.test.ts`, documenting the development default and asserting that `NODE_ENV=production` disables the documentation route
- [ ] T038 [P] Add route-not-found and internal error examples in `src/docs/openapi.ts` and `specs/002-swagger-api-docs/contracts/openapi.yaml`, each using only `success: false`, a safe `message`, and `error.code` (`NOT_FOUND_ERROR` or `INTERNAL_ERROR`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T001-T004 can begin immediately.
- **Foundational (Phase 2)**: Depends on Setup; T005-T009 block all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2; delivers the MVP documentation contract and UI.
- **User Story 2 (Phase 4)**: Depends on Phase 3 because interactive execution needs the mounted UI and complete operations.
- **User Story 3 (Phase 5)**: Depends on Phase 2 and can begin after shared schemas exist; it should be verified against the operations from Phase 3.
- **Polish (Phase 6)**: Depends on the desired user stories being implemented.

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only; no dependency on another user story.
- **US2 (P1)**: Depends on US1's mounted OpenAPI document and documentation route.
- **US3 (P2)**: Depends on Foundational and the operations produced by US1; its security/error coverage can be developed in parallel with US2 after US1.

### Parallel Opportunities

- T002, T003, and T004 can run in parallel after T001 is planned.
- T007 and T008 can run in parallel after T005-T006 establish shared types.
- T010-T012 can run in parallel before US1 implementation.
- T013-T016 can be split by operation/schema area after foundational schemas exist.
- T019-T021 can run in parallel after the docs route is mounted.
- T026-T028 can run in parallel after US1 operations exist.
- T032, T033, and T036 can run in parallel after story implementation; T034-T035 follow implementation and can run together when files are stable.

## Parallel Example: User Story 1

```text
Task: "T010 [US1] Add OpenAPI structure tests in tests/unit/openapi.test.ts"
Task: "T011 [US1] Add schema and response tests in tests/unit/openapi.test.ts"
Task: "T012 [US1] Add documentation route integration coverage in tests/integration/docs.integration.test.ts"
Task: "T013 [US1] Implement health operation in src/docs/openapi.ts"
Task: "T014 [US1] Implement register operation in src/docs/openapi.ts"
Task: "T015 [US1] Implement login operation in src/docs/openapi.ts"
```

## Parallel Example: User Story 2

```text
Task: "T019 [US2] Verify Swagger UI and OpenAPI exposure in tests/integration/docs.integration.test.ts"
Task: "T020 [US2] Verify health regression in tests/integration/docs.integration.test.ts"
Task: "T021 [US2] Verify development gating in tests/integration/docs.integration.test.ts"
Task: "T025 [US2] Update README.md quickstart instructions"
```

## Parallel Example: User Story 3

```text
Task: "T026 [US3] Add Bearer security contract tests in tests/unit/openapi.test.ts"
Task: "T027 [US3] Add safe error response contract tests in tests/unit/openapi.test.ts"
Task: "T028 [US3] Add invalid input regression test in tests/integration/docs.integration.test.ts"
Task: "T029 [US3] Document authentication and authorization behavior in src/docs/openapi.ts"
Task: "T030 [US3] Document validation constraints in src/docs/openapi.ts"
Task: "T031 [US3] Document safe error mappings in src/docs/openapi.ts"
```

## Implementation Strategy

1. **MVP first**: Complete Phase 1, Phase 2, and Phase 3 to provide a browsable, complete contract for all current endpoints.
2. **Incremental delivery**: Complete Phase 4 for interactive development testing, then Phase 5 for security/error clarity.
3. **Regression protection**: Complete Phase 6 before declaring the feature ready; all existing tests and typecheck must remain green.
4. **No unrelated changes**: Do not modify controllers, services, schemas, auth middleware, or response utilities unless a documentation test exposes an existing contract mismatch that must be reported separately.
