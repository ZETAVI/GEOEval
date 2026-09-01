# Design: AI Evaluation Query Generator

## Design position

The existing question-generation capability belongs in GEO Intelligence, but
the synchronous `EvaluationQuestionGenerator.generate(snapshot)` interface is
not the correct runtime port for a paid external call. The change preserves the
capability owner while replacing that interface with durable preparation: the
application requests preparation, Background Work delivers the intent, AI
Execution performs one recorded call, and GEO Intelligence accepts one complete
definition. It does not introduce a generic workflow engine or a second
definition owner.

## Module Architecture Card: Query preparation

### Outcome and Boundary

- Owner and observable outcome: GEO Intelligence owns one resumable question
  preparation and one immutable accepted definition per brand evaluation
  fingerprint.
- In: frozen evaluation-purpose brand snapshot, Query Prompt and structured
  contract, candidate-to-selected projection, preparation state, accepted
  definition, and explicit retry after terminal technical exhaustion.
- Out: editable brand facts and catalog maintenance, provider protocol,
  BullMQ mechanics, evaluation sampling, parsing, report synthesis, visual
  redesign, and factual brand investigation.
- Upstream prerequisites and downstream consumers: Brand Knowledge supplies the
  snapshot and recommendation subject; AI Execution supplies recorded technical
  outcomes; Background Work delivers intents; official evaluation start
  consumes only an accepted immutable definition.

### Lifecycle and Data

- States and allowed transitions:

  ```text
  PREPARING -> READY
            -> PLEASE_RETRY
  PLEASE_RETRY --explicit retry/new internal sequence--> PREPARING
  READY is terminal for the brand fingerprint.
  ```

- Authoritative records and invariants:
  - `EvaluationQuestionPreparation` is unique by brand and input fingerprint;
    it stores the frozen brand/catalog snapshot, status, current internal
    sequence, correlation identity, and accepted definition reference.
  - `AiQuestionGenerationAttempt` is append-oriented and unique by preparation,
    sequence, and attempt number. It owns route, provider, request, protected
    response envelope, failure, usage, and timing evidence.
  - `EvaluationDefinition` and its four `EvaluationQuestion` records remain the
    only accepted business question set. Exactly one preparation may accept
    exactly one definition.
  - Candidate alternatives exist only in the protected successful attempt
    envelope. They are not editable or historical product definitions.
- Transaction, concurrency, and history boundary:
  - First preparation stores the snapshot, `PREPARING` state, and one
    `evaluation.definition.prepare.requested` Outbox fact in one transaction.
  - A unique brand-plus-fingerprint constraint makes duplicate and concurrent
    HTTP requests return the same preparation.
  - Successful projection creates the definition and four questions, links the
    accepted attempt, and moves preparation to `READY` in one transaction.
  - A brand edit creates a new fingerprint and preparation; earlier accepted
    data remain immutable, while existing start-time staleness checks prevent
    the old definition from running.
- Migration and rollback:
  - Add preparation and Query-attempt storage through an additive migration.
  - The upstream brand-reference-data change owns industry and region migration
    plus fingerprint continuity before this branch is rebased.
  - Existing deterministic definitions with a run remain readable historical
    definitions and do not grant another evaluation opportunity. In the current
    development-only data boundary, the implementation migration removes only
    unstarted deterministic definitions so an unchanged ready brand can be
    prepared once by the Query Agent. Verification records the before/after
    count and proves every removed definition had no Run. No production-data
    migration is claimed.
  - The real customer path never silently falls back to a template. Operational
    rollback disables new Agent preparation while preserving existing accepted
    definitions and attempts.

### Contracts and Dependencies

- Public commands, queries, and facts:
  - `GET` observes the current fingerprint's preparation or definition without
    creating work and may return no preparation;
  - idempotent `PUT` ensures preparation and returns `PREPARING`, `READY`, or
    `PLEASE_RETRY`, with a definition only when ready;
  - explicit `POST` retry is valid only from `PLEASE_RETRY`; concurrent repeats
    return the same active sequence;
  - `evaluation.definition.prepare.requested` carries stable identifiers only;
  - accepted definition continues through the unchanged official-start command.
- Dependency direction:
  - Web -> generated HTTP client -> GEO application contract;
  - GEO -> Brand Knowledge evaluation-purpose view;
  - Background Work -> GEO preparation coordinator;
  - GEO coordinator -> AI Execution question-generation service;
  - AI Execution -> provider adapters and attempt repository.
  No module reads another module's tables directly.
- External ports and failure boundary: GEO replaces the current paid-call-
  hiding `generate(snapshot)` path with a preparation coordinator, a pure
  Prompt builder, and a deterministic output projector. AI Execution adds one
  Query-specific recorded-attempt service and repository keyed by preparation,
  sequence, and attempt number. It reuses provider adapters, route resolution,
  transport, envelopes, telemetry, and ambiguity behavior without creating a
  fake Run/Sample or making the existing S6 attempt tables nullable and generic.
