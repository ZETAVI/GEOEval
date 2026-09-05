# Evaluation Evidence Delta

## MODIFIED Requirements

### Requirement: Attempt and delivery separation

AI Execution SHALL own attempt evidence, Background Work SHALL deliver stable
identifiers, and GEO Intelligence SHALL own accepted business facts.

#### Scenario: A candidate is evaluated before runtime selection

- **WHEN** Prompt, context or topology is compared
- **THEN** inputs, routes, schemas and candidate identities are frozen
- **AND** raw output quality is assessed separately from projection recovery
- **AND** experimental output never becomes an official sample or report
- **AND** one candidate's failure does not imply another candidate is accepted.

#### Scenario: A topology enters implementation

- **WHEN** evidence and architecture approval select a candidate
- **THEN** its attempt, retry, partial-success and assembly policies are explicit
- **AND** component persistence is introduced only if that candidate needs it.

### Requirement: Concise customer progress

The diagnosis view SHALL project truthful durable progress.

#### Scenario: A platform has an unavailable position

- **WHEN** a position terminates without an accepted interpretation
- **THEN** it remains distinguishable from successful analysis
- **AND** timers cannot fabricate completion or expose internal retries.
