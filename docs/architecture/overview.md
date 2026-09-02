# Architecture Overview

- Status: S1-S6 evaluation behavior and the Media Supply backend foundation are
  integrated after one
  fictional real 4-by-5 Worker evaluation, authenticated customer-report
  inspection, fixed-revision review, and product-owner confirmation. Production
  activation and commercial customer data remain separate gates.
- Entry condition: Approved product foundation and bounded first product slice
- Decision history: [`define-application-architecture`](../../openspec/changes/archive/2026-08-25-define-application-architecture/proposal.md)
- Completed change: [`deliver-first-evaluation-slice`](../../openspec/changes/archive/2026-08-31-deliver-first-evaluation-slice/proposal.md)
- Completed change: [`integrate-real-evaluation-providers`](../../openspec/changes/archive/2026-09-01-integrate-real-evaluation-providers/proposal.md),
  coordinated by [Issue #4](https://github.com/ZETAVI/GEOEval/issues/4) and
  [PR #20](https://github.com/ZETAVI/GEOEval/pull/20)

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
positions after one bounded ERNIE R03 retry. Controlled S6 calls use the same
production-adapter boundary with fictional data, while production deployment
and commercial customer data remain outside the current authorization. Final
report presentation remains the independent Issue #13
outcome; it may refine presentation but must preserve the accepted journey and
behavior.

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

Brand Knowledge owns the editable account-scoped Brand, the executable
`industry-catalog@1.0.0` source, and a separate checked mainland administrative-
region snapshot. Web and API use dependent two-level industry and three-level
region selections; the server validates complete paths and resolves display
labels. Brand fingerprints contain stable industry and official region
identities but exclude contact, catalog/source version, labels, and
presentation-only city groups. GEO Intelligence receives one versioned,
immutable evaluation-purpose projection and never imports either reference
source or reads Brand persistence directly. A central decoder keeps original
flat snapshots readable without rewriting historical JSON.

Media Supply owns the global administrator-maintained platform catalog in
PostgreSQL: stable platform identity, fixed multi-category membership,
one first-release availability state and whole-point price per platform,
optional concrete resources, one current internal source per resource, public
catalog revision, and administrator audit. Identity owns the reusable all-role
session and required-role guards; only administrators mutate media facts.
Customer HTTP responses are explicit safe projections and never reuse
administrator DTOs or expose procurement cost, source/contact data, cases, or
notes.

Platform state and price—not candidate-resource count—decide whether a platform
is buyable. A separate one-to-one Listing is intentionally absent until one
platform needs multiple independently priced or scheduled sale variants. Future
Publishing Commerce consumes a synchronous quote and owns the paid snapshot.
Future Publication Delivery may consume a possibly empty candidate list, but a
stored resource reference remains optional and a recorded accessible
publication URL owns completion. Catalog freshness uses a durable global
revision and conditional reads; it does not reuse Notification SSE or introduce
Outbox/BullMQ work without an asynchronous consumer. The accepted behavior is
specified by [`media-supply`](../../openspec/specs/media-supply/spec.md).

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

S6 adds explicit deterministic versus real Worker composition, one-call durable
attempt ownership, provider-specific transport adapters, truthful search and
source evidence, optional masked Langfuse telemetry, and ambiguity recovery
without another workflow engine or attempt store. Sampling keeps its five
accepted platform routes. Per-sample interpretation and overall synthesis use
Model Studio Qwen3.8 Flash for attempts one and two with `medium` reasoning
effort, then TokenHub Hy3 as the third-attempt fallback.

Semantic provider contracts are deliberately smaller than the canonical GEO
contracts: models return evidence-linked semantic facts, while deterministic
projectors assign internal IDs, repair only owner-controlled references, retain
ungrouped brand mentions, and run the existing strict domain validation before
acceptance. Default parser and synthesis calls do not use web search. Overall
synthesis summarizes sampled platform perception rather than investigating
real-world brand facts; it groups only obvious name relations from answer
context and leaves uncertain names separate. Add a web-backed resolver only if
repeated real evidence later shows that ambiguity materially harms reports.

The first complete real run accepted all twenty acquisition samples on their
first platform attempt. Ten interpretations passed the first Qwen3.8 attempt,
eight passed its same-route retry, and two used the Hy3 fallback. Overall
synthesis required the same fallback after one semantic rejection and one
timeout. This proves the recovery path, not production capacity. It also fixes
the next semantic-quality frontier: improve evidence extraction, other-brand
classification, and synthesis-reference discipline from retained real evidence
before adding retries or weakening the canonical contracts.

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

1. Reconcile provider-console billed cost and commercial data terms before any
   production-capacity, pricing, or real-customer claim. One successful
   fictional run is not a load or quota test.
2. Introduce the AI question
   generator as a separate GEO Intelligence change behind the existing
   `EvaluationQuestionGenerator` port. Versioned prompt, model-output contract,
   and fixtures belong to `apps/backend/geo-intelligence/query-generator/`;
   external execution still goes through AI Execution, while GEO retains the
   four-question shape, immutable snapshot, validation, and fallback authority.
   Keep the deterministic generator as the local baseline and rollback path.
3. Validate SSE proxy buffering and reconnect behavior in the named release
   environment, and remove or isolate F0-only HTTP, schema, and page probes,
   before a commercial deployment.

Do not use this document as a list of imagined future services.
