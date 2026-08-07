# RHCT-DATA-002 — Database V2 & Controlled Migration

**Status:** Draft — revised after R4 adversarial review  
**Risk Tier:** R4 — Critical  
**Product:** RHC Training  
**Normative process:** RHC Tech SDD v1.3

## 1. Purpose

Rebuild the RHC Training database in a new Supabase project from an approved canonical model, migrate only the historical data that must be preserved, recreate clean profiles when no retained history exists, and cut over with deterministic authorization, reconciliation and rollback.

Legacy remains production/source-of-truth until formal R4 cutover approval.

## 2. Non-goals

- no commercial/SaaS multi-tenancy;
- no families, family members, invitations or organization hierarchy;
- no coach/community/billing features;
- no broad UI redesign;
- no blind database dump/restore of application-domain data;
- no copying Legacy authorization shortcuts into V2.

## 3. Identity and authorization architecture

V2 uses only:

- Supabase `auth.users` — authentication;
- `app_users` — application role/status;
- `profiles` — trained-person identity;
- `profile_access` — one explicit normal-account-to-profile mapping.

### 3.1 `app_users`

Required contract:

- `user_id uuid primary key references auth.users(id)` with deletion protection rather than automatic cascade;
- `role in ('user','admin')`;
- `status in ('active','disabled')`;
- timestamps.

Every application authorization decision requires a matching active `app_users` row. Missing/disabled application identity is DENY even if a profile mapping exists.

### 3.2 `profiles`

Profiles represent people being trained, not Auth ownership.

They SHALL NOT contain an authorization `user_id`, family/group ownership or email-based access relationship.

Inactive profiles retain history. Normal users cannot access inactive profile-domain data; active admins may inspect/reactivate through approved admin paths.

### 3.3 `profile_access`

V2 launch is intentionally one-to-one and role-free.

Required invariants:

- `user_id UNIQUE NOT NULL`;
- `profile_id UNIQUE NOT NULL`;
- no `owner/editor` role;
- one normal account -> at most one profile;
- one profile -> at most one normal account;
- admins require no synthetic mapping rows;
- direct client writes are denied;
- assign/revoke/reassign operations are admin-only and audited.

Shared/delegated profile editing is out of scope and requires a future Spec/ADR.

### 3.4 Canonical authorization logic

```text
is_active_app_user() =
  authenticated AND app_users.status = active

is_admin() =
  is_active_app_user() AND app_users.role = admin

can_access_profile(profile_id) =
  is_active_app_user()
  AND target profile is active
  AND (
    is_admin()
    OR unique profile_access(auth.uid(), profile_id) exists
  )
```

No helper may fall back to profile owner fields, creator, email, name, invitation, family/group or client route state.

## 4. Admin lifecycle

### First admin

The first V2 admin is created only during controlled environment bootstrap:

1. create and verify the intended V2 Supabase Auth account;
2. manually verify the exact Auth UUID;
3. execute an operator-only setup statement that creates `app_users(role='admin', status='active')` for that UUID;
4. record evidence in the R4 migration package.

There is no client bootstrap endpoint and the baseline does not hard-code production email/UUID values.

### Additional admins

Only an active admin may promote another active application user through a reviewed server-side RPC.

### Last admin

The database must prevent zero active admins. Protected admin operations must serialize/check active-admin count and reject demotion, disablement or retirement of the final active admin. Auth-user deletion must be blocked while the application identity is still referenced; it may occur only after safe application retirement.

## 5. Security-definer and RLS implementation contract

Any `SECURITY DEFINER` helper/RPC SHALL:

- schema-qualify referenced objects;
- use a fixed safe `search_path`;
- revoke default PUBLIC execute;
- grant execute only to minimum required roles;
- validate `auth.uid()` and active application status server-side;
- avoid recursive RLS dependency chains;
- validate all client-supplied target IDs;
- emit audit events for privileged admin mutations.

RLS is enabled on all application/profile-owned tables exposed through Supabase client APIs. Default posture is deny.

Frontend route guards are defense-in-depth only.

## 6. Canonical domain model

The baseline SHALL include only approved current-domain entities, including as required:

- `app_users`;
- `profiles`;
- `profile_access`;
- `exercise_catalog`;
- `muscle_groups`;
- `movement_patterns`;
- `exercise_categories`;
- `workout_plans`;
- `profile_training_state`;
- `workout_sessions`;
- `workout_exercises`;
- `exercise_records`;
- `body_measurements`;
- `progress_photos`;
- `workout_drafts`;
- `training_programs`;
- `program_sessions`;
- `program_exercises`;
- `program_exercise_substitutions`;
- `program_enrollments`;
- `event_logs`.

