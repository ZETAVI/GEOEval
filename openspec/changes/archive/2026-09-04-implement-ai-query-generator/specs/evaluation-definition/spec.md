# Evaluation Definition Delta Specification
<!-- Reopened on 2026-09-04 after the real-chain location acceptance failed. -->

## MODIFIED Requirements

### Requirement: Stable definition ownership

GEO Intelligence SHALL own one immutable Definition for each Brand evaluation fingerprint and SHALL prepare AI-generated questions through a durable, idempotent lifecycle before an official evaluation may start.

#### Scenario: A ready Brand enters diagnosis without a Definition

- **WHEN** an authenticated terminal customer prepares diagnosis for an active, account-owned, evaluation-ready Brand
- **THEN** GEO freezes the current `brand-evaluation-snapshot@3`
- **AND** creates or returns one `PREPARING` question preparation for the Brand and fingerprint
- **AND** freezes the Query Prompt and model-output contract used by that preparation
- **AND** commits one durable preparation-requested Outbox fact in the same transaction
- **AND** repeated or concurrent requests return the same preparation without another business identity.

#### Scenario: A current ready Brand is saved or selected

- **WHEN** the Web successfully creates, updates, or selects the current Brand
- **AND** the returned Brand is evaluation-ready
- **THEN** the Web immediately asks GEO to ensure question preparation for that Brand and fingerprint
- **AND** the request waits only for durable preparation and Outbox persistence, not for model completion
- **AND** repeated save, selection, or diagnosis requests remain idempotent
- **BUT WHEN** the Brand is incomplete or not current
- **THEN** the Web does not prewarm question generation
- **AND** a failed prewarm request does not turn a successful Brand mutation into a failure because diagnosis retains the authoritative ensure path.

#### Scenario: Query receives its frozen input

- **WHEN** the Query Agent prepares the four questions
- **THEN** it receives only a GEO-owned projection containing company name, broader recommendation subject, city label, terminal-region label, typed Query locality, flagship product or service, and all two through six peer characteristics
- **AND** it does not receive coordinates, exact address, Provider provenance, Brand persistence, or live Amap contracts
- **AND** `ADDRESS_LOCALITY` remains an address locality rather than being relabelled as a business area.

#### Scenario: One Agent returns the final four questions

- **WHEN** Query generation succeeds
- **THEN** the model returns one natural target-brand name and exactly one final string for each of the four question roles
- **AND** the brand-directed question contains the natural target-brand name
- **AND** the three open questions contain neither the natural target-brand name nor the full company name
- **AND** the three open questions use the concrete location and flagship product or service as their discovery context
- **AND** the two characteristic questions use the complete peer set to form two complementary user-need scenarios without requiring full characteristic coverage
- **AND** GEO assigns the existing fixed kinds and ordinals and atomically accepts one immutable Definition.

#### Scenario: The Agent chooses a natural brand name

- **WHEN** the legal company or store name is less natural than a consumer-recognizable short form
- **THEN** the Agent may use the full name or a meaningful continuous substring of it
- **AND** program validation rejects an invented alias or a direct question that omits the chosen name
- **AND** naturalness and brand distinctiveness remain Prompt and product-review responsibilities rather than a generic word blacklist.

#### Scenario: Query generation cannot produce a complete accepted result

- **WHEN** a Provider attempt fails or its structured output violates the accepted model or brand-name boundary
- **THEN** the failed attempt remains append-oriented evidence
- **AND** the bounded route policy may schedule the next attempt without resampling or creating a Definition
- **BUT WHEN** all attempts are exhausted
- **THEN** the preparation becomes `PLEASE_RETRY`
- **AND** the customer may explicitly start one new sequence for the same fingerprint
- **AND** no official evaluation opportunity is consumed.

#### Scenario: An earlier sequence completes late

- **WHEN** a stale sequence produces a late success after another explicit retry has advanced the preparation
- **THEN** conditional acceptance rejects the stale result
- **AND** it cannot replace the current sequence or create a second Definition.

#### Scenario: An existing Definition already owns the fingerprint

- **WHEN** a deterministic or Agent-generated Definition already exists for the same Brand and fingerprint
- **THEN** diagnosis returns that Definition
- **AND** creates no preparation, Provider attempt, or replacement question set.

### Requirement: Honest diagnosis entry

The Web SHALL expose only durable customer states for question preparation and SHALL not reveal internal AI execution.

#### Scenario: Questions are being prepared

- **WHEN** the current fingerprint has a `PREPARING` preparation and no Definition
- **THEN** the page shows a concise preparing state
- **AND** the customer may leave and later return without losing progress
- **AND** Prompt, Provider, model, route, attempt, queue, trace, candidate, and internal failure details remain hidden.

#### Scenario: Questions are ready

- **WHEN** one accepted Definition exists
- **THEN** the page shows only the final four read-only questions, five platform labels, and the explicit start action
- **AND** exposes no edit, refresh, candidate-selection, or question-history capability.

#### Scenario: Question preparation requires retry

- **WHEN** the current preparation is `PLEASE_RETRY`
- **THEN** the page shows the short customer state `请重试`
- **AND** one explicit action starts the next durable preparation sequence.
