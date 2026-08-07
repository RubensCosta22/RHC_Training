# RHCT-DATA-002 — Canonical ERD V2

**Status:** Revised after R4 adversarial review

```text
auth.users
   │ 1:1
   ▼
app_users
   │
   ├────────────── global role: user | admin
   │
   └──── normal user only ───► profile_access ◄───1:1───► profiles
                                                       │
                     ┌─────────────────────────────────┼───────────────────────────────────┐
                     │                                 │                                   │
                     ▼                                 ▼                                   ▼
              workout_plans                    workout_sessions                    profile_training_state
                     │                                 │
                     │                                 ▼
                     │                          workout_exercises ─────► exercise_catalog
                     │
                     └───────────────────────────────► exercise_catalog

profiles ─► exercise_records ─► exercise_catalog
profiles ─► body_measurements
profiles ─► progress_photos
profiles ─► workout_drafts
profiles ─► program_enrollments ─► training_programs ─► program_sessions ─► program_exercises ─► exercise_catalog
                                                                                 │
                                                                                 └──► program_exercise_substitutions

exercise_catalog ─► muscle_groups
exercise_catalog ─► movement_patterns
exercise_catalog ─► exercise_categories
```

## Identity and authorization

### `app_users`
- `user_id uuid PK -> auth.users(id)` with deletion protection, not automatic cascade;
- `role: user | admin`;
- `status: active | disabled`;
- timestamps.

### `profiles`
- canonical person/training identity;
- no authorization `user_id`;
- profile attributes only;
- `is_active` soft lifecycle.

### `profile_access`
Launch model is intentionally one-to-one and role-free:

- `user_id uuid UNIQUE NOT NULL`;
- `profile_id uuid UNIQUE NOT NULL`;
- timestamps;
- no `owner/editor` role;
- no soft `is_active` flag is required at launch: revocation removes the mapping through an admin-only protected operation;
- only non-admin source of profile authorization.

This prevents one normal account from resolving to multiple profiles and prevents multiple normal accounts from owning the same profile. Shared/delegated access requires a future Spec/ADR.

## Canonical exercise model

### `exercise_catalog`
Single source of exercise identity used by plans, programs, records and new sessions.

Representative fields:
- `id uuid PK`;
- `code text UNIQUE NOT NULL` — stable machine key/slug;
- `name text NOT NULL` — current display name;
- `primary_muscle_group_id`;
- `movement_pattern_id`;
- `exercise_category_id`;
- optional execution-video/reference metadata;
- `is_active`;
- timestamps.

Exercise identity is by stable `exercise_catalog.id/code`, never free-text capitalization.

### Historical snapshot rule

`workout_exercises` SHALL reference `exercise_id` and also retain immutable snapshot fields needed to preserve history, including at minimum the executed/display name and semantic fields required by historical statistics. Later catalog edits SHALL NOT rewrite completed workout history.

### Taxonomy lookup tables

`muscle_groups`, `movement_patterns` and `exercise_categories` are canonical lookup tables with stable codes and unique constraints. Free text is not accepted for these structured concepts.

## Training domain

### `workout_plans`
Belongs to one profile and references `exercise_catalog` for configured A–F workouts.

### `profile_training_state`
One row per profile for persisted state that must not be inferred ambiguously from history.

Representative responsibilities:
- current/next workout code in the A–F rotation;
- active plan/program reference where applicable;
- last completed workout reference/time when needed;
- version/timestamps for concurrency.

The exact current Legacy schedule/rotation fields must be mapped during inventory before baseline finalization.

### `workout_sessions`
Belongs to one profile. Completed sessions are historical records and immutable except through an approved correction path.

Representative attributes:
- `profile_id`;
- canonical workout type/code;
- started/completed timestamps;
- duration;
- gym/location where applicable;
- running distance/time/pace fields when applicable;
- `client_operation_id uuid UNIQUE` for idempotent sync/replay protection;
- environment/schema epoch metadata required by the cutover contract.

### `workout_exercises`
Child of a session; references `exercise_catalog` and stores immutable execution snapshots plus sets/load/reps.

### `exercise_records`
Persisted progression state with deterministic uniqueness on `(profile_id, exercise_id)`.

### `body_measurements`
Profile-owned measurement history.

### `progress_photos`
Profile-owned photo metadata. Storage object path/metadata is tied to profile ID and migration integrity includes byte-size/hash evidence.

### `workout_drafts`
Profile-owned autosave/recovery state. One deterministic active draft per workout context. Draft/sync writes use idempotency identifiers and backend epoch checks.

## Structured programs

### `training_programs`
Program definition; not an authorization boundary.

### `program_sessions`
Workout/session definitions inside a program.

### `program_exercises`
References canonical `exercise_catalog`; program-specific ordering/prescription belongs here rather than duplicating exercise identity taxonomy.

### `program_exercise_substitutions`
References canonical exercise IDs for permitted alternatives.

### `program_enrollments`
Links a profile to selected/current program state.

## Audit

### `event_logs`
Security/admin/domain audit events only.

Minimum contract:
- event id/type;
- actor user id when available;
- target profile/entity id when applicable;
- timestamp;
- request/correlation id where available;
- minimal structured metadata.

Never store passwords, tokens, secrets, raw authorization headers or unnecessary sensitive payloads. Retention must be defined before production cutover.

## Inactive profile semantics

- normal users cannot read or write an inactive profile or its domain data;
- admins may inspect inactive profiles through admin-authorized paths;
- reactivation is admin-only;
- historical rows are retained when a profile is deactivated.

## Forbidden V2 relationships

The following SHALL NOT exist:
- `profiles.user_id` authorization ownership;
- `family_group_id`;
- families/family_members/family_invitations;
- `owner/editor` access roles at launch;
- multiple profile mappings for one normal account;
- duplicated `user_id` ownership columns on profile-owned domain tables;
- authorization based on creator/email/name;
- per-profile synthetic admin ownership rows;
- parallel RLS ownership rules.
