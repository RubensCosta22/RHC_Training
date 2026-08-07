# RHCT-DATA-002 — Canonical ERD V2

**Status:** Draft for R4 review

```text
auth.users
   │ 1:1
   ▼
app_users
   │
   │ global role: user | admin
   │
   └───────────────┐
                   │
                   ▼
             profile_access
                   │ N:1
                   ▼
                profiles
                   │
      ┌────────────┼─────────────────────────────────────────────┐
      │            │             │            │                 │
      ▼            ▼             ▼            ▼                 ▼
workout_plans  workout_sessions exercise_records body_measurements progress_photos
                   │
                   ▼
             workout_exercises

profiles
   │
   ├───────────────► workout_drafts
   │
   └───────────────► program_enrollments ─────► training_programs
                                                 │
                                                 ▼
                                          program_sessions
                                                 │
                                                 ▼
                                          program_exercises
                                                 │
                                                 ▼
                                  program_exercise_substitutions
```

## Identity and authorization

### `app_users`
- `user_id uuid PK -> auth.users(id)`
- `role: user | admin`
- `status: active | disabled`
- timestamps

### `profiles`
- canonical person/training identity
- NO authorization `user_id`
- profile attributes only
- soft-active state

### `profile_access`
- `(profile_id, user_id)` unique/PK
- role `owner | editor`
- active flag
- only non-admin source of profile authorization

## Training domain

### `workout_plans`
Belongs to one profile. Stores configurable A-F/current plan definitions or references to a canonical exercise catalog as finalized by schema review.

### `workout_sessions`
Belongs to one profile. Immutable historical training session after completion except explicitly approved correction paths.

Representative attributes:
- profile_id
- workout_type
- started_at / completed_at or canonical date fields
- duration
- gym/location free text where applicable
- running metrics when applicable
- source draft/idempotency reference

### `workout_exercises`
Child of a workout session.

Must keep distinct:
- exercise identity/name
- muscle_group
- movement_pattern
- exercise_category
- load/repetition/set values required by current product

### `exercise_records`
Derived/persisted progression state for a profile + canonical exercise identity.

Must have a deterministic uniqueness key, not free-form duplicates differing only by capitalization.

### `body_measurements`
Profile-owned measurement history.

### `progress_photos`
Profile-owned photo metadata. Storage object authorization is tied to profile_id.

### `workout_drafts`
Profile-owned in-progress state for autosave/recovery. One deterministic active draft identity per in-progress workout context.

## Structured programs

### `training_programs`
Program definition; not used as an authorization boundary.

### `program_sessions`
Session/workout definitions inside a program.

### `program_exercises`
Exercises inside a program session.

Must contain explicit semantic fields rather than overloading muscle group:
- primary muscle group
- movement pattern
- exercise category

### `program_exercise_substitutions`
Allowed alternatives for a program exercise.

### `program_enrollments`
Links a profile to the selected/current program state.

## Audit

### `event_logs`
Security/admin/domain audit events as approved by the observability/privacy review.

Audit data must not become a second authorization model.

## Forbidden V2 relationships

The following SHALL NOT exist:
- `profiles.user_id` authorization ownership;
- `family_group_id`;
- families/family_members/family_invitations;
- duplicated `user_id` owner columns on every profile-owned domain table;
- authorization based on creator/email/name;
- per-profile synthetic admin ownership rows;
- parallel RLS ownership rules.
