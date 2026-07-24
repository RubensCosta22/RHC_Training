# <SPEC-ID> — Implementation Plan

> Implementation may begin only after the related Spec is Approved and Ready under RHC Tech SDD v1.2.

## 1. Spec Reference

- **Spec ID:**
- **Spec Version:**
- **Risk Tier:**
- **Applicable Controls:**
- **SDD Process Budget Target:**
- **Approved By:**

## 2. Technical Summary

Describe how the approved Spec will be implemented without changing its requirements.

## 3. Scope of Change

| Area | File/module | Planned change |
|---|---|---|
| | | |

- **Components:**
- **Services / APIs:**
- **Database / Supabase:**
- **Migrations:**
- **RLS / permissions:**
- **Storage:**
- **External integrations:**

## 4. Architecture Decisions

- Existing patterns reused:
- New abstractions:
- ADRs required:
- Dependencies added/changed:
- Dependency necessity/security/license/runtime evaluation:

## 5. Data & Migration Plan

For each applicable migration document objective, compatibility, existing-data impact, RLS impact, rollback/remediation, validation query and post-migration verification.

## 6. Failure Handling & Observability

| Operation | Failure mode | User/system outcome | Telemetry |
|---|---|---|---|
| | | | |

Structured logs must redact credentials, tokens, cookies, session IDs, secrets and sensitive personal data before emission.

## 7. Security / Privacy Implementation

- Authentication impact:
- Authorization boundaries:
- Input validation:
- Sensitive-data handling:
- Privacy/LGPD controls:
- Abuse/privilege-escalation mitigations:
- Secret handling:

## 8. UX Implementation

- Mobile behavior:
- Desktop behavior:
- Loading/empty/error/unauthorized/degraded states:
- Accessibility:
- Brand System compliance:

## 9. Legacy Touch Plan

- Material legacy surfaces touched:
- Newly discovered legacy risks to record:
- Critical surfaces requiring immediate current controls:
- L1 Domain baseline trigger:
- L0 Product baseline trigger:
- Unrelated legacy debt intentionally excluded:

## 10. Test & Evidence Plan

| Requirement / AC | Applicable control | Test level | Verification | Evidence expected |
|---|---|---|---|---|
| | | | | |

## 11. Performance & Reliability

- Expected performance impact:
- Query/bundle/media impact:
- Performance budget if required:
- Timeouts/retries/idempotency:
- Concurrency/race risks:
- Degraded/recovery behavior:

## 12. Rollout & Recovery

- Rollout sequence:
- Feature flag/staging strategy if applicable:
- Rollback/remediation strategy:
- Production verification:

## 13. Risk Register

| Risk | Probability | Impact | Mitigation | Residual risk |
|---|---|---|---|---|
| | | | | |

## 14. Implementation Checklist

- [ ] Plan matches approved Spec
- [ ] Applicable Controls are preserved
- [ ] No requirement changed silently
- [ ] Risk tier has not been lowered to avoid controls
- [ ] Security/data boundaries identified when applicable
- [ ] Migration/remediation defined when applicable
- [ ] Tests map to material requirements
- [ ] Observability covers required failure paths
- [ ] Legacy touch/baseline triggers addressed
- [ ] Rollout and recovery are defined when required
- [ ] Required ADRs prepared

Material discoveries that change requirements or risk return the item to **Spec Review**.