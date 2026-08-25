# Design: GEOEval Application Foundation

- Status: Exploration
- Change: [`define-application-architecture`](proposal.md)
- Current frontier: Application-stack proposal and architecture confirmation

## Review contract

This design must implement the accepted [product specification](../../specs/product-definition/spec.md)
without redefining it. The current [architecture overview](../../../docs/architecture/overview.md)
owns accepted architecture after reconciliation; this file owns only the design
being considered by this change.

## Stable product facts

- One account has one role; agent attribution is a separate account-level
  relationship.
- One customer account may own several independent brands, while points remain
  account-level.
- Evaluation runs and reports retain immutable input and question snapshots.
- A paid publishing order retains the confirmed article and purchased commercial
  commitment; later catalog changes do not rewrite it.
- The live media catalog, commercial package and price configuration, paid-order
  snapshot, and historical publication result have different lifecycles.
- Point changes, agent commission, and withdrawals require traceable financial
  records rather than editable totals.
- Notifications expose role-relevant outcomes; technical diagnostics remain
  controlled and separate.

## Decision map

| Decision | Prerequisite | Status | Downstream effect |
| --- | --- | --- | --- |
| Capability decomposition and one durable-data owner per concept | Approved product specification | Decided: capability-first | Determines module seams, product-design ownership, and parallel work packages |
| First capability map and durable concept ownership | Capability-first decomposition principle | Decided: lifecycle-driven modular map | Determines which lifecycles belong together and which boundaries need public contracts |
| Cross-capability dependency direction and public contracts | Capability owners | Decided for the first evaluation slice and paid-order contract; later contracts remain slice-bound | Determines allowed calls, integration tests, and refactoring boundaries |
| Lifecycles, snapshots, ledgers, and consistency boundaries | Capability owners and collaboration modes | Decided for the first evaluation slice and paid-order boundary; later journeys remain slice-bound | Determines transaction and concurrency design |
| Role permissions, sensitive-data, errors, notifications, logs, and observability ownership | Capability owners and data classes | Decided: fixed roles, purpose views, and separated business/technical outcomes | Determines shared platform responsibilities and security review |
| External provider, payment, storage, and realtime contracts | Capability boundaries plus primary-source and controlled account evidence | First-slice official-source brief complete; controlled-account validation pending | Determines adapters, failure isolation, cost, and exit boundaries |
| Application stack and deployment shape | All preceding architecture constraints | Decided: TypeScript modular monolith with Next.js web and one NestJS backend deployed as separate API and worker processes; foundation spike pending | Determines implementation plan rather than product meaning |
| Internal layering and abstraction threshold | Application stack, capability owners, and collaboration levels | Decided: layered capability modules, bounded orchestration, ports/adapters, selective read composition, and layered frontend | Determines maintainability without creating framework ceremony or generic middle layers |
| Minimum operational and quality baseline | Application stack, first-slice contract, and failure boundaries | Decided: environment separation, explicit migrations, tested recovery, validated secrets, runtime health, duplicate-safe work, correlated observability, layered verification, and bounded foundation spike | Determines implementation authorization and release evidence without selecting every production product upfront |

## Confirmed decomposition principle

The application is organized first around stable business capabilities and
their owned records. Customer, operations, administrator, and agent experiences
compose those capabilities according to their permissions; pages and roles do
not become competing owners of brand, evaluation, order, media, fulfilment, or
financial state.

Architecture patterns and framework conventions must serve the accepted product
meaning and actual boundary pressures. A pattern is not adopted merely because
it is common, and this capability map does not imply microservices, deployable
units, code directories, or final navigation one-for-one.

## Business architecture model

The product contains four connected but independently governed chains. These
chains, rather than individual pages or requirement headings, reveal the stable
module seams.

1. **Evidence chain:** current brand facts become a fixed evaluation definition,
   platform evidence, interpreted findings, and reusable optimization guidance.
2. **Content chain:** current brand knowledge and evaluation guidance become one
   customer-confirmed core article, then order-bound publication variants.
3. **Commercial delivery chain:** live media supply becomes a purchased
   commitment, operational work, and customer-visible publication evidence.
4. **Value chain:** renminbi payment becomes points, order consumption or return,
   eligible agent commission, and eventually a reviewed payout.

The product's most important trust boundary is between observation and
intervention: an evaluation records what external AI platforms returned, while
the paid service guarantees controlled content and publication work rather than
a later AI-platform outcome. The architecture must preserve this distinction in
data ownership, language, and user-visible history.

## Proposed modular domain map

The refined map separates experience composition, business domains, shared
technical capabilities, and read projections. A domain may contain several
modules, but each durable record still has one write owner.

### Experience composition

Customer, operations, administrator, and agent applications invoke business
use cases and read role-appropriate projections. They do not own independent
copies of business state. In particular, there is no administrator domain,
operations domain, or generic system-management module: those are role-specific
views over capabilities owned elsewhere.

### Differentiating value domains

| Domain | Internal modules | Ownership boundary |
| --- | --- | --- |
| GEO Intelligence | Evaluation Definition; Evidence Acquisition; Evidence Interpretation; Report | Owns the evaluation-input revision, fixed question and platform snapshots, run and sample identities, parser output, cross-sample synthesis, report, and optimization guidance. Provider calls are delegated to AI Execution, while sampling validity and report meaning remain here. |
| Optimization Studio | Article Workspace | Owns the one current editable core promotional article, its generation attempts, edits, regeneration, and customer confirmation until order submission. It consumes current brand knowledge and the latest usable optimization guidance but never rewrites them. |
| Media Supply | Media Catalog; Publishing Offer | Owns live media facts and availability separately from sellable random packages, precise prices, and eligibility rules. A paid order receives a snapshot; later catalog or offer changes do not rewrite the commitment. |
| Publication Delivery | Fulfilment Assignment; Publication Production; Publication Work; Publication Evidence | Owns exclusive order claiming, order-bound article variants, one work item per purchased publication unit, operational state, exceptions, and publication results. Variants live here because they are fulfilment artifacts, not new customer-approved core articles. |

These domains carry GEOEval's distinctive product knowledge and company-resource
advantage: converting external AI evidence into understandable direction,
turning that direction into content, and using managed media supply to produce
visible delivery evidence. They deserve the strongest product attention,
domain-specific tests, and observability.

### Business-enabling and trust-control domains

| Domain | Internal modules | Ownership boundary |
| --- | --- | --- |
| Brand Knowledge | Brand Portfolio; Brand Profile; Material Knowledge | Owns the current editable brand truth, current-brand selection, archive state, source-material associations, and the prepared material digest. File bytes belong to the asset platform, but their business meaning and digest lifecycle belong here. |
| Identity and Access | Account; Authentication; Authorization | Owns account identity, the single account role, activation and access state. Agent attribution is deliberately excluded because it is a commercial relationship, not identity. |
| Publishing Commerce | Publishing Order | Owns the paid agreement, confirmed-article snapshot, media or package and price snapshot, point requirement, agent and commission-policy snapshot where applicable, customer-visible order lifecycle, and agreed return decision. It does not own operational work items or live media configuration. |
| Customer Value | Point Wallet; Recharge and Payment; Recharge Invoicing | Point Wallet owns the unified whole-number balance and append-only funded/granted composition ledger. Recharge and Payment owns payment orders and confirmations. Recharge Invoicing owns the invoice request lifecycle. These modules collaborate through explicit financial postings rather than editing one another's totals. |
| Partner Channel | Agent Attribution; Customer Portfolio | Owns the current account-level customer-agent relationship and the agent's authorized customer/brand hierarchy. Portfolio statistics and progress are projections over source domains, not copied operational ledgers. |
| Agent Settlement | Commission Policy; Commission Ledger; Payout Profile; Withdrawal | Owns the current commission policy, pending/effective/reversed commission entries, available/frozen balances, sensitive payout instructions, withdrawal snapshots, review, failure, and completion. Publishing Commerce captures the applicable policy on an order; settlement later consumes that snapshot with fulfilment and point-origin facts but does not own customer points or attribution. |
| Notification Center | Notification Record; Role Delivery Policy | Owns durable role-targeted notification records and read state. Source domains own the underlying event and action; the notification only explains the result and links back to its owner. |

These domains protect promises, money, authority, and sensitive information.
They are separated from the value-core domains because their invariants,
permissions, audit requirements, and correction paths evolve differently.

### Shared technical capabilities

| Capability | Responsibility and prohibition |
| --- | --- |
| AI Execution | Provider-neutral invocation, model routing, retry and fallback execution, technical attempt correlation, tracing, and usage. It returns the complete provider result to the owning domain but does not become the durable owner of customer-visible raw evidence or decide evaluation validity, report semantics, brand truth, or article lifecycle. |
| Asset Service | File storage, scan, retrieval, replacement, retention, and access control. It does not own the prepared digest or decide how a business module uses a file. |
| Business Event Delivery and Background Work | Reliable handoff, idempotent background execution, scheduling, and realtime fan-out. It carries domain facts but does not become their source of truth or a universal workflow engine. |
| Security, Audit, and Observability | Shared enforcement, immutable audit evidence where required, controlled diagnostics, metrics, and traces. Technical logs do not become user notifications. |

Business configuration stays with the domain whose behavior it changes: media
availability and prices stay in Media Supply, evaluation platform policy stays
in GEO Intelligence, the live commission policy stays in Agent Settlement and
is snapshotted by Publishing Commerce, and point adjustments stay in Customer
Value. A generic configuration module must not become a back door for mutating
unowned business state.

### Read models and role homes

Homes, dashboards, customer order progress, agent portfolios, and administrative
statistics may use purpose-built read models assembled from domain events or
public queries. These projections may duplicate display data for clarity and
performance, but they are disposable and never accept authoritative writes.
Empty-state experiences remain valid views rather than invented zero-valued
business records.

## Lifecycle and record classes

| Record class | Examples | Governing rule |
| --- | --- | --- |
| Current mutable truth | account access state, current brand profile, live media entry, live publishing offer, payout profile | One module may change it; material changes are audited where required. |
| Immutable snapshot | evaluation input and questions, platform set, completed report and optimization guidance, confirmed article and commercial terms on an order, withdrawal payout details | Created at a business boundary and never rewritten by later source changes. |
| Append-only ledger | point changes and funded/granted composition, commission postings and reversals | Corrections use compensating entries; displayed balances come from or reconcile to the ledger. |
| Stateful workflow | evaluation run, recharge, invoice request, publishing order, fulfilment work item, withdrawal request | Explicit allowed transitions, idempotent commands, terminal states, and controlled exception handling. |
| Derived projection | report visualizations, role homes, agent portfolio statistics, and order progress summaries | Rebuildable from owner data or events; never the mutation authority. A notification is instead its own durable role-delivery record linked to an owner event. |

This classification prevents versioning every editable field while still
preserving the exact evidence, paid promise, and monetary history that must not
drift.

## Initial dependency direction

The following direction is proposed for the next contract round:

1. Experiences depend on application use cases, not domain storage.
2. Brand Knowledge supplies snapshots to GEO Intelligence and current writing
   facts to Optimization Studio.
3. GEO Intelligence supplies only approved optimization guidance to
   Optimization Studio; complete reports and raw samples are not writing input.
4. Optimization Studio supplies a confirmed core-article snapshot to Publishing
   Commerce. Publication Delivery creates and owns later variants.
5. Media Supply supplies current offers to selection and immutable commercial
   snapshots to Publishing Commerce.
6. Publishing Commerce requests a point posting from Customer Value and creates
   the paid commitment; Publication Delivery consumes that commitment without
   reaching into wallet or live-price state.
7. Publication Delivery reports fulfilment facts to Publishing Commerce. Agent
   Settlement consumes finalized order, funded-point, return, attribution, and
   commission-policy facts through explicit contracts.
8. Notification Center and read projections consume business events; they do
   not call back to mutate source domains.

The exact synchronous transaction and asynchronous-event boundaries remain an
open decision. The logical modules do not require one deployable service each.
Unless later scaling, isolation, or team-ownership evidence contradicts it, a
modular monolith with separately executable background workers should be the
default deployment candidate rather than premature microservices.

## Collaboration and consistency levels

Logical decoupling is preserved only when collaboration matches the business
consistency requirement. GEOEval should not force every interaction through one
universal service, transaction, or event pattern.

| Level | Use when | Collaboration form | Initial GEOEval examples |
| --- | --- | --- | --- |
| L0: module-local invariant | One owner can decide and commit the complete rule | Domain command plus one owner-local transaction | change a brand profile; append and balance one point posting; transition one publication work item |
| L1: synchronous owner contract | A caller needs an immediate authoritative decision or immutable input from another owner | Small command or snapshot query through a public module interface | obtain the current brand writing facts; request the current sellable offer; validate account access |
| L2: cross-module atomic use case | Several owner-controlled writes must either all become visible or none may become visible | A use-case-specific application coordinator invokes public module operations inside one controlled transaction when the deployment permits it | create a paid publishing order together with its article/commercial snapshots and successful point debit |
| L3: reliable asynchronous reaction | The source fact is already committed and followers may catch up without invalidating it | Domain event recorded with the source commit, reliable delivery, idempotent consumer, and retry | evaluation completion creates a notification; paid order enters the operations pool; publication result refreshes customer progress |
| L4: long-running process | External calls, human work, waiting, timeout, or compensation cross request boundaries | Explicit state machine or narrowly scoped process manager with correlation identity, idempotency, retry, timeout, and compensating action | evaluation sampling and parsing; payment confirmation; seven-day fulfilment; invoice handling; withdrawal review and offline transfer |
| L5: read composition | Several modules must be presented together but no cross-owner write is needed | Public queries or rebuildable projection optimized for a role and screen | customer service home; order progress; operations statistics; agent customer portfolio and commission detail |

L2 is intentionally narrow. A modular monolith may use one physical database
transaction for a high-risk business commit without allowing one module to
reach into another module's tables. The coordinator depends on module contracts;
each module still owns its validation and writes. If deployment boundaries later
separate, this use case must be redesigned explicitly rather than silently
assuming a distributed transaction.

L3 and L4 are also distinct. An event states a fact that already happened; a
process manager tracks a specific multi-step business journey. Neither should
become a generic workflow engine containing the rules that belong to Brand
Knowledge, GEO Intelligence, Publishing Commerce, Customer Value, Publication
Delivery, or Agent Settlement.

## Initial consistency policy

### Strong consistency is required for owner invariants

- one completed official evaluation for one unchanged evaluation-input revision;
- non-negative point balance and exact funded/granted composition after a posting;
- paid-order creation, captured commercial promise, and point debit as one
  customer-observable success or failure;
- one exclusive operations owner for a claimed order;
- at most one valid publication result for one work item;
- commission available/frozen balances and withdrawal reservation.

### Eventual consistency is acceptable for derived visibility

- homes, dashboards, statistics, and agent portfolio summaries;
- notification delivery and read-side refresh;
- search or filter indexes;
- customer order-progress projections after a committed fulfilment result;
- observability data and AI usage views.

Eventual does not mean best effort: material events require durable recording,
idempotent consumption, retry, and a reconciliation path. It means a short,
observable delay is acceptable because the source record remains authoritative.

### External systems require evidence and compensation, not false atomicity

AI providers, payment channels, media publication sites, mail delivery, and
offline bank transfer cannot participate in the application's local transaction.
Their workflows retain request identity and evidence, distinguish unknown from
failed outcomes, retry only safe operations, and use a business compensation or
manual intervention path when the external result cannot be made atomic.

## Boundary enforcement rules

- A module may write only its owned records; foreign identifiers are references,
  not authority to mutate foreign state.
- Cross-module commands express business intent, queries return purpose-specific
  snapshots, and events use completed facts in past tense.
- Mutation code may not join another module's private tables. Read projections
  may combine owner-approved data but remain non-authoritative.
- Shared database access, generic repositories, mutable global caches, and a
  catch-all event bus API must not bypass module contracts.
- Every asynchronous or externally retried consumer handles duplicate delivery
  and records enough correlation evidence to diagnose partial progress.
- Material cross-module contract tests protect business inputs, outputs, errors,
  idempotency, and authorization without freezing private implementation.

## Minimum first-release baseline

The initial architecture enforces only rules whose absence would create shared
mutable state, duplicate money movement, broken paid promises, or
non-diagnosable long-running work.

1. **Owner-only writes:** a module changes only its own durable records. Other
   modules call a public business operation rather than importing a foreign
   repository or updating a foreign table.
2. **Explicit consistency for material journeys:** only journeys involving
   money, a paid promise, immutable evidence, external effects, or long-running
   work must name an L0-L5 collaboration level before implementation.
3. **Idempotent consequential commands:** payment confirmation, point posting,
   paid-order submission, publication-result recording, commission posting, and
   withdrawal processing cannot create a second effect when safely retried.
4. **Snapshots at commitment boundaries:** evaluation completion, paid-order
   creation, and withdrawal submission preserve the inputs whose later change
   must not rewrite history.
5. **Events only after owner commit:** a material asynchronous reaction begins
   from a durably recorded source fact; notification or background-work failure
   cannot roll back a business result that already succeeded.
6. **Explicit states for long work:** evaluation, payment confirmation,
   fulfilment, invoicing, and withdrawal distinguish active, successful,
   exceptional, and terminal outcomes without exposing technical retry states
   as customer language.

The first release does **not** require a database, schema, process, or network
service per module; an interface for every class; event sourcing; full CQRS;
an event for every field edit; a generic workflow engine; a Saga for a use case
that can safely use one local transaction; or formal architecture paperwork for
ordinary owner-local CRUD. These patterns may be introduced only when a real
boundary or operational need earns them.

## First confirmed cross-module collaboration: paid publishing order

Submitting a paid publishing order is the first contract to design because it
joins the customer-confirmed article, live media offer, points, agent context,
commercial promise, and later fulfilment. The customer must never receive an
order without the corresponding point debit or lose points without the order.

### Responsibilities

| Participant | Contribution | Must not do |
| --- | --- | --- |
| Application coordinator | Authorizes the use case, supplies one submission identity, and coordinates the L1 reads and L2 commit | Own order, wallet, article, media, or agent records |
| Optimization Studio | Supplies the confirmed core-article snapshot for the current account and brand | Decide price or debit points |
| Media Supply | Supplies a versioned package or precise-selection price snapshot and confirms final availability at commit | Reserve an unpaid price indefinitely or create the order |
| Partner Channel | Supplies the current account-level attribution, if any | Calculate commission or gain commercial authority over the customer |
| Agent Settlement | Supplies the current applicable commission policy | Create commission before a paid-order fact exists |
| Customer Value | Validates the unified balance and appends one idempotent debit with funded/granted composition | Create or mutate the publishing order |
| Publishing Commerce | Owns the order identity, paid commitment, snapshots, debit reference, and customer-visible initial state | Mutate wallet entries, live media configuration, or fulfilment tasks |

### Confirmed commit boundary

1. The command carries the customer account, brand, confirmed article,
   publishing selection, and one submission identity used for duplicate-safe
   retry.
2. The coordinator obtains purpose-specific, versioned L1 snapshots and
   authorization. At final submission, Media Supply confirms the selected offer
   is still eligible and unchanged, and the applicable commission policy is
   captured from its owner rather than trusted from an earlier page view.
3. One L2 transaction includes those owner assertions, asks Customer Value to
   post the debit, and asks Publishing Commerce to create the paid order with
   the article, commercial, attribution, commission-policy, and point-origin
   snapshots. The offer assertion, debit, and order either commit together or
   none does. Whether this is enforced by a lock, optimistic version check, or
   another database mechanism remains an implementation decision.
4. The transaction makes no AI-provider, payment-channel, notification, or
   media-site call. Those systems cannot improve the atomic guarantee and would
   extend lock time or produce unknown outcomes.
5. After commit, reliable L3 events may place the order in the fulfilment pool,
   create pending commission information, refresh read projections, and notify
   relevant roles. Each consumer is idempotent and can recover independently.

### Customer-visible failure boundary

- insufficient points: no order and no debit; preserve the reviewed selection
  so the customer can recharge and return;
- changed price, disabled media, or ineligible precise selection: no debit and
  no order; return to review with the changed item identified;
- repeated submission caused by double-click, timeout, or safe retry: return the
  existing result for the same submission identity rather than creating another
  debit or order;
- downstream notification or fulfilment-pool delay after commit: the paid order
  remains valid, the delay is observable internally, and reliable delivery is
  retried without charging again.

This contract intentionally stops before database locks, table design, API
shape, framework middleware, or event technology. Those implementation choices
must satisfy the contract rather than redefine it.

## Architecture delivery strategy

GEOEval should make architecture progressive without making it improvised. The
working rule is: **stabilize boundaries before development, then refine
reversible implementation detail through vertical business slices.**

### Stabilize before implementation begins

The initial application foundation is ready to implement only when these
cross-project decisions are sufficiently stable:

- module ownership and prohibited dependency directions;
- the minimum consistency, snapshot, ledger, idempotency, and long-process
  baseline;
- account-role, permission, and sensitive-data boundaries;
- current primary-source and controlled-account evidence for external systems
  used by the first slice;
- the smallest application stack and deployment shape able to enforce the
  approved boundaries;
- one complete first-slice contract with user-visible success, failure, and
  verification evidence.

This does not require completing the data model, API catalog, event catalog, or
failure matrix for the whole product before code starts.

### Refine one vertical slice at a time

Before implementing a material slice, record only:

1. the user or operator outcome and non-goals;
2. participating modules and the owner of each write;
3. lifecycle states and required snapshots or ledgers;
4. its L0-L5 collaboration and consistency levels;
5. important failure, idempotency, permission, and acceptance boundaries.

Implementation then chooses the simplest local tables, contracts, locks,
events, workers, and adapters that satisfy that slice. Focused tests and runtime
evidence expose mistaken assumptions. The design is updated when that evidence
reveals a durable boundary; private implementation remains in code and tests
rather than being duplicated into architecture documents.

### Promote only durable decisions

A decision needs explicit architecture review or an ADR when it changes a data
owner, public cross-module contract, money or paid-promise invariant, sensitive
data boundary, external dependency, deployment boundary, migration strategy, or
rollback risk. Reversible owner-local choices such as helper shape, internal
query style, naming, and small refactoring patterns stay with the implementing
module and normal code review.

### Keep enforcement lightweight

Once the stack exists, automated checks should target only costly drift:

- dependency rules prevent imports of another module's private implementation;
- migration and repository conventions make record ownership visible;
- focused contract tests cover material cross-module calls;
- idempotency, ledger, snapshot, and state-transition tests cover consequential
  journeys;
- architecture review is triggered by boundary changes, not every pull request.

This produces enough architecture before coding to avoid foundational rework,
while letting real implementation evidence shape details. It also keeps the
active architecture change bounded: the team does not need to finish every
future module contract before starting the first approved vertical slice.

## Objective architecture assessment

The refined design has materially better cohesion and lifecycle fit than a
page-, role-, or requirement-shaped decomposition. Its main advantage is not the
number of modules but the separation of change reasons: report evidence, article
editing, live media supply, a paid promise, operational work, customer points,
channel attribution, and agent settlement can evolve without sharing one state
machine.

The design still carries three manageable risks:

1. **Vocabulary and boundary overhead:** too many tiny services would burden the
   first team. Keep these as logical modules and group deployment initially.
2. **Hidden database coupling:** a shared database can erase the design if code
   imports foreign repositories or writes foreign tables. Enforce dependency
   and ownership rules in code review, tests, and CI.
3. **Coordination drift:** overusing synchronous calls creates cycles, while
   overusing events weakens monetary and commercial consistency. Classify every
   collaboration against L0-L5 and document exceptions.

With these controls, the current map is a sound working architecture, not yet a
complete implementation architecture. Public contracts, exact transaction
boundaries for later slices, controlled external evidence, stack selection, and
the operational baseline remain subsequent approval gates.

## Deliberately rejected module shapes

- One module per role or page.
- One broad `user`, `order`, `finance`, `system`, or `common` module that owns
  unrelated lifecycles.
- A global administrator service that directly edits other modules' records.
- Treating AI agents as business owners; agents execute policies defined by the
  owning domain.
- Treating dashboards, notification feeds, or search indexes as write sources.
- Treating every internal module as a network service before an operational need
  is demonstrated.

## Macro system blueprint

The module map explains ownership but not the whole system. The first commercial
release needs one coordinated blueprint across customer experience, business
rules, AI execution, data, external systems, operations, and delivery quality.
The following views describe that whole without selecting implementation
products prematurely.

### Logical system layers

| Layer | Responsibility | Boundary |
| --- | --- | --- |
| Entry and experience | Public product entry plus customer, operations, administrator, and agent web experiences with a consistent role-appropriate shell | Organizes journeys and presentation; never owns duplicate business truth |
| Application coordination | Purpose-specific commands, queries, L2 coordinators, L4 processes, and role-aware response mapping | Coordinates owner modules; does not become a generic business-rules or workflow layer |
| Business domains | Brand Knowledge, GEO Intelligence, Optimization Studio, Media Supply, Publishing Commerce, Publication Delivery, Customer Value, Partner Channel, Agent Settlement, Identity and Access, and Notification Center | Own business rules, durable records, states, snapshots, and ledgers |
| Shared technical platform | AI Execution, assets, background work and event delivery, realtime delivery, security enforcement, audit, and observability | Provides reusable mechanics; cannot decide product meaning or mutate unowned business records |
| Data and evidence | Transactional owner records, immutable snapshots, append-only ledgers, raw external evidence, files, and rebuildable read projections | Preserve authority and history while allowing role-specific display models |
| External boundaries | AI and search providers, online payment, file storage, browser delivery, email, offline bank transfer, and manually operated media channels | Enter only through controlled adapters with evidence, credentials, failure isolation, and an exit boundary |

The expected dependency direction is experience to application use case to
business owner to technical port. Infrastructure and provider adapters implement
ports pointing inward; business modules do not import a provider SDK, frontend
state, or another module's private repository.

### Architecture areas and decision timing

| Area | Stabilize before first implementation | Refine with the owning slice |
| --- | --- | --- |
| Product and experience | public-versus-signed-in boundary, one role per account, shared current-brand context, role navigation principle, state and error language, responsive and accessibility baseline | final page composition, charts, motion, empty-state copy, and reusable components |
| Modules and contracts | domain owners, prohibited dependencies, L0-L5 model, first-slice contracts, paid-order and point-debit invariant | internal classes, local interfaces, later-slice commands and events |
| Data and history | account/brand resource scope, stable identities, owner-only writes, snapshot and ledger classes, time and whole-point semantics, archive-versus-delete principle | tables, fields, indexes, storage formats, locks, retention periods, and query optimization |
| AI-native execution | business owner for every AI purpose, structured input/output contract, retained raw evidence, validation, retry/fallback boundary, trace and cost identity, regression-evaluation requirement | prompts, Skills, model routes, token budgets, exact retry counts, quality thresholds, and provider-specific adapters |
| Background processes | which journeys are long-running, their owner states, idempotency and correlation rules, post-commit delivery principle | queue technology, scheduling values, worker concurrency, backoff, timeout, and capacity limits |
| Security and privacy | authentication trust boundary, role and resource authorization, sensitive-data classes, secret ownership, audit-triggering actions | session durations, field-level presentation, masking details, rate limits, and operational access procedure |
| External integrations | required capability, source evidence standard, adapter ownership, credential and failure boundaries, manual fallback | SDK, API version, quota, timeout, webhook, reconciliation, and vendor-specific configuration |
| Operations and reliability | environment separation, migration ownership, backup and restore expectation, health and readiness, business correlation, alert ownership, rollback gate | hosting product, resource sizes, scaling triggers, dashboards, alert thresholds, and retention values |
| Quality and release | contract, state, ledger, AI regression, browser, accessibility, migration, security, and real-business acceptance categories | exact test framework, fixture inventory, coverage targets, performance thresholds, and release automation |
| Delivery coordination | one writer for shared contracts, disjoint work packages, integration gates, evidence-based completion, commercial-release boundary | concrete assignees, worktrees, issue sequence, estimates, and calendar dates |

### AI-native subsystem baseline

GEOEval's agents are governed computations inside business domains, not
independent business owners. Query generation, provider sampling, sample parsing,
overall synthesis, material preparation, promotional writing, and publication-
variant writing therefore share a minimum execution envelope:

1. the owning domain creates an immutable purpose-specific input and execution
   identity;
2. AI Execution records or correlates the prompt or Skill version, model route,
   provider attempts, usage, latency, and trace identity, and returns the complete
   provider envelope so the owning business domain can persist its canonical raw
   evidence;
3. the result must pass a purpose-owned structured contract and semantic
   validation before it can affect business state;
4. retries and provider fallback are bounded and cannot create additional
   business samples, articles, postings, or work items;
5. raw evidence remains distinguishable from parsed interpretation and from
   customer-facing presentation;
6. a model or prompt change affects later executions and is exercised against a
   controlled regression set before replacing an important production route;
7. AI code cannot write arbitrary business records: the owning domain accepts or
   rejects a validated result through its own command.

Exact models, prompts, evaluation cases, thresholds, and tooling remain
purpose-specific decisions backed by current provider evidence. The shared
envelope exists to make quality, cost, failure, and historical meaning visible
across agents without forcing them into one universal prompt framework.

### Shared AI execution contract

AI Execution accepts an immutable purpose request from a business owner. The
request identifies:

- execution and business-correlation identity;
- owning capability, purpose, account and resource scope, and input-snapshot
  reference or hash;
- instruction, prompt, Skill, output-schema, route-policy, and configuration
  versions;
- requested capability such as web search or structured output, sensitivity
  class, bounded attempt policy, and cost-control context.

It returns a complete execution envelope containing each attempt identity,
provider and protocol, requested and returned model identity, search request and
observed use where available, timing, usage and provider cost evidence, result or
normalized technical failure, retry or fallback relationship, source metadata,
and the complete provider response required by the owner. This envelope is a
technical result. It cannot itself create a sample, report, article, point
posting, order, or publication record.

Every consequential purpose follows one acceptance pipeline:

1. transport and provider response are captured without rewriting evidence;
2. the expected shape or JSON Schema is validated;
3. the owning capability performs purpose-specific semantic validation;
4. only the owner accepts the result into its canonical business record and
   emits any resulting business fact.

A valid JSON object is therefore not automatically a valid rank parse,
evaluation synthesis, material interpretation, or article. Validation failures
may consume another bounded attempt or approved fallback but never create a
second business identity. Provider retries, parser retries, and a customer
evaluation retry remain distinct concepts with separate correlation.

### AI failure, cost, and regression boundary

AI Execution uses a small stable technical outcome taxonomy: configuration or
entitlement failure, authentication or authorization failure, quota or
rate-limit response, timeout or transport failure, provider rejection, invalid
or incomplete output, and exhausted retry/fallback. The business owner maps
these outcomes into its own lifecycle and user-safe action. Provider text and
technical retry counts never become customer wording.

The application records usage and cost in provider-native units together with a
normalized monetary estimate only when the required price inputs are known.
Unknown or delayed provider cost remains explicitly unknown and is reconciled
from the provider bill or console; it is never silently treated as zero. Cost
limits may stop a new attempt but cannot erase an accepted business result.

Each material AI purpose owns a small regression set containing input fixture,
expected semantic facts or bounded quality rubric, allowed nondeterminism, and
evidence reviewer. Query generation, sample parsing, overall synthesis,
material preparation, promotional writing, and publication-variant writing use
different purpose sets even though they share the execution envelope. A prompt,
Skill, route, model alias, schema, or semantic-validator change must pass its
purpose set before replacing an accepted production configuration. Exact cases,
thresholds, and expensive run frequency are confirmed with the owning slice and
controlled evidence.

Business records remain the source of truth. Structured logs and an
OpenTelemetry/Langfuse-compatible adapter may receive correlation, route,
timing, usage, cost, and masked quality metadata after or independently from the
owner commit. Full prompts, outputs, materials, contact data, or provider keys
are excluded from telemetry by default; any later duplication requires a named
purpose, access policy, retention period, and security approval.

### Macro deployment candidate

Before technology comparison, the smallest logical deployment candidate is:

- one web experience with clearly separated public and signed-in role areas;
- one modular application exposing business use cases and read endpoints;
- separately executable background workers for AI and long-running jobs;
- one authoritative transactional datastore with module-owned records;
- object storage for uploaded and large retained assets when required;
- reliable post-commit job or event delivery plus optional realtime browser
  delivery;
- centralized secret handling, audit, logs, metrics, traces, and AI usage
  correlation;
- provider adapters at the application boundary.

This is a shape to compare, not an approved stack. A cache, dedicated search
index, separate service, or additional datastore is added only when a measured
need cannot be met by the simpler shape.

### Confirmed application stack

The confirmed foundation uses one TypeScript workspace with two source
applications and three runtime processes: a Next.js web application, plus one
NestJS modular backend built once and started through API or standalone-worker
entrypoints. PostgreSQL remains the authoritative transactional datastore;
Prisma's current generally available major provides ordinary access and one
migration history with an explicit SQL escape hatch; BullMQ and Redis deliver
background work; SSE supplies recoverable browser updates; and files enter
through an S3-compatible asset boundary. Exact versions are pinned only after
the foundation spike and current compatibility check.

The foundation keeps the logical modular monolith intact: API and worker are
thin bootstraps over the same business owner modules, while Next.js owns
experience and presentation rather than becoming a second domain backend. The
web consumes a generated OpenAPI client and never imports backend entities or
database types. Queue and realtime state remain delivery mechanisms;
PostgreSQL owner records remain business truth.

Maintenance and delivery efficiency come from capability-local domain and
application layers, narrow public module surfaces, bounded cross-module
orchestration, ports and infrastructure adapters, selective read composition,
frontend feature and presentation layers, layer-matched tests, schema files
grouped by owner but one migration stream, and one backend artifact for two
processes.
The detailed comparison, evidence, rejected complexity, repository shape, and
spike gate are recorded in the [application-stack source brief](research/application-stack-options.md).

The stack is **confirmed but not implementation-authorized**. The first-slice
contract is now confirmed; the proposed operational and quality baseline,
controlled provider evidence, and the foundation spike remain gates.

### Confirmed internal code layering

The modular monolith uses two coordinated axes:

- **vertical capability ownership** decides which module owns a rule, record,
  lifecycle, snapshot, ledger, and public operation;
- **inward-pointing layers** decide how delivery, application coordination,
  domain rules, ports, and infrastructure collaborate inside or across those
  owners.

Within a material business module, inbound HTTP, job, or event adapters map an
external request to an owner application use case. The application layer owns
authorization intent, idempotency, transaction requests, use-case sequencing,
and outbound ports. The domain layer owns framework-independent invariants,
policies, and state transitions. Prisma, BullMQ, S3, provider SDK, and telemetry
adapters implement ports from the outside. Dependencies always point inward.

A purpose-named application coordinator is permitted for a material journey
that spans several owners. It may establish the transaction or long-running
process boundary and call public owner operations; it cannot contain their rules,
write their repositories, or own a parallel lifecycle. Integration events are
mapped from committed owner facts rather than leaking internal entities or
domain events directly to every consumer.

The coordinator authorizes entry to the composite use case, but each owner still
checks its resource, lifecycle, action, and purpose-view boundary. An L2 unit of
work is exposed as an application port and binds owner repositories to one
transaction; a Prisma handle never enters a domain object. Read composition uses
owner purpose queries or projections from published facts and cannot silently
join private write tables across modules.

Simple owner-local reference data does not need ceremonial aggregates, ports,
and pass-through classes. Full layering is earned when a module has meaningful
rules, history, money, permissions, AI interpretation, external effects, or
cross-module consistency. Even a collapsed simple module must preserve the
dependency direction and keep business decisions out of delivery and storage
adapters.

The Next.js application mirrors this discipline through route shells, page or
flow composition, feature use cases, presentation/API mapping, and an internal
design system. A generated OpenAPI client remains transport infrastructure; a
feature maps it into user-oriented state and errors rather than exposing backend
DTOs throughout components. Purpose-specific read services or projections may
serve reports and role homes, but writes always return to the owning application
and domain rules.

The complete repository shape, layer responsibilities, abstraction admission
rules, and test mapping are maintained in the
[application-stack source brief](research/application-stack-options.md). The
product owner confirmed this layered refinement on 2026-08-25. It does not alter
the confirmed technology stack or deployment shape.

### Dependency-aware delivery program

The first commercial release remains one complete product, but implementation
is integrated through sequential value waves with parallel preparation where
interfaces are stable.

| Wave | Integrated outcome | Main prerequisites |
| --- | --- | --- |
| 0. Architecture and engineering foundation | approved architecture brief, selected stack, environments, module skeleton, identity and security baseline, migrations, background execution, CI and verification foundation | macro blueprint, first slice, first-slice external evidence |
| 1. Evaluation value | terminal customer enters, manages current brand, completes one real evaluation, and sees the full report and notification | Wave 0; five evaluation routes; AI execution and report contracts |
| 2. Optimization value | customer completes article information and materials, receives and edits a core article, and confirms it for publishing | Wave 1 guidance contract; material preparation and writer capability evidence |
| 3. Commercial commitment | customer browses media, recharges, sees points, selects random or precise publishing, and creates the atomic paid order | Wave 2 confirmed article; maintained media and price data; merchant and payment readiness; point ledger |
| 4. Managed delivery | operations claims the order, creates variants, manages publication work, returns real results, and customer order state completes automatically | Wave 3 paid-order event and snapshots; operations workflow; real media process |
| 5. Channel and governance closure | administrators govern the system; agents see attributed customers and performance; commission, withdrawal, invoice, exception, and support paths close | stable order and fulfilment facts; sensitive-data and finance controls; operating inputs |
| 6. Commercial-release hardening | real paid closed loop passes security, backup, migration, cost, failure-recovery, responsive UI, accessibility, browser, operations, and release checks | Waves 1-5 integrated; real accounts, media, payment, support, and operating values |

This order is dependency-based, not a calendar promise. A later wave may start
isolated preparation earlier, but it cannot redefine or bypass an upstream
contract.

### Parallel preparation lanes

The following work can proceed before its integration wave when it has one
owner, a read-only or isolated scope, and an explicit evidence output:

- official provider and controlled-account research for evaluation, parsing,
  synthesis, writing, payment, storage, realtime, and observability;
- merchant application and payment onboarding, because external lead time may
  exceed code lead time;
- administrator-owned media catalog, package, price, support, commission,
  withdrawal, invoice, and bank-template operating inputs;
- the separate writing-Skill workstream and controlled quality evaluation;
- frontend visual language, responsive foundations, charts, accessibility, and
  role-shell exploration without treating prototypes as implementation truth;
- deployment, security, backup, CI, and observability experiments in isolated
  environments.

Parallel work becomes implementation only after its consuming contract is
approved. Shared specs, module contracts, design primitives, migrations, and
release records retain one reconciler.

### System-level gates

| Gate | Evidence required to pass |
| --- | --- |
| Architecture gate | approved module and data ownership, collaboration baseline, macro shape, first slice, permission and sensitive-data baseline, first-slice external evidence with retained later research gates, stack decision, quality and operational baseline |
| Slice gate | bounded outcome and non-goals, owners, lifecycle, collaboration level, failures, permissions, acceptance evidence, and implementation plan |
| Integration gate | public contract tests, migrations, end-to-end path, observable background behavior, error and recovery evidence, and no foreign-data mutation |
| Commercial gate | real five-platform evaluation, article, payment and points, paid order, fulfilment and publication result, applicable invoice and agent finance paths, all role boundaries, coherent responsive design, security and operational recovery without developer database intervention |

## Confirmed minimum operational and quality baseline

This baseline is the smallest safe platform contract before first-slice
implementation. It does not select every production service or require
production-scale infrastructure during the foundation spike.

### Environment and artifact boundary

- Use distinct local, automated integration, staging, and production
  environments with separate credentials, databases, queues, buckets, and
  external-provider configuration. Production data is not copied into ordinary
  development without an approved sanitization process.
- Build immutable web and backend artifacts from one reviewed lockfile. Promote
  the same artifact between deployable environments and inject runtime
  configuration where the framework permits it; never rebuild source merely to
  insert secrets.
- Validate required configuration at process startup with explicit public,
  server-secret, and optional categories. `NEXT_PUBLIC_` values are treated as
  published browser data. Credentials, raw tokens, and private connection values
  cannot enter client bundles, generated contracts, queue payloads, or logs.
- Begin with one web instance. A second instance is admitted only with explicit
  Next.js deployment-version, encryption-key, and cache-coordination behavior or
  evidence that the used features do not require it.

### Database, migration, and recovery boundary

- Keep one reviewed Prisma migration history and one release reconciler. Create
  migrations only in development; apply approved production migrations through
  an explicit deployment step before incompatible application traffic. API or
  worker startup cannot generate, reset, push, or silently reconcile schema.
- Prefer backward-compatible expand-and-contract changes when old and new
  artifacts may overlap. Every material migration states compatibility,
  expected lock or data risk, rehearsal evidence, and the recovery action. A
  code rollback is not described as a database rollback when the schema change
  is irreversible.
- Staging rehearses migrations against representative, non-production-sensitive
  data. A risky production migration requires a verified recent recovery point
  and an accountable go/no-go owner.
- PostgreSQL authority, required object assets, and operational configuration
  each have named backup and restore ownership. Before commercial release, the
  team restores disposable copies and verifies business invariants and asset
  references; backup creation alone is not acceptance evidence.
- Exact backup service, retention, RPO, and RTO are set before commercial launch
  from real business tolerance and provider capability. The architecture gate
  requires restorability and test ownership, not speculative numeric promises.

### Runtime, background work, and health boundary

- API and worker expose separate process identity, startup validation, graceful
  shutdown, and health evidence. Liveness means the process can make progress;
  readiness means it may accept its role's work. Worker heartbeat, outbox age,
  queue depth or lag, stalled work, and exhausted business retries are observable
  independently.
- Readiness checks only dependencies required to accept the next unit of work.
  External AI provider health is monitored through actual attempts and controlled
  probes but does not make the core API unready when customers can still sign in,
  read durable state, or receive an accepted background request.
- BullMQ is treated as at-least-once delivery under failure. Every consequential
  consumer rechecks a durable business idempotency identity and owner state.
  Queue cleanup, retry, redelivery, or Redis loss cannot authorize a duplicate
  business effect or erase the authoritative process state.
- Outbox and background delivery have a reconciliation path that can find
  committed-but-undelivered facts and safely resume them. The queue is never the
  sole record of an evaluation, notification, payment, order, or fulfilment
  lifecycle.

### Observability and diagnostic boundary

- Structured application records carry environment, service, deployment,
  request, actor where permitted, business correlation, job or execution cycle,
  and trace identities. Dynamic identifiers remain fields rather than creating
  unbounded event names or metric labels.
- Business outcomes, audit evidence, diagnostic logs, metrics, traces, and AI
  telemetry keep their confirmed ownership. Export is failure-isolated and
  cannot block an owner commit.
- Telemetry uses an explicit field allowlist and masking policy. Credentials,
  contact and financial data, raw uploaded materials, and full prompts or outputs
  are excluded by default; any later duplication of sensitive AI evidence needs
  a purpose, access boundary, retention value, and security approval.
- Minimum alerts cover process unavailability, migration failure, exhausted
  business work, sustained outbox or queue lag, restore or backup failure, and
  abnormal provider failure or cost. Exact thresholds follow measured baselines.

### Verification levels

| Level | Required evidence | Boundary protected |
| --- | --- | --- |
| Fast local | formatting, lint and type checks, focused domain/application tests, deterministic AI fixtures, and restricted-import checks | ordinary feedback and layer direction |
| Pull request | clean install and build, generated OpenAPI-client drift check, module contract tests, fresh-database migration, security/static checks, and affected integration tests | reproducible artifact, public contracts, migration history, and shared seams |
| Integrated slice | API and worker over disposable PostgreSQL and Redis, plus object storage only when the consuming slice requires assets; outbox and duplicate-delivery tests; SSE reconnect; role authorization; real browser responsive and accessibility checks | deployed process collaboration and customer journey |
| Controlled external | authorized provider calls with retained semantic results, exact route identity, search evidence, latency, failure, usage, cost, parser quality, and telemetry isolation | external capability and account-specific truth |
| Pre-release | staging promotion, representative migration rehearsal, disposable restore drill, rollback or forward-recovery exercise, security review, operational smoke, and real-business acceptance | commercial release and recoverability |

Not every pull request runs expensive providers or a full restore. The evidence
level follows the claim: deterministic fixtures protect routine behavior;
controlled and pre-release lanes prove the boundaries fixtures cannot establish.

### Foundation-spike gate

Before business-feature implementation, a bounded spike must prove:

1. one pinned workspace installs and builds the Next.js web and the NestJS
   backend once, and the backend artifact starts as API or worker;
2. the generated OpenAPI client is reproducible and drift is detected;
3. one reviewed migration stream applies to a fresh database through the
   production-style command, while development shadow state remains isolated;
4. an owner commit and outbox fact remain atomic, duplicate job delivery creates
   one business effect, and a restarted worker resumes from durable state;
5. SSE reconnect reloads durable state instead of depending on missed messages;
6. liveness, readiness, graceful shutdown, structured correlation, and telemetry
   exporter failure behave as designed;
7. startup configuration validation rejects missing private values and the built
   web artifact exposes no server secret; and
8. a disposable backup and restore recovers representative first-slice owner
   records and their invariants.

The S3-compatible adapter and asset-reference recovery join the evidence gate
when the material-owning optimization slice begins; the first evaluation slice
does not create a speculative file workflow merely to exercise the future port.

The [operational and quality source brief](research/operational-quality-baseline.md)
records the official evidence and remaining operational decisions. This baseline
was confirmed by the product owner on 2026-08-25. Exact commands enter
`AGENTS.md` only after they have executed successfully in this repository.

The macro blueprint prevents local delivery from silently redefining the whole
system. It is intentionally not a detailed project schedule, complete data
model, API inventory, provider selection, or UI specification.

## Role, resource, and sensitive-data baseline

Authorization is not derived from navigation visibility. Every consequential
request must satisfy five checks at the server boundary:

1. the account is authenticated and active;
2. its single account role permits the business action;
3. the account has the required ownership, current attribution, assignment, or
   governance relationship to the target resource;
4. the resource lifecycle permits the action;
5. the requested fields and purpose fit the sensitive-data policy.

Identity and Access supplies the authenticated account and role. The business
module that owns the target record decides resource scope and lifecycle. The
application use case coordinates these decisions; a frontend route, hidden
button, administrator page, or foreign database identifier never grants
authority by itself.

### Role and resource matrix

| Resource | Terminal customer | Operations | Administrator | Agent |
| --- | --- | --- | --- | --- |
| Account and access | manage own ordinary account details | own staff account only | activate, disable, assign the one role, and audit access through Identity and Access | own agent account and payout contact details |
| Brand profile | create, edit, select, and archive own eligible brands | read only the brand context required by a claimed order | controlled inspection for governance or support; no ordinary replacement of customer-owned facts | read the currently attributed customer's brand hierarchy and customer-visible report context; no edit |
| Evaluation and report | prepare, start, retry when eligible, and read own current or historical evidence | no general evaluation access | controlled support and audit access, with internal evidence separated from customer presentation | read complete customer-visible reports only while current attribution exists; no start, retry, edit, export, sources, prompts, or traces |
| Core article and materials | own source information, edit and confirm the core article | receive the order snapshot and create or adjust fulfilment variants only after claiming the order | exceptional inspection through the owning module; not routine writing | no generation, editing, confirmation, or order authority |
| Media and offering | read live customer presentation and select only as allowed by publishing mode | read eligible supply needed for assigned fulfilment | maintain media facts, availability, packages, prices, and rules through Media Supply | read customer-visible service information for assisted explanation |
| Order and fulfilment | create paid decisions and read own progress and results | see bounded pool summaries; after claim, handle the whole order, work items, exceptions, and results | intervene, reassign, return points, or inspect records only through the owning modules and recorded reasons | receive approved attributed-customer milestones and own historical performance references; no customer order mutation |
| Recharge, points, and invoice | own recharge, unified balance, point history, and eligible invoice requests | read and process only assigned invoice work | perform recorded adjustments, returns, invoice oversight, and audit through Customer Value | no customer balance, funded/granted composition, invoice, or recharge access |
| Attribution, commission, and withdrawal | no customer-facing commission detail or agent control | no access | activate agents, maintain attribution, review commission and withdrawals, and record intervention | read own attributed portfolio, performance, commission, payout profiles, and withdrawals |
| Notifications | own role-targeted notifications | own role-targeted notifications and eligible pool or assigned-work attention | only governance or escalated attention requiring administrator authority | approved customer milestones and own commission or withdrawal outcomes |

Role permission does not transfer data ownership. Reattribution removes the
former agent's customer and report access while preserving the agent's own
historical performance and commission records. Order return or reassignment
changes operational responsibility without changing the customer, order,
article, point, or result owners.

### Sensitive-data categories

| Category | Examples | Default handling |
| --- | --- | --- |
| Customer business information | brand profile, article information, materials, evaluation report, confirmed article | customer-owned; supporting roles receive only the business-context view granted above |
| Contact and account information | contact person, mobile number, email, account identifiers | limited to the account owner and an authorized existing business record such as a claimed order or assigned invoice; exclude from broad lists, notifications, traces, and analytics payloads |
| Customer money and invoice information | recharge payment reference, funded/granted point composition, invoice name, taxpayer identifier, receiving email | customer sees approved business view; operations receives assigned invoice fields; administrators receive authorized adjustment or audit views; agents receive none |
| Agent financial information | bank-account name and number, bank and routing fields, contact mobile, commission and withdrawal balances | agent and authorized administrator only; mask stored account numbers in ordinary views, snapshot withdrawals, and audit full-value access |
| Internal commercial and operational information | publishing account or channel, internal notes, correction history, operator identity, commission calculation inputs | only the role and business context that require it; never copied wholesale into customer or agent pages |
| AI and technical evidence | prompts, Skills, provider sources, exact model traces, retry history, usage, logs, stack traces, credentials | controlled technical or approved support access; the customer sees agreed original answers and business explanations, while agents see only the customer-visible report boundary; credentials never enter business payloads or logs |

Exact encryption, masking, consent text, retention, session, and rate-limit
mechanisms remain security and technology decisions. The architectural rule is
purpose limitation: a role does not receive a full record when a smaller
business view is enough.

### Error, notification, audit, and diagnostic ownership

- The business owner classifies a normal constraint or failure and returns a
  stable business outcome with the affected action and available recovery.
- The role experience turns that outcome into simple, formal, role-appropriate
  wording; it never passes through provider text, stack traces, internal routes,
  or retry details.
- Notification Center creates a durable recipient record only for asynchronous,
  cross-page, or other-role-attention results. Page-local corrections remain on
  the page, and technical retries never become notifications.
- The module owning a consequential action records who did what, to which
  business record, when, and why. Audit evidence is not an editable operations
  note and is not a customer notification.
- Logs, metrics, traces, and AI execution evidence use shared business and
  correlation identities while excluding credentials and minimizing personal
  or financial values. Technical support can correlate a user-safe support
  reference without exposing diagnostics to the role.

### Confirmed sensitive-access baseline

The confirmed first-release default is least privilege by business context:

- an operations user sees only bounded summaries before claiming an order; a
  claimed order unlocks its minimum customer, brand, article, contact, and
  fulfilment fields, while assigned invoice work exposes only the invoice and
  contact fields required for that request;
- an administrator has broad governance actions but ordinary views keep full
  payout, invoice, contact, and other sensitive values masked; an authorized
  business action can reveal or use the required value and records the access;
- an agent receives attributed-customer identity, brand hierarchy, milestones,
  and customer-visible reports, but not customer contact, points, invoice,
  article, internal operations, source, prompt, trace, or log data unless a later
  explicit product decision grants a narrower field for a defined purpose.

This avoids a complex per-field permission builder in the first release. The
policy is implemented as a small set of owner-provided purpose views such as
customer report, fulfilment order, invoice handling, governance intervention,
and agent portfolio rather than returning one universal record and hiding
fields in the frontend.

The first release has four fixed account roles: terminal customer, operations,
administrator, and agent. It does not include user-defined roles, one account
switching among several roles, a permission editor, a configurable permission
matrix, a policy engine, or a generic RBAC, ABAC, or ACL platform. This product
simplification does not move authorization to the frontend: the server still
checks the fixed role together with resource relationship, lifecycle, action,
and purpose-specific field boundary. Owner modules expose the few business
views required by approved journeys. A future need for delegated authority,
multiple roles per account, custom roles, or customer-configurable permissions
is a new product and architecture decision rather than a hidden first-release
extension point.

## Confirmed first implementation vertical slice

The first slice is an internal development milestone, not a reduced definition
of the first commercial release. It proves the terminal customer's first real
GEO value before the team builds optimization, commerce, and operations around
it.

### Included outcome

A terminal customer can:

1. create or enter a terminal-customer account through the initial direct path;
2. continue from an intentional no-brand state, create and select a current
   brand, and complete the basic information required for evaluation;
3. receive the one fixed, non-editable four-question set for the current
   evaluation-input revision and start its official evaluation;
4. leave the page while five-platform sampling, parsing, and synthesis continue
   as background work;
5. see clear evaluating, completed, or please-retry outcomes and receive the
   related in-product notification;
6. open a complete, responsive report containing the accepted summary, index,
   coverage, comparisons, combined characteristics, original-answer evidence,
   highlights where reliable, and concise optimization direction.

### Participating ownership

| Module or capability | Slice responsibility |
| --- | --- |
| Identity and Access | Terminal-customer identity, single role, session, and access decision |
| Brand Knowledge | No-brand state, basic profile, current-brand context, normalized evaluation-relevant facts |
| GEO Intelligence | Input revision, fixed questions, run and sample identities, parser and synthesis results, completed report and guidance |
| AI Execution | Provider invocation, retry and fallback execution, complete response-envelope return, tracing, and usage evidence; GEO Intelligence persists the canonical accepted answer |
| Notification Center | Durable completion or please-retry notification and read state |
| Background Work and read projections | Resumable execution, progress delivery, current-brand service state, and report presentation without business-write ownership |

### First-slice mutation and record ownership

The first slice uses business operations rather than repository sharing. Names
below express contract intent and may be refined with the implementing slice;
their owners and invariants are the stable architecture boundary.

| Owner | Public operation or fact | Authoritative records and invariant |
| --- | --- | --- |
| Identity and Access | establish a terminal-customer session and return the authenticated account purpose view | Account identity, one role, activation, and session authority; registration may finish without a brand and never creates brand state directly |
| Brand Knowledge | create brand; update basic brand facts; select current brand; provide evaluation-purpose facts | Current brand profile, current-brand selection, and normalized evaluation-relevant fingerprint; only this owner decides whether relevant facts changed |
| GEO Intelligence: Evaluation Definition | prepare the fixed four-question definition for one brand fingerprint | Evaluation-input revision, immutable brand-fact snapshot, generated question set, platform policy snapshot, and question-generation identity; preparation is idempotent and supplies no customer refresh operation |
| GEO Intelligence: Evaluation Run | start one official evaluation from the displayed definition; retry the same eligible run from retained evidence | Run identity, internal execution-cycle identity, twenty business sample identities, run snapshot, current-report transition, and post-commit start or resume facts; one unchanged revision has at most one completed run and one brand has at most one active run |
| AI Execution | execute one purpose-specific provider attempt and return its complete envelope | Attempt correlation, requested and returned route identity, usage, latency, retry and fallback evidence; an attempt cannot create another business sample or change a run directly |
| GEO Intelligence: Evidence Acquisition | accept a valid provider result or record an exhausted sample failure against the expected sample and attempt | Canonical format-preserving answer, returned source metadata, model identity, sample validity, and accepted-attempt reference; only one accepted evidence result exists for each of the twenty business sample identities |
| GEO Intelligence: Evidence Interpretation | accept validated per-sample parsing and overall synthesis results | Parser evidence, relative position, characteristics, synthesis, and comprehensive optimization guidance; syntactic provider output does not become accepted interpretation until purpose-owned validation passes |
| GEO Intelligence: Report | complete the report or mark the run please-retry from retained records | Reproducible index inputs, report snapshot, customer presentation data, latest usable guidance, terminal run outcome, and consumed evaluation opportunity only on successful completion |
| Notification Center | consume the durable terminal evaluation fact and create the recipient notification once | Role-targeted completion or please-retry notification and read state; notification failure never changes the run |
| Read composition | read current brand service state, evaluation progress, and report purpose views | Disposable projections or composed reads only; no mutation API and no duplicated evidence authority |

