# Data Model: Authentication & User Management

## Overview

Supabase Auth tetap menjadi pemilik identity, password, email confirmation, refresh token, dan
session lifecycle. Schema publik hanya menyimpan data personel sekolah dan registry pencabutan yang
diperlukan backend. Tidak ada credential yang disalin ke schema publik.

## Entity: Auth User (managed by Supabase)

| Field | Type | Rules | Purpose |
|-------|------|-------|---------|
| `id` | UUID | Primary key, provider-managed | Identity key |
| `email` | Email | Required, normalized, unique by provider | Login identifier |
| `encrypted_password` | Provider-managed | Never read or returned by application | Credential proof |
| `email_confirmed_at` | Timestamp nullable | Non-null before login is accepted | Verification state |
| `raw_user_meta_data` | JSON | Signup metadata only; never trusted for role | Profile bootstrap |
| `created_at` | Timestamp | Provider-managed | Audit timestamp |

Only `id`, normalized `email`, and verification state are consumed by application services.

## Entity: `school_staff_profiles`

| Field | Type | Null | Default / Constraint |
|-------|------|------|----------------------|
| `user_id` | UUID | No | PK; FK `auth.users(id)`; `ON DELETE CASCADE` |
| `full_name` | Text | No | Trimmed; 2-120 characters |
| `staff_id` | Text | No | Trimmed; 3-50 characters; case-insensitive unique index |
| `school_unit` | Text | No | Trimmed; 2-100 characters |
| `role` | Text/enum | No | `staff`; allowed: `staff`, `inventory_officer`, `admin` |
| `account_status` | Text/enum | No | `active`; allowed: `active`, `inactive` |
| `created_at` | Timestamptz | No | Current timestamp |
| `updated_at` | Timestamptz | No | Current timestamp; refreshed on update |

### Relationships

- Exactly one profile belongs to one Auth User through `user_id`.
- Deleting the Auth User deletes the profile.
- Email is read from Auth User and is not duplicated in the profile.

### Security rules

- RLS is enabled.
- An authenticated user may select only the row whose `user_id = auth.uid()`.
- Public/anonymous users cannot select, insert, update, or delete profiles.
- Registration trigger is a tightly scoped `SECURITY DEFINER` function with an explicit empty
  search path and schema-qualified object names.
- `role` and `account_status` are database defaults and are never copied from signup metadata.
- Service-role access is server-only.

### Validation and integrity

- Trigger rejects missing/invalid `full_name`, `staff_id`, or `school_unit`.
- Functional unique index on normalized `staff_id` prevents case variants and registration races.
- Application normalizes email by trimming and lowercasing before calling the identity provider.
- Database constraints remain authoritative even after Zod validation.

## Entity: `revoked_auth_sessions`

| Field | Type | Null | Default / Constraint |
|-------|------|------|----------------------|
| `session_id` | UUID | No | Primary key; taken from an already verified token claim |
| `user_id` | UUID | No | Identity owner; indexed |
| `expires_at` | Timestamptz | No | Original access-token expiry |
| `revoked_at` | Timestamptz | No | Current timestamp |

### Relationships and lifecycle

- A row represents one session explicitly logged out through this backend.
- Rows are created idempotently on logout (`session_id` conflict does not fail logout).
- Auth middleware rejects a verified token while its `session_id` has a non-expired row.
- Rows with `expires_at <= now()` are deleted by scheduled or opportunistic cleanup.
- The table is not exposed to anonymous or authenticated data API access; only the server service
  role can read/write it.

## State Transitions

### Account

```text
not_created
  -> unverified_active     registration succeeds; profile defaults to active/staff
  -> verified_active       email confirmed; login permitted
  -> verified_inactive     administrator deactivates profile; login/access denied
  -> deleted               Auth User deleted; profile cascades
```

The administration workflow that changes `account_status` or `role` is outside this feature.

### Session

```text
absent -> active           verified active account logs in
active -> revoked          logout records session_id and revokes refresh capability
active -> expired          access token reaches expiry
revoked -> expired         original access token reaches expiry; registry row may be removed
```

## Response Projection

The profile endpoint composes Auth User and profile data into:

```text
user_id, full_name, email, staff_id, school_unit, role, account_status
```

All projection keys use `snake_case`; password, provider internals, metadata, and revocation data
are never returned.
