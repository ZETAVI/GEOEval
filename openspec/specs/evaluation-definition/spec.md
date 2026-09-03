# Evaluation Definition and Start Specification

## Purpose

Define the accepted S2 behavior that turns one evaluation-ready brand revision
into a frozen four-question definition and atomically starts one official run
with twenty business sample identities. Evidence processing is owned by the
separate evaluation-evidence specification; reports and real-provider execution
remain later increments.

## Requirements

### Requirement: Stable definition ownership

GEO Intelligence SHALL own one immutable definition for each brand and
evaluation fingerprint, while Brand Knowledge remains the only owner of editable
brand facts and fingerprint meaning.

#### Scenario: A ready brand enters diagnosis

- **WHEN** an authenticated terminal customer prepares diagnosis for an active,
  account-owned, evaluation-ready brand
- **THEN** GEO Intelligence stores an immutable evaluation-purpose brand
  snapshot and the Brand Knowledge fingerprint
- **AND** `brand-evaluation-snapshot@3` freezes industry IDs and labels,
  catalog version, applicable `Other` phrase, recommendation subject, verified
  Store Location display/provenance/GCJ-02 coordinate, its derived official-
  region path, final Query locality, flagship product/service, and canonical
  peer characteristics supplied by Brand Knowledge
- **AND** stores one ordered brand-directed question, one industry question, and
  two characteristic questions
- **AND** stores the fixed five-platform policy, question-generator identity,
  and objectivity-profile identity
- **AND** repeated preparation of the unchanged fingerprint returns the same
  definition and questions, including under concurrent requests
- **AND** the public contract exposes no question-refresh operation or internal
  fingerprint, policy, model-route, or correlation identity

#### Scenario: The current brand information changes

- **WHEN** a contact-only field changes
- **THEN** preparation returns the existing definition
- **BUT WHEN** an evaluation-relevant field changes
- **THEN** preparation creates a new definition and leaves the previous snapshot
  and questions unchanged
- **AND** an unstarted definition whose fingerprint is no longer current cannot
  start an official run

#### Scenario: Query consumes the frozen Brand context

- **WHEN** Query Generator #26 prepares question wording
- **THEN** it receives a GEO-owned narrow projection containing the final
  locality, flagship value, recommendation subject, and peer characteristics
- **AND** coordinates, provider provenance, and exact address remain frozen
  evidence rather than Prompt instructions
- **AND** Query does not import Brand or Amap contracts.

### Requirement: Atomic official start

GEO Intelligence SHALL create the official run, expected samples, and reliable
start fact in one local database transaction without an external call.

#### Scenario: The customer confirms the displayed definition

- **WHEN** the current account starts an eligible definition
- **THEN** one evaluating run, exactly twenty four-by-five sample identities, and
  one pending `evaluation.run.started` product outbox fact commit together
- **AND** every sample is constrained to a question and run from the same frozen
  definition
- **AND** a duplicate start returns the same active run without duplicating
  samples or events
- **AND** a brand can have at most one evaluating run and a definition can have
  at most one official run
- **AND** provider invocation and report completion are not part of the start
  transaction

### Requirement: Honest diagnosis entry

The Web SHALL present the S2 definition and start state without fabricating
later evaluation progress or results.

#### Scenario: A customer opens AI-search diagnosis

- **WHEN** no current brand exists or its basic information is incomplete
- **THEN** the page explains the prerequisite and returns the customer to brand
  work
- **BUT WHEN** the current brand is ready and no run exists
- **THEN** the page shows four read-only questions, the five platform labels,
  and one explicit start action
- **BUT WHEN** the run has started
- **THEN** the page shows the durable run through the evaluation-evidence public
  progress contract without a fabricated score, sample result, or report

## Current environment boundary

Question generation is deterministic in S2. The confirmed shared objectivity
profile is owned by
[`apps/backend/geo-intelligence/evaluation-objectivity.json`](../../../apps/backend/geo-intelligence/evaluation-objectivity.json),
and the provider-validation harness consumes that same file. Real AI execution
requires the later authorized integration increment.