- Earned patterns or extension seams: Outbox for durable initiation, strategy
  and adapter for provider variation, a small state machine for preparation,
  and a deterministic projector between model output and the business
  definition. No factory, hot replacement, lease system, or new workflow
  framework is added.

### Query Prompt and output boundary

One versioned Query instruction receives:

- company or store name;
- province, city, and the terminal-region label supplied by Brand Knowledge;
- catalog version, primary/secondary labels, and controlled recommendation
  subject;
- the two customer-supplied brand characteristics.

The first model-output contract asks the model to consider several ordinary-
user angles and return:

1. two or three candidate questions for each required role, with no more than
   twelve candidates in total;
2. one selected question for each of the four roles;
3. one protected selection note of at most 300 characters for diagnosis and
   Prompt iteration.

Each candidate or selected question is non-empty and at most 240 characters.
These are provider and persistence bounds, not a score for writing quality.

The selected set should be natural and context-aware. Naturalness, useful
recommendation angles, and non-rigid expression remain Prompt and controlled
product-review responsibilities. The exact brand-name inclusion/exclusion rule
below is the one deterministic business check because it protects the meaning
of open-question recommendation metrics.

The deterministic projector checks only:

- the exact four required role identities and their order;
- one non-empty selected question per role;
- bounded string and collection sizes needed for persistence and provider
  safety;
- a structurally valid response document;
- that the brand-directed question contains the normalized exact current brand
  name and the three open questions do not contain that exact name.

It does not expand aliases, score tone, compare candidates, ban other phrases,
call a second model, or claim that a structurally valid question is good.
Controlled product review of real output remains the quality gate before the
first four-by-five run.

### Persistence and acceptance constraints

- Preparation is unique by `(brandId, inputFingerprint)` and relates to Brand
  through account-plus-brand ownership.
- Preparation stores the frozen Query instruction ID, version, hash, and
  content plus the model-output contract version and schema identity. A retry
  after another deployment therefore uses the same Prompt meaning rather than
  reading the latest asset by name.
- Query attempt is unique by
  `(preparationId, sequence, attemptNumber)`; preparation freezes the Query
  Prompt and output-contract identity used by every sequence.
- Accepted definition and accepted attempt references are unique. Composite
  ownership constraints keep the preparation, brand, definition, account,
  fingerprint, and accepted attempt in the same identity boundary.
- An acceptance transaction succeeds only when preparation is `PREPARING`, its
  current sequence equals the attempt sequence, and the attempt is `SUCCEEDED`.
  An earlier sequence's late success cannot win after a customer retry.
- Explicit retry conditionally advances `PLEASE_RETRY` to exactly one next
  sequence and creates that sequence's first Outbox fact in the same
  transaction. Concurrent retries observe the active sequence.
- Each provider call has its own Outbox business key containing preparation,
  sequence, and attempt number. A terminal, ambiguous, or failed attempt cannot
  later be rewritten to success; late transport results cannot be accepted.

### Failure and Recovery

| Failure | Classification | Retry or recovery owner | Idempotency or reconciliation evidence |
| --- | --- | --- | --- |
| Duplicate prepare HTTP request | Concurrent duplicate | GEO repository | Unique brand-plus-fingerprint preparation; returns existing state |
| Duplicate Outbox or BullMQ delivery | Delivery duplicate | Background Work and AI Execution | Event business key plus preparation/sequence/attempt unique identity; non-acquired caller sends no request |
| Provider timeout or transient failure | Transient/ambiguous | AI Execution records; GEO route policy advances | Same ambiguity deadline and delayed-delivery pattern proven in S6 |
| Structurally invalid Agent output | Semantic/structural rejection | GEO rejects; route policy advances | Rejected attempt envelope remains protected; no definition is created |
| All three attempts exhausted | Terminal technical failure | GEO marks `PLEASE_RETRY`; customer may explicitly retry | Conditional next sequence, same brand-fingerprint identity, no evaluation consumed |
| Process stops after provider response | Ambiguous interruption | AI Execution and scheduled reconciliation | Expired started attempt becomes recorded ambiguous failure before a new attempt identity |
| Brand changes while preparing | Business staleness | Brand Knowledge and GEO start check | New fingerprint gets a separate preparation; stale definition cannot start |
| Telemetry export fails | Non-business side effect | Telemetry owner | Best-effort failure cannot change attempt or definition acceptance |

### Tool and Framework Decision

