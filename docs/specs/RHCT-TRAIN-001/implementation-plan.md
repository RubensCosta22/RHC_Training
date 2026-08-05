# RHCT-TRAIN-001 — Implementation Plan

> Implementation may begin only after the related Spec is Approved and Ready under RHC Tech SDD v1.3.

## 1. Spec Reference

- **Spec ID:** RHCT-TRAIN-001
- **Spec Version:** 1.1
- **Risk Tier:** R2 — Medium
- **Applicable Controls:** Spec, adversarial review, implementation plan, additive migration review, RLS, privacy, tests, regression, UX/mobile and verification record
- **SDD Process Budget Target:** one cohesive feature PR after the documentation gate
- **Approved By:** Rubens Costa

## 2. Technical Summary

Implement the feature in three cohesive layers:

1. extend Henrique's configurable plan with session F and exercise metadata/videos;
2. add a running-session model/UI for distance, elapsed duration, pace, stopwatch and optional in-memory GPS;
3. add local and remote workout drafts with deterministic restoration, conflict detection and idempotent finalization.

Existing historical workout tables remain authoritative for completed sessions. Drafts are stored separately and consumed only when a workout is successfully finalized.

## 3. Scope of Change

| Area | File/module | Planned change |
|---|---|---|
| Workout UI | `src/pages/Workout.jsx` | Restore/save drafts, running mode, conflict states and finalization flow |
| Exercise UI | `src/components/ExerciseCard.jsx` | Emit explicit important events, preserve existing exercise behavior |
| Running UI | new `src/components/RunningSessionPanel.jsx` | Manual distance/time, stopwatch, pace and optional GPS controls |
| Local draft domain | new `src/services/workoutDraftLocalService.js` | Namespaced serialization, retention, restore and purge |
| Remote draft service | new `src/services/workoutDraftService.js` | RLS-backed draft CRUD, version/conflict handling |
| Running domain | new `src/lib/runningSession.js` | Pace, stopwatch timestamps, GPS filtering/distance calculations |
| Completion service | `src/services/workoutService.js` and/or RPC | Idempotent save by `draftId` |
| Plan/seed | current plan/program seed/migration path | Add F only to Henrique; ensure A–F rotation |
| Videos | existing exercise-video mapping/data | Add mappings for F primary exercises and approved alternatives |
| History/statistics | touched only where required | Display running distance/time/pace while accepting legacy nulls |
| Tests | unit/integration/rendered/RLS suites | Add draft, running, migration and idempotency tests |

- **Components:** Workout, ExerciseCard, new RunningSessionPanel, status/conflict dialogs
- **Services / APIs:** local draft service, remote draft service, idempotent completion path
- **Database / Supabase:** new draft table; additive running metrics/idempotency fields or dedicated running table according to schema review
- **Migrations:** one additive migration preferred
- **RLS / permissions:** draft read/write limited to authenticated user and profiles they may manage/use
- **Storage:** browser localStorage/IndexedDB only for serialized draft; GPS points never persisted
- **External integrations:** browser Geolocation API only; no new third-party dependency

## 4. Architecture Decisions

- Existing offline queue and workout save patterns will be reused where safe.
- Draft persistence is separate from completed sessions.
- Local persistence protects every edit; remote Auto Save occurs only on approved important events.
- A stable `draftId` and database uniqueness constraint provide idempotency.
- GPS calculations use a pure utility module and configurable thresholds.
- No new runtime dependency is planned.
- ADR required only if schema inspection shows completed-session metrics cannot be added without creating a dedicated running-session table.

## 5. Data & Migration Plan

### 5.1 Draft table

Create an additive `workout_drafts` table with at least:

- id / `draft_id`;
- `user_id`;
- `profile_id`;
- `workout_type`;
- `program_enrollment_id` nullable;
- `plan_version` / fingerprint;
- serialized draft payload;
- monotonically updated version or `updated_at` used for optimistic conflict detection;
- created/updated timestamps;
- consumed/finalized session reference where appropriate.

Add unique constraints/indexes for `draft_id` and applicable active-draft lookup.

### 5.2 Completed running metrics

Prefer additive nullable fields on the completed session if they fit the existing domain:

- `distance_meters`;
- `duration_seconds`;
- `average_pace_seconds_per_km`;
- `activity_mode`.

If schema inspection shows these belong in a separate one-to-one table, document the decision in an ADR before implementation.

### 5.3 Idempotency

Add a nullable unique `source_draft_id` or equivalent idempotency key to the completed session path. Existing rows remain null.

### 5.4 Plan F

Add F through the current configurable-program mechanism, scoped to Henrique's active plan. Migration/seed uses stable identifiers and `ON CONFLICT`/existence checks.

### 5.5 Compatibility and validation

- No historical UPDATE/DELETE/TRUNCATE.
- Legacy sessions with null running metrics remain valid.
- Pre/post counts and checksums/sample IDs for historical tables are recorded.
- RLS tests verify cross-user/profile denial.
- Reapplying migration/seed creates no duplicates.

### 5.6 Remediation

If rollout fails, disable the new UI and leave additive nullable structures in place. Do not drop a table containing user drafts or completed running metrics. Remediation migration may remove only unused constraints/functions after data export and review.

## 6. Failure Handling & Observability

| Operation | Failure mode | User/system outcome | Telemetry |
|---|---|---|---|
| Local draft save | storage unavailable/quota | visible warning; in-memory session continues | sanitized warning, browser capability only |
| Remote Auto Save | offline/network/RLS | local draft remains; status shows pending | structured warn with draft/profile safe IDs and error code |
| Draft restore | corrupt/incompatible payload | do not apply unsafe fields; offer discard/export diagnostic | structured error without exercise notes/content |
| Conflict detection | remote newer | explicit choice; no overwrite | conflict event with versions/timestamps |
| Stopwatch restore | invalid timestamps | pause and request review; preserve entered metrics | validation warning |
| GPS acquisition | denied/unavailable/noisy | manual mode remains available | reason category only; no coordinates |
| Finalization | retry/double click | return existing session for same draft | idempotency outcome |
| Finalization failure | DB/network | keep local and remote draft | structured error with request/draft ID |

