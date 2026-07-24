# <SPEC-ID> — Adversarial Review

> Independent challenge required before a Spec may move from `In Review` to `Approved` in solo development.

## 1. Review Context

- **Spec ID / Version:**
- **Risk Classification:**
- **Reviewer:**
- **Review Date:**
- **Authoring context separated from review pass?** Yes / No

## 2. Adversarial Question

> What would make this Spec unsafe, ambiguous, incomplete, untestable or likely to cause a regression if implemented exactly as written?

## 3. Findings

Use only: `Blocker`, `Major`, `Minor`, `Accepted Risk`.

| ID | Severity | Area | Finding | Required action | Status |
|---|---|---|---|---|---|
| AR-01 | | | | | Open / Resolved |

Review explicitly for:

- ambiguous or contradictory requirements;
- missing acceptance criteria;
- hidden scope expansion;
- authorization or privilege escalation;
- privacy or sensitive-data exposure;
- migration/rollback risk;
- silent failure paths;
- missing observability;
- unhandled UX states;
- accessibility gaps;
- performance/reliability risk;
- missing tests;
- regression risk;
- architecture or Brand System conflicts;
- third-party/dependency risk.

## 4. Requirement Challenge

For every material FR/AC, answer:

- Is it objectively testable?
- Could two competent implementers interpret it differently?
- Does it define failure/denied behavior where relevant?
- Does it conflict with another requirement?

## 5. Security & Data Challenge

- Authentication assumptions:
- Authorization bypass possibilities:
- RLS/server enforcement gaps:
- Data ownership ambiguity:
- Sensitive logging exposure:
- Upload/storage abuse:
- Data retention/deletion gaps:

## 6. Architecture & Reliability Challenge

- Single points of failure:
- Race/concurrency risks:
- Retry/idempotency gaps:
- Migration compatibility:
- Rollback/remediation feasibility:
- Performance regression risks:

## 7. UX & Brand Challenge

- Missing states:
- Mobile/desktop ambiguity:
- Accessibility gaps:
- Brand System conflicts:
- Decorative data without decision value:

## 8. Approval Verdict

- [ ] **APPROVE** — no unresolved blocking finding.
- [ ] **REJECT / RETURN TO DRAFT** — unresolved Blocker exists.
- [ ] **CONDITIONAL** — only allowed where the SDD permits explicit recorded exceptions.

### Blocking findings remaining


### Major findings remaining


### Accepted risks / exceptions


### Reviewer conclusion

A high-risk Spec with unresolved Major findings may not be approved unless an explicit exception exists under the RHC Tech SDD.
