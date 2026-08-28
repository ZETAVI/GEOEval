# Architecture Overview

- Status: deterministic S1 accepted; S2 definition and start locally verified
  and checkpointed; S3 resumable evidence verified and checkpointed; S4 report
  acceptance and customer read path locally verified and product-reviewed; S5
  evaluation continuity locally verified, product-reviewed, and checkpointed
- Entry condition: Approved product foundation and bounded first product slice
- Decision history: [`define-application-architecture`](../../openspec/changes/archive/2026-08-25-define-application-architecture/proposal.md)
- Active change: [`deliver-first-evaluation-slice`](../../openspec/changes/deliver-first-evaluation-slice/proposal.md)

## Current state

The application foundation is a TypeScript modular monolith: one pnpm workspace,
a Next.js Web application, and one NestJS backend built once with separate API
and Worker entrypoints. PostgreSQL owns business truth; Redis/BullMQ delivers
recoverable background work through a transaction Outbox and durable business
idempotency. REST/OpenAPI owns the Web transport boundary, and SSE is a
recoverable hint over normal durable reads.

This shape passed the bounded
[F0 foundation evidence](../../openspec/changes/archive/2026-08-25-define-application-architecture/research/foundation-spike-evidence.md)
and is recorded by [ADR 0001](adr/0001-application-foundation.md). The checked
F0 routes and records are non-product probes. A separately authorized
four-call provider entitlement gate also passed, without enabling web search;
its [sanitized evidence](../../openspec/changes/archive/2026-08-25-define-application-architecture/research/provider-entitlement-evidence.md)
does not authorize provider integration or product implementation. Subsequent
[restricted search/fidelity probes](../../openspec/changes/archive/2026-08-25-define-application-architecture/research/provider-search-fidelity-evidence.md)
ultimately produced successful evidence for all fifteen unique R01-R03
positions after one bounded ERNIE R03 retry. Production infrastructure and real
external authentication remain outside the current authorization. The
deterministic S1 customer entry and responsive My brands interaction are
implemented and accepted under the active change. Final visual language and
typographic polish remain a later frontend-design responsibility; that work may
refine presentation but must preserve the accepted journey and behavior.

Customer-visible evaluation uses one shared, versioned
[objectivity-instruction profile](../../apps/backend/geo-intelligence/evaluation-objectivity.json)
across all five routes. GEO Intelligence owns its product meaning;
route policy references it, AI Execution snapshots its ID/version/hash, and
provider adapters only translate the same content to a verified transport.
Frozen evaluation inputs, evidence semantics, and scoring remain shared, while
historical reports retain the exact profile context that produced them. The
confirmed implementation profile is `evaluation.objectivity@0.3.0`; search
availability and automatic trigger posture remain provider-route configuration,
not prompt-level product meaning.

GEO Intelligence is the executable owner of that profile from S2 onward. The
provider-validation harness consumes the same production-owned source rather
than maintaining a calibration copy.

S3 extends that owner with a PostgreSQL execution cycle, canonical per-sample
answer, accepted interpretation, exhausted-stage record, and the
seventeen-of-twenty readiness decision. AI Execution owns only append-oriented
attempt evidence. Background Work owns product-Outbox relay, small BullMQ jobs,
and a scheduled reconciliation scan; neither Redis nor telemetry is a source of
business truth. The API and Worker load separate module graphs so background
processing does not depend on HTTP controllers or session guards. The current
behavior is specified by
[`evaluation-evidence`](../../openspec/specs/evaluation-evidence/spec.md).

S4 adds typed per-sample semantics, deterministic cross-sample calculations,
run-scoped synthesis attempts, immutable public reports, protected optimization
guidance, and an account-authorized current-report projection. The Web preserves
safe original Markdown and applies only validated non-destructive highlights.
Accepted behavior is specified by
[`evaluation-report`](../../openspec/specs/evaluation-report/spec.md); final
visual refinement is tracked separately and cannot change report ownership or
metrics.

S5 makes the twenty logical sample positions run-owned so each bounded retry
can retain prior attempts and exhaustion in a new execution cycle. Evidence-
stage retry reopens only the missing acquisition or interpretation stage;
synthesis retry reuses every accepted sample. Report history queries the
existing immutable reports rather than copying them. A separate Notification
capability materializes evaluation result facts idempotently in PostgreSQL, and
the authenticated app-shell SSE stream carries only a disposable refresh
revision over normal durable reads. The accepted boundaries are specified by
[`evaluation-evidence`](../../openspec/specs/evaluation-evidence/spec.md),
[`evaluation-report`](../../openspec/specs/evaluation-report/spec.md), and
[`notification`](../../openspec/specs/notification/spec.md).

## Architecture qualities

When architecture work begins, it must preserve:

- high cohesion around product capabilities and data ownership;
- low coupling through small, explicit public contracts;
- dependency direction that can be checked in code and CI;
- reuse based on stable semantics rather than anticipated similarity;
- incremental migration and local refactoring instead of large rewrites;
- observable failure boundaries and task-appropriate verification;
- primary-source evidence for every consequential external dependency.

## Next architecture gates

1. Keep destination-branch integration as a separate explicit branch-exit
   action; the accepted S1-S5 checkpoint does not imply a merge or deployment.
2. Before real-provider S6 integration, preserve the S5 retry and notification
   boundaries and complete the smallest provider adapter, resilience,
   capacity/cost, and telemetry evidence; no additional prompt-only five-
   platform batch is required.
3. Validate SSE proxy buffering and reconnect behavior in the named release
   environment, and remove or isolate F0-only HTTP, schema, and page probes,
   before a commercial deployment.

Do not use this document as a list of imagined future services.
