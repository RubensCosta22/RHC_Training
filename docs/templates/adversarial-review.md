# <SPEC-ID> — Adversarial Review

> Required for solo-development R1–R4 work before a Spec may move from `In Review` to `Approved`. R0 does not require adversarial review unless reclassified or a conditional control reveals material risk.

## 1. Review Context

- **Spec ID / Version:**
- **Risk Tier:** R1 / R2 / R3 / R4
- **Applicable Controls reviewed:**
- **Reviewed artifact / commit / stable reference:**
- **Reviewer:**
- **Review Date:**
- **Independent review context from authoring/implementation?** Yes / No
- **If No for R3/R4, tooling limitation and review-independence risk:**

For R1/R2, separate review context is preferred whenever practical. For R3/R4, separate context is mandatory whenever tooling supports it.

## 2. Adversarial Question

> What would make this Spec unsafe, ambiguous, incomplete, untestable or likely to cause a regression if implemented exactly as written?

## 3. Findings

Use only: `Blocker`, `Major`, `Minor`, `Accepted Risk`.

| ID | Severity | Area | Finding | Required action | Status |
|---|---|---|---|---|---|
| AR-01 | | | | | Open / Resolved |

Review explicitly for ambiguity, hidden scope, permission escalation, privacy exposure, migration/rollback risk, silent failures, missing observability, UX/accessibility gaps, performance/reliability risk, missing tests, regressions, architecture/Brand conflicts, dependency risk and legacy-touch risks.

## 4. Risk Tier Challenge

- Is the assigned tier consistent with potential impact rather than implementation effort?
- Is any control marked non-applicable even though its surface is touched?
- Should the tier be raised because of authorization, personal data, destructive behavior, security boundary or systemic impact?
- Is the SDD Process Budget being used only to simplify documentation, never to bypass controls?

## 5. Requirement Challenge

For every material FR/AC, answer:

- Is it objectively testable?
- Could two competent implementers interpret it differently?
- Does it define failure/denied behavior where relevant?
- Does it conflict with another requirement?

## 6. Security & Data Challenge

- Authentication assumptions:
- Authorization bypass possibilities:
- RLS/server enforcement gaps:
- Data ownership ambiguity:
- Sensitive logging exposure:
- Upload/storage abuse:
- Data retention/deletion gaps:

## 7. Architecture & Reliability Challenge

- Single points of failure:
- Race/concurrency risks:
- Retry/idempotency gaps:
- Migration compatibility:
- Rollback/remediation feasibility:
- Performance regression risks:

## 8. Legacy Adoption Challenge

- Does this change materially touch legacy behavior?
- Were newly discovered material legacy risks recorded?
- Is critical legacy debt improperly grandfathered?
- Has an L1 Domain baseline trigger been reached?
- Has an L0 Product baseline trigger been reached?
- Is unrelated legacy debt being pulled into scope without justification?

## 9. UX & Brand Challenge

- Missing states:
- Mobile/desktop ambiguity:
- Accessibility gaps:
- Brand System conflicts:
- Decorative data without decision value:

## 10. Approval Verdict

- [ ] **APPROVE** — no unresolved blocking finding and required controls are satisfied.
- [ ] **REJECT / RETURN TO DRAFT** — unresolved Blocker exists or risk/applicability is materially wrong.
- [ ] **CONDITIONAL** — only where the SDD permits an explicit recorded exception.

### Blocking findings remaining

### Major findings remaining

### Accepted risks / exceptions

### Reviewer conclusion

R3/R4 work with unresolved Major findings may not be approved unless an explicit exception exists under the RHC Tech SDD.