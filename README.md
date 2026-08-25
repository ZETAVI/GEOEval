# GEOEval

GEOEval is a GEO optimization product with an approved product foundation. The
repository is entering product and architecture design before selecting the
application stack or beginning implementation.

## Current status

- Phase: product and architecture entry
- Approved product specification: [`product-definition`](openspec/specs/product-definition/spec.md)
- Active next-stage change: [`define-application-architecture`](openspec/changes/define-application-architecture/proposal.md)
- Application stack: not selected
- Runtime code: not started

## Start here

1. Read the [product vision](docs/product/vision.md).
2. Read the [product glossary](docs/product/glossary.md) and [accepted product specification](openspec/specs/product-definition/spec.md).
3. Review the [operating principles](docs/process/operating-principles.md).
4. Use [How We Work](docs/process/how-we-work.md) for the practical workflow and Skill prompts.
5. Use the [active architecture-entry change](openspec/changes/define-application-architecture/proposal.md) for the current module and ownership discussion.
6. Read the [archived product-foundation change](openspec/changes/archive/2026-08-24-define-product-foundation/proposal.md) or [GEO-Eval-Prompts.md](GEO-Eval-Prompts.md) only when decision history is needed.

## Delivery model

```text
Explore → Align → Propose → Approve → Implement → Verify → Reconcile → Close
```

Current behavior and proposed changes remain separate. GitHub carries execution and evidence; repository specs, code, tests, contracts, and ADRs carry durable engineering truth.

## Repository map

```text
.agents/skills/       Project-level Agent Skills
docs/product/         Product vision, language, and discovery
docs/architecture/    Current architecture and durable decisions
docs/process/         Adopted AI-native working model
docs/handoffs/        One current continuation snapshot when needed
openspec/specs/       Accepted current capability behavior
openspec/changes/     Proposed standard or architectural changes
.github/              Issue, pull request, and validation workflow
```

## Validate the project framework

```bash
python3 scripts/validate_project_framework.py
```
