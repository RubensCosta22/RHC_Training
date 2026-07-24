# RHC Tech SDD v1.2 — Risk Tier Applicability Checklist

Use this file as the daily operational index. The corporate SDD Standard remains normative and wins in case of conflict.

Legend: `R` required · `C` conditional and mandatory when affected · `Lite` simplified required form · `—` not normally required.

| Control | R0 | R1 | R2 | R3 | R4 |
|---|:---:|:---:|:---:|:---:|:---:|
| Change record / Feature Spec | Lite | Lite | R | R | R |
| Acceptance Criteria | C | R | R | R | R |
| Solo AI Adversarial Review | — | R | R | R | R |
| Architecture Review | — | — | C | R | R |
| ADR | — | — | C | C | R |
| Security Review | — | C | C | R | R |
| Authorization / RLS Review | — | C | C | R | R |
| Privacy / LGPD Review | — | C | C | R | R |
| Database Impact Review | — | C | C | R | R |
| Migration Rollback / Remediation | — | — | C | R | R |
| Observability / Failure Handling | — | C | R | R | R |
| Performance Budget | — | — | C | R | R |
| Reliability Review | — | — | C | R | R |
| Supply Chain Review | — | C | C | R | R |
| Traceability | — | Lite | R | R | R |
| Automated Regression Testing | C | C | R | R | R |
| Manual UX Validation | — | C | C | R | R |
| Production Verification | — | C | R | R | R |
| Explicit Risk Acceptance | — | — | C | R | R |

## R0

Use `lightweight-change-record.md`. No runtime behavior change. If a conditional control reveals material impact, reclassify.

## R1

Use `r1-lite-spec.md`. Acceptance criteria and solo adversarial review are mandatory. Apply every conditional control whose surface is affected.

## R2

Use the normal Feature Spec. Automated verification and material traceability are required. User-facing work normally requires manual UX validation. Production verification is required.

## R3

High-risk. Security, authorization/RLS, privacy, database, observability, performance/reliability, supply chain, traceability, regression and production verification are expected as applicable by the Standard. Rollback/remediation and explicit risk acceptance are required. Unresolved Major adversarial findings block approval unless covered by an approved exception.

## R4

Critical. Strictest controls, ADR, documented recovery procedure, explicit release approval and staged rollout where technically possible. No artificial process-time cap.

## Process budget targets

| Tier | Target |
|---|---|
| R0 | Up to 15 minutes |
| R1 | Up to 45 minutes |
| R2 | Up to one focused work session |
| R3 | Up to two focused work sessions |
| R4 | No artificial cap |

The budget controls specification/review/approval overhead only. It may simplify workflow, never remove a mandatory risk control.

## Legacy touch reminders

When materially touching legacy code:

- new/changed behavior follows current SDD;
- record newly discovered material risks;
- do not pull unrelated legacy debt into scope automatically;
- no grandfathering for critical security/data surfaces;
- evaluate L1 Domain and L0 Product baseline triggers.

**Conditional does not mean optional.**