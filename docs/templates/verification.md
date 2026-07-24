# <SPEC-ID> — Verification Record

## 1. Release Candidate

- **Spec ID / Version:**
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

| Gate | Result | Evidence / Notes |
|---|---|---|
| G1 — Spec Compliance | Pass / Fail / N/A | |
| G2 — Build | Pass / Fail / N/A | |
| G3 — Static Quality | Pass / Fail / N/A | |
| G4 — Tests | Pass / Fail / N/A | |
| G5 — Security | Pass / Fail / N/A | |
| G6 — Permissions | Pass / Fail / N/A | |
| G7 — UX | Pass / Fail / N/A | |
| G8 — Brand | Pass / Fail / N/A | |
| G9 — Observability | Pass / Fail / N/A | |
| G10 — Privacy & Data Governance | Pass / Fail / N/A | |
| G11 — Supply Chain Security | Pass / Fail / N/A | |
| G12 — Performance & Reliability | Pass / Fail / N/A | |
| G13 — Regression | Pass / Fail / N/A | |

Any mandatory failed gate blocks release.

## 4. Automated Evidence

### Build

```text
<command and result>
```

### Static analysis

```text
<command and result>
```

### Tests

```text
<command and result>
```

### Security / dependency checks

```text
<command and result>
```

## 5. Manual Verification

### Critical journeys

- [ ]

### Mobile

- [ ]

### Desktop

- [ ]

### Accessibility

- [ ]

### Error/degraded states

- [ ]

## 6. Database / Migration Verification

- Migration applied:
- Validation query/result:
- RLS verification:
- Existing-data verification:
- Rollback/remediation readiness:

## 7. Production Verification

- [ ] Authentication
- [ ] API/data access
- [ ] Critical UI
- [ ] Storage
- [ ] Telemetry
- [ ] Major errors checked

Evidence / observations:

## 8. Residual Risks & Accepted Exceptions

| Item | Severity | Owner | Decision / follow-up |
|---|---|---|---|
| | | | |

## 9. Definition of Done

- [ ] Approved Spec implemented
- [ ] Acceptance criteria pass
- [ ] Required tests pass
- [ ] Build passes
- [ ] Authorization verified
- [ ] Migrations verified
- [ ] Error handling is intentional
- [ ] Sensitive log data is protected
- [ ] Responsive behavior checked
- [ ] Accessibility checked
- [ ] Brand compliance checked
- [ ] Privacy/supply-chain/performance gates checked when applicable
- [ ] Traceability evidence exists
- [ ] No blocking regression remains
- [ ] Documentation updated
- [ ] Release evidence exists

**No evidence → No Done.**
