# GEOEval

GEOEval is a GEO optimization product with an approved product definition, a
validated application foundation, and an accepted deterministic first
evaluation slice. Real-provider execution remains a separately reviewed
integration boundary until it is merged and accepted.

## Current status

- Phase: deterministic S1-S5 customer entry, evaluation, report, retry,
  history, and notification behavior are implemented and locally accepted on
  `main`; the S6 real-provider candidate remains an unmerged change
- Approved product specification: [`product-definition`](openspec/specs/product-definition/spec.md)
- Active product changes: the completed deterministic slice awaits change
  retirement and its bounded frontend-presentation follow-up belongs in a new
  change; real-provider S6 work is isolated on
  `codex/integrate-real-evaluation-providers`
- Application stack: Next.js Web plus NestJS API/Worker, PostgreSQL,
  Redis/BullMQ, Prisma, and generated OpenAPI client
- Runtime code: non-product F0 validation foundation only

## Start here

1. Read the [product vision](docs/product/vision.md).
2. Read the [product glossary](docs/product/glossary.md) and [accepted product specification](openspec/specs/product-definition/spec.md).
3. Review the [operating principles](docs/process/operating-principles.md).
4. Use [How We Work](docs/process/how-we-work.md) for the practical workflow and Skill prompts.
5. Use the [architecture overview](docs/architecture/overview.md) for current
   foundation and next-gate boundaries.
6. Use the [change-tracking contract](docs/process/change-tracking.md) for
   Issues, sub-issues, pull requests, commits, reopening, and follow-up work.
7. Read the [archived architecture change](openspec/changes/archive/2026-08-25-define-application-architecture/proposal.md), [archived product-foundation change](openspec/changes/archive/2026-08-24-define-product-foundation/proposal.md), or [GEO-Eval-Prompts.md](GEO-Eval-Prompts.md) only when decision history is needed.
8. Review [ADR 0001](docs/architecture/adr/0001-application-foundation.md)
   and the [F0 evidence](openspec/changes/archive/2026-08-25-define-application-architecture/research/foundation-spike-evidence.md)
   before changing application foundations.

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
docs/handoffs/        Created lazily for one active continuation snapshot only
openspec/specs/       Accepted current capability behavior
openspec/changes/     Proposed standard or architectural changes
.github/              Issue, pull request, and validation workflow
```

## Validate the project framework

```bash
python3 scripts/validate_project_framework.py
```
