# RHCT-DATA-002 — Authorization Matrix V2

**Status:** Revised after R4 adversarial review

## Actors

- `admin`: authenticated account with `app_users.role = 'admin'` and `status = 'active'`.
- `user`: authenticated account with `app_users.role = 'user'`, `status = 'active'` and exactly one `profile_access` mapping.
- `disabled`: authenticated account with missing/disabled `app_users`.
- `none`: active authenticated account without a mapping to the target profile.
- `anonymous`: no authenticated session.

There is no `editor` role in V2 launch.

## Profile and domain access

| Operation | admin | mapped user | none | disabled | anonymous |
|---|:---:|:---:|:---:|:---:|:---:|
| List all active profiles | ALLOW | DENY* | DENY | DENY | DENY |
| Inspect inactive profile | ALLOW admin path | DENY | DENY | DENY | DENY |
| Read active mapped profile | ALLOW | ALLOW | DENY | DENY | DENY |
| Edit active mapped profile | ALLOW | ALLOW within product contract | DENY | DENY | DENY |
| Create profile | ALLOW | DENY | DENY | DENY | DENY |
| Deactivate/reactivate profile | ALLOW | DENY | DENY | DENY | DENY |
| Read workout sessions | ALLOW | ALLOW mapped active profile | DENY | DENY | DENY |
| Create workout session | ALLOW | ALLOW mapped active profile | DENY | DENY | DENY |
| Correct completed workout | ALLOW | approved correction path only | DENY | DENY | DENY |
| Read/write exercise records | ALLOW | ALLOW mapped active profile | DENY | DENY | DENY |
| Read/write measurements | ALLOW | ALLOW mapped active profile | DENY | DENY | DENY |
| Read/write progress photos | ALLOW | ALLOW mapped active profile | DENY | DENY | DENY |
| Read/write workout draft | ALLOW | ALLOW mapped active profile | DENY | DENY | DENY |
| Read plan/program state | ALLOW | ALLOW mapped active profile | DENY | DENY | DENY |
| Modify permitted plan/training state | ALLOW | ALLOW mapped active profile | DENY | DENY | DENY |

*Normal users never receive a cross-profile listing; their profile resolution is a single explicit mapping.

## Access administration

| Operation | admin | user | none/disabled |
|---|:---:|:---:|:---:|
| View mappings | ALLOW | DENY | DENY |
| Assign account to profile | ALLOW protected operation | DENY | DENY |
| Revoke mapping | ALLOW protected operation | DENY | DENY |
| Reassign account/profile | ALLOW protected operation with uniqueness checks | DENY | DENY |
| Promote user to admin | ALLOW protected RPC | DENY | DENY |
| Demote/disable admin | ALLOW protected RPC only if another active admin remains | DENY | DENY |
| Delete Auth identity still referenced by `app_users` | DENY until safe retirement | DENY | DENY |
| Direct client write to `app_users.role/status` | DENY | DENY | DENY |
| Direct client write to `profile_access` | DENY | DENY | DENY |

## Canonical helpers

### `is_active_app_user()`
True only when `auth.uid()` exists and the matching `app_users.status = 'active'`.

### `is_admin()`
True only when `is_active_app_user()` and `app_users.role = 'admin'`.

### `can_access_profile(profile_id)`
True only when:

1. `is_active_app_user()`; AND
2. target profile is active; AND
3. (`is_admin()` OR the unique `profile_access(user_id = auth.uid(), profile_id)` row exists).

### Inactive profiles

Normal users receive DENY for inactive profiles and all profile-owned domain data. Admins may inspect/manage inactive profiles only through admin-authorized policies/RPCs. Reactivation is admin-only.

## Required database invariants

- unique `profile_access.user_id`;
- unique `profile_access.profile_id`;
- no role column in `profile_access` at launch;
- admin access does not depend on profile mappings;
- direct client mutation of authorization state is denied;
- no authorization fallback to Legacy fields.

## Required adversarial tests

The automated suite SHALL prove at least:

1. User A cannot SELECT User B's profile by known UUID.
2. User A cannot SELECT User B's workout sessions by direct REST query.
3. User A cannot INSERT/UPDATE rows using User B's `profile_id`.
4. A second mapping for the same normal user is rejected by constraint.
5. A second normal account mapping to the same profile is rejected by constraint.
6. Disabled `app_users` receives DENY even when a mapping exists.
7. Inactive profile receives DENY for its normal mapped user.
8. User cannot manipulate another profile's storage path/object.
9. Non-admin cannot call admin RPCs successfully.
10. Non-admin cannot mutate `app_users.role/status` or `profile_access` directly.
11. Guessed/Legacy profile UUIDs are denied.
12. Anonymous requests cannot read profile-owned resources.
13. Admin may access active profiles without synthetic mappings.
14. Admin can inspect inactive profiles only through approved admin paths.
15. Last active admin cannot be demoted, disabled or retired.

## Routing invariant

Frontend guards are defense-in-depth only. Database authorization must fail closed even if the UI is bypassed. A normal account resolves to exactly one intended active profile; no “first profile” selection or ambiguity is permitted.
