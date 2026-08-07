# RHCT-DATA-002 — Database V2 & Controlled Migration

**Status:** Draft — Architecture Definition  
**Risk Tier:** R4 — Critical  
**Product:** RHC Training  
**Scope:** Database, authorization, RLS, Auth integration, storage references, data migration, rollback and cutover  
**Normative process:** RHC Tech SDD v1.3

---

## 1. Context

The current RHC Training database evolved incrementally and now contains overlapping authorization concepts, legacy ownership fields, duplicate profile identities and historical migrations that are difficult to reason about safely.

A production incident demonstrated that legacy `profiles.user_id` semantics could coexist with explicit access relationships and expose a profile to the wrong authenticated account. Emergency fail-closed hotfixes reduce immediate risk, but the long-term solution is a clean database rebuild based on the current business model instead of the historical implementation path.

This Spec defines a new Supabase project and a controlled migration of production data. The existing database remains the source of truth until the V2 cutover is explicitly approved.

---

## 2. Goals

1. Create a minimal, explicit and auditable identity/authorization model.
2. Ensure one logical person maps to one canonical profile.
3. Make authorization derive from exactly one explicit access model plus the global admin role.
4. Remove legacy implicit ownership rules from the new schema.
5. Preserve all valid historical training data.
6. Normalize domain taxonomy such as muscle group, movement pattern and exercise category.
7. Validate data equivalence before production cutover.
8. Provide deterministic rollback to the legacy production database.
9. Establish a clean baseline so future migrations are incremental changes to an approved architecture, not architecture discovery in production.

---

## 3. Non-goals

- No new commercial/SaaS functionality.
- No public multi-tenant organization model.
- No `families`, `family_members` or team hierarchy.
- No community, billing, subscriptions or professional-coach features.
- No broad UI redesign.
- No deletion of the legacy database during migration.
- No blind `pg_dump -> restore` of application-domain data.

---

## 4. Core architecture decision

### 4.1 Identity model

The V2 identity model SHALL contain only:

- Supabase `auth.users` — authentication identity;
- `app_users` — application-level global role/status;
- `profiles` — the person being trained;
- `profile_access` — explicit relationship between an authenticated user and a profile.

There SHALL NOT be:

- `families`;
- `family_members`;
- `family_invitations`;
- `family_group_id`;
- bootstrap roles;
- authorization fallback through `profiles.user_id`;
- authorization inferred from creator, email, name or legacy ownership fields.

### 4.2 Authorization principle

> A profile is accessible only when the current account is an active global admin or has an explicit active `profile_access` row for that profile.

No parallel authorization mechanism is permitted.

---

## 5. Proposed identity schema

### 5.1 `app_users`

Purpose: application role/status associated with Supabase Auth.

