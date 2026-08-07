# RHCT-DATA-002 — Gate 1 Legacy Inventory Runbook

**Status:** In progress  
**Risk:** R4  
**Mode:** Read-only evidence gathering

## Objective

Capture the effective production Legacy database state before any V2 baseline is finalized.

Repository migrations are historical evidence only. They SHALL NOT be treated as proof of the current production schema because later manual applications, partial migrations, hotfixes and Supabase-side changes may differ from Git history.

## Evidence order

1. Effective database structure from PostgreSQL catalogs.
2. Current RLS policies and security functions.
3. Current triggers, indexes, constraints and FKs.
4. Storage buckets/policies/object footprint.
5. Current Auth identities and profile-to-account relationships.
6. Exact data footprint per profile across every profile-owned table.
7. Historical-profile classification: `MIGRATE_HISTORY` or `RECREATE_CLEAN`.
8. Legacy -> V2 mapping contract.

## Safety rules

- Do not UPDATE/DELETE/INSERT production domain data during inventory.
- Do not drop/recreate policies or functions.
- Do not apply the V2 baseline to Legacy.
- Do not classify a profile as RECREATE_CLEAN based only on `workout_sessions`.
- Do not infer authorization from names or emails.
- Preserve the Legacy database as source of truth until cutover approval.

## Gate 1A — Structural inventory

Run `legacy-inventory-01-structure.sql` in the Legacy Supabase SQL Editor.

Capture/export all result sets. The script uses catalog SELECT queries only.

Expected evidence:

- public tables/views and RLS state;
- columns and types/defaults/nullability;
- PK/unique/FK/check constraints;
- indexes;
- RLS policies;
- public functions and security-definer/search_path state;
- triggers;
- storage buckets;
- profiles and Auth identities for mapping review.

## Gate 1B — Profile data footprint

After Gate 1A identifies every table that contains `profile_id` directly or indirectly, create a table-by-table count matrix by canonical Legacy profile ID.

Required categories include, when present:

- workout sessions;
- workout exercises through session parent;
- exercise records;
- measurements;
- photos/storage objects;
- workout plans;
- weekly/training state;
- program enrollments/state;
- workout drafts/offline state;
- event/domain records that materially affect user experience.

A profile can be marked `RECREATE_CLEAN` only when all approved retained-history categories are zero.

## Gate 1C — Historical integrity

For each `MIGRATE_HISTORY` profile record:

- exact session count;
- exact workout-exercise count;
- min/max session date;
- workout types;
- aggregate volume;
- exercise record count and latest/best state;
- running metrics;
- measurements;
- photos plus storage object mapping;
- plan/program/training-state snapshot;
- drafts/pending sync disposition.

## Gate 1D — Authorization inventory

Build a truth table:

`auth user -> app/legacy access rows -> profiles visible by current RLS`

Flag:

- duplicate logical profiles;
- multiple normal-account profile relationships;
- orphan access rows;
- profile `user_id` legacy ownership;
- admin/family legacy relationships;
- any authorization path not present in V2 ADR.

## Gate completion

Gate 1 is complete only when:

- effective schema is captured;
- every relevant profile-owned table is identified;
- every current profile is classified from evidence;
- the historical profile(s) are explicitly identified;
- Auth/profile mapping is explicit;
- no unexplained profile-owned data remains;
- a Legacy -> V2 mapping artifact can be written without guessing.
