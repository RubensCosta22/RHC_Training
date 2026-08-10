# RHCT-DATA-002 — Database V2 Schema Contract

**Status:** Gate 3 draft — architecture approved, implementation pending validation

## Design constraints

1. `auth.users` is authentication identity only.
2. `app_users` defines global application role/status.
3. `profiles` is the training-person identity and contains no auth ownership column.
4. `profile_access` is launch-time 1:1 mapping for normal users; admin access is global and does not create mapping rows.
5. Profile-owned domain rows use `profile_id`, never duplicated auth `user_id` ownership.
6. Authorization is fail-closed through private helpers and RLS.
7. Completed workout history keeps immutable execution snapshots even if the exercise catalog changes.
8. Structured exercise identity uses `exercise_catalog.id`, never free-text capitalization.
9. No family tables, family IDs, owner/editor roles or authorization fallbacks exist in V2.

## Security schemas

### `private`
Non-API helper schema. Not part of the exposed PostgREST API schema.

Contains authorization helpers such as:
- `private.is_active_app_user()`;
- `private.is_admin()`;
- `private.can_access_profile(uuid)`;
- `private.can_admin_access_profile(uuid)`.

Clients receive no direct table writes to authorization state.

## Identity

### `app_users`
- `user_id uuid PRIMARY KEY REFERENCES auth.users(id)`; no cascade delete;
- `role text NOT NULL CHECK role IN ('user','admin')`;
- `status text NOT NULL CHECK status IN ('active','disabled')`;
- timestamps.

Invariant: authorization helpers return false if this row is missing or disabled.

### `profiles`
- `id uuid PK`;
- `name`;
- `birth_date` optional; legacy age is transformed during ETL only when a reliable DOB is available, otherwise age-compatible product data must be handled explicitly rather than fabricating a date;
- `gender`;
- `goal`;
- `avatar_path`;
- `is_active`;
- timestamps.

No `user_id`.

### `profile_access`
- `user_id uuid UNIQUE NOT NULL`;
- `profile_id uuid UNIQUE NOT NULL`;
- timestamps;
- composite PK or deterministic unique pair.

No role column. Admins do not require rows here.

## Exercise taxonomy

### `muscle_groups`
Stable `code`, display `name`, active flag.

### `movement_patterns`
Stable `code`, display `name`, active flag.

### `exercise_categories`
Stable `code`, display `name`, active flag.

### `exercise_catalog`
- `id uuid PK`;
- `code text UNIQUE` stable slug;
- `name` current display name;
- optional `primary_muscle_group_id`;
- optional `movement_pattern_id`;
- required category where known;
- optional `execution_video_url`/reference metadata;
- active flag;
- timestamps.

Historical matching may normalize names/aliases for ETL, but runtime identity is the stable catalog ID.

## Training plans

### `workout_plans`
Header for a profile workout code A–F.
- one active logical plan per `(profile_id, workout_code)` at launch;
- title/description;
- active flag;
- timestamps.

### `workout_plan_exercises`
Normalized replacement for Legacy JSON exercise arrays.
- `workout_plan_id`;
- `exercise_id`;
- `sort_order`;
- prescribed sets/reps/rest;
- optional goal/instructions;
- active flag.

### `workout_plan_exercise_alternatives`
- plan exercise parent;
- alternative `exercise_id`;
- order.

## Training state

### `profile_training_state`
Exactly one row per profile.
- `current_workout_code` and/or `next_workout_code`;
- active program enrollment if applicable;
- `last_completed_session_id` optional;
- monotonic `version` for concurrency;
- timestamps.

This row prevents frontend inference from arbitrary history ordering.

## Workout history

### `workout_sessions`
- `id uuid PK`;
- `profile_id`;
- `workout_code A–F`;
- workout date and creation/completion timestamps;
- gym name;
- duration/completion/volume;
- notes;
- running fields: distance, duration seconds, average pace, activity mode;
- `client_operation_id uuid UNIQUE` for idempotency;
- `source_system` / `source_legacy_id` migration provenance;
- archive state where product behavior requires it.

### `workout_exercises`
- child of session;
- `exercise_id` canonical reference;
- immutable snapshot fields: `exercise_name_snapshot`, muscle-group/movement snapshot where required;
- prescribed sets/reps;
- actual reps/load/completion/notes;
- deterministic order;
- migration provenance.

### `exercise_records`
One row per `(profile_id, exercise_id)`.
- last load/date;
- best load;
- updated timestamp.

ETL merges capitalization-only Legacy duplicates deterministically.

## Measurements/media

### `body_measurements`
Profile-owned dated measurements with supported anthropometric fields, notes, archive state and provenance.

### `progress_photos`
Profile-owned metadata:
- date/type;
- private storage path;
- byte size/hash evidence fields after migration if useful operationally;
- notes/archive state;
- timestamps.

Storage is private. Object paths are profile-scoped and authorization is checked from the path profile UUID.

## Autosave

### `workout_drafts`
- one deterministic active draft per profile/workout context;
- payload JSONB with strict size limit;
- `version`;
- `client_operation_id`/idempotency key;
- optional program enrollment context;
- consumed session reference;
- timestamps.

## Structured programs

### `training_programs`
Canonical program definition.

### `program_phases`
Program week/range progression metadata.

### `program_sessions`
Program session A–F/running/recovery definitions.

### `program_exercises`
References `exercise_catalog` and contains program-specific prescription/progression.

### `program_exercise_substitutions`
References alternative canonical exercise IDs.

### `program_enrollments`
Profile ↔ program state with status, start date/current week, running baseline and timestamps.

### `program_exercise_baselines`
Optional established load/baseline per enrollment/program exercise.

### `program_exercise_exposures`
Historical program progression facts linked to profile, enrollment, program exercise and, where present, workout session.

## Audit

### `event_logs`
Minimal domain/security/admin audit metadata only. No passwords, tokens, authorization headers or raw sensitive request payloads.

## RLS contract

All public application tables enable RLS.

Normal-user profile-owned policy predicate is always equivalent to:

`private.can_access_profile(profile_id)`

Admin-only identity/access mutations do not receive generic client table policies. They must use a separately reviewed protected admin operation (recommended Edge Function/service-role boundary for launch) that enforces:
- actor is an active admin;
- uniqueness invariants;
- at least one active admin remains;
- audit event creation.

No public `SECURITY DEFINER` authorization helper is required for ordinary RLS evaluation.

## Storage contract

Bucket: private `progress-photos` (name may be retained for compatibility).

V2 path convention:
`<profile_id>/<kind>/<yyyy-mm-dd-or-static>/<filename>`

`kind` includes at minimum `photos` and `avatars`.

Storage RLS parses the first folder as profile UUID and checks `private.can_access_profile(profile_id)` for normal access. Admin inspection is allowed only according to the approved admin authorization rule.

## Migration-only provenance

Historical/domain tables may retain `source_system='legacy_v1'` and `source_legacy_id` where useful for deterministic reconciliation. These fields are not authorization inputs and may be removed in a future cleanup Spec only after migration reconciliation/retention requirements expire.

## Explicitly forbidden

- `profiles.user_id`;
- duplicated auth ownership columns in domain tables;
- family tables/IDs;
- multiple access roles at launch;
- free-text exercise identity as a foreign-key substitute;
- public authorization fallback functions from Legacy;
- client-writable `app_users.role/status` or `profile_access`;
- implicit profile selection (`first()`, alphabetical, most recent, etc.).
