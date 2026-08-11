# GEOEval

GEOEval is a GEO optimization product currently in product discovery. The repository is intentionally starting with product definition and an AI-native delivery operating model before application architecture or implementation is selected.

## Current status

- Phase: product discovery
- Active change: [`define-product-foundation`](openspec/changes/define-product-foundation/proposal.md)
- Application stack: not selected
- Runtime code: not started

## Start here

1. Read the [product vision](docs/product/vision.md).
2. Follow the [product discovery plan](docs/product/discovery-plan.md).
3. Review the [operating principles](docs/process/operating-principles.md).
4. Use [How We Work](docs/process/how-we-work.md) for the practical workflow and Skill prompts.
5. Use the [active product-definition change](openspec/changes/define-product-foundation/proposal.md) for the next discussion.
6. Read [GEO-Eval-Prompts.md](GEO-Eval-Prompts.md) only as historical input, not as accepted requirements.

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
