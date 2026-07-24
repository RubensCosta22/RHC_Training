# <SPEC-ID> — <Title>

> RHC Tech Spec-Driven Development Standard v1.2

## 1. Identification

- **Spec ID:** <PRODUCT>-<DOMAIN>-<NUMBER>
- **Product:** RHC Training
- **Version:** 1.0
- **Status:** Draft
- **Owner:**
- **Required Approvers:**
- **Risk Tier:** R0 / R1 / R2 / R3 / R4
- **SDD Process Budget Target:**
- **Created:** YYYY-MM-DD
- **Last Updated:** YYYY-MM-DD
- **Related ADRs:**
- **Related PRs:**
- **Target Release:**
- **Supersedes:**

## 2. Applicable Controls

Derive this block from SDD v1.2 Section 32. `Conditional` controls become mandatory when the affected surface applies.

- [ ] Change record / Feature Spec
- [ ] Acceptance Criteria
- [ ] Solo AI Adversarial Review
- [ ] Architecture Review
- [ ] ADR
- [ ] Security Review
- [ ] Authorization / RLS Review
- [ ] Privacy / LGPD Review
- [ ] Database Impact Review
- [ ] Migration Rollback / Remediation
- [ ] Observability / Failure Handling
- [ ] Performance Budget
- [ ] Reliability Review
- [ ] Supply Chain Review
- [ ] Traceability
- [ ] Automated Regression Testing
- [ ] Manual UX Validation
- [ ] Production Verification
- [ ] Explicit Risk Acceptance

**Why each unchecked conditional control does not apply:**

## 3. Problem

Describe the user/product problem. Do not describe the implementation.

## 4. Objective

Define the measurable or objectively verifiable outcome.

## 5. Non-Goals

- 

## 6. User Stories / Use Cases

### US-01
As a <user>, I want <capability> so that <outcome>.

## 7. Functional Requirements

### FR-01
The system must ...

### FR-02
The system must ...

## 8. Business Rules

### BR-01

## 9. Permissions & Authorization

| Operation | Who may perform it? | Enforcement layer | Denied behavior |
|---|---|---|---|
| Read | | | |
| Create | | | |
| Update | | | |
| Delete | | | |
| Administer | | | |

### RLS / server-side enforcement

Describe the database/server guarantees. Frontend-only authorization is not sufficient.

## 10. UX/UI Specification

### User journey

### Information hierarchy

### Required states

- [ ] Loading
- [ ] Empty
- [ ] Success
- [ ] Validation error
- [ ] System error
- [ ] Unauthorized
- [ ] Offline/degraded
- [ ] Disabled

### Responsive behavior

**Mobile:**

**Desktop:**

### Accessibility

- Keyboard navigation:
- Semantic structure:
- Focus visibility:
- Labels:
- Contrast/readability:

### Brand compliance

Applicable RHC Tech Brand System rules and product-specific visual language.

## 11. Architecture Impact

- **Components affected:**
- **Data flow:**
- **Dependencies:**
- **Storage:**
- **Database:**
- **External integrations:**
- **Authentication:**
- **Authorization:**
- **Failure modes:**
- **Scalability:**
- **Backward compatibility:**
- **Migration strategy:**
- **ADR required?** Yes / No

## 12. Security & Privacy

### Threat / abuse cases

### Input validation

### Secrets and sensitive data

### Upload/file security

### Personal data

- Data collected:
- Purpose:
- Storage:
- Access:
- Third parties:
- Retention:
- Deletion/export:
- Backup implications:
- Logging implications:
- Masking/minimization:

## 13. Observability

Define critical events, failure paths, structured-log context, metrics or alerts required.

Sensitive data must be redacted before emission.

## 14. Performance & Reliability

- Performance budget:
- Timeout policy:
- Retry policy:
- Idempotency:
- Concurrency:
- Rate limiting:
- Degraded mode:
- Recovery behavior:

## 15. Legacy / Touch Assessment

- **Does this materially touch legacy code?** Yes / No
- **Legacy risks discovered:**
- **Critical surface involved?** Yes / No
- **L1 Domain baseline trigger reached?** Yes / No
- **L0 Product baseline trigger reached?** Yes / No
- **Unrelated legacy debt explicitly out of scope:**

## 16. Test Strategy

- [ ] Unit
- [ ] Integration
- [ ] Permission/RLS
- [ ] Regression
- [ ] E2E
- [ ] Manual UX
- [ ] Performance/reliability
- [ ] Security/supply-chain

Explain required coverage based on risk and applicable controls.

## 17. Acceptance Criteria

### AC-01
**Given** ...  
**When** ...  
**Then** ...

### AC-02
**Given** ...  
**When** ...  
**Then** ...

## 18. Definition of Ready

- [ ] Risk tier assigned
- [ ] Applicable Controls declared
- [ ] SDD Process Budget target identified for R0–R3
- [ ] Problem is clear
- [ ] Scope and non-goals are explicit
- [ ] Functional requirements are testable
- [ ] Business rules are resolved
- [ ] Authorization is defined when applicable
- [ ] UX states are defined when applicable
- [ ] Architecture impact is understood
- [ ] Security/privacy impact is assessed
- [ ] Legacy touch/baseline triggers assessed
- [ ] Acceptance criteria exist
- [ ] Material open questions are closed
- [ ] Required adversarial review completed for R1–R4
- [ ] Blocking findings resolved

**No Risk Tier → No Ready.**  
**No Applicable Controls → No Ready.**  
**No Ready → No Code.**