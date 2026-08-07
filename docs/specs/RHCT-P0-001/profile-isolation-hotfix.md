# RHCT-P0-001 — Profile Isolation Hotfix

Status: Emergency hotfix
Severity: P0

## Incident
A regular family account could render another profile's current dashboard/program through a profile-scoped route. The exposed profile had no visible history in that session, but its identity and active workout plan were rendered and therefore must be treated as unauthorized profile exposure.

## Immediate controls
- Regular accounts must have exactly one accessible profile.
- Login must never choose the first accessible profile silently.
- Every route containing `:profileId` must validate the requested profile against the current authenticated session before rendering.
- Admin accounts retain explicit multi-profile access.
- Zero or multiple accessible profiles for a regular account fail closed.
- A mismatched requested profile is never rendered; when exactly one authorized profile exists, the route is redirected to that profile.

## Scope
Covers dashboard, workout, history, progress, measurements, photos, settings and archived routes.

## Data
No historical data is changed by this frontend hotfix.

## Follow-up
Database identity/access model remains under investigation. Do not treat this client guard as a replacement for RLS; server-side authorization remains authoritative.
