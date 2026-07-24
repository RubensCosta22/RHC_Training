# CHG-XXX — <Title>

> Use only for **R0 — Trivial** changes that provably do not alter runtime behavior under RHC Tech SDD v1.3.

- **Product:** RHC Training
- **Classification:** R0 — Trivial
- **Owner:**
- **Date:** YYYY-MM-DD
- **Related PR:**

## Change

Describe exactly what is being changed.

## Why this is R0

Explain why the change does **not** alter runtime behavior, business rules, user data, persistence, schema/RLS, APIs, authentication/authorization, security/privacy boundaries, significant UX behavior, architecture, critical observability, or material performance/reliability characteristics.

## Scope

Files/documentation affected:

- 

## Runtime impact

**Expected runtime impact:** None.

Evidence/reasoning:

## Verification

- [ ] Diff contains only the intended trivial change
- [ ] No runtime code or configuration changed
- [ ] No dependency/lockfile change
- [ ] No database/migration/RLS change
- [ ] No security or privacy behavior changed
- [ ] No user-facing functional behavior changed

Verification evidence:

## Escalation rule

If review discovers material runtime, security, data, UX, architecture, observability, performance or reliability impact, stop using this record, reclassify the change, and create the engineering record required by the new Risk Tier: `r1-lite-spec.md` for valid R1 or a full Feature Spec for R2–R4.