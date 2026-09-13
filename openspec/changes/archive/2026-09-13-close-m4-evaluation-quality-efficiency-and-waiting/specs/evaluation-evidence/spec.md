# Evaluation Evidence Delta

## MODIFIED Requirements

### Requirement: Concise customer progress

The authenticated diagnosis view SHALL expose durable progress that explains
where the customer's evaluation has reached without exposing internal execution
or fabricating platform completion.

#### Scenario: A customer revisits an active evaluation

- **WHEN** the run is evaluating
- **THEN** the public projection shows, for every fixed platform, expected,
  acquired, analyzed and available sample counts derived from durable owner state
- **AND** provides one overall customer-safe stage derived from question
  preparation, platform answers, content analysis and report preparation
- **AND** the Web may ease progress only inside the current truthful stage and
  cannot enter a later stage or reach 100% before its durable condition is met
- **AND** an unfinished platform row never exposes Provider, model, attempt,
  retry, queue, failure or trace detail
- **AND** internal retry is not labeled as a customer-visible platform “需重试”
- **AND** the existing terminal run-level please-retry outcome remains available
  when the accepted evaluation lifecycle actually ends there
- **AND** refresh, leave-and-return, current-brand switching and simultaneous
  runs for different brands cannot move the progress to another run.

## ADDED Requirements

### Requirement: Parallel analysis preserves business authority

Evaluation analysis MAY split and execute independent purposes concurrently only
when durable GEO state remains sufficient to resume work and reproduce the
accepted report.

#### Scenario: The analysis task graph is optimized

- **WHEN** sample parsing, brand grouping, themes/directions or report assembly
  are split, rerouted or run concurrently
- **THEN** PostgreSQL owner state, not BullMQ or telemetry, still determines
  unfinished work and accepted truth
- **AND** program logic still owns all counts, rates, index and position facts
- **AND** repeated delivery cannot issue a concurrent duplicate Provider request
- **AND** timeout, fallback and late completion cannot create duplicate accepted
  evidence, synthesis or reports
- **AND** stage waiting, Provider time, projection time, retry time and final
  assembly time remain distinguishable for the selected budget and rollback
  decision.

### Requirement: Diagnostic telemetry remains controlled and non-authoritative

AI Execution SHALL allow explicitly enabled local/test diagnostics without
making telemetry a customer-data or business-state authority.

#### Scenario: A developer diagnoses a local AI purpose

- **WHEN** the approved local/test diagnostic mode is explicitly enabled
- **THEN** a Generation observation may contain an allowlisted versioned Prompt
  configuration, task input projection, normalized output or failure summary and
  correlation/timing fields needed for diagnosis
- **AND** credentials, authorization, unnecessary raw Provider envelopes and
  unapproved sensitive content remain masked or absent
- **AND** default and production configuration remain metadata-only
- **AND** exporter failure cannot change an Attempt, retry, sample, report or
  customer progress outcome.
