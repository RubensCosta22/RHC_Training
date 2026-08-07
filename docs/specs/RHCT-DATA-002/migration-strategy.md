# RHCT-DATA-002 — Selective Migration Strategy

**Status:** Draft for R4 review  
**Parent Spec:** RHCT-DATA-002  
**Decision:** migrate historical data only for the profile that actually owns relevant history; recreate the remaining profiles cleanly in V2.

---

## 1. Migration principle

The V2 migration SHALL NOT copy every legacy profile merely because it exists.

Profiles are classified into one of two migration modes:

1. **MIGRATE_HISTORY** — canonical profile with relevant production history that must be preserved.
2. **RECREATE_CLEAN** — profile exists in the current product but has no history that must be retained; create a fresh canonical V2 profile and new access relationship.

This classification must be produced from an explicit inventory before ETL execution.

No profile is classified based only on name.

---

## 2. MIGRATE_HISTORY flow

For the single profile confirmed to contain relevant history, migrate and reconcile every approved profile-owned resource.

At minimum inspect and migrate when present:

- profile attributes required by the current product;
- workout sessions;
- workout exercises / sets represented in the current schema;
- exercise records / progression data;
- workout plans;
- training program enrollment and current program state;
- body measurements;
- progress photos and storage objects;
- running metrics;
- schedule state required by the current product;
- any persistent progress/autosave data explicitly approved for migration;
- other profile-owned records discovered during inventory and approved in the mapping contract.

Historical IDs may be replaced by new V2 UUIDs. Referential integrity SHALL be maintained through an explicit migration mapping table/artifact.

Suggested migration mapping artifact:

```text
entity_type | legacy_id | v2_id | migration_mode | notes
profile     | ...       | ...   | MIGRATE_HISTORY | canonical historical profile
session     | ...       | ...   | MIGRATE_HISTORY | ...
...
```

The ETL must be repeatable and deterministic.

---

## 3. RECREATE_CLEAN flow

For profiles with no approved history to preserve:

- DO NOT migrate the legacy profile row;
- DO NOT preserve the legacy `profile_id`;
- DO NOT migrate legacy ownership/access artifacts;
- DO NOT migrate legacy `user_id`, `family_group_id`, invitation or family relationships;
- create a new V2 `profiles` row using only approved current profile attributes;
- create a fresh `profile_access` row for the intended authenticated account;
- create fresh plan/program enrollment state from the approved current configuration when required by product behavior;
- start history at zero in V2.

A clean recreation is not data loss when inventory confirms the profile has no approved history to retain.

The source Legacy database remains available during the rollback/observation window.

---

## 4. Mandatory pre-migration proof

Before any profile may be classified as RECREATE_CLEAN, the inventory must prove zero approved historical data for that profile across every relevant profile-owned table and storage namespace.

The verification must not rely only on `workout_sessions`.

Required checks include at least:

- workout sessions;
- workout exercises;
- exercise records;
- body measurements;
- progress photos / objects;
- plan/program state;
- drafts/pending sync data if persisted;
- event/domain records that materially affect the user experience.

If any retained data is found, classification returns to review.

---

## 5. Historical profile reconciliation

The historical profile has a stricter parity requirement.

Before cutover, Legacy and V2 reports must reconcile at least:

- number of workout sessions;
- session dates and workout types;
- exercises per session;
- loads/reps/volume values represented in Legacy;
- exercise-record latest/best values after deterministic reconciliation;
- running duration/distance metrics;
- body measurements;
- progress photo count and file accessibility;
- plan/program state that should survive cutover;
- aggregate total volume and other statistics used by the product.

Every mismatch must have one of these states:

- FIXED;
- EXPLAINED_AND_APPROVED;
- BLOCKING.

No unexplained mismatch is acceptable.

---

## 6. Authentication mapping

User accounts are handled separately from profile history.

For each intended V2 user:

```text
legacy auth identity -> intended V2 auth identity -> app_users -> profile_access
```

For RECREATE_CLEAN profiles, only the intended V2 identity and fresh profile/access records are needed.

For the MIGRATE_HISTORY profile, historical domain data maps to the fresh canonical V2 profile regardless of its legacy authorization artifacts.

Runtime access SHALL never be inferred from legacy email/profile ownership fields.

---

## 7. Cutover impact

Immediately before cutover:

1. freeze writes to Legacy for the cutover window;
2. extract the final delta for the MIGRATE_HISTORY profile only;
3. apply deterministic transforms;
4. load delta into V2;
5. recreate/verify clean profiles and access rows;
6. run parity and RLS tests;
7. switch application environment only after R4 approval.

The Legacy database remains intact for rollback/read-only comparison.

---

## 8. Release-blocking checks

- [ ] exactly one profile is classified MIGRATE_HISTORY, based on inventory evidence;
- [ ] every RECREATE_CLEAN profile has zero approved retained history;
- [ ] historical profile row/data mapping is explicit;
- [ ] no legacy authorization relationship is imported as ownership authority;
- [ ] all V2 profiles receive fresh canonical IDs unless a documented exception exists;
- [ ] every normal account receives exactly one intended active profile access;
- [ ] admin access derives only from `app_users.role = 'admin'`;
- [ ] historical parity checks pass;
- [ ] cross-profile RLS suite passes;
- [ ] rollback remains possible until the observation window closes.
