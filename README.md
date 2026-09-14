# GEOEval

GEOEval is a GEO optimization product with an approved product definition, a
validated application foundation, and an accepted S1-S6 evaluation journey.
Real-provider execution is integrated as a local and release-candidate
capability; production activation and commercial customer data remain separate
release gates.

Repository: [ZETAVI/GEOEval](https://github.com/ZETAVI/GEOEval) (private).

## Current status

- Phase: S1-S6 and the M4 evaluation-quality closeout are integrated on `main`:
  customer entry, AI-generated question preparation, real-provider evaluation,
  staged semantic analysis, truthful progress, report, retry, history, and
  notification behavior are accepted
- Project control: GitHub Issues and pull requests are live; `main` requires a
  pull request, the `AI Native 项目框架 CI` and `完整项目 CI` status checks,
  linear history, and resolved review conversations. Planning Status/Priority
  lives only in the [GEOEval Delivery Project](https://github.com/users/ZETAVI/projects/1);
  the initial governance migration closed through
  [Issue #21](https://github.com/ZETAVI/GEOEval/issues/21).
- Approved product specification: [`product-definition`](openspec/specs/product-definition/spec.md)
- Active product changes: completed S1-S6 and M4 Changes are archived. Recharge
  remains separately owned. [Agency Entry](openspec/specs/agency-entry/spec.md)
  adds opt-in acquisition and initial registration attribution under Issue #100;
  [Agency Customer Service](openspec/specs/agency-customer-service/spec.md)
  adds controlled reassignment and read-only customer/brand/report access.
  Production acquisition, purchase snapshots, commission and withdrawal remain gated. Prompt mirroring in Issue #49 is `Ready`, while report visual
  refinement in Issue #13 is `Backlog` and does not block accepted evaluation.
- Application stack: Next.js Web plus NestJS API/Worker, PostgreSQL,
  Redis/BullMQ, Prisma, and generated OpenAPI client
- Runtime code: deterministic and real-provider evaluation modes are
  implemented; F0 probes remain non-product validation tools. Production use
  still requires the separate release, customer-data, quota, and deployment
  gates.

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
