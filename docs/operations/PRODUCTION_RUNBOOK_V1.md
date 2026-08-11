# RHC Training v1.0 — Production Runbook

## Canonical production architecture

- Application: Render service tracking branch `Rcosta22`.
- Database/Auth/Storage: Supabase Database V2.
- Canonical database definition: `database-v2/baseline/00000000000000_baseline_v2.sql`.
- Legacy migrations under `supabase/migrations/` are historical only and MUST NOT be applied to Database V2.
- Identity model: `auth.users` + `app_users` + `profiles` + `profile_access`.
- There is no `families` / `family_members` authorization model in V2.

## Access model

- `admin`: global administrative access according to V2 RLS/RPC rules.
- `user`: access only to profiles explicitly linked through `profile_access`.
- user without a linked profile: fail closed; no profile-scoped data is visible.

Production identities at v1.0 release gate:

- `rhc.techbr@gmail.com`: admin, no personal profile required.
- `rubens19962@hotmail.com`: regular user linked to Henrique.
- `rudney3ribeiro2@gmail.com`: regular user without profile; expected to be blocked until a profile is explicitly associated.

## Backup and recovery

### Database definition

The full V2 schema, RLS, RPCs and integrity tests are versioned in Git. A clean database must be reproducible from the canonical V2 baseline and pass Database V2 CI.

### User data

1. The pre-cutover Legacy environment is retained as a rollback snapshot during the stabilization period.
2. Application deletes use archive/restore flows for workouts, measurements and photos; permanent deletion is not part of the standard user flow.
3. Before destructive database maintenance, create/export a Supabase logical backup from the provider dashboard or approved CLI and verify that the export is readable.
4. Never store production database dumps, access tokens, service-role keys or private photos in this repository.

### Recovery priorities

1. Stop new writes if data integrity is uncertain.
2. Preserve the V2 project before attempting repairs.
3. Compare current counts and latest timestamps against the release verification record.
4. For application regressions, redeploy the last known-good `Rcosta22` commit.
5. For database regressions, restore using the latest verified provider backup/export. The paused Legacy environment is a pre-cutover fallback, not a substitute for ongoing V2 backups.

## Monitoring

### Application

- Security CI must pass tests, production build and `npm audit --omit=dev --audit-level=high` before release.
- Structured client logs must keep sensitive-field redaction enabled.
- Review Render deploy status after every merge to `Rcosta22`.
- Review Render request/app logs for repeated 4xx/5xx responses and build/runtime failures.
- Monitor request count, HTTP latency, memory and CPU when available on the active Render plan.

### Database

Monitor for:

- authentication failures or unexpected access errors;
- abnormal growth in active `workout_drafts`;
- unexpected archived-row growth;
- RLS regressions;
- mismatches between `workout_sessions`, `workout_exercises`, program exposures and exercise records after write-path changes.

## Release gates

A release is GO only when:

1. Security CI is green.
2. Database V2 CI is green for database-affecting changes.
3. Production build succeeds.
4. Admin and regular-user login smoke tests pass.
5. Unlinked users remain fail-closed.
6. History, workout draft/autosave, completion, measurements, photos, archive/restore and progress views are functional.
7. Reconciliation shows no unexplained loss of sessions, exercises, exposures, measurements or photos.

## Legacy retirement

Legacy may be paused only after the v1.0 production release is live and the final smoke test passes. Pausing must not delete the Legacy Supabase project or historical data. Keep it available for rollback during the stabilization period; deletion is a separate future decision requiring a fresh backup and explicit approval.