The canonical original answer used by the report belongs to GEO Intelligence,
not AI Execution, BullMQ, Langfuse, logs, or a read model. AI Execution may retain
bounded diagnostics under the approved technical-evidence policy, but those
records cannot be required to reconstruct a customer report. This separates the
business fact from provider tracing and prevents telemetry retention from
silently changing product history.

A customer retry does not create a second evaluation run for unchanged
evaluation-relevant brand facts. GEO Intelligence opens a new internal execution
cycle on the same run and frozen definition, retains every accepted answer and
interpretation, and schedules only failed or unfinished work. A synthesis-only
failure therefore retries synthesis only. The execution-cycle identity is
internal diagnostic and idempotency evidence, not a new customer-visible state
or profile version. If evaluation-relevant brand facts have changed, the old
failed run is not resumed against stale inputs: the customer prepares the new
definition and starts a new run for the new revision.

### First-slice collaboration sequence

1. The web calls Identity and Access and Brand Knowledge through application use
   cases. It receives purpose views, not ORM entities.
2. GEO Intelligence obtains one versioned evaluation-purpose brand snapshot and
   prepares the non-editable question definition. Query-generation AI work uses
   AI Execution, but GEO Intelligence owns the accepted definition.
3. `Start evaluation` is an idempotent L2 transaction inside the authoritative
   datastore: it rechecks account, brand, definition, revision allowance, and
   active-run constraints; creates the run and twenty sample identities; applies
   the current-report transition; and appends the reliable start fact. It makes
   no external provider call.
4. An outbox relay hands the start fact to Background Work. A small
   evaluation-process coordinator resumes from GEO-owned state and requests
   provider attempts through AI Execution. Queue redelivery only repeats a
   command with the same business and attempt identities.
5. GEO Intelligence accepts each valid canonical answer or exhausted failure,
   then requests parsing and synthesis through the same AI Execution boundary.
   Each accepted result passes local structural and semantic validation.
6. When at least seventeen samples are valid and all required interpretation is
   accepted, GEO Intelligence completes the report in one owner-local
   transaction and appends its terminal fact. If the valid-report boundary
   cannot be met after approved retries, it marks the run please-retry without
   consuming the revision's completed opportunity.
7. When an eligible unchanged run is **Please retry**, `Retry evaluation`
   atomically rechecks ownership, the current brand fingerprint, and run state;
   opens one internal execution cycle; and appends a reliable resume fact. The
   process coordinator resumes only failed or unfinished sampling, parsing, or
   synthesis work from retained evidence. Duplicate retry requests return the
   same active cycle. When the brand fingerprint has changed, this command does
   not revive the stale run and the customer follows the normal new-definition
   and new-run path.
8. Notification Center and read projections consume the committed terminal fact
   idempotently. SSE may announce progress or completion, but the browser always
   reloads the durable purpose view after reconnecting.

This sequence deliberately avoids a generic workflow engine. The process
coordinator advances only the evaluation use case and is recoverable from
GEO-owned records. Provider, queue, notification, projection, or telemetry
failure cannot roll back an already committed owner transition.

### Explicit first-slice non-goals

- article information, materials, generation, editing, or confirmation;
- media catalog, packages, recharge, points, paid orders, fulfilment, results,
  invoices, commission, or withdrawal;
- agent acquisition, agent portfolio, operations workbench, or administrator
  management experiences beyond controlled development support;
- a second eligible evaluation after a later profile revision, evaluation-
  history presentation, trend comparison, monitoring, or automatic
  re-evaluation, although the retained run snapshot must not block those
  approved later capabilities;
- final public marketing and case-showcase design;
- selecting final internal values for provider quotas, retry counts, timeouts,
  or visual details before current evidence and implementation feedback exist.

### Slice acceptance boundary

- one real brand completes the real fixed five-platform route and receives an
  official report only with at least seventeen valid samples;
- the accepted recommendation-index formula and report evidence remain
  reproducible from retained owner records;
- repeated start or retry requests cannot create a second active run or consume
  a second completed opportunity for the unchanged revision;
- retrying an unchanged failed run preserves its frozen definition and accepted
  evidence, re-executes only failed or unfinished work, and does not move report
  history again; changed evaluation facts require a new definition and run;
- leaving the page does not stop evaluation, and notification or realtime
  delivery failure does not corrupt the run;
- provider, parser, or synthesis failure reaches the approved retry or
  please-retry boundary without presenting an incomplete official report;
- later profile editing cannot rewrite the run's input, question, platform,
  evidence, or report snapshot;
- another account or an unauthorized role cannot read or mutate the brand's
  evaluation evidence;
- verification includes controlled provider evidence, focused state and
  idempotency tests, contract tests at module boundaries, and a real browser
  journey through the report.

The product owner confirmed this first-slice contract, including the bounded
retry lifecycle, on 2026-08-25. Exact tables, API payloads, job payloads, retry
counts, and provider configuration remain implementation or controlled-evidence
decisions and cannot redefine these boundaries.

## Current evidence frontier

Before provider-adapter approval and first-slice implementation authorization,
current evidence must establish whether the approved routes can supply the
required five-platform sampling, web-grounded responses where specified,
retained raw answers and source metadata, structured parsing and synthesis,
bounded fallback, and per-execution trace identity. Documentation cannot prove
account-specific access, quota, quality, source completeness, or failure
semantics; the research must separate documented capability from the smallest
controlled-account test still required. This is an agent-owned fact-finding
frontier, not a product tradeoff to send back to the user.

The [first-slice external evidence brief](research/first-slice-external-evidence.md)
established that the route was plausible enough for the now-completed stack
comparison. It also fixes three constraints: provider-specific adapters must
preserve raw evidence, application workers own long-running execution, and
observability is a non-blocking follower rather than business storage.
Controlled-account tests remain mandatory before provider-adapter approval or
implementation authorization.

## Dependency-aware mainline

After the first slice and macro route are confirmed, architecture work proceeds
only as far as needed to authorize its implementation safely:

1. finish no-secret route sheets, fixtures, compatibility candidates, and the
   evidence boundaries for the two execution lanes;
2. after separate explicit authorizations, execute the bounded foundation spike
   and the controlled-account matrix as disjoint parallel lanes. The foundation
   lane uses deterministic adapters; the provider lane validates the five
   evaluation routes, parser and synthesis execution, and trace isolation;
3. reconcile both evidence sets, complete architecture review and a short
   decision brief, then reconcile the
   accepted foundation into current architecture owners;
4. authorize and implement the first slice through the dependency-aware plan,
   disjoint ownership, integration gates, and verification evidence;
5. refine later optimization, commerce, fulfilment, and settlement contracts
   only before their respective vertical slices, while preserving the already
   confirmed paid-order and point-debit invariant.

## Impact and rollback

This exploration changes documentation only and has no runtime data, migration,
deployment, or external-write impact. Until the architecture is explicitly
approved, any proposed boundary can be revised by updating this active change.
After approval, durable decisions move to the architecture overview, current
specifications or owner-local contracts, and ADRs before this change is closed.
