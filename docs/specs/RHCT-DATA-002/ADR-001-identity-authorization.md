# ADR-001 — Identity and Authorization Model for RHC Training V2

**Status:** Proposed  
**Spec:** RHCT-DATA-002  
**Risk Tier:** R4

## Context

The legacy database accumulated multiple overlapping authorization mechanisms, including historical profile ownership, explicit access rows and family abstractions. This created ambiguity over which authenticated account was allowed to access a profile and contributed to a cross-profile authorization incident.

The current product does not require a generic organization/team model. It requires a small set of authenticated users, one or more global administrators and explicit access to individual training profiles.

## Decision

RHC Training V2 SHALL use exactly four identity/authorization concepts:

1. Supabase `auth.users` for authentication;
2. `app_users` for global application role/status;
3. `profiles` for the person being trained;
4. `profile_access` for explicit authenticated-user-to-profile authorization.

### Global admin

`app_users.role = 'admin'` grants the approved global administrative capabilities.

Admins do not require `profile_access` rows for every profile.

Admins may promote/demote other admins only through a protected server-side operation. The last active admin cannot be removed or demoted.

### Normal user access

A non-admin can access a profile only when an active `profile_access` row exists for `(auth.uid(), profile_id)`.

### Profiles

`profiles` SHALL NOT grant authorization through a `user_id`, creator field, email, name or any other implicit relationship.

### Forbidden fallbacks

The V2 authorization model SHALL NOT contain logic equivalent to:

- `profiles.user_id = auth.uid()`;
- same family/group implies access;
- same email implies access;
- creator implies access;
- accepted historical invitation implies permanent runtime access without a current access row.

## Rationale

This model minimizes authorization paths and makes the answer to "why can this user access this profile?" deterministic:

- because the user is an active global admin; or
- because an explicit active `profile_access` row exists.

There is no third path.

## Consequences

### Positive

- substantially smaller RLS surface;
- easier auditing and testing;
- no ambiguity between profile identity and authentication identity;
- easier admin management;
- reduced risk of legacy ownership fields becoming accidental authorization sources;
- straightforward cross-profile denial tests.

### Negative / trade-offs

- legacy ownership data must be mapped during migration instead of copied blindly;
- admin is a global role rather than scoped by organization;
- future commercial multi-tenant/team requirements would require a new approved ADR rather than stretching this model.

## Security invariants

1. Default deny.
2. No client-side-only authorization decision is sufficient.
3. Direct table access must be constrained by RLS.
4. Admin role cannot be self-assigned from the client.
5. A disabled `app_users` account receives no application access.
6. Disabled `profile_access` grants no access.
7. Guessing or retaining another profile UUID must not bypass authorization.
8. Storage and RPC authorization must resolve to the same profile-access model.

## Rejected alternatives

### Families / family_members

Rejected because the current product does not require organization hierarchy and the abstraction increases authorization complexity without corresponding business value.

### `profiles.user_id` ownership

Rejected because a profile represents the trained person, not necessarily the authenticated account, and legacy ownership semantics already caused ambiguity.

### Admin represented as owner of every profile

Rejected because it duplicates data, conflates global administration with ownership and creates unnecessary rows/state.

### Email-based runtime authorization

Rejected because email is an identity attribute, not an authorization relationship. Email may assist controlled account setup but SHALL NOT grant runtime profile access by itself.

## Review trigger

This ADR must be revisited only if the business model materially changes, for example:

- multiple independent organizations/customers;
- scoped administrators;
- professional coaches managing multiple unrelated clients;
- commercial multi-tenancy.

Until such a change is approved, additional authorization models SHALL NOT be introduced in parallel.