No Legacy table is copied merely because it exists today.

## 7. Exercise and taxonomy contract

### `exercise_catalog`

V2 has a canonical exercise catalog with stable identity (`id` + unique machine `code`) and current display metadata.

Plans, programs, progression records and new workout sessions reference canonical exercise IDs.

### Completed workout history

Completed `workout_exercises` SHALL also preserve immutable snapshot fields needed to reproduce historical display/statistics. Later catalog edits cannot rewrite history.

### Structured taxonomy

Muscle group, movement pattern and exercise category are distinct canonical concepts. Values such as `puxar_vertical` cannot be stored as muscle groups. Structured taxonomy is validated at write time; no admin free-text mutation for these concepts.

`exercise_records` uniqueness is deterministic on `(profile_id, exercise_id)`.

## 8. Training/rotation state

Current A–F progression/rotation state must be explicit rather than inferred ambiguously.

`profile_training_state` stores the minimal durable state required by current behavior, such as current/next workout code, active plan/program reference where applicable, last-completion reference/time when required and concurrency/version metadata.

Gate 1 inventory must identify all current persisted scheduling/rotation fields before the baseline contract is finalized.

## 9. Idempotency and offline writes

Durable workout/draft/offline operations use a client-generated `client_operation_id` or equivalent deterministic idempotency key.

V2 must reject duplicate operation IDs and incompatible backend/schema epochs.

Persisted client queues record the backend instance/schema epoch that created them. A Legacy queue must never be silently replayed into V2.

## 10. Storage contract

Storage ownership is tied to profile ID, not Legacy Auth ownership.

For retained media migration, evidence includes:

- source and destination bucket/path;
- source/destination profile mapping;
- object byte size;
- cryptographic hash when technically available;
- copy/readability result;
- authorization test result.

Unauthorized profile users must not access another profile's storage object even by guessed path.

## 11. Audit/event logs

Event logs are audit evidence, never authorization state.

Minimum event shape includes event type/id, timestamp, actor ID where available, target profile/entity where applicable, correlation/request ID where available and minimal structured metadata.

Passwords, tokens, secrets, raw authorization headers and unnecessary sensitive payloads are prohibited. Retention is defined before cutover.

## 12. Selective migration policy

Profiles are classified by evidence as:

- `MIGRATE_HISTORY` — exactly one profile, if Gate 1 confirms the current assumption that only one profile has retained production history;
- `RECREATE_CLEAN` — intended profiles with no approved historical data to retain.

A clean profile gets a new V2 UUID, new Auth identity mapping and new `profile_access`; Legacy ownership/family artifacts are not imported.

Before `RECREATE_CLEAN`, inventory must prove absence of retained data across sessions, exercises, records, measurements, photos/storage, durable drafts/sync, program/training state and other user-visible records.

If the inventory proves more than one profile has retained history, the plan changes to migrate every profile with retained data; data is never discarded to preserve the assumption.

## 13. Authentication migration decision

V2 Auth accounts are recreated rather than importing Legacy password credentials.

For each intended user:

1. create V2 Auth account with approved email;
2. require controlled password reset/re-authentication;
3. record Legacy Auth UUID -> V2 Auth UUID mapping;
4. create `app_users` explicitly;
5. create one `profile_access` mapping for each normal user;
6. bootstrap the first admin through the controlled process in Section 4.

No runtime authorization is inferred from email.

## 14. ETL

Migration is Extract -> Transform -> Load -> Reconcile.

Transformation includes:

- Legacy entity ID -> V2 entity ID mapping;
- canonical exercise mapping;
- taxonomy normalization;
- profile history classification;
- orphan detection;
- invalid/ambiguous record quarantine;
- conflict reporting.

No ambiguous mapping is guessed silently.

ETL rehearsals must be repeatable/idempotent.

## 15. Reconciliation

For the historical profile, reconciliation includes at least:

- workout session count/dates/types;
- executed exercises/sets;
- loads, reps and represented volume;
- exercise progression latest/best values;
- running distance/time/pace;
- body measurements;
- plan/program/training state approved for retention;
- aggregate statistics used by the product;
- progress photo count, readability, size and content hash.

Every mismatch is `FIXED`, `EXPLAINED_AND_APPROVED` or `BLOCKING`. Unexplained mismatches block cutover.

## 16. Migration gates