Required fields:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `role text not null check (role in ('user','admin'))`
- `status text not null default 'active' check (status in ('active','disabled'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Rules:

- new accounts default to `user`;
- only an active admin can promote/demote another user;
- frontend SHALL NOT update `role` directly;
- role changes occur through a security-definer RPC with authorization checks;
- the system SHALL prevent removal/demotion of the last active admin.

### 5.2 `profiles`

Purpose: canonical identity of the person whose training data is stored.

Representative fields:

- `id uuid primary key`
- `name text not null`
- `birth_date date null`
- `sex text null`
- `goal text null`
- `avatar_path text null`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Rules:

- `profiles` SHALL NOT contain an authorization `user_id` field;
- a person SHALL have one canonical profile;
- duplicate identity prevention SHALL use an explicit migration mapping and application/admin workflow, not name-only matching;
- profile deletion in normal operation SHOULD be soft-delete/deactivation unless a future approved Spec defines otherwise.

### 5.3 `profile_access`

Purpose: explicit account-to-profile authorization.

Required fields:

- `profile_id uuid not null references profiles(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `role text not null check (role in ('owner','editor'))`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- primary key or unique constraint on `(profile_id, user_id)`

Rules:

- current normal users SHOULD have exactly one active `owner` profile;
- each profile SHALL have at most one active owner unless a future Spec changes this business rule;
- admins do not require synthetic access rows for every profile;
- disabled access rows grant no permissions.

---

## 6. Authorization functions

V2 SHALL keep authorization helpers minimal.

### `is_admin()`

Returns true only when:

- `auth.uid()` exists;
- matching `app_users` row exists;
- `role = 'admin'`;
- `status = 'active'`.

### `can_access_profile(target_profile_id uuid)`

Returns true only when:

- `is_admin()` is true; OR
- an active `profile_access` row exists for `auth.uid()` and `target_profile_id`.

### `can_edit_profile(target_profile_id uuid)`

Returns true only when:

- `is_admin()` is true; OR
- an active `profile_access` row exists with an allowed edit role.

There SHALL be no `OR profiles.user_id = auth.uid()` fallback.

---

## 7. Admin model

The application has one or more global admins.

Admins may:

- view all profiles;
- create profiles;
- assign/revoke profile access;
- manage plans/programs;
- promote another account to admin;
- demote another admin when at least one active admin remains;
- perform approved administrative operations.

Admins SHALL NOT be modeled as owners of every profile.

High-impact admin mutations SHALL:

- execute through reviewed RPCs or trusted backend paths;
- validate caller authorization server-side;
- emit an audit/event log;
- reject self-escalation by non-admins;
- prevent zero-active-admin state.

---

## 8. Domain schema direction

The target schema SHALL be derived from current product behavior and may include:

- `app_users`
- `profiles`
- `profile_access`
- `workout_plans`
- `training_programs`
- `program_sessions`
- `program_exercises`
- `program_exercise_substitutions`
- `program_enrollments`
- `workout_sessions`
- `workout_exercises`
- `exercise_records`
- `body_measurements`
- `progress_photos`
- `workout_drafts`
- `event_logs`

Every table must have a documented business purpose, ownership model, PK/FK strategy, constraints, indexes and RLS policy before implementation.

No legacy table is copied merely because it exists today.

---

## 9. Domain taxonomy

Structured concepts SHALL NOT be stored as arbitrary free text when the product relies on their semantics.

At minimum the model SHALL distinguish:

- `muscle_group` — canonical muscle group;
- `movement_pattern` — biomechanical movement pattern;
- `exercise_category` — e.g. strength/cardio/mobility;
- `workout_type` — canonical workout code/type;
- access/application roles.

A value such as `puxar_vertical` SHALL NOT be stored as a muscle group.

Canonical values SHALL be defined in one source of truth and validated at write time.

---

## 10. Data ownership rule

Domain data belongs to `profile_id`, not implicitly to `auth.users.id`.

Tables representing profile-owned data SHALL reference `profile_id` directly where semantically appropriate.

Duplicated `user_id` ownership columns SHALL NOT be introduced unless a separately documented technical need exists and they SHALL NOT be used as an authorization fallback.

---

## 11. RLS strategy

RLS SHALL be enabled on all profile-owned tables exposed through the Supabase client.

The default posture is deny.

Profile-owned resources SHALL derive access from `can_access_profile(profile_id)` or the equivalent profile relationship through a parent row.

Required adversarial cases:

- normal user -> own profile: ALLOW;
- normal user -> another profile: DENY;
- normal user -> guessed profile UUID: DENY;
- normal user -> old/legacy profile UUID: DENY;
- user with no access row: DENY;
- disabled user: DENY;
- disabled profile access: DENY;
- admin -> any active profile: ALLOW;
- non-admin -> admin RPC: DENY;
- direct role update from client: DENY.

RLS tests are release-blocking.

---

## 12. Storage authorization

Storage objects SHALL have deterministic ownership metadata/path rules tied to `profile_id`.

Signed URL generation and upload paths SHALL validate profile authorization server-side.

Legacy path semantics based on historical owner user IDs SHALL NOT be copied into V2 unless required solely for migration compatibility.

The migration plan must map every retained media object to the canonical V2 profile.

---

## 13. Migration strategy

Migration SHALL use controlled ETL, not blind database restore.

### Phase A — Extract

Export all source tables and storage metadata required by the approved mapping.

The legacy production database remains unchanged except for emergency corrective maintenance.

### Phase B — Transform

Transformation SHALL include:

- old profile ID -> canonical V2 profile ID mapping;
- duplicate-profile consolidation;
- authorization mapping;
- taxonomy normalization;
- legacy field translation;
- orphan detection;
- invalid-record quarantine;
- conflict reporting.

No ambiguous mapping is silently guessed.

### Phase C — Load

Load data into an isolated V2 Supabase project.

Load order SHALL respect referential integrity and be idempotent/repeatable for rehearsals.

### Phase D — Reconcile

Source and destination SHALL be compared before cutover.

Required reconciliation includes at least:

- profiles;
- workout sessions;
- workout exercises;
- exercise records;
- body measurements;
- progress photos metadata/files;
- plans/programs/enrollments;
- drafts where migration is approved;
- aggregate volume/count/date checks.

A mismatch blocks cutover until explained and accepted.

---

## 14. Known duplicate-profile case

The current database contains more than one historical profile for Rudney with valid records across both identities.

The migration SHALL:

1. create one canonical V2 Rudney profile;
2. map all approved historical Rudney profile IDs to that canonical profile;
3. preserve distinct workout sessions;
4. reconcile `exercise_records` deterministically;
5. preserve source IDs in migration audit/mapping artifacts where useful;
6. never deduplicate workouts solely by profile name.

The same process SHALL be applied to any additional duplicates discovered during inventory.

---

## 15. Auth migration

Authentication migration must be explicitly designed before cutover.

Preferred objective:

- preserve the intended user identities/emails;
- establish V2 `app_users` rows;
- create only explicit `profile_access` mappings;
- verify every account individually.

If Supabase Auth credentials cannot be migrated safely in-place between projects, the approved plan SHALL define a controlled re-authentication/password-reset path rather than weakening security.

No profile access may be inferred from email at runtime after migration.

---

## 16. Migration gates

### Gate 0 — Legacy freeze

- schema-changing feature development paused;
- only P0/P1 corrective work allowed;
- final legacy backup strategy confirmed.

### Gate 1 — Inventory

Complete catalog of:

- tables;
- columns;
- constraints;
- FKs;
- indexes;
- functions;
- triggers;
- RLS/policies;
- buckets/storage rules;
- RPCs/Edge Functions;
- row counts by profile/resource.

### Gate 2 — Canonical model approval

- ERD approved;
- table contracts approved;
- authorization matrix approved;
- ADR approved;
- rollback/recovery approved.

### Gate 3 — V2 baseline

- new Supabase project created;
- single baseline schema applied;
- RLS and storage rules installed;
- test identities created;
- no production cutover.

### Gate 4 — ETL rehearsal

- complete extract/transform/load executed on a snapshot;
- all mappings recorded;
- no unexplained orphan/conflict.

### Gate 5 — Reconciliation

- row-level/count/aggregate checks pass;
- historical data parity confirmed;
- duplicate consolidation verified.

### Gate 6 — Shadow validation

A non-production build points to V2 and validates:

- Henrique;
- Rudney;
- Nicole;
- Karol;
- admin;
- cross-profile denial;
- workout A-F;
- running flow;
- autosave/F5;
- offline sync;
- history;
- progress;
- measurements;
- photos;
- plans/programs;
- admin operations.

### Gate 7 — Cutover approval

Requires explicit R4 release approval.

### Gate 8 — Cutover

- final legacy backup;
- short write freeze;
- delta extraction;
- delta transformation/load;
- final reconciliation;
- environment switch;
- deploy;
- production smoke tests;
- authorization tests.

### Gate 9 — Observation / rollback window

Legacy database remains intact and available for rollback/read-only comparison for an explicitly defined retention period.

---

## 17. Cutover rollback

Rollback must be practical, documented and rehearsed.

Before cutover:

- legacy environment variables are preserved securely;
- legacy database remains intact;
- backup restore procedure is verified;
- last accepted source checkpoint is recorded.

If any P0/P1 issue occurs during cutover validation:

1. stop writes to V2 if necessary;
2. restore frontend/backend configuration to Legacy;
3. redeploy known-good application configuration;
4. validate user login/profile isolation;
5. record any V2-only writes for later reconciliation;
6. open incident review before attempting another cutover.

---

## 18. Baseline migration policy

V2 SHALL start from one reviewed baseline representing the approved architecture, e.g.:

`00000000000000_baseline_v2.sql`

The baseline SHALL be reproducible against an empty V2 project.

After V2 launch, normal timestamped migrations resume.

Future migrations must reference a Spec/change record and document:

- intent;
- data impact;
- authorization/RLS impact;
- compatibility;
- rollback/remediation;
- automated tests;
- production verification.

A migration SHALL NOT be used as a substitute for unresolved architecture design.

---

## 19. Acceptance criteria

The V2 migration cannot be considered complete until all of the following are true:

- [ ] `families`, `family_members`, `family_invitations`, `family_group_id` do not exist in V2.
- [ ] `profiles.user_id` is not used as an authorization mechanism and is preferably absent from V2.
- [ ] `app_users` is the only source of global admin status.
- [ ] `profile_access` is the only non-admin source of profile authorization.
- [ ] normal users cannot access another profile by URL, query, RPC, storage path or direct API call.
- [ ] admin can access/manage all profiles according to the approved matrix.
- [ ] non-admin cannot self-promote.
- [ ] the last active admin cannot be removed/demoted.
- [ ] duplicate logical profiles are consolidated according to explicit mappings.
- [ ] all approved historical workout sessions are preserved.
- [ ] all approved historical exercise records are reconciled.
- [ ] measurements and photos are preserved and linked to the correct canonical profile.
- [ ] taxonomy no longer mixes muscle group, movement pattern and category.
- [ ] no unexplained orphan records remain.
- [ ] reconciliation reports show accepted parity between Legacy and V2.
- [ ] automated RLS regression suite passes.
- [ ] Security CI passes.
- [ ] manual account-by-account validation passes.
- [ ] rollback has been rehearsed.
- [ ] explicit R4 release approval is recorded before production cutover.

---

## 20. Definition of Done

The database rebuild is Done only when:

- the V2 canonical model is documented and implemented;
- authorization is understandable from `app_users + profile_access` without hidden fallbacks;
- data migration is reproducible;
- reconciliation evidence is stored;
- all critical flows pass against V2;
- production cutover succeeds;
- the observation window completes without unresolved P0/P1 incidents;
- Legacy is retained or retired according to an explicit approved retention decision.

---

## 21. Required R4 review artifacts

Before implementation/cutover, this Spec SHALL be accompanied by:

1. ADR — Database V2 identity and authorization architecture;
2. ERD / canonical data model;
3. Authorization & RLS matrix;
4. Security review;
5. Database impact review;
6. Migration mapping document;
7. ETL design;
8. Reconciliation plan/report;
9. Backup and rollback runbook;
10. Production cutover runbook;
11. Adversarial review with all Blocker/Major findings resolved or explicitly accepted under the RHC Tech process.

---

## 22. Current decision

Approved architectural direction for further review:

- no family/team abstraction;
- global admin role in `app_users`;
- explicit profile authorization in `profile_access`;
- admins can create/promote additional admins through protected server-side operations;
- profiles represent trained people, not auth ownership;
- legacy authorization shortcuts are not carried into V2;
- migration proceeds in parallel with Legacy remaining production until formal cutover.
