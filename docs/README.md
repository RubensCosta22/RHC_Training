# RHC Training — Engineering Documentation

RHC Training follows the **RHC Tech Spec-Driven Development Standard v1.3**.

> **Define → Classify Risk → Apply Controls → Implement → Verify → Release when applicable**

## Mandatory operating rules

- **No Risk Tier → No Ready.**
- **No Applicable Controls → No Ready.**
- **No Ready → No Code.**
- **No required independent review → No Approved.**
- **No evidence → No Done.**
- **No passed mandatory gates → No Release.**

For solo development, R1–R4 require adversarial AI review plus explicit human-owner approval. R0 lightweight records do not require adversarial review unless reclassified or a conditional control reveals material risk.

For R3/R4, adversarial review must use a separate review context from authoring/implementation whenever the tooling supports it. If separation is unavailable, that limitation must be recorded as a review-independence risk.

## Risk tiers

- **R0 — Trivial:** documentation/copy/maintenance with no runtime behavior change. Lightweight change record.
- **R1 — Low:** isolated low-risk behavior. Lite Spec/record with acceptance criteria and applicable R1 controls.
- **R2 — Medium:** meaningful business/API/database/workflow/UX behavior. Normal Feature Spec.
- **R3 — High:** auth, RLS, personal/sensitive data, critical migrations, destructive operations, security boundaries or high-impact behavior.
- **R4 — Critical:** broad exposure, irreversible loss, major compromise or systemic outage potential.

Risk measures potential impact and required controls, **not implementation effort**. Risk may be raised at any point and must not be lowered to avoid gates.

## Applicable Controls

Use `docs/checklists/risk-tiers.md` as the daily operational index. A control marked `Conditional` becomes mandatory whenever that surface is affected.

## SDD Process Budget

Process budget applies only to specification/review/approval overhead; it never limits implementation, CI, debugging, deployment or observation.

- R0: up to 15 minutes
- R1: up to 45 minutes
- R2: up to one focused work session
- R3: up to two focused work sessions
- R4: no artificial cap

A budget may simplify documentation, never remove mandatory security, authorization, privacy, migration, regression or release controls.

## Legacy Adoption & Touch Rule

RHC Training is an existing product. We do **not** stop useful development to rewrite all historical documentation.

When a legacy surface is materially changed, the changed behavior follows current SDD controls and newly discovered material risks are recorded. Unrelated legacy debt stays out of scope.

No grandfathering applies when changing or discovering meaningful defects in authentication, authorization/RLS, cross-profile exposure, sensitive data, secrets, destructive migrations, irreversible data-loss paths or security-sensitive uploads.

An L1 Domain/System Spec is required when the current SDD baseline triggers are reached, including the first R3/R4 change in a domain or the third R2+ material change without a current L1 baseline. A current L0 Product Spec and architecture/security baseline are required before the product's first R3/R4 change, commercialization/external beta or major production baseline release.

## Repository structure

```text
docs/
  specs/<SPEC-ID>/
    spec.md
    adversarial-review.md
    implementation-plan.md
    verification.md

  templates/
    feature-spec.md
    r1-lite-spec.md
    adversarial-review.md
    implementation-plan.md
    verification.md
    lightweight-change-record.md
    bug-record.md
    exception-record.md
    adr.md

  checklists/
    risk-tiers.md

  product/
  architecture/
  domains/
  adr/
  security/
```

Directories are adopted progressively when Legacy Adoption triggers are reached. Do not create empty documentation merely for appearance.

## Starting work

### R0
Use `docs/templates/lightweight-change-record.md` only when runtime behavior is provably unchanged. R0 is not forced through R1–R4 review, implementation-plan or production-verification controls unless a Conditional control becomes applicable or the change is reclassified.

### R1
Use `docs/templates/r1-lite-spec.md`, derive Applicable Controls, run adversarial review in solo development and collect lightweight traceability/evidence.

### R2–R4
1. Create `docs/specs/<SPEC-ID>/spec.md` from `feature-spec.md`.
2. Assign Risk Tier.
3. Declare Applicable Controls from `docs/checklists/risk-tiers.md`.
4. Assess Legacy Touch/baseline triggers.
5. Run required reviews, including adversarial AI review for solo R1–R4.
6. Resolve blocking findings and explicitly approve the Spec.
7. Create `implementation-plan.md` when required by scope/risk.
8. Implement only after Ready.
9. Create `verification.md`, map requirements to evidence and pass mandatory gates.
10. Deploy only when the change has runtime release impact; perform production verification only when Required or Conditional-and-applicable.

Material requirement or risk discoveries return the Spec to review.

## Pull requests

`.github/pull_request_template.md` is the default evidence/gate record. Every relevant PR references the engineering record required by its Risk Tier: Feature Spec, R1 Lite Spec or R0 Lightweight Change Record.

A successful merge or deployment does not prove that a change is Done or healthy in production.

The Standard is normative. Templates, checklists and playbooks exist to make compliance efficient; if they conflict with the Standard, **the Standard wins**.