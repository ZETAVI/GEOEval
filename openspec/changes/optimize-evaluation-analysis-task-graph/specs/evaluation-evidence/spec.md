# Evaluation Evidence Delta

## MODIFIED Requirements

### Requirement: Attempt and delivery separation

AI Execution SHALL own append-oriented purpose-attempt evidence, while
Background Work SHALL own only reliable delivery of stable identifiers.

#### Scenario: Independent synthesis tasks are delivered

- **WHEN** a run becomes ready for synthesis
- **THEN** one PostgreSQL transition appends one brand-relationship task and one
  report-narrative task with stable business keys
- **AND** the tasks may execute concurrently through existing Background Work
- **AND** each task has an independent attempt identity, retry budget and
  accepted GEO-owned component
- **AND** repeated or interrupted delivery cannot issue a concurrent duplicate
  Provider request or replace an accepted component
- **AND** BullMQ dependency or return-value state is not required to decide
  whether either component or the final report exists.

#### Scenario: One synthesis task fails

- **WHEN** one synthesis task is accepted and the other is retried or exhausted
- **THEN** the accepted component remains immutable and is not requested again
- **AND** only the failed task consumes another task-policy attempt
- **AND** a synthesis-only customer retry reuses the accepted component when its
  input fingerprint and semantic contract remain supported
- **AND** no report is accepted until both required components can be
  deterministically assembled.

### Requirement: Concise customer progress

The authenticated diagnosis view SHALL expose only durable progress that helps
the customer understand the current outcome.

#### Scenario: Per-platform progress is projected

- **WHEN** an evaluation is active
- **THEN** every platform exposes its fixed expected positions, accepted answers,
  terminally analyzed positions and report-available interpretations
- **AND** the overall stage derives from durable question, sample, accepted
  synthesis-component and report state
- **AND** Provider, route, attempt, retry, queue and internal task names remain
  protected
- **AND** a presentation timer cannot advance a platform count, cross a durable
  stage boundary or reach completion before report acceptance.
