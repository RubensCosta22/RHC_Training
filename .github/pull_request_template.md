# RHC Tech — Pull Request

## Change classification

- **SDD version:** v1.3
- **Engineering record ID:**
- **Record type:** R0 Lightweight Change / R1 Lite Spec / Feature Spec
- **Record version:**
- **Risk Tier:** R0 / R1 / R2 / R3 / R4
- **Applicable Controls:**
- **Approval status:** Approved / N/A for valid R0

> Every relevant PR references the engineering record required by its Risk Tier. No Risk Tier → No Ready. No Applicable Controls → No Ready.

## What changed

Summarize the implementation or process/documentation change.

## What did not change

List important behavior intentionally preserved.

## Legacy touch

- **Material legacy surface touched?** Yes / No
- **Critical legacy surface?** Yes / No
- **L1/L0 baseline trigger reached?** Yes / No
- **Legacy risks recorded:**
- **Unrelated legacy debt kept out of scope:**

## Database / permissions impact

- [ ] Not applicable
- [ ] Database impact reviewed
- [ ] Migration included where required
- [ ] Existing-data impact evaluated
- [ ] Authorization / RLS reviewed where applicable
- [ ] Rollback/remediation documented where required
- [ ] Validation evidence recorded

## Security & privacy impact

- Authentication:
- Authorization / RLS:
- Input validation:
- Sensitive data / logging:
- Privacy / LGPD / retention / third parties:

## UX / Brand impact

- Screens/states affected:
- Mobile / Desktop:
- Accessibility:
- RHC Tech Brand System:

## Observability / reliability / supply chain

- Failure handling / telemetry:
- Performance/reliability:
- Dependency/supply-chain impact:

## Tests & evidence

Record only evidence required by the Risk Tier and affected surfaces.

| Requirement / AC | Applicable control | Implementation | Test | Evidence | Status |
|---|---|---|---|---|---|
| | | | | | |

Commands/results:

```text
<evidence or N/A with reason>
```

## Quality Gates

Mark only gates required by the Risk Tier Applicability Matrix and actual affected surfaces. `Conditional` is mandatory when its surface applies. A gate marked `—` by the Standard is not required merely because it appears here. Any `N/A` must have an explicit reason where a record is required.

- [ ] G1 — Spec / Engineering Record Compliance
- [ ] G2 — Build
- [ ] G3 — Static Quality
- [ ] G4 — Tests
- [ ] G5 — Security
- [ ] G6 — Permissions
- [ ] G7 — UX
- [ ] G8 — Brand
- [ ] G9 — Observability
- [ ] G10 — Privacy & Data Governance
- [ ] G11 — Supply Chain Security
- [ ] G12 — Performance & Reliability
- [ ] G13 — Regression

## Adversarial review

- [ ] Not required: valid R0
- [ ] Required and completed for R1–R4
- [ ] R3/R4 separate review context recorded when tooling supports it
- **Blockers remaining:** 0 / N/A
- **R3/R4 Major findings remaining without approved exception:** 0 / N/A

## Risks / exceptions

Known residual risks or approved exception IDs:

## Release & production verification

- **Runtime release impact?** Yes / No
- **Production verification Required or Conditional-and-applicable?** Yes / No
- Rollout/remediation strategy when applicable:
- Post-release critical affected journey when applicable:
- Telemetry/errors to verify when applicable:

Documentation-only/process-only valid R0 changes do not require runtime production verification.

---

**No Ready → No Code. No evidence → No Done. No passed mandatory gates → No Release.**