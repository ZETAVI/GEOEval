# Architecture Overview

- Status: S1-S6 evaluation behavior, AI-generated Query preparation, and the
  Media Supply backend foundation are integrated after one
  fictional real 4-by-5 Worker evaluation, authenticated customer-report
  inspection, fixed-revision review, and product-owner confirmation. Production
  activation and commercial customer data remain separate gates.
- Entry condition: Approved product foundation and bounded first product slice
- Decision history: [`define-application-architecture`](../../openspec/changes/archive/2026-08-25-define-application-architecture/proposal.md)
- Completed change: [`deliver-first-evaluation-slice`](../../openspec/changes/archive/2026-08-31-deliver-first-evaluation-slice/proposal.md)
- Completed change: [`integrate-real-evaluation-providers`](../../openspec/changes/archive/2026-09-01-integrate-real-evaluation-providers/proposal.md),
  coordinated by [Issue #4](https://github.com/ZETAVI/GEOEval/issues/4) and
  [PR #20](https://github.com/ZETAVI/GEOEval/pull/20)
- Active change: [`implement-ai-query-generator`](../../openspec/changes/implement-ai-query-generator/proposal.md),
  coordinated by [Issue #26](https://github.com/ZETAVI/GEOEval/issues/26) and
  [PR #28](https://github.com/ZETAVI/GEOEval/pull/28)

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
region snapshot. Web uses dependent two-level industry selection plus one Amap
map/result-panel/Marker POI interaction: the form loads a Beijing-centered map,
typing remains local, and only the explicit action searches. It requests no
device location or separate
province/city/terminal mutation. Brand independently resolves selected POI
detail and reverse-geocode evidence through its conditional server adapter,
derives exactly one official region and one automatic Query locality, and commits
only an account/Brand-bound short-lived receipt. The Store Location, flagship
product/service, and two-to-six peer
characteristics belong to the Brand aggregate and participate in
`brand-evaluation-input@3`; characteristic order, contact, and provider
representation do not. GEO Intelligence freezes one
`brand-evaluation-snapshot@3` projection and exposes a narrower Query handoff;
it never imports Brand/Amap contracts or re-resolves frozen evidence. Development
activation uses one empty v3 database rather than a legacy snapshot decoder.

The Web receives only the domain-restricted Amap JS Key. Next owns the bounded
`/_AMapService` security proxy, while the JS security code and Web Service Key
remain in separate server runtimes. The Brand API completes provider calls before
the aggregate transaction, stores no raw provider response, serializes Brand
writes, and rejects expired, replayed, cross-account, or stale receipts.

GEO Intelligence turns the narrow frozen Query handoff into one durable
`EvaluationQuestionPreparation` per Brand fingerprint. One repository-owned,
versioned no-search Prompt asks a single Agent for a natural target-brand name
and four final question strings; the program supplies fixed business kinds and
ordinals and validates only the agreed target-name boundary. The three open
questions combine concrete location and flagship need, while two of them form
complementary scenarios from all peer characteristics. Candidate generation,
Critic/Judge layers, naturalness scores, template fallback, and customer Query
editing or refresh are deliberately absent.

Preparation, Prompt and schema snapshots, append-oriented Query attempts,
Product Outbox delivery, conditional Definition acceptance, explicit retry,
and stale-sequence rejection keep Provider work recoverable without creating a
second orchestration framework. Model Studio `qwen3.8-flash` owns attempts one
and two; TokenHub `hy3` is the third-attempt cross-provider fallback.
Deterministic Query output is a test fixture only. Web exposes preparing, ready,
and `请重试` states but not Prompt, Provider, model, route, attempt, queue, or
trace details. Current behavior is specified by
[`evaluation-definition`](../../openspec/specs/evaluation-definition/spec.md).

Media Supply owns the global administrator-maintained platform catalog in
PostgreSQL: stable platform identity, fixed multi-category membership,
one first-release availability state and whole-point price per platform,
optional concrete resources, one current internal supplier per resource, public
catalog revision, and administrator audit. Each supplier is a globally reusable
`MediaSupplier`; each resource stores one resource-owned two-state decision while its
effective availability is derived from that decision and supplier status.
Supplier/resource association counts are queried rather than stored, and both
owners use optimistic concurrency plus guarded non-cascading deletion. Identity owns the reusable all-role
session and required-role guards; only administrators mutate media facts.
Customer HTTP responses are explicit safe projections and never reuse
administrator DTOs or expose procurement cost, supplier/contact data, cases, or
notes.

The reviewed first Media Supply batch enters through one offline fixed-format
adapter rather than a migration framework or runtime upload. It verifies the
exact workbook, versioned Web Logo bundle, administrator actor and current
database state in a read-only plan, then recomputes the same boundary inside one
serializable PostgreSQL apply transaction. Deterministic identities make exact
replay idempotent; conflicts never update current facts. Logos deploy before
apply, safe receipts are recoverable projections after commit, and every
inserted platform/supplier/resource remains inactive with resources hidden.
Implementation or merge never implies formal import, deployment, activation, or
customer publication.

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
effort, then TokenHub Hy3 as the third-attempt fallback. Query preparation now
reuses the same semantic route order with its own smaller model contract.

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

The Query-only quality review then accepted one shared Prompt across restaurant,
enterprise-service, and consumer-electronics stores. One Qwen request timed out
at the bounded 180-second limit and its same-route retry succeeded; an explicit
Hy3 fallback call also produced an accepted four-question set. This supports
the existing recovery order and Prompt semantics, not production latency or
capacity.

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
2. Complete the representative Brand 4-by-5 Integration Gate under Issue #39
   using the accepted Query Definition, then route any independent parsing,
   synthesis, latency, or report finding back to its owning Issue rather than
   reopening Query design.
3. Validate SSE proxy buffering and reconnect behavior in the named release
   environment, and remove or isolate F0-only HTTP, schema, and page probes,
   before a commercial deployment.

Do not use this document as a list of imagined future services.
