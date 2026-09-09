# Architecture Overview

- Status: S1-S6 evaluation behavior, AI-generated Query preparation, the Media
  Supply backend foundation, Identity and Access, Brand writing information,
  protected Evaluation guidance reads, and the GEO Optimization customer
  workspace are integrated after one
  fictional real 4-by-5 Worker evaluation, authenticated customer-report
  inspection, fixed-revision review, and product-owner confirmation. Production
  activation and commercial customer data remain separate gates.
- Entry condition: Approved product foundation and bounded first product slice
- Decision history: [`define-application-architecture`](../../openspec/changes/archive/2026-08-25-define-application-architecture/proposal.md)
- Completed change: [`deliver-first-evaluation-slice`](../../openspec/changes/archive/2026-08-31-deliver-first-evaluation-slice/proposal.md)
- Completed change: [`integrate-real-evaluation-providers`](../../openspec/changes/archive/2026-09-01-integrate-real-evaluation-providers/proposal.md),
  coordinated by [Issue #4](https://github.com/ZETAVI/GEOEval/issues/4) and
  [PR #20](https://github.com/ZETAVI/GEOEval/pull/20)
- Current Identity contract:
  [`identity-and-access`](../../openspec/specs/identity-and-access/spec.md), with
  durable rationale in [ADR 0004](adr/0004-server-authoritative-identity-and-access.md)
- Completed change: [`implement-ai-query-generator`](../../openspec/changes/archive/2026-09-04-implement-ai-query-generator/proposal.md),
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

GEO Optimization owns immutable WriterInputSnapshot records, idempotent
ArticleGeneration execution, and at most one current CoreArticle per Brand. It
consumes only the Brand Writer-purpose projection and Evaluation Report's latest
accepted guidance service, freezes the actual versioned Writer Request, and runs
Writer outside database transactions. The current Adapter is deterministic and
local/test-only; unknown modes and deterministic production composition fail
closed. Article replacement, explicit save, confirmation and Future Order reads
use exact revisions, while Brand/guidance freshness remains advisory. A
terminal-customer combined read and explicit REST commands support one responsive
Web journey; the client receives neither Writer/Snapshot internals nor contact
facts. Real Writer, materials, real payment, deployment and production
activation remain separate gates.

Identity and Access owns fixed single-role Accounts, mobile Challenge lifecycle,
opaque server-side Sessions, declarative HTTP access, administrator account
governance, append-only governance audit, and one-time offline first-
administrator Bootstrap. Every account has exactly one of terminal customer,
operations, administrator, or agent; customer and internal role families never
convert, while controlled internal-role changes revoke all existing Sessions.
PostgreSQL is the sole authority for account status, current role, Session
expiry/revocation, the last-administrator invariant, Bootstrap control, and
audit. Redis, Cookie content, Web routing, and business modules do not own
authorization truth.

The NestJS API authenticates by default through one global fail-closed access
boundary. Controllers explicitly mark public routes or required fixed roles and
consume only a narrow current principal. State-changing browser requests also
require JSON, the application header, and an exact configured Origin. The Web
maps the returned role to `/brands`, `/admin`, `/operations`, or `/agent`, but
that mapping grants no backend authority. Real SMS, production migration,
Bootstrap execution, second-administrator readiness, monitoring, deployment,
and activation remain separate release gates documented by the
[Identity operations runbook](../operations/identity-and-access.md).

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

After a successful create, update, or selection of a current evaluation-ready
Brand, Web opportunistically asks GEO Intelligence to ensure the durable
preparation before returning control to the customer; the model work continues
in Background Work and never extends the Brand transaction. Incomplete or
non-current Brands do not prewarm. A failed prewarm does not fail the completed
Brand mutation, and the diagnosis page remains the authoritative idempotent
ensure-and-observe path. This improves perceived latency without making Brand
Knowledge publish a new event or depend on GEO Intelligence.

Media Supply owns the global administrator-maintained platform catalog in
PostgreSQL: stable platform identity, fixed multi-category membership,
one first-release availability state and whole-point price per platform,
optional concrete resources, one current internal supplier per resource, public
catalog revision, and administrator audit. Each supplier is a globally reusable
`MediaSupplier`; each resource stores one resource-owned two-state decision while its
effective availability is derived from that decision and supplier status.
Supplier/resource association counts are queried rather than stored, and both
owners use optimistic concurrency plus guarded non-cascading deletion. Media
Supply declares its administrator requirement through the Identity-owned access
contract; only administrators mutate media facts.
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
processing does not depend on HTTP controllers or access guards. The current
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
accepted platform routes. Per-sample interpretation uses Model Studio Qwen3.8
Flash for attempts one and two with `low` reasoning effort, then TokenHub Hy3 as
the third-attempt fallback. Query generation and overall synthesis keep Qwen3.8
Flash at `medium` because they own broader generative judgment.

Semantic provider contracts are deliberately smaller than the canonical GEO
contracts: models return evidence-linked semantic facts, while deterministic
projectors assign internal IDs, retain only literal answer anchors, remove
unsupported optional observations or other brands, normalize incomplete
optional positions to no position, retain ungrouped brand mentions, and run the
existing strict domain validation before acceptance. Target mention and
open-query position remain hard evidence boundaries; the projector does not
fuzzy-match or invent either. Parser instructions and their provider-facing
schema require concise formal customer card prose. The same projector replaces
only a card value with no letter or numeral, using already accepted mention and
open-position facts; readable prose passes through, and the report projection
does not maintain a second hiding rule. Default parser and synthesis calls do
not use web search. Overall
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

The Query-only quality review then accepted one shared Prompt across an
advertising service company, a law firm, and a restaurant. The real browser
path verified Amap selection, frozen Brand projection, durable preparation,
Qwen execution, and final Web display. Exact frozen-projection replays passed
Qwen3.8 Flash for all three types and Hy3 for the restaurant fallback. Together
with the earlier recovered timeout, this supports the existing recovery order
and Prompt semantics, not production latency or capacity.

Direct-question parser projection tolerance is owned by
[#32](https://github.com/ZETAVI/GEOEval/issues/32). Its projector may discard
unsupported optional observations, other-brand records and optional positions,
but an open rank without resolvable position evidence remains rejected. Earlier
protected-output replay demonstrated the value of optional-detail cleanup but
used a broader target-position recovery path and is not reused as an exact
acceptance count for the final projector. Four low-reasoning Parser-only real
calls on the earlier model contract were accepted on their first attempt at
about nineteen seconds average latency; the latest contract and final integrated
4-by-5 remain separately unverified. The 17/20 report boundary is unchanged.

Publishing Commerce begins with administrator-maintained random packages and
customer-safe offer visibility. Package configuration, explicit platform scope
and administrator audit save atomically with expected revisions. Media Supply
continues to own platform buyability; a batched quote read derives package
availability without resource counts or copied status. Scope foreign keys join
the Media-owned deletion gate. Its current boundary is specified by
[`publishing-commerce`](../../openspec/specs/publishing-commerce/spec.md).
Point accounts now own zero-initialized balances, granted-only administrator
adjustment and append-only account-sequenced history. Identity provides a narrow
terminal-account directory; Commerce does not query role tables. One wallet lock
serializes request replay checks, balance bounds and ledger insertion in the same
transaction. Customer projections expose one balance and public reasons only.
An actor-bound pending tab request survives an interrupted response/reload and
reuses its key; tab storage is not financial truth.
The Commerce-owned `CommercePointsModule` assembles these existing controllers
and providers and exports only `PointAccountService`. A points-only consumer
imports it without the Publishing/Delivery/Media/GEO graph; root-global Identity
and Persistence still provide their existing dependencies. Publishing Commerce
imports the same module rather than declaring duplicate services or routes.
This does not introduce a separate wallet owner or a real-payment writer.
One saved selection per account/Brand now uses a revision-conditional write and
composite article-owner reference. Commerce reads the minimal GEO Optimization
preview and Media quote interfaces to build an advisory current quote; catalogue
IDs in unpaid intent are not reservations. The customer explicitly saves or
discards edits, sees both publishing modes and shortage, and can return without
losing the saved choice. Independent quote reads cannot authorize a debit.
Final purchase now uses one Commerce transaction adapter and transaction-bound
article/media readers, following [ADR 0005](adr/0005-atomic-publishing-purchase.md).
Wallet → selection → article → optional package → sorted platform locks keep
accepted contents/terms coherent. Same-key success is recovered first; exact
confirmation/terms checks, granted-first spending, order/ledger creation and
selection consumption commit together. The cleared selection retains its next
monotonic revision. Order article/terms are frozen; source identities and a unique
spending relationship use restrictive references, not cascading deletion.
Customer pages separately confirm the charge, retain uncertain requests across
reload, and show owned pending orders plus linked point history. The current
article can evolve without changing its purchased snapshot. Real payment and
commission retain independent activation boundaries; no speculative
general-purpose transaction framework is introduced.

Publication Delivery now owns minimal order admission and responsibility. Its
transaction-bound adapter initializes the unique aggregate during purchase,
under [ADR 0006](adr/0006-initialize-delivery-with-purchase.md). Identity-owned
same-connection reads protect assignment roles; Delivery serializes claim,
explicit start, unstarted return and administrator reassignment with revision
and atomic audit. The API composition service combines its authorized view with
Commerce's immutable facts, without reverse calls or shared private-table reads.
Customer status comes from Delivery; Commerce's old placeholder column is
retired. Sparse work items now retain separately validated current preparation
and publication result values. A short aggregate transaction serializes work,
effective-result count, normal completion and auditable correction. Preparation
runs outside transactions through an async-capable port, with Identity and
revision fences rechecked before save; no real provider or new background-work
engine is introduced. Customer result subroutes reuse Commerce ownership and
return only public projections. Delivery also owns manually saved agreements,
effective precise replacements, irreversible remaining-work stops and their
before/after audit. An operator's zero-point termination closes without touching
the wallet. Positive agreements stay in a separate administrator queue even when
publication is Completed; settlement eligibility follows finished or stopped work.

For positive returns, the root composition binds Identity → Commerce wallet →
Delivery locks on one connection. Commerce's narrow order-return adapter restores
the original consumption sources under reservation-aware capacity, then Delivery
records the same settled-ledger reference and, only for termination, Closed.
Actor-bound exact requests recover successful writes; ledger, wallet, fulfilment
and audit commit together. Composite references and deferred final-graph checks
enforce the cross-owner stored relationship without letting either owner write
the other's private tables. A return ledger/request is immutable. This extends
the existing explicit transaction seam, not an approval engine, second wallet,
generic refund framework or payment-channel action. Current behavior is owned by
[Publication Delivery](../../openspec/specs/publication-delivery/spec.md) and
[Publishing Commerce](../../openspec/specs/publishing-commerce/spec.md).

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
