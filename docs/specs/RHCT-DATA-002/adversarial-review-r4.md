# RHCT-DATA-002 — R4 Adversarial Review

**Review status:** CHANGES REQUIRED  
**Risk tier:** R4 — Critical  
**Scope reviewed:** Spec, ADR, canonical ERD, authorization matrix and selective migration strategy.

## Summary

The architectural direction is materially better than Legacy, but the current documents are not yet safe to approve for baseline implementation. Several invariants are either contradictory or under-specified in ways that could recreate authorization ambiguity, permit disabled-user access, or create an unsafe cutover/rollback path.

Current disposition: **4 Blockers, 6 Majors, 3 Minors**.

---

## Blockers

### B1 — Disabled users can still pass the canonical profile helper as currently specified

`can_access_profile(profile_id)` is defined as `is_admin() OR active profile_access exists`. For a normal user, this does not require a matching active `app_users` row. Therefore a user with `app_users.status = 'disabled'` but an active `profile_access` could still be authorized, contradicting the Spec and test matrix.

**Required correction**

Introduce an explicit `is_active_app_user()` invariant and require it before every non-anonymous application authorization decision. Conceptually:

```text
can_access_profile(profile_id) =
  is_active_app_user()
  AND (
    is_admin()
    OR active_profile_access_exists(profile_id, auth.uid())
  )
```

The same precondition must apply to edit helpers, storage authorization and RPCs.

### B2 — Current product invariant is still weakened by `editor` and `SHOULD have exactly one profile`

The current business requirement is simpler: a normal account maps to one intended profile; admins see all profiles globally. The proposed model still introduces `owner | editor` and only says a normal user **SHOULD** have exactly one active owner profile. This leaves the database able to represent multiple accessible profiles for a normal account, reproducing the ambiguity class that caused the recent incident.

**Required correction**

For V2 launch, remove `editor` unless a concrete current use case exists. Make the current invariant mandatory and enforceable:

- one active normal user -> at most one active profile access;
- one profile -> at most one active normal account association, unless an explicitly approved future Spec changes this;
- admin does not need profile access rows.

If delegated/shared profile editing is ever needed, add it through a future Spec/ADR rather than pre-building unused complexity.

### B3 — First-admin provisioning and last-admin protection are incomplete

The Spec forbids bootstrap roles and requires the last active admin to be protected, but it does not define how the first admin is created in a fresh V2 project. It also relies on protected role RPCs while `app_users.user_id -> auth.users(id) ON DELETE CASCADE` can remove an admin indirectly if the Auth user is deleted outside that RPC path.

**Required correction**

Define both mechanisms before baseline:

1. deterministic first-admin provisioning during controlled environment bootstrap, using a pre-verified Auth user ID and an operator-only migration/setup step; no client bootstrap path;
2. database-level protection of the last active admin from demotion, disablement **and deletion/cascade**, or a design that makes such deletion impossible through normal operational paths.

### B4 — Cutover/rollback is unsafe with offline sync and V2-only writes

The product has offline workout synchronization. A short Legacy write freeze does not by itself prevent an old/offline client from later replaying queued writes to Legacy after V2 cutover. The rollback section also says V2-only writes will merely be "recorded for later reconciliation", which is not deterministic enough for R4 data integrity.

**Required correction**

Define a cutover epoch/version strategy and a deterministic write protocol. At minimum:

- drain/inspect pending offline queues before cutover where possible;
- prevent post-cutover clients from writing to Legacy, even with stale cached state;
- reject writes from obsolete environment/schema epochs;
- keep V2 read/write gated until smoke + authorization validation passes;
- define deterministic handling of any V2 writes if rollback becomes necessary (export/replay into Legacy or keep production writes disabled until rollback decision).

---

## Majors

### M1 — Canonical exercise identity is unresolved

`workout_plans` may store definitions "or references to a canonical exercise catalog as finalized by schema review", while `exercise_records` requires deterministic uniqueness. This is not closed enough for a baseline intended to avoid future corrective migrations.

**Required decision before baseline:** define an `exercises` catalog (or explicitly reject it) and specify how historical workout rows snapshot exercise name/metadata so future catalog edits do not rewrite history.

### M2 — Required current product state is referenced but absent from the canonical ERD

The migration strategy mentions schedule state and the product currently uses scheduling/rotation behavior, but the ERD does not define a schedule/configuration entity or explain that the state is derived and therefore intentionally not persisted.

**Required correction:** inventory current persisted schedule/rotation state and either model it in V2 or explicitly document why it is derived and not migrated.

### M3 — Auth migration remains a placeholder

The Spec says credentials may require reset if they cannot be migrated safely, but the actual V2 authentication strategy is not decided.

**Required correction:** before V2 environment build/cutover, choose and document one supported path: controlled Auth user migration with tested credential behavior, or recreated users with forced password-reset/re-authentication. Include mapping, verification and rollback implications.

### M4 — Security-definer/RLS helper hardening contract is missing

The baseline will depend heavily on helper functions and admin RPCs, but the Spec does not require hardening details such as fixed `search_path`, minimal EXECUTE grants, recursion avoidance and explicit treatment of RLS bypass/security-definer behavior.

**Required correction:** add a database security contract for helper/RPC implementation and tests.

### M5 — Storage reconciliation lacks content-integrity verification

The migration requires photo counts/accessibility, but count parity can pass even if the wrong/corrupt object was copied.

**Required correction:** for retained objects, record source/destination path mapping plus size and cryptographic hash when technically available; validate object readability and profile authorization after migration.

### M6 — Inactive profile semantics are ambiguous

The Spec states `admin -> any active profile: ALLOW`, but `can_access_profile()` does not define how `profiles.is_active` participates. It is unclear whether an owner can still access a deactivated profile and whether admins can inspect archived/inactive profiles.

**Required correction:** define read/write behavior for inactive profiles explicitly and test it.

---

## Minors

### m1 — `is_active` rows versus deletion policy is not fully standardized

`profile_access` uses an active flag, while some admin operations are described as revoke/delete. Pick one canonical lifecycle for normal revocation and document whether hard deletion is reserved for maintenance.

### m2 — Event log retention/privacy contract is deferred too far

The ERD includes `event_logs`, but the exact data minimization/retention requirements are not stated. Before baseline, define minimum event fields and prohibit secrets/tokens/raw sensitive payloads.

### m3 — "One logical person = one profile" is not technically enforceable as written

This is acceptable as a business invariant, but the Spec should state how the admin creation workflow prevents accidental duplicate profiles and how duplicates are detected without name-only uniqueness.

---

## Positive findings

The following directions are approved in principle:

- removal of `families`, `family_members`, invitations and `family_group_id`;
- no `profiles.user_id` authorization fallback;
- global admin separated from profile ownership;
- explicit profile authorization as the only non-admin path;
- fail-closed RLS posture and direct-API adversarial tests;
- selective migration (`MIGRATE_HISTORY` vs `RECREATE_CLEAN`);
- Legacy preserved for rollback/comparison;
- ETL + mapping + reconciliation instead of blind restore;
- baseline-first V2 approach.

## Approval condition

**Do not create `00000000000000_baseline_v2.sql` yet.**

The four Blockers must be resolved in the Spec/ADR/ERD/matrix. Majors M1–M6 must be resolved or converted into explicit pre-baseline gates with no schema ambiguity. After corrections, repeat the R4 adversarial review.