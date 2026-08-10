# RHCT-DATA-002 — Canonical Henrique Legacy Manifest

**Status:** Gate 1C evidence
**Source project:** RHCTRAINING Legacy
**Canonical legacy profile:** `ae3c54bd-bf68-46a2-a1d9-389957158fce`
**Canonical auth account:** `rubens19962@hotmail.com`
**Migration mode:** `MIGRATE_HISTORY`

## Scope decision

Only the canonical Henrique profile above is approved as historical migration source. Other legacy profiles/accounts are not migration sources. The Legacy database remains intact until cutover validation is complete.

## Domain counts

- workout_sessions: 27
- workout_exercises: 139
- exercise_records: 60
- body_measurements: 1
- progress_photos rows: 2
- workout_plans: 1
- workout_drafts: 0
- profile_program_enrollments: 1
- profile_program_exercise_baselines: 0
- program_exercise_exposures: 69

## Workout history

| Type | Sessions | Accumulated volume | First | Last |
|---|---:|---:|---|---|
| A | 6 | 62012 | 2026-07-02 | 2026-08-08 |
| B | 5 | 23484 | 2026-06-30 | 2026-08-03 |
| C | 5 | 53980 | 2026-07-01 | 2026-08-04 |
| D | 5 | 48360 | 2026-07-03 | 2026-08-05 |
| E | 5 | 0 | 2026-07-07 | 2026-08-06 |
| F | 1 | 15895 | 2026-08-07 | 2026-08-07 |

The zero-volume E sessions are cardio and SHALL NOT be treated as invalid solely because strength volume is zero.

## Exercise history integrity

- 139 executed exercise rows
- 59 normalized exercise names in session history
- 122 rows contain weight > 0
- 138 rows are marked completed
- 17 completed rows have zero weight; these require semantic preservation (e.g. bodyweight/cardio/non-loaded movements) and SHALL NOT be dropped merely for zero load
- maximum recorded session exercise weight: 96

## Exercise records

- 60 record rows
- 58 normalized names
- 49 have last_weight > 0
- 50 have best_weight > 0
- record date range: 2026-06-30 through 2026-08-08

Two case-only duplicate identities exist and MUST be canonicalized during ETL without losing progression values:

- `Hack machine` / `Hack Machine` -> canonical exercise identity
- `Leg press` / `Leg Press` -> canonical exercise identity

The V2 exercise catalog SHALL provide the durable exercise identifier. Free-text case differences SHALL NOT create separate progression records.

## Current profile state

Legacy profile attributes:

- name: Henrique
- age: 29
- gender: homem
- goal: Emagrecer e ganhar força
- avatar object exists in private `progress-photos` storage

## Current custom workout plan

One active profile-specific workout plan exists:

- type: F
- title: `Complementar — Máquinas e Barra Fixa`
- created/updated: 2026-08-05
- 9 exercises

This current plan is part of the required V2 product state and SHALL be migrated/mapped to the V2 canonical exercise model.

## Structured program state

One active enrollment exists:

- program: `RHC Strength 12W`
- program id: `9b52e7d3-7595-4e40-abf4-1779b8f82086`
- objective: força
- duration: 12 weeks
- status: published
- enrollment start: 2026-07-21
- current_week: 1
- running baseline: 10 km / 50 min / 5:00 min/km

Program definition contains:

- 6 program sessions
- 29 program exercises
- 77 substitutions

The canonical Henrique profile has 69 program exercise exposure rows.

### Exposure integrity

All 69 exposures are structurally valid at inventory time:

- 69/69 linked to workout_session
- 0 unlinked
- 0 broken profile/session relationships
- 0 broken enrollment relationships
- 0 broken program exercise relationships
- exposure range: 2026-07-21 through 2026-08-08

This dataset SHALL be migrated or deterministically transformed so current progression behavior and statistics remain equivalent.

## Storage manifest

Three storage objects belong to the canonical profile namespace:

1. archived progress photo — 62,437 bytes — referenced by progress_photos
2. avatar — 62,437 bytes — referenced by profiles.avatar_url
3. archived progress photo — 62,437 bytes — referenced by progress_photos

Both progress photo rows are archived. Archived state SHALL be preserved initially. The avatar is active profile state and SHALL be preserved.

Before cutover, migration tooling SHALL additionally record cryptographic hashes of copied objects and compare size + hash between Legacy and V2.

## Non-migration sources

The legacy profile `2a8285bc-46d0-4676-946d-c54faa3649d4` and other duplicate/test profiles are explicitly excluded from the V2 historical migration source by product-owner decision.

They SHALL remain untouched in Legacy during the observation/rollback window but SHALL NOT be loaded into V2.

## Reconciliation contract

Before V2 cutover, at minimum prove:

- 27/27 historical workout sessions represented in V2
- 139/139 executed exercise rows represented or deterministically transformed with a documented one-to-one mapping
- 60 legacy exercise_record rows reconciled into the V2 canonical exercise identities, with case-only duplicates merged deterministically
- 1 measurement preserved
- 2 archived progress-photo records preserved if approved at final migration run
- active avatar copied and verified
- active F plan behavior preserved
- active 12-week program enrollment/state preserved
- 69/69 exposures represented or equivalently transformed
- no record from excluded test profiles is imported
- all target-profile RLS isolation tests pass

Any count reduction caused by canonicalization must be documented with explicit source -> target mapping and must preserve semantic information.
