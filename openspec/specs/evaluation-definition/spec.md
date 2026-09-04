# Evaluation Definition and Start Specification

## Purpose

Define the accepted behavior that turns one evaluation-ready Brand revision
into a recoverable AI-generated four-question Definition and atomically starts
one official run with twenty business sample identities. Evidence processing
and reporting remain owned by their separate specifications.

## Requirements

### Requirement: Stable definition ownership

GEO Intelligence SHALL own one immutable Definition for each Brand evaluation
fingerprint and SHALL prepare its questions through one durable lifecycle,
while Brand Knowledge remains the only owner of editable Brand facts and
fingerprint meaning.

#### Scenario: A ready Brand enters diagnosis without a Definition

- **WHEN** an authenticated terminal customer prepares diagnosis for an active,
  account-owned, evaluation-ready Brand
- **THEN** GEO Intelligence freezes `brand-evaluation-snapshot@3` and the Brand
  Knowledge fingerprint in one `PREPARING` question preparation
- **AND** the snapshot includes maintained industry identity, verified Store
  Location and Query locality, flagship product or service, and two through six
  canonical peer characteristics
- **AND** the preparation freezes the Query Prompt and model-output contract
- **AND** one durable preparation-requested Product Outbox fact commits in the
  same transaction
- **AND** repeated or concurrent requests for the same Brand and fingerprint
  return the same preparation without another business identity or synchronous
  Provider call.

#### Scenario: Query consumes the frozen Brand context

- **WHEN** the Query Agent prepares question wording
- **THEN** it receives only a GEO-owned projection containing company name,
  maintained recommendation subject, city, terminal region, typed Query
  locality, flagship product or service, and all peer characteristics
- **AND** coordinates, exact address, Provider provenance, Brand persistence,
  and live Amap contracts remain outside the Prompt
- **AND** an `ADDRESS_LOCALITY` remains a nearby address location rather than
  being relabelled as a business area.

#### Scenario: One Agent returns the final four questions

- **WHEN** Query generation succeeds
- **THEN** the model returns one natural target-brand name and exactly one final
  question string for each of the four established roles
- **AND** the brand-direct question uses the natural target-brand name and asks
  about the Brand's main business, product or service, and overall performance
- **AND** the three open questions contain neither that target-brand name nor
  the full company name
- **AND** all three open questions use the concrete location and flagship
  product or service, while the two characteristic questions form
  complementary user-need scenarios from the complete peer set
- **AND** GEO assigns the established fixed kinds and ordinals
- **AND** the accepted question set, five-platform policy, Query identity, and
  objectivity-profile identity commit as one immutable Definition linked to the
  successful attempt.

#### Scenario: Query generation cannot produce an accepted result

- **WHEN** a Provider attempt fails or its structured result violates the model
  or target-brand-name boundary
- **THEN** the attempt remains append-oriented evidence
- **AND** the bounded route policy may schedule the next attempt without
  creating a Definition or consuming an official evaluation opportunity
- **BUT WHEN** all attempts are exhausted
- **THEN** the preparation becomes `PLEASE_RETRY`
- **AND** an explicit customer retry opens one new sequence for the same
  fingerprint
- **AND** a result from an earlier sequence cannot create or replace the current
  Definition.

#### Scenario: The current Brand information changes

- **WHEN** a contact-only field changes
- **THEN** diagnosis returns the existing preparation or Definition
- **BUT WHEN** an evaluation-relevant field changes
- **THEN** the next preparation uses the new fingerprint and frozen snapshot
- **AND** every previous snapshot, preparation, and accepted question set
  remains unchanged
- **AND** an unstarted Definition whose fingerprint is no longer current cannot
  start an official run.

#### Scenario: An existing Definition already owns the fingerprint

- **WHEN** a Definition already exists for the same Brand and fingerprint
- **THEN** diagnosis returns that Definition
- **AND** creates no preparation, Provider attempt, or replacement question set.

### Requirement: Atomic official start

GEO Intelligence SHALL create the official run, expected samples, and reliable
start fact in one local database transaction without an external call.

#### Scenario: The customer confirms the displayed Definition

- **WHEN** the current account starts an eligible Definition
- **THEN** one evaluating run, exactly twenty four-by-five sample identities, and
  one pending `evaluation.run.started` Product Outbox fact commit together
- **AND** every sample is constrained to a question and run from the same frozen
  Definition
- **AND** a duplicate start returns the same active run without duplicating
  samples or events
- **AND** a Brand can have at most one evaluating run and a Definition can have
  at most one official run
- **AND** Provider invocation and report completion are not part of the start
  transaction.

### Requirement: Honest diagnosis entry

The Web SHALL expose only durable customer states for question preparation and
official evaluation.

#### Scenario: A customer opens AI-search diagnosis

- **WHEN** no current Brand exists or its required evaluation information is
  incomplete
- **THEN** the page explains the prerequisite and returns the customer to Brand
  work
- **BUT WHEN** the current fingerprint has a `PREPARING` preparation and no
  Definition
- **THEN** the page shows concise question preparation and allows the customer
  to leave and return
- **BUT WHEN** the preparation is `PLEASE_RETRY`
- **THEN** the page shows `请重试` and one explicit preparation-retry action
- **BUT WHEN** the Definition is ready and no run exists
- **THEN** the page shows only four read-only questions, five platform labels,
  and one explicit start action
- **BUT WHEN** the run has started
- **THEN** the page shows durable progress through the evaluation-evidence
  public contract
- **AND** Prompt, Provider, model, route, attempt, queue, trace, internal failure,
  and discarded model-output details remain hidden.

## Current environment boundary

Query uses a versioned repository-owned no-search Prompt and compact structured
model contract. Real execution uses Model Studio `qwen3.8-flash` for attempts
one and two with `medium` reasoning effort, then TokenHub `hy3` as the
third-attempt fallback. Deterministic Query output exists only in the test
adapter and is not a customer recovery path.

The bounded real Query review accepted the Prompt across restaurant,
enterprise-service, and consumer-electronics stores and retained one recovered
Qwen timeout as operational evidence. This proves the Query contract and
bounded recovery path, not production capacity, commercial data readiness, or
the separate representative 4-by-5 Integration Gate.
