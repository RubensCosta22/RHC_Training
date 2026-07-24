# <SPEC-ID> — <Title>

> RHC Tech Spec-Driven Development Standard v1.1

## 1. Identification

- **Spec ID:** <PRODUCT>-<DOMAIN>-<NUMBER>
- **Product:** RHC Training
- **Version:** 1.0
- **Status:** Draft
- **Owner:**
- **Required Approvers:**
- **Risk Classification:** R0 / R1 / R2 / R3 / R4
- **Created:** YYYY-MM-DD
- **Last Updated:** YYYY-MM-DD
- **Related ADRs:**
- **Related PRs:**
- **Target Release:**
- **Supersedes:**

## 2. Problem

Describe the user/product problem. Do not describe the implementation.

## 3. Objective

Define the measurable or objectively verifiable outcome.

## 4. Non-Goals

- 

## 5. User Stories / Use Cases

### US-01
As a <user>, I want <capability> so that <outcome>.

## 6. Functional Requirements

### FR-01
The system must ...

### FR-02
The system must ...

## 7. Business Rules

### BR-01

## 8. Permissions & Authorization

| Operation | Who may perform it? | Enforcement layer | Denied behavior |
|---|---|---|---|
| Read | | | |
| Create | | | |
| Update | | | |
| Delete | | | |
| Administer | | | |

### RLS / server-side enforcement

Describe the database/server guarantees. Frontend-only authorization is not sufficient.

## 9. UX/UI Specification

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

## 10. Architecture Impact

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

## 11. Security & Privacy

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
- Logging implications:
- Masking/minimization:

## 12. Observability

Define critical events, failure paths, structured-log context, metrics or alerts required.

Sensitive data must be redacted before emission.

## 13. Performance & Reliability

- Performance budget:
- Timeout policy:
- Retry policy:
- Idempotency:
- Concurrency:
- Rate limiting:
- Degraded mode:
- Recovery behavior:

## 14. Test Strategy

- [ ] Unit
- [ ] Integration
- [ ] Permission/RLS
- [ ] Regression
- [ ] E2E
- [ ] Manual UX
- [ ] Performance/reliability
- [ ] Security/supply-chain

Explain required coverage based on risk.

## 15. Acceptance Criteria

### AC-01
**Given** ...  
**When** ...  
**Then** ...

### AC-02
**Given** ...  
**When** ...  
**Then** ...

## 16. Definition of Ready

- [ ] Problem is clear
- [ ] Scope and non-goals are explicit
- [ ] Functional requirements are testable
- [ ] Business rules are resolved
- [ ] Authorization is defined
- [ ] UX states are defined when applicable
- [ ] Architecture impact is understood
- [ ] Security/privacy impact is assessed
- [ ] Risk classification is assigned
- [ ] Acceptance criteria exist
- [ ] Material open questions are closed
- [ ] Adversarial review completed
- [ ] Blocking findings resolved

**No Ready → No Code.**