| Candidate | Adopt, defer, or reject | Evidence and limitation | Exit or refresh trigger |
| --- | --- | --- | --- |
| Existing Product Outbox + BullMQ runtime | Adopt | Already owns durable product work, duplicate delivery, delay, and reconciliation; it does not own GEO state | Revisit only if measured Query traffic needs independent backpressure or isolation |
| Existing provider adapters and structured-output transport | Adopt | S6 verified Qwen3.8 and Hy3 routes, envelopes, timeouts, and strict JSON handling; it does not judge Query quality | Refresh before controlled calls if route/model/config changed |
| Zod model-output schema + deterministic projector | Adopt | Existing parser/synthesis boundary keeps provider convenience separate from durable meaning | Revise only with a versioned output-contract change |
| Synchronous `generate()` inside HTTP | Reject | Reachable timeout, concurrent duplicate cost, and missing durable failure state | None while using a paid external model |
| Second Critic Agent or semantic lint suite | Reject for this change | No demonstrated failure requiring extra cost or brittle rules | Reconsider only after repeated real Query defects with a changed action |
| Query-Agent web search | Reject for this change | Brand profile is the approved input; search adds latency and another factual authority | Reconsider only if controlled profiles repeatedly cannot produce useful questions |
| Separate queue/workflow framework | Reject for this change | Existing delivery capability already matches the lifecycle | Reconsider only after observed isolation or scheduling failure |

### Operational and Verification Boundary

- Security and sensitive data: Prompt input contains the same evaluation-purpose
  brand snapshot already approved for evaluation. Credentials stay in AI
  Execution; customer contracts omit prompts, candidates, raw envelopes, route,
  source, trace, and correlation details.
- Backpressure, capacity, and cost: Query generation shares the existing bounded
  Worker concurrency initially. Each sequence uses at most three recorded
  provider attempts. The current local integration boundary does not yet cap
  how many explicit retry sequences one revision may request, so production
  remains disabled until abuse and cost policy is separately decided. A
  separate queue or limiter requires measured contention or quota evidence.
- Metrics, logs, traces, and operator recovery: observe preparation age and
  status, attempt route/status/latency/usage, Outbox age, and reconciliation.
  Operators may inspect protected evidence; the first release has no manual
  question editing or acceptance workflow.
- Completion claims and discriminating evidence: deterministic fixtures prove
  lifecycle and recovery; migration replay proves data constraints; API/client,
  build, tests, and browser checks prove the customer path; controlled real
  Query output proves current model compatibility and supports product review.
  Only the later authorized four-by-five run proves integration with the
  accepted S6 evaluation pipeline.
- Residual risk accepted by: product owner accepts real Query quality after
  seeing exact selected questions; architecture owner accepts lifecycle and
  recovery after deterministic and controlled evidence. Production capacity,
  customer-data terms, and release remain separate gates.

## Brand reference-data dependency

Industry and region activation are independently valuable Brand Knowledge work
and are not implemented in #26. They share one customer form, readiness rule,
fingerprint, immutable evaluation snapshot, migration, and evaluation-purpose
projection, so they belong to one vertical reference-data Change.

Inside that Change, they remain two explicit domain sources rather than one
generic catalog engine:

- the industry catalog is GEOEval-owned, versioned business classification and
  must move its exact approved nodes to one executable owner;
- the region source represents maintained province-city-terminal-region
  identities from a researched authoritative dataset and does not inherit
  industry recommendation semantics.

The prerequisite must migrate Brand/API/Web selection to stable industry IDs,
`Other`, and stable region identities; preserve evaluation-fingerprint and
historical-opportunity meaning across representation changes; handle cities
without an ordinary county/district tier through the confirmed conventional
terminal-region behavior; expose the frozen identities and display labels in
the evaluation-purpose projection; and reconcile `move-on-activation`.

After that PR merges, #26 rebases and consumes only the stable projection. GEO
never imports either reference source or maintains a second mapping.

## Alternatives considered

### Replace the generator class and keep synchronous HTTP

Rejected. It preserves a small diff but not the real lifecycle. Two concurrent
requests can both pay for a model before the definition uniqueness constraint
selects one result, and a timeout leaves no honest customer state.

### Generate four questions in four independent calls

Rejected. It multiplies cost and failure surfaces and weakens coherence. The
product owner explicitly prefers one Agent to consider the full set and choose
the final four together.

### Let the model output only four final strings

Deferred as the smallest fallback if candidate evidence proves useless. The
current proposal keeps candidate exploration inside one call and outside the
business model so Prompt iteration can compare angles without exposing a new
customer workflow.

## Documentation disposition

- `update`: the evaluation-definition current spec after behavior is accepted.
- `dependency`: the separate brand-reference-data Change owns the exact
  industry move, region source, selectors, migration, fingerprint continuity,
  and `move-on-activation` reconciliation before #26 implementation.
- `update`: architecture overview with the accepted preparation boundary.
- `archive`: this change after implementation, verification, reconciliation,
  merge, and Issue closure. Do not leave it as a continuing Prompt backlog.
