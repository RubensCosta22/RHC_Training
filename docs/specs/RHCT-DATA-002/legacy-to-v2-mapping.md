# RHCT-DATA-002 — Legacy → V2 Transformation Mapping

**Status:** Gate 1D — evidence-based mapping

## Canonical migration source

Only the canonical Henrique Legacy profile is an historical source:

- Legacy profile: `ae3c54bd-bf68-46a2-a1d9-389957158fce`
- canonical person: Henrique
- canonical Auth account to preserve/recreate: `rubens19962@hotmail.com`
- all other Legacy profiles/accounts are excluded from historical migration by explicit product-owner decision; Legacy remains untouched until cutover validation completes.

The test Henrique profile `2a8285bc-46d0-4676-946d-c54faa3649d4` MUST NOT contribute sessions, records, measurements, photos, plans, programs, progression state or storage objects to V2.

## Transformation rules

| Legacy source | V2 destination | Transformation contract |
|---|---|---|
| `auth.users` canonical account | Supabase Auth + `app_users` | Recreate/preserve the canonical login according to the approved Auth migration procedure. Create exactly one active `app_users` row. Auth credentials/tokens are never copied through domain ETL. |
| `profiles` canonical Henrique | `profiles` | Create one new canonical V2 profile ID. Copy approved profile attributes only. Do not copy Legacy `user_id`, family fields or authorization artifacts. |
| Legacy ownership/access rows | `profile_access` | Do not copy. Create exactly one fresh mapping from the canonical normal user to the new Henrique profile. Admin access is global via `app_users.role=admin`, never synthetic `profile_access`. |
| `workout_sessions` | `workout_sessions` | Migrate all 27 canonical sessions with original historical dates/times, workout code A–F, completion/volume and running fields that exist. Generate deterministic migration provenance/idempotency metadata. Do not import sessions from excluded profiles. |
| `workout_exercises` | `workout_exercises` | Migrate all 139 canonical execution rows. Resolve each historical exercise to `exercise_catalog`; preserve immutable executed-name and required semantic snapshots so catalog cleanup cannot rewrite history. |
| `exercise_records` | `exercise_records` | Reconcile 60 Legacy rows into canonical `(profile_id, exercise_id)` state. Case-only duplicates (`Hack machine`/`Hack Machine`, `Leg press`/`Leg Press`) resolve to one catalog identity each. Preserve the deterministic latest/best progression facts rather than blindly inserting duplicate free-text rows. |
| `body_measurements` | `body_measurements` | Migrate the single canonical measurement with original date and supported measurement values. |
| `progress_photos` | `progress_photos` | Migrate the two canonical archived metadata rows and preserve `archived_at`. New object paths use the V2 profile identity. Validate referenced objects by manifest before cutover. |
| canonical avatar object/reference | V2 profile avatar + Storage | Migrate the referenced avatar object and update the new profile to its V2 object path. |
| `workout_plans` | `workout_plans` + plan exercise structure | Preserve current active workout F configuration. JSON/free-text exercise identity is resolved to `exercise_catalog`; V2 must not use the Legacy profile ID or Legacy authorization columns. |
| `workout_drafts` | `workout_drafts` | No canonical pending rows currently exist; initial migration count is zero. Cutover delta check must still re-query this table immediately before freeze. |
| `profile_program_enrollments` | `program_enrollments` | Migrate the one active enrollment, including start date, current week and running baseline (10 km, 50 min, 5:00 min/km), remapped to the V2 program/profile IDs. |
| `training_programs` | `training_programs` | Migrate/seed the required current program definition (`rhc-strength-12w`) as canonical V2 reference data, not as user-owned data. |
| program sessions/exercises/substitutions | corresponding V2 program tables | Rebuild from the required current program definition using canonical exercise IDs. Current Legacy evidence: 6 program sessions, 29 program exercises, 77 substitutions. |
| `program_exercise_exposures` | V2 progression/exposure history | Preserve all 69 canonical exposures and remap profile, enrollment, program-exercise and workout-session references. Legacy inventory found 0 broken session, enrollment or program-exercise links. |
| `profile_program_exercise_baselines` | V2 baseline state if retained by baseline design | Current canonical count is zero. Do not invent rows. |
| `storage.objects` canonical paths | private V2 Storage bucket | Copy only objects in the approved canonical manifest: 2 archived progress-photo objects plus the referenced avatar object. Verify bytes using size and cryptographic hash during migration tooling. Do not copy objects from excluded profiles. |
| Legacy RLS/policies/functions/triggers | none directly | Never copy. V2 authorization is implemented fresh from the approved ADR/matrix. Legacy ownership/family fallback logic is explicitly forbidden. |

