# Evaluation Evidence Specification

## Purpose

Define the accepted S3 behavior that turns the twenty immutable sample
identities of one official evaluation into durable, format-preserving answers
and accepted per-sample interpretations. This specification stops at internal
readiness for overall synthesis or the public `PLEASE_RETRY` outcome; it does
not own report synthesis, scoring, optimization advice, synthesis-only retry,
or notifications. S6 extends this owner with the accepted real execution and
protected provider-evidence boundary.

## Requirements

### Requirement: Durable owner state

GEO Intelligence SHALL be the only owner of evaluation cycle, sample, canonical
answer, interpretation, exhaustion, and readiness state.

#### Scenario: An official run enters background processing

- **WHEN** Background Work delivers the run's transaction-Outbox start fact
- **THEN** GEO Intelligence activates the existing initial execution cycle
- **AND** appends one acquisition request for each of the twenty sample
  identities without duplicating work under repeated delivery
- **AND** PostgreSQL remains sufficient to determine every unfinished stage
  without consulting BullMQ or telemetry

#### Scenario: One answer or interpretation is accepted

- **WHEN** a successful AI attempt belongs to the same sample, cycle, and
  purpose and its output passes the GEO-owned schema and semantic checks
- **THEN** GEO Intelligence accepts at most one format-preserving canonical
  answer and at most one interpretation for that sample
- **AND** the accepted record links to the exact successful attempt
- **AND** the same transaction advances the sample and appends the next durable
  work fact

### Requirement: Attempt and delivery separation

AI Execution SHALL own append-oriented purpose-attempt evidence, while
Background Work SHALL own only reliable delivery of stable identifiers.

#### Scenario: Purpose execution fails

- **WHEN** one acquisition or interpretation attempt fails
- **THEN** the persisted purpose policy, not BullMQ's delivery-attempt counter,
  decides whether to append another purpose attempt
- **AND** a terminal purpose failure creates one GEO-owned stage-exhaustion
  record and makes that sample unavailable
- **AND** queue retry never creates a second canonical answer or accepted
  interpretation

#### Scenario: Delivery is duplicated or interrupted

- **WHEN** the same Outbox fact is delivered concurrently, a Worker stops with
  queued work, or Redis delivery state must be reasserted
- **THEN** database uniqueness and conditional transitions make processing
  idempotent
- **AND** the Outbox relay and scheduled reconciliation scan resume only work
  implied by durable GEO state
- **AND** telemetry failure cannot reject accepted business evidence

#### Scenario: A real attempt is duplicated or interrupted

- **WHEN** concurrent delivery encounters a live started attempt
- **THEN** it defers the same durable work and sends no second provider request
- **AND** when the attempt exceeds the reviewed ambiguity deadline it is
  atomically recorded as a retryable ambiguous failure before a later numbered
  attempt may run
- **AND** a late result cannot overwrite that failure or accepted evidence

### Requirement: Explicit real execution boundary

The Worker SHALL select deterministic or real AI execution through validated
startup configuration, and AI Execution SHALL preserve provider evidence behind
one provider-neutral inward-facing result.

#### Scenario: Real execution is enabled

- **WHEN** the Worker starts in real execution mode
- **THEN** every accepted route has an explicit logical policy, provider service
  class, base URL, requested model, credential reference, timeout, and supported
  purpose
- **AND** an incomplete route set, missing credential, unsupported model,
  official-direct DeepSeek route, or purpose/protocol mismatch fails readiness
  before evaluation work is consumed
- **AND** secrets never enter snapshots, logs, traces, errors, or Git

#### Scenario: A sampling route succeeds

- **WHEN** a real platform returns a complete answer
- **THEN** GEO receives one normalized answer, format, exact returned model,
  source metadata, and `TRIGGERED`, `NOT_TRIGGERED`, or `UNKNOWN` search
  observation based on explicit provider evidence
- **AND** the protected attempt envelope retains the complete provider response,
  request identity where returned, finish reason, native usage, search evidence,
  and reasoning evidence when actually exposed
- **AND** provider sources, search details, raw envelopes, and technical usage do
  not enter the customer report

### Requirement: Versioned neutral sampling instruction

Every customer-visible sampling route SHALL receive the same versioned
objectivity meaning, while AI Execution may translate it only through the
route's verified instruction transport.

#### Scenario: A customer-visible sample is requested

- **WHEN** one of the five platform routes prepares a sampling request
- **THEN** it uses the current shared
  [evaluation-objectivity profile](../../../apps/backend/geo-intelligence/evaluation-objectivity.json)
- **AND** the durable attempt evidence snapshots the profile identity, version,
  and content hash used for that request
- **AND** the profile requires evidence-based, neutral treatment rather than
  automatic praise, unsupported certainty, invented facts, or invented sources
- **AND** search support and automatic triggering remain route configuration,
  not separate product meaning or provider-authored policy

### Requirement: Provider failures respect purpose policy

Transport, provider, and semantic failures SHALL remain explicit attempts whose
next action is owned by GEO Intelligence rather than an SDK, queue counter, or
telemetry exporter.

