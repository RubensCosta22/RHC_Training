# RHCT-DATA-002 — R4 Remediation Record

**Status:** Corrections applied; second adversarial review pending.  
**Source review:** `adversarial-review-r4.md`

## Blockers

| Finding | Resolution |
|---|---|
| B1 Disabled user could pass profile helper | RESOLVED — every authorization now requires `is_active_app_user()` before admin/mapping evaluation; disabled/missing app user is DENY across RLS/RPC/storage. |
| B2 `editor` + multiple profile ambiguity | RESOLVED — `editor` removed for launch; `profile_access.user_id` and `profile_access.profile_id` are individually UNIQUE; one normal account maps to at most one profile and one profile to at most one normal account. |
| B3 First/last admin lifecycle incomplete | RESOLVED — first admin uses operator-only bootstrap with verified V2 Auth UUID; no client bootstrap. Auth relationship uses deletion protection; admin RPCs must prevent zero active admins for demotion/disable/retirement. |
| B4 Offline/cutover/rollback unsafe | RESOLVED at architecture level — backend/schema epoch + `client_operation_id`, Legacy enforced write freeze, V2 read-only verification phase, writes enabled only after validation, and rehearsed reverse-delta rollback after V2 production writes. |

## Majors

| Finding | Resolution |
|---|---|
| M1 Canonical exercise identity unresolved | RESOLVED — explicit `exercise_catalog` with stable ID/code; plans/programs/records reference canonical IDs; completed session rows retain immutable snapshots. |
| M2 Rotation/schedule state absent | RESOLVED — `profile_training_state` added; Gate 1 must inventory exact Legacy fields before baseline finalization. |
| M3 Auth migration placeholder | RESOLVED — V2 Auth identities are recreated; controlled password reset/re-authentication; explicit Legacy Auth UUID -> V2 Auth UUID mapping. |
| M4 SECURITY DEFINER hardening missing | RESOLVED — fixed search path/schema qualification, minimal grants, PUBLIC revoke, active-user check, recursion avoidance and privileged audit contract added. |
| M5 Storage integrity weak | RESOLVED — source/destination path, byte size, cryptographic hash, readability and authorization verification required for every retained object. |
| M6 Inactive profile semantics ambiguous | RESOLVED — normal access denied when inactive; admin inspection/reactivation via approved admin paths; history retained. |

## Minors

| Finding | Resolution |
|---|---|
| m1 Access lifecycle inconsistent | RESOLVED — launch `profile_access` is a simple one-to-one mapping; normal revocation removes mapping through protected admin operation; no unused active/role state. |
| m2 Event-log privacy/retention vague | RESOLVED — minimum event shape and explicit prohibition on passwords/tokens/secrets/raw auth headers added; retention required before cutover. |
| m3 Duplicate-person prevention under-specified | RESOLVED — admin creation workflow must search/display active and inactive profiles and require explicit confirmation; normalized identity signals are warnings, never authorization or name-only uniqueness. |

## Remaining pre-baseline work

These are implementation/evidence gates rather than unresolved architectural findings:

1. second R4 adversarial review of the revised documents;
2. Gate 1 Legacy inventory and evidence for the single `MIGRATE_HISTORY` assumption;
3. exact table contracts/columns/indexes for baseline implementation;
4. exact Legacy -> canonical exercise mapping;
5. exact current rotation/training-state mapping;
6. cutover/rollback runbooks and rehearsal evidence.

`00000000000000_baseline_v2.sql` remains forbidden until the second R4 review reports no unresolved Blocker or Major.
