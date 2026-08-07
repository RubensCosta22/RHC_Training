# RHCT-DATA-002 — Authorization Matrix V2

**Status:** Draft for R4 review

## Roles

- `admin`: global application administrator from `app_users.role = 'admin'` and `status = 'active'`.
- `owner`: active `profile_access` to one profile; normal self-service profile user.
- `editor`: optional delegated edit role for a profile. No global rights.
- `none`: authenticated account without access to the target profile.
- anonymous: no authenticated session.

## Profile and domain access

| Operation | admin | owner | editor | none | anonymous |
|---|:---:|:---:|:---:|:---:|:---:|
| List all profiles | ALLOW | DENY* | DENY* | DENY | DENY |
| Read target profile | ALLOW | ALLOW own | ALLOW assigned | DENY | DENY |
| Edit target profile | ALLOW | ALLOW own | ALLOW assigned if enabled by contract | DENY | DENY |
| Create profile | ALLOW | DENY | DENY | DENY | DENY |
| Deactivate profile | ALLOW | DENY by default | DENY | DENY | DENY |
| Read workout sessions | ALLOW | ALLOW own | ALLOW assigned | DENY | DENY |
| Create workout session | ALLOW | ALLOW own | ALLOW assigned | DENY | DENY |
| Correct completed workout | ALLOW | ALLOW only through approved correction path | contract-specific | DENY | DENY |
| Read exercise records | ALLOW | ALLOW own | ALLOW assigned | DENY | DENY |
| Read/write measurements | ALLOW | ALLOW own | contract-specific | DENY | DENY |
| Read/write progress photos | ALLOW | ALLOW own | contract-specific | DENY | DENY |
| Read/write workout draft | ALLOW | ALLOW own | ALLOW assigned when editing workout is allowed | DENY | DENY |
| Read plan/program enrollment | ALLOW | ALLOW own | ALLOW assigned | DENY | DENY |
| Modify own plan state | ALLOW | ALLOW own as product permits | contract-specific | DENY | DENY |

*Normal users must not receive a cross-profile listing. Queries return only rows explicitly authorized by `profile_access`.

## Access administration

| Operation | admin | owner | editor | none |
|---|:---:|:---:|:---:|:---:|
| View `profile_access` for any profile | ALLOW | DENY by default | DENY | DENY |
| Assign user to profile | ALLOW | DENY | DENY | DENY |
| Revoke user from profile | ALLOW | DENY | DENY | DENY |
| Change profile access role | ALLOW | DENY | DENY | DENY |
| Promote user to admin | ALLOW via protected RPC | DENY | DENY | DENY |
| Demote admin | ALLOW via protected RPC, cannot remove last active admin | DENY | DENY | DENY |
| Update own `app_users.role` directly | DENY | DENY | DENY | DENY |
| Direct client write to protected role/status fields | DENY | DENY | DENY | DENY |

## Canonical authorization helpers

### `is_admin()`
Only true if the current `auth.uid()` has one active `app_users` row with `role = 'admin'`.

### `can_access_profile(profile_id)`
Only true if:
1. `is_admin()`; OR
2. active `profile_access(profile_id, auth.uid())` exists.

### `can_edit_profile(profile_id)`
Only true if:
1. `is_admin()`; OR
2. active profile access exists with a role explicitly authorized for the requested edit operation.

No helper may fall back to `profiles.user_id`, creator id, email, profile name, legacy owner id, invitation state, or any family relationship.

## Required negative RLS tests

The automated suite SHALL prove:

1. User A cannot SELECT User B's profile by known UUID.
2. User A cannot SELECT User B's workout sessions by direct REST query.
3. User A cannot INSERT a workout session with User B's `profile_id`.
4. User A cannot UPDATE/DELETE User B's profile-owned rows.
5. User A cannot access User B's photo object by manipulating a storage path.
6. User A cannot call an admin RPC successfully.
7. User A cannot set `app_users.role = 'admin'` directly.
8. User with disabled `app_users` status receives no application access.
9. Disabled `profile_access` grants no profile access.
10. Guessed/legacy profile UUIDs are denied.
11. Anonymous requests cannot read profile-owned resources.
12. Admin may access all profiles without synthetic `profile_access` rows.

## Routing invariant

Frontend route guards are defense-in-depth only. Database authorization must deny unauthorized access even when the client bypasses the UI and calls Supabase directly.

A normal account should resolve to exactly the intended active profile access for current product behavior. Ambiguity must fail closed; the frontend must never select an arbitrary profile.