## 7. Security / Privacy Implementation

- Authorization is enforced in RLS and completion RPC/service, not only in React.
- `user_id` comes from authenticated context where possible, not trusted client input.
- Profile access uses existing authorization functions/policies.
- Draft notes and text fields remain length-limited and sanitized.
- Latitude/longitude arrays never enter local persisted draft, remote payload, logs or analytics.
- Logout clears loaded draft state and local index visibility for the previous user.
- Local keys are namespaced by authenticated user and profile; UI never scans/displays another user's namespace.
- Conflict payloads reveal no information about unauthorized profiles.

## 8. UX Implementation

- Mobile-first running panel with large stopwatch and accessible controls.
- Manual distance/time is always visible or one action away; GPS is clearly optional/experimental.
- Draft status distinguishes `Salvo neste dispositivo`, `Sincronizado`, `Pendente` and `Falha ao salvar`.
- Restore dialog offers Continue/Discard; old or incompatible drafts include clear explanation.
- Conflict dialog never silently overwrites.
- Keyboard focus, labels, button states, reduced motion and screen-reader status announcements are required.
- F uses the current Training design language and exercise-card structure.

## 9. Legacy Touch Plan

- Material surfaces: Workout state lifecycle, workout completion, plan rotation and history rendering.
- Immediate current controls: idempotency, RLS, preservation of history and offline recovery.
- Existing completed-session and exercise-record behavior must remain unchanged for A–D and other profiles.
- Unrelated statistics redesign, commercial onboarding and other training plans are excluded.

## 10. Test & Evidence Plan

| Requirement / AC | Applicable control | Test level | Verification | Evidence expected |
|---|---|---|---|---|
| AC-01/02 | Local persistence | Unit + rendered UI | edit, refresh, restore; no remote call per keypress | test output/video |
| AC-03 | Event Auto Save | Unit/integration | complete exercise and inspect single draft upsert | test output |
| AC-04/05/16 | Idempotency | DB/integration | repeat completion with same draft | one session ID/count |
| AC-06/18 | Isolation | RLS/integration/manual | switch users/profiles | denied queries + UI proof |
| AC-07/08 | Running math/timer | Unit + mobile | manual values, pause/reload/resume | deterministic assertions |
| AC-09/10 | GPS privacy/fallback | Unit/manual | deny GPS; inspect payload/logs | no coordinates, completion succeeds |
| AC-11/12 | Workout F | Data/rendered/manual | F order, alternatives, videos | screenshots/test output |
| AC-13/14 | History/migration | Migration contract | before/after queries; reapply | preserved counts, no duplicates |
| AC-15 | Plan compatibility | Unit/integration | changed plan with stale draft | only deterministic mappings applied |
| AC-17 | Device conflict | Integration/manual | local older than remote | explicit conflict UI |
| AC-19 | Retention | Unit | age draft beyond 30 days | confirmation required |

## 11. Performance & Reliability

- No remote request is emitted for each keystroke.
- Local serialization should remain small; do not store video/media/GPS points.
- Remote payload size is bounded and validated.
- Remote saves use version checks/optimistic concurrency.
- Finalization uses database uniqueness/idempotent RPC or equivalent transaction.
- Stopwatch derives from timestamps, remaining accurate after browser throttling.
- GPS watcher is stopped on pause/finalize/unmount and does not leak background activity.

## 12. Rollout & Recovery

1. Apply additive migration in test/staging or isolated Supabase environment.
2. Run migration/RLS/idempotency contract tests.
3. Deploy branch preview.
4. Validate A–E regressions and F on Henrique only.
5. Validate running manual mode and stopwatch on mobile.
6. Validate GPS experimentally; disable GPS UI if evidence is insufficient, without blocking the feature.
7. Validate refresh/offline/logout/conflict scenarios.
8. Merge only with verification record complete.
9. Apply production migration before/with compatible frontend deploy.
10. Post-deploy smoke test using test/family account without modifying historical records.

Recovery: disable new route/panel behavior and retain drafts/data; never roll back by deleting user data.

## 13. Risk Register

| Risk | Probability | Impact | Mitigation | Residual risk |
|---|---|---|---|---|
| Duplicate sessions | Medium | High | unique source draft + idempotent completion | Low |
| Cross-user local draft exposure | Low/Medium | High | auth namespace, logout clearing, tests | Low |
| Remote/local conflict | Medium | Medium | optimistic version + explicit UI | Medium |
| GPS inaccuracy/background limits | High | Medium | manual fallback, configurable filters, experimental gate | Medium |
| Plan change misapplies loads | Low | High | deterministic IDs, no positional mapping | Low |
| Migration affects history | Low | Critical | additive-only, before/after evidence | Low |
| Excessive remote writes | Medium | Medium | event-driven Auto Save only | Low |

## 14. Implementation Checklist

- [x] Plan matches approved Spec
- [x] Applicable Controls are preserved
- [x] No requirement changed silently
- [x] Risk tier has not been lowered to avoid controls
- [x] Security/data boundaries identified
- [x] Migration/remediation defined
- [x] Tests map to material requirements
- [x] Observability covers required failure paths
- [x] Legacy touch/baseline triggers addressed
- [x] Rollout and recovery are defined
- [x] ADR trigger defined if schema review requires it

Material discoveries that change requirements or risk return the item to **Spec Review**.
