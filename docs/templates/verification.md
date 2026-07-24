# <SPEC-ID> — Verification Record

## 1. Release Candidate

- **Spec ID / Version:**
- **Risk Tier:**
- **Applicable Controls:**
- **PR:**
- **Commit SHA:**
- **Environment:**
- **Verifier:**
- **Date:**

## 2. Acceptance Verification

| Requirement / AC | Implementation | Test | Evidence | Status |
|---|---|---|---|---|
| | | | | Pass / Fail |

## 3. Quality Gates

Only gates required by the Risk Tier Applicability Matrix and the actual affected surfaces are mandatory. `Conditional` becomes mandatory when its surface applies.

| Gate | Required? | Result | Evidence / Notes |
|---|---|---|---|
| G1 — Spec Compliance | Yes / No | Pass / Fail / N/A | |
| G2 — Build | Yes / No | Pass / Fail / N/A | |
| G3 — Static Quality | Yes / No | Pass / Fail / N/A | |
| G4 — Tests | Yes / No | Pass / Fail / N/A | |
| G5 — Security | Yes / No | Pass / Fail / N/A | |
| G6 — Permissions | Yes / No | Pass / Fail / N/A | |
| G7 — UX | Yes / No | Pass / Fail / N/A | |
| G8 — Brand | Yes / No | Pass / Fail / N/A | |
| G9 — Observability | Yes / No | Pass / Fail / N/A | |
| G10 — Privacy & Data Governance | Yes / No | Pass / Fail / N/A | |
| G11 — Supply Chain Security | Yes / No | Pass / Fail / N/A | |
| G12 — Performance & Reliability | Yes / No | Pass / Fail / N/A | |
| G13 — Regression | Yes / No | Pass / Fail / N/A | |

Any required failed gate blocks release. Every `N/A` for a conditional control must include a reason.

## 4. Automated Evidence

### Build / static analysis

```text
<commands and results>
```

### Tests

```text
<commands and results>
```

### Security / dependency checks

```text
<commands and results>
```

## 5. Manual Verification

### Critical journeys
- [ ]

### Mobile / Desktop / Accessibility
- [ ]

### Error / degraded states
- [ ]

## 6. Database / Migration Verification

- Migration applied:
- Validation query/result:
- RLS verification:
- Existing-data verification:
- Rollback/remediation readiness:

## 7. Legacy Touch Verification

- Material legacy surface touched:
- Legacy risks discovered and recorded:
- L1/L0 baseline trigger status:
- Critical surfaces brought to current controls:
- Unrelated legacy debt remained outside scope:

## 8. Production Verification

- [ ] Authentication, when applicable
- [ ] API/data access, when applicable
- [ ] Critical UI, when applicable
- [ ] Storage, when applicable
- [ ] Telemetry/errors, when applicable

Evidence / observations:

## 9. Residual Risks & Accepted Exceptions

| Item | Severity | Owner | Decision / follow-up |
|---|---|---|---|
| | | | |

## 10. Definition of Done

- [ ] Approved Spec implemented
- [ ] Applicable Controls executed
- [ ] Acceptance criteria pass
- [ ] Required tests/build/static checks pass
- [ ] Required authorization/migration/security/privacy checks pass
- [ ] Error handling and observability verified when applicable
- [ ] Required responsive/accessibility/Brand validation completed
- [ ] Required supply-chain/performance/reliability checks completed
- [ ] Required traceability evidence exists
- [ ] No blocking regression remains
- [ ] Documentation updated when necessary
- [ ] Required production verification completed

**No evidence → No Done.**