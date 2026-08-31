# GEOEval

GEOEval is a GEO optimization product with an approved product definition, a
validated application foundation, and an accepted deterministic first
evaluation slice. Real-provider execution remains a separately reviewed
integration boundary until it is merged and accepted.

Repository: [ZETAVI/GEOEval](https://github.com/ZETAVI/GEOEval) (private).

## Current status

- Phase: deterministic S1-S5 customer entry, evaluation, report, retry,
  history, and notification behavior are implemented and locally accepted on
  `main`; the S6 real-provider candidate remains an unmerged change
- Project control: GitHub Issues and pull requests are live; `main` requires a
  pull request, the `AI Native 项目框架 CI` and `完整项目 CI` status checks,
  linear history, and resolved review conversations. Planning Status/Priority
  lives only in the [GEOEval Delivery Project](https://github.com/users/ZETAVI/projects/1);
  the initial governance migration closed through
  [Issue #21](https://github.com/ZETAVI/GEOEval/issues/21).
- Approved product specification: [`product-definition`](openspec/specs/product-definition/spec.md)
- Active product changes: deterministic S1-S5 is retired as a completed Change;
  frontend presentation remains Issue #13, while real-provider S6 is tracked by
  [Issue #4](https://github.com/ZETAVI/GEOEval/issues/4) and remains isolated on
  `codex/issue-4-s6-real-provider-integration` as Draft PR #20
- Application stack: Next.js Web plus NestJS API/Worker, PostgreSQL,
  Redis/BullMQ, Prisma, and generated OpenAPI client
- Runtime code: deterministic S1-S5 product behavior is implemented on `main`;
  F0 probes remain non-product validation tools and real-provider S6 remains an
  integration candidate

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

The GitHub Project is a planning projection only. Issues, PRs, OpenSpec,
current specs, code, tests, and ADRs retain their distinct authority.

## Validate the project framework

```bash
python3 scripts/validate_project_framework.py
```