### Gate 0 — Legacy freeze policy

- schema-changing feature work paused;
- only P0/P1 corrective work on Legacy;
- backup/restore ability confirmed.

### Gate 1 — Inventory

Catalog schema, constraints, FKs, indexes, functions, triggers, RLS/policies, storage rules, RPCs/Edge Functions, row counts by profile and all durable/offline state. Produce evidence for `MIGRATE_HISTORY` vs `RECREATE_CLEAN`.

### Gate 2 — Canonical architecture approval

Required before baseline:

- revised Spec;
- ADR;
- canonical ERD;
- authorization matrix;
- table contracts;
- migration strategy;
- security/database review;
- rollback/cutover strategy;
- second R4 adversarial review with no unresolved Blocker/Major.

### Gate 3 — V2 baseline/environment

Only after Gate 2 approval:

- create separate Supabase V2 project;
- apply one reviewed `00000000000000_baseline_v2.sql` against an empty project;
- configure RLS/storage/functions;
- bootstrap test/admin identities;
- no production cutover.

### Gate 4 — ETL rehearsal

Run full snapshot ETL and mapping/reconciliation.

### Gate 5 — Shadow validation

Test V2 with all intended normal accounts plus admin, including A–F, running, autosave/F5, offline behavior, history, progression, measures, photos, programs/plans and admin operations.

### Gate 6 — Cutover approval

Explicit R4 approval required.

### Gate 7 — Cutover read-only verification

1. coordinate all known devices;
2. resolve pending Legacy offline queues;
3. take final Legacy backup/checkpoint;
4. enforce Legacy write freeze so stale clients cannot append writes;
5. load/reconcile final historical delta;
6. deploy V2-connected application with V2 production writes still gated;
7. execute login, RLS, storage and smoke validation.

Failure here returns to Legacy with no V2 production write loss.

### Gate 8 — Open V2 writes

Only after read-only verification passes:

- enable V2 writes;
- keep Legacy write-frozen/read-only;
- begin observation window;
- monitor authorization/data-integrity signals.

### Gate 9 — Observation/retention

Legacy remains intact until rollback window ends and retirement is separately approved.

## 17. Rollback

### Before V2 writes open

Restore known-good Legacy application configuration and remove Legacy write freeze after validation.

### After V2 writes open

No accepted V2 production write may be discarded.

A rollback requires:

1. gate V2 writes;
2. export V2 delta since cutover checkpoint using operation IDs/timestamps/mapping artifacts;
3. transform supported V2 writes through a rehearsed reverse-delta mapping;
4. load/reconcile that delta into Legacy;
5. restore Legacy configuration only after reconciliation passes.

If an entity cannot be reverse-mapped safely, production writes for that entity cannot be enabled during the rollback window without an explicit approved remediation.

## 18. Profile creation duplicate prevention

“One logical person = one profile” is enforced operationally through admin workflow rather than name uniqueness.

Before creating a profile, admin workflow must display/search existing active and inactive profiles and require explicit confirmation. Duplicate detection may use normalized name plus secondary attributes only as warnings, never as authorization or hard identity proof.

The one-to-one `profile_access` constraints prevent accidental multiple account/profile mappings.

## 19. Acceptance criteria

The V2 architecture/migration is not complete until:

- no family/team tables or `family_group_id` exist;
- no `profiles.user_id` authorization ownership exists;
- every app authorization requires active `app_users`;
- `profile_access` is one-to-one and role-free at launch;
- normal users cannot access another/inactive profile by URL, REST, RPC or storage path;
- direct client mutation of admin/access state is denied;
- first-admin bootstrap is documented and tested;
- last active admin cannot be removed by demotion, disablement or Auth deletion;
- security-definer/RLS hardening tests pass;
- canonical exercise identity and structured taxonomy are implemented;
- current training rotation/state has an explicit V2 contract;
- offline/idempotency/backend-epoch behavior is tested;
- every retained historical record/object reconciles or has approved explanation;
- Auth recreation/password-reset path is tested for every intended account;
- cross-profile and admin adversarial suites pass;
- pre-write and post-write rollback procedures are rehearsed;
- explicit R4 cutover approval is recorded.

## 20. Baseline policy

Only after Gate 2 approval may implementation create:

`00000000000000_baseline_v2.sql`

The baseline must reproduce the full approved V2 schema against an empty project. Future migrations require a Spec/change record, data/RLS impact analysis, verification and rollback/remediation plan. Migrations are not substitutes for unresolved architecture decisions.
