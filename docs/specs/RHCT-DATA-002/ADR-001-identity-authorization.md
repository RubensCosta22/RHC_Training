# ADR-001 — Identity and Authorization Model for RHC Training V2

**Status:** Proposed — revised after R4 adversarial review  
**Spec:** RHCT-DATA-002  
**Risk Tier:** R4

## Context

The Legacy database accumulated multiple overlapping authorization mechanisms and a cross-profile incident proved that implicit ownership cannot coexist safely with explicit access rules. The current product is intentionally simple: normal accounts operate one profile each; global admins can manage every profile and may create additional admins.

## Decision

RHC Training V2 SHALL use exactly four identity/authorization concepts:

1. Supabase `auth.users` — authentication only;
2. `app_users` — application status and global role;
3. `profiles` — the person being trained;
4. `profile_access` — the single explicit non-admin account-to-profile mapping.

There is no family/team/organization authorization model.

### Active application identity is mandatory

Every application authorization decision requires an authenticated user with an `app_users` row whose `status = 'active'`.

A disabled or missing `app_users` row means DENY, regardless of any `profile_access` row.

### Global admin

`app_users.role = 'admin'` plus `status = 'active'` grants the approved global administrative capabilities.

Admins do not require `profile_access` rows.

Only protected server-side operations may promote, demote, disable or retire an admin. The system must prevent a state with zero active admins.

### Normal user access — launch invariant

For V2 launch, a normal user maps to exactly one intended profile and a profile maps to at most one normal account.

`profile_access` therefore does not carry `owner/editor` roles at launch. It represents one active direct association only.

The database SHALL enforce:

- at most one `profile_access` row per `user_id`;
- at most one `profile_access` row per `profile_id`;
- admin accounts SHALL NOT use `profile_access` for global access;
- delegated/shared editing is out of scope and requires a future Spec/ADR.

### Profiles

`profiles` SHALL NOT grant authorization through `user_id`, creator, email, name or any other implicit relationship.

### Canonical authorization logic

Conceptually:

```text
is_active_app_user() =
  authenticated
  AND app_users.status = active

is_admin() =
  is_active_app_user()
  AND app_users.role = admin

can_access_profile(profile_id) =
  is_active_app_user()
  AND profile is active
  AND (
    is_admin()
    OR profile_access(user_id = auth.uid(), profile_id) exists
  )
```

Inactive profiles are not available to normal users. Active admins may inspect inactive profiles through explicitly admin-scoped operations, but normal profile-domain reads/writes remain denied while inactive.

### Forbidden fallbacks

V2 SHALL NOT authorize by:

- `profiles.user_id = auth.uid()`;
- family/group membership;
- matching email;
- creator id;
- profile name;
- historical invitation;
- Legacy owner fields;
- client-side route state.

## First-admin provisioning

The first V2 admin is provisioned only during controlled environment bootstrap:

1. create/verify the intended admin identity in Supabase Auth;
2. obtain and manually verify its exact Auth UUID;
3. run an operator-only bootstrap SQL/setup step that inserts that UUID into `app_users` as `role = 'admin', status = 'active'`;
4. record the bootstrap evidence in the R4 migration artifacts.

There is no public/client bootstrap endpoint and no email-based runtime elevation.

The baseline SHALL NOT hard-code a production email or Auth UUID.

## Last-admin protection

`app_users.user_id -> auth.users(id)` SHALL use deletion protection rather than `ON DELETE CASCADE` for admin identities. Auth deletion of an application user must be blocked until the application relationship is explicitly and safely retired.

Admin mutation RPCs SHALL serialize the active-admin check and refuse any operation that would produce zero active admins, including demotion, disablement or retirement.

## Security-definer contract

Any authorization helper or admin RPC implemented with `SECURITY DEFINER` SHALL:

- schema-qualify referenced objects;
- use a fixed safe `search_path` (prefer empty/fixed with fully-qualified names);
- revoke default `PUBLIC` execute privileges;
- grant execute only to the minimum required role(s);
- validate `auth.uid()` and `app_users.status` server-side;
- avoid recursive RLS dependency chains;
- never trust role/profile identifiers supplied by the client without authorization checks;
- emit audit events for privileged admin mutations.

## Rationale

The answer to “why can this account access this profile?” becomes deterministic:

- the account is an active global admin; or
- the account is active and has the one explicit mapping to that active profile.

There is no third path.

## Rejected alternatives

- `families` / `family_members`: unnecessary complexity for the current business model.
- `profiles.user_id` ownership: conflates training identity with authentication identity.
- `owner | editor` profile roles at launch: unused flexibility that recreates multi-profile ambiguity.
- admin as owner of every profile: duplicates state and confuses global administration with ownership.
- email-based runtime authorization: identity attribute is not authorization.

## Review trigger

This ADR must be revisited before adding shared/delegated profile access, coaches, scoped admins, organizations, customers or commercial multi-tenancy. Until then, no parallel authorization model is permitted.
