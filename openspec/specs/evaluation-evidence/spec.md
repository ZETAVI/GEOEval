# Evaluation Evidence Specification

## Purpose

Define the accepted S3 behavior that turns the twenty immutable sample
identities of one official evaluation into durable, format-preserving answers
and accepted per-sample interpretations. This specification stops at internal
readiness for overall synthesis or the public `PLEASE_RETRY` outcome; it does
not own report synthesis, scoring, optimization advice, customer retry
execution, or real-provider integration.

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

- **WHEN** one deterministic acquisition or interpretation attempt fails
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

S3 uses deterministic acquisition and interpretation adapters and rejects the
Worker in production while those adapters are selected. Real five-platform
routes, parser-model fallback, production pacing and cost controls, and
production Redis high availability remain later approved gates.
