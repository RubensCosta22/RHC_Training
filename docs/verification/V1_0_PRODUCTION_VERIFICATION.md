# RHC Training v1.0 — Production Verification

Date: 2026-08-11

## Data reconciliation checkpoint

Henrique V2 production snapshot at the release gate:

- workout sessions: 28
- workout exercise rows: 144
- program exercise exposures: 74
- body measurements: 1
- progress photos: 2

The cutover and post-cutover cleanup preserved the historical dataset. Temporary test sessions/drafts used during migration validation were removed when positively identified as tests.

## Authorization verification

RLS was exercised in the real V2 project using authenticated-role session claims inside rollback/read-only checks.

### Admin

Account: `rhc.techbr@gmail.com`

Expected/result:

- global admin role active;
- can see the currently existing profile set;
- can read the profile-scoped sessions/measurements/photos allowed to admin.

Observed at verification time: 1 profile, 28 sessions, 1 measurement and 2 photos visible.

### Henrique regular user

Account: `rubens19962@hotmail.com`

Expected/result:

- role `user`;
- exactly one profile association: Henrique;
- can see Henrique data;
- no global admin privilege.

Observed at verification time: 1 profile, 28 sessions, 1 measurement and 2 photos visible.

### Unlinked regular user

Account: `rudney3ribeiro2@gmail.com`

Expected/result:

- role `user`;
- no profile association;
- fail closed for profile-scoped data.

Observed at verification time: 0 profiles, 0 sessions, 0 measurements and 0 photos visible.

## Critical flow verification completed during V2 cutover

- password/session login;
- admin login and global administration;
- regular user profile isolation;
- unlinked-user fail-closed behavior;
- workout A–F visibility/rotation;
- atomic remote workout drafts;
- autosave -> refresh -> restore;
- exercise completion without false multi-device conflicts;
- full workout completion and next-workout advancement;
- migrated history display;
- running-session history normalization;
- measurements;
- photos and archived photos;
- archive/restore;
- progress/program statistics after V2 schema migration;
- secure image flow previously validated in production path;
- Database V2 clean-build CI;
- Security CI tests/build/dependency audit.

## v1.0 final UX closeout

The release branch adds:

- server-side history pagination (10 sessions per page);
- history result counts and page navigation;
- search by gym name plus workout/date filters;
- archived-item text search;
- archived category filter.

## Residual/operational notes

- A completely empty workout draft can be created when a workout screen is opened. It does not affect history and is safe; abnormal accumulation should be monitored.
- The Legacy environment remains a pre-cutover rollback snapshot. Once paused, it must be preserved rather than deleted until a later explicit retirement decision.
- Provider-level V2 backups/exports remain an operational responsibility; database dumps must never be committed to Git.