#### Scenario: A real purpose attempt fails

- **WHEN** a route times out, cannot connect, rate-limits, rejects a request,
  returns malformed data, or returns semantically invalid structured output
- **THEN** AI Execution retains stable technical failure evidence without a
  hidden transport retry
- **AND** when a Provider-successful structured response fails deterministic
  projection or canonical semantic validation, that exact Attempt becomes
  `FAILED/SEMANTIC_CONTRACT_REJECTED` before the next purpose attempt is
  scheduled
- **AND** its versioned envelope retains the rejected normalized output,
  Provider Evidence, model-contract version, and domain-contract version
- **AND** acquisition retries the same platform route
- **AND** interpretation uses Model Studio Qwen3.8 Flash for attempts one and
  two and TokenHub Hy3 for attempt three
- **AND** a structured response affects accepted interpretation only after GEO's
  deterministic projection and canonical semantic validation succeed

### Requirement: Protected and non-blocking execution observability

AI Execution SHALL retain enough protected evidence to inspect each approved AI
purpose without making telemetry a business truth source or exporting customer
content by default.

#### Scenario: An internal owner inspects an AI execution

- **WHEN** an evaluation or another approved AI purpose calls a model provider
- **THEN** the attempt can be correlated to the relevant account, brand,
  business run, and purpose
- **AND** protected evidence identifies the provider, platform, requested and
  returned model identity, prompt or configuration version, search setting and
  observation, time, latency, available native usage or cost, outcome, and retry
  relationship
- **AND** product business records remain authoritative for customer data,
  complete answers, interpretations, and reports
- **AND** telemetry unavailability cannot reject or lose accepted business
  evidence
- **AND** Langfuse remains metadata-only by default, and production startup
  rejects the local diagnostic content mode

#### Scenario: A controlled local diagnostic is explicitly enabled

- **WHEN** a development or test Worker explicitly enables local diagnostic
  content for fictional or otherwise approved test data
- **THEN** the Generation input contains a versioned projection of the exact
  system instruction, its content fingerprint, task context, and applicable
  output-contract version/schema
- **AND** its output contains only the provider-neutral normalized result or a
  stable failure-class/retryability summary
- **AND** credentials, Authorization values, API keys, Provider request/response
  envelopes, response headers, source evidence, and reasoning chains are always
  removed by the controlled projection and serialized export mask
- **AND** environment, optional release/revision, purpose, route, attempt,
  run/sample correlation, status, latency, and available usage remain technical
  observability metadata
- **AND** production content transfer, retention, and access require a separate
  approved data boundary

### Requirement: Readiness boundary

GEO Intelligence SHALL evaluate readiness only after all twenty sample
positions have either an accepted interpretation or an exhausted stage.

#### Scenario: At least seventeen samples are accepted

- **WHEN** seventeen through twenty interpretations are accepted
- **THEN** the execution cycle and run enter internal `READY_FOR_SYNTHESIS`
- **AND** an accepted answer that does not mention the brand still counts as a
  valid sample
- **AND** the public run status remains `EVALUATING` until S4 produces a report

#### Scenario: Fewer than seventeen samples are accepted

- **WHEN** zero through sixteen interpretations are accepted after all positions
  are terminal
- **THEN** the execution cycle is exhausted and the public run status becomes
  `PLEASE_RETRY`

### Requirement: Evidence-stage retry preserves accepted work

An account-authorized retry SHALL open one new bounded execution cycle over the
same official run and its same twenty logical sample positions.

#### Scenario: The customer retries insufficient evidence

- **WHEN** the run is `PLEASE_RETRY` because sample acquisition or
  interpretation was exhausted
- **THEN** one next positive-sequence cycle returns the run to `EVALUATING`
- **AND** only positions without an accepted answer restart acquisition
- **AND** positions with an accepted answer but no interpretation restart only
  interpretation
- **AND** accepted answers, accepted interpretations, earlier attempts, and
  earlier exhaustion records remain unchanged
- **AND** concurrent or repeated retry commands return the same active retry
  without creating another cycle, run, or logical sample

### Requirement: Concise customer progress

The authenticated diagnosis view SHALL expose only durable progress that helps
the customer understand the current outcome.

#### Scenario: A customer revisits an active evaluation

- **WHEN** the run is evaluating
- **THEN** the Web periodically reads and displays expected, processed, valid,
  and unavailable sample counts without requiring a page refresh
- **AND** it does not expose attempt counts, prompts, routes, queue state,
  internal failures, source metadata, or trace identities
- **AND** internal ready-for-synthesis is presented as sampling complete and
  results being prepared, without fabricating a report

## Current environment boundary

The business contract remains reproducible with deterministic adapters. One
complete fictional real 4-by-5 Worker run accepted all twenty platform answers
on their first acquisition attempts and completed through the reviewed
Qwen3.8-primary/Hy3-fallback interpretation policy. This proves route and
recovery compatibility only. Provider-console cost reconciliation, production
pacing and quota evidence, commercial data approval, and production Redis high
availability remain later gates.
