# RHC Training — Engineering Documentation

RHC Training follows the **RHC Tech Spec-Driven Development Standard v1.1**.

Engineering work is governed by:

> **Problem → Spec → Review → Approval → Implementation → Verification → Release**

## Mandatory operating rules

- **No Ready → No Code.**
- **No independent review → No Approved.**
- **No evidence → No Done.**
- **No passed mandatory gates → No Release.**

For solo development, independent review means a mandatory adversarial AI review plus explicit human-owner approval.

## Repository documentation structure

```text
docs/
  product/
    product-spec.md

  architecture/
    architecture.md

  domains/
    authentication.md
    authorization.md
    observability.md

  specs/
    <SPEC-ID>/
      spec.md
      adversarial-review.md
      implementation-plan.md
      verification.md

  adr/
    ADR-001.md

  security/
    security-standard.md

  templates/
    feature-spec.md
    adversarial-review.md
    implementation-plan.md
    verification.md
    adr.md
    bug-record.md
    exception-record.md
```

The directories above are adopted progressively. Do not create empty documentation solely to satisfy structure; add each source of truth when it is reviewed and useful.

## Spec identification

RHC Training uses the `RHCT` product prefix.

```text
RHCT-<DOMAIN>-<NUMBER>
```

Examples:

```text
RHCT-AUTH-001
RHCT-WORKOUT-001
RHCT-OBS-001
RHCT-STATS-001
```

## Risk classification

- **R0 — Trivial:** no runtime behavior change; lightweight change record allowed.
- **R1 — Low:** isolated low-risk behavior.
- **R2 — Medium:** meaningful business, API, database, workflow or UX change.
- **R3 — High:** auth, RLS, sensitive data, critical migration/infrastructure or security boundary.
- **R4 — Critical:** broad exposure, irreversible loss, major compromise or systemic outage risk.

Risk may be raised during review. It must not be lowered to avoid a required gate.

## Starting a relevant change

1. Copy `docs/templates/feature-spec.md` into `docs/specs/<SPEC-ID>/spec.md`.
2. Complete the Spec and assign risk.
3. Run an independent adversarial review using `adversarial-review.md`.
4. Resolve blocking findings and obtain explicit approval.
5. Create `implementation-plan.md` from the template.
6. Only then implement code.
7. Create `verification.md`, map requirements to evidence and pass applicable gates.
8. Merge, deploy and perform production verification.

Material requirement changes discovered during implementation return the Spec to review.

## Bugs

Meaningful defects use `docs/templates/bug-record.md`. Root cause and regression verification are required; symptom-only patches are not considered sufficient.

## Exceptions

Exceptions use `docs/templates/exception-record.md`. Exceptions are explicit, time-bounded or condition-bounded, risk-assessed and approved by the accountable role.

## Pull requests

`.github/pull_request_template.md` is the default evidence and gate checklist for every PR.

A successful merge or deployment does not, by itself, prove that a change is Done or healthy in production.
