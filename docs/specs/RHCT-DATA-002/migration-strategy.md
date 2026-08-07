# RHCT-DATA-002 — Selective Migration Strategy

**Status:** Revised after R4 adversarial review  
**Parent Spec:** RHCT-DATA-002  
**Decision:** migrate historical data only for the single profile proven to contain relevant history; recreate all other intended profiles cleanly in V2.

## 1. Migration modes

Each intended profile is classified from inventory evidence as exactly one of:

1. **MIGRATE_HISTORY** — preserve and reconcile approved production history.
2. **RECREATE_CLEAN** — create a fresh V2 profile and fresh access mapping because no approved retained history exists.

No classification is based only on name.

## 2. MIGRATE_HISTORY

For the single historical profile, migrate every approved profile-owned resource discovered by inventory, including when present:

- required profile attributes;
- workout sessions and executed sets/exercises;
- exercise records/progression;
- workout plans;
- program enrollment/state;
- profile training/rotation state;
- body measurements;
- progress photos and storage objects;
- running metrics;
- drafts/pending durable state explicitly approved for migration;
- any additional profile-owned row required by current behavior.

All Legacy IDs map explicitly to new V2 IDs through a migration artifact. ETL must be deterministic and repeatable.

## 3. RECREATE_CLEAN

For a clean profile:

- do not copy its Legacy profile row or Legacy ID;
- do not copy Legacy authorization/family/owner artifacts;
- create a fresh V2 profile from approved current attributes;
- create exactly one fresh `profile_access` mapping for its intended normal account;
- recreate only the current approved plan/program configuration required for normal operation;
- history starts at zero.

Before this classification is allowed, inventory must prove there is no approved retained history across sessions, exercises, records, measurements, photos/storage, durable drafts/sync state, program state or other user-visible domain records.

## 4. Canonical exercise transformation

Before ETL rehearsal, build the V2 `exercise_catalog` and mapping contract.

For every historical/planned Legacy exercise:

```text
legacy exercise representation -> canonical exercise_catalog.id/code
```

Mapping rules:

- no matching by capitalization alone without normalization/review;
- ambiguous mappings are BLOCKING;
- completed workout rows retain immutable snapshot fields required to reproduce historical display/statistics;
- canonical catalog edits after cutover do not rewrite historical snapshots.

## 5. Historical reconciliation

Legacy and V2 must reconcile at least:

- session count;
- session dates/types;
- exercises and sets per session;
- load/repetition/volume values;
- exercise-record latest/best values;
- running distance/time/pace data;
- body measurements;
- plan/program/training-state values approved for retention;
- aggregate statistics used by the app;
- progress-photo object count, readability, byte size and cryptographic hash for every retained object when technically available.

Every mismatch is classified as `FIXED`, `EXPLAINED_AND_APPROVED`, or `BLOCKING`. No unexplained mismatch may pass cutover.

## 6. Authentication strategy

V2 SHALL use recreated Supabase Auth identities rather than importing Legacy password credentials.

For this small private user set:

1. create each intended account in the V2 Auth project using the approved email;
2. require controlled password reset/re-authentication before production use;
3. record `legacy_auth_user_id -> v2_auth_user_id` in the migration mapping artifact;
4. create `app_users` rows explicitly;
5. create exactly one `profile_access` mapping for each normal account;
6. bootstrap the first admin separately using the verified V2 Auth UUID and operator-only setup procedure.

Runtime profile access is never inferred from email.

## 7. Storage migration

For each retained storage object record:

```text
legacy_bucket/path
v2_bucket/path
legacy_profile_id
v2_profile_id
byte_size
sha256 (or approved cryptographic hash)
copy_status
verification_status
```

The migrated object must be readable after copy and inaccessible to unauthorized accounts under V2 policies.

## 8. Backend/cutover epoch

Legacy and V2 are separate backend epochs. The client must know which backend instance/schema epoch created a persisted offline operation.

Required behavior:

- durable offline writes/drafts carry a `client_operation_id` and backend/schema epoch;
- V2 rejects operations created for an incompatible Legacy epoch unless an explicit migration path handles them;
- replay is idempotent through unique `client_operation_id` constraints or equivalent;
- on backend fingerprint/epoch change, the client must not silently replay a Legacy queue into V2;
- unsynced Legacy data discovered before cutover blocks cutover until synchronized, exported or explicitly resolved.

## 9. Cutover protocol

Cutover has two write phases.

### Phase 1 — read-only verification

1. announce/coordinate the short maintenance window for all known devices;
2. ensure no unresolved pending offline queues remain;
3. take final Legacy backup/checkpoint;
4. put Legacy application data into enforced read-only/write-frozen state so stale clients cannot append new domain writes;
5. extract the final MIGRATE_HISTORY delta;
6. transform/load to V2;
7. run final data reconciliation;
8. deploy the V2-connected application while V2 production writes remain gated;
9. run login, profile-isolation, RLS, storage and smoke tests.

If validation fails here, rollback is simple: restore the known-good Legacy app configuration and remove the Legacy write freeze. No V2 production user write has been accepted.

### Phase 2 — open V2 writes

Only after Phase 1 is explicitly accepted:

1. enable V2 production writes;
2. keep Legacy write-frozen/read-only;
3. begin the observation window;
4. audit V2 write health and authorization.

## 10. Rollback after V2 writes open

Once V2 has accepted production writes, rollback cannot discard them.

If a P0/P1 requires return to Legacy:

1. immediately gate V2 writes;
2. export all V2 writes since the cutover checkpoint using `client_operation_id`, timestamps and entity mappings;
3. transform those writes through an approved reverse-delta mapping for the supported profile-owned entities;
4. load/reconcile the reverse delta into Legacy before reopening Legacy writes;
5. validate counts, key values and profile ownership;
6. restore Legacy application configuration only after reconciliation passes.

The cutover runbook must prove this reverse-delta procedure in rehearsal. If a V2-only entity cannot be safely reverse-mapped, V2 writes for that entity may not be enabled until the rollback window closes or an approved remediation exists.

## 11. Release-blocking checks

- [ ] exactly one profile is `MIGRATE_HISTORY` based on inventory evidence;
- [ ] each `RECREATE_CLEAN` profile has zero approved retained history;
- [ ] canonical exercise mappings have no unresolved ambiguity;
- [ ] every normal V2 account has exactly one mapping and every mapped profile has at most one normal account;
- [ ] V2 Auth identities and password-reset/re-authentication path are tested;
- [ ] first-admin bootstrap evidence exists;
- [ ] all retained photos pass path/size/hash/readability verification;
- [ ] all pending offline Legacy queues are resolved before cutover;
- [ ] Legacy write freeze blocks stale-client writes;
- [ ] V2 rejects incompatible backend epochs and duplicate operation IDs;
- [ ] historical parity checks pass;
- [ ] cross-profile RLS/storage suite passes;
- [ ] pre-write rollback and post-write reverse-delta rollback have been rehearsed;
- [ ] Legacy remains intact until the approved observation/retention window ends.