## Exercise identity transformation

Legacy free-text names are not primary keys in V2.

1. normalize for matching only (trim/case/known aliases);
2. resolve to a stable `exercise_catalog.code/id`;
3. preserve the historical executed/display name snapshot in `workout_exercises`;
4. reject unresolved ambiguous mappings for manual review — never silently create two catalog exercises for capitalization only;
5. `exercise_records` has deterministic uniqueness on `(profile_id, exercise_id)`.

Inventory evidence before ETL:

- 139 historical execution rows;
- 59 normalized execution names;
- 60 Legacy record rows / 58 normalized record names;
- known case-only record duplicates: Hack Machine and Leg Press variants;
- 122 execution rows with positive weight;
- 138 execution rows marked completed;
- maximum observed load: 96 kg.

## Program/exposure integrity

The 69 canonical exposures are migration-required historical state. Inventory verified:

- 69/69 linked to a workout session;
- 0 broken workout-session links;
- 0 broken enrollment links;
- 0 broken program-exercise links;
- exposure period starts 2026-07-21 and reaches 2026-08-08 in the inventory snapshot.

ETL must remap IDs; it must not preserve Legacy foreign-key IDs as V2 authorization identity.

## Storage manifest

Canonical inventory currently contains three required objects under the Henrique canonical path:

- archived progress photo #1 — 62,437 bytes;
- avatar — 62,437 bytes;
- archived progress photo #2 — 62,437 bytes.

Equal byte sizes do not prove equal contents. Migration tooling SHALL calculate cryptographic hashes from actual object bytes and compare source → destination before storage reconciliation passes.

## Reconciliation contract

Pre-cutover snapshot and post-load V2 must reconcile the canonical source after applying only documented transformations.

Required checks include:

- exactly 27 canonical sessions from the current inventory snapshot, adjusted only by a documented cutover delta if new legitimate sessions are created before freeze;
- every canonical session represented once in V2;
- 139 canonical workout-exercise rows represented once before any explicitly documented structural transformation;
- no session/exercise from excluded Legacy profiles;
- exercise-record transformation report proving why 60 Legacy rows produce the V2 canonical count;
- 1 measurement;
- 2 archived progress-photo metadata rows;
- avatar present and referenced;
- 3/3 required Storage objects hash-verified;
- 1 active program enrollment with equivalent running baseline/current state;
- 69/69 current exposures represented and referentially valid, adjusted only by documented pre-freeze delta;
- current workout F preserved;
- 0 pending drafts at inventory time, with a fresh freeze-time check;
- zero Legacy authorization/family artifacts imported.

Any unexplained mismatch is a cutover blocker.

## Delta rule

This document is an inventory snapshot, not permission to freeze production now. Because the canonical Henrique profile remains in daily use, counts can legitimately increase between inventory and cutover. The final migration therefore uses:

1. baseline extraction manifest;
2. pre-freeze delta extraction;
3. write freeze/epoch gate;
4. final delta load;
5. reconciliation against the freeze-time Legacy snapshot;
6. only then application cutover.

No hard-coded historical count may cause legitimate post-inventory training data to be dropped.