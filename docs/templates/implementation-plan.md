# <SPEC-ID> — Implementation Plan

> Implementation may begin only after the related Spec is Approved and Ready.

## 1. Spec Reference

- **Spec ID:**
- **Spec Version:**
- **Risk Classification:**
- **Approved By:**

## 2. Technical Summary

Describe how the approved Spec will be implemented without changing its requirements.

## 3. Scope of Change

### Files / modules affected

| Area | File/module | Planned change |
|---|---|---|
| | | |

### Components

### Services / APIs

### Database / Supabase

### Migrations

### RLS / permissions

### Storage

### External integrations

## 4. Architecture Decisions

- Existing patterns reused:
- New abstractions:
- ADRs required:
- Dependencies added/changed:
- Dependency risk/license/security evaluation:

## 5. Data & Migration Plan

For every migration document:

- objective;
- compatibility;
- existing-data impact;
- RLS impact;
- rollback/remediation;
- validation query;
- post-migration verification.

## 6. Failure Handling & Observability

| Operation | Failure mode | User/system outcome | Telemetry |
|---|---|---|---|
| | | | |

Structured logs must redact credentials, tokens, cookies, session IDs, secrets and sensitive personal data before emission.

## 7. Security Implementation

- Authentication impact:
- Authorization boundaries:
- Input validation:
- Sensitive-data handling:
- Abuse/privilege escalation mitigations:
- Secret handling:

## 8. UX Implementation

- Mobile behavior:
- Desktop behavior:
- Loading/empty/error/unauthorized/degraded states:
- Accessibility:
- Brand System compliance:

## 9. Test Plan

| Requirement / AC | Test level | Test or verification | Evidence expected |
|---|---|---|---|
| | | | |

## 10. Performance & Reliability

- Expected performance impact:
- Query/bundle/media impact:
- Timeouts/retries/idempotency:
- Concurrency/race risks:
- Degraded/recovery behavior:

## 11. Rollout & Recovery

- Rollout sequence:
- Feature flag/staging strategy if applicable:
- Rollback/remediation strategy:
- Production verification:

## 12. Risk Register

| Risk | Probability | Impact | Mitigation | Residual risk |
|---|---|---|---|---|
| | | | | |

## 13. Implementation Checklist

- [ ] Plan matches approved Spec
- [ ] No requirement changed silently
- [ ] Security boundaries identified
- [ ] Data migration/remediation defined
- [ ] Tests map to material requirements
- [ ] Observability covers critical failures
- [ ] Rollout and recovery are defined
- [ ] Required ADRs prepared

Material discoveries that change requirements return the item to **Spec Review**.
