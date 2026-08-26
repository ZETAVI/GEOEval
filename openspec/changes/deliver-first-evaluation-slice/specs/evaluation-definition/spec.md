# Evaluation Definition and Start Delta

## ADDED Requirements

### Requirement: One immutable definition per evaluation-input revision

The product SHALL prepare one non-editable four-question evaluation definition
from an evaluation-ready brand revision and SHALL preserve the exact context
that a later official run uses.

#### Scenario: A customer prepares the current revision

- **GIVEN** an account-owned active brand has complete basic information
- **WHEN** the customer enters diagnosis for that brand
- **THEN** GEO Intelligence stores the normalized evaluation-purpose brand
  snapshot and Brand Knowledge fingerprint
- **AND** stores one brand-directed, one industry-recommendation, and two
  characteristic-based questions in a stable order
- **AND** stores the fixed five-platform policy, deterministic question-
  generator identity, and shared objectivity-profile identity
- **AND** returning with the unchanged fingerprint returns the same definition
  and exact questions rather than generating another set
- **AND** no customer or API refresh operation exists for the unchanged revision

#### Scenario: Brand facts change after preparation

- **WHEN** an evaluation-relevant brand field changes before official start
- **THEN** the prior definition remains immutable
- **AND** starting it is rejected as stale
- **AND** preparing from the new fingerprint creates a different definition
- **BUT** a contact-only edit retains the same fingerprint and definition

### Requirement: Official start is atomic and idempotent

The product SHALL start an official evaluation without an external call by
atomically creating its run, expected business samples, and reliable start fact.

#### Scenario: A customer starts the displayed definition

- **WHEN** the customer confirms a current, account-owned definition and starts
  the evaluation
- **THEN** one evaluating run is created from the frozen definition
- **AND** exactly twenty sample identities are created from its four questions
  and fixed DeepSeek, Doubao, Qwen, ERNIE Bot, and Tencent Hunyuan platform set
- **AND** one reliable start fact is committed in the same transaction
- **AND** no provider or queue call occurs inside the transaction
- **AND** a repeated start request for that same active definition returns the
  same run without creating more samples or events

#### Scenario: Run invariants prevent ambiguous work

- **WHEN** another definition is started while the same brand already has an
  evaluating run
- **THEN** the product keeps the existing run and rejects the new start
- **AND** one definition can own at most one official run so later retry work
  must resume the same run
- **AND** another account cannot read, prepare, or start the brand's definition

### Requirement: Diagnosis exposes only implemented S2 truth

The product SHALL let a terminal customer review the definition and start the
official evaluation without implying that deterministic S2 has already sampled
or completed a report.

#### Scenario: A customer opens diagnosis

- **WHEN** the current brand is absent or incomplete
- **THEN** the page explains the missing prerequisite and links to brand work
- **BUT WHEN** the brand is ready
- **THEN** the page shows the four read-only questions and one start action
- **AND** after start it shows the evaluating state and twenty expected sample
  positions without fabricated progress, results, or scores

## Explicitly Deferred

- Real question-generation or five-platform provider calls.
- Sample attempts, parsing, synthesis, report calculation, notification, and
  customer retry execution.
