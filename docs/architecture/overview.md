# Architecture Overview

- Status: Application foundation accepted; product implementation not authorized
- Entry condition: Approved product foundation and bounded first product slice
- Decision history: [`define-application-architecture`](../../openspec/changes/archive/2026-08-25-define-application-architecture/proposal.md)

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
positions after one bounded ERNIE R03 retry. Production infrastructure,
authentication, and customer-facing interaction design remain outside the
current authorization.

Customer-visible evaluation uses one shared, versioned
[objectivity-instruction profile](../../scripts/provider-validation/evaluation-objectivity.json)
across all five routes. GEO Intelligence owns its product meaning;
route policy references it, AI Execution snapshots its ID/version/hash, and
provider adapters only translate the same content to a verified transport.
Frozen evaluation inputs, evidence semantics, and scoring remain shared, while
historical reports retain the exact profile context that produced them. The
confirmed implementation profile is `evaluation.objectivity@0.3.0`; search
availability and automatic trigger posture remain provider-route configuration,
not prompt-level product meaning.

The validation harness is the current executable owner only until S0. The first
activating product change must move—not copy—the profile into its owner-local
production source, update canonical links, and leave the harness consuming that
same owner.

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

1. Start a new bounded change and obtain explicit S0 authorization before
   implementing deterministic S1-S5 customer identity, brand, evaluation,
   notification, or report behavior.
2. Complete the smallest parser, synthesis, resilience, capacity/cost, and
   telemetry evidence before real-provider S6 integration; no additional
   prompt-only five-platform batch is required.
3. Remove or isolate F0-only HTTP, schema, and page probes before a commercial
   deployment.

Do not use this document as a list of imagined future services.
