# GEO Optimization Specification

## Purpose

Define the accepted backend boundary that freezes one Writer input, executes a
deterministic local Writer outside database transactions, owns one current Core
Article per Brand, preserves explicit customer revisions, and exposes only a
confirmed article reference to future Publishing Commerce. Customer HTTP and Web
activation remain outside the current backend boundary.

## Requirements

### Requirement: Writer input is frozen once before invocation

GEO Optimization SHALL persist one immutable WriterInputSnapshot for every
customer generation action and SHALL keep Writer independent of upstream
repositories.

#### Scenario: A saved current Brand starts generation

- **WHEN** the account's current Brand is generation-ready, its expected revision
  matches and accepted Evaluation guidance exists
- **THEN** GEO Optimization resolves one strict versioned Writer Request before
  invocation
- **AND** the Snapshot records the source Brand revision and writing fingerprint,
  binds the immutable Evaluation guidance through its account/Brand-owned Run,
  and freezes the actual Request plus generation-policy identity, version and
  hash
- **AND** the Request contains `preparedMaterialDigest: null`
- **AND** the Request excludes contacts, repositories, complete reports, scores,
  sample IDs, evidence references, answers, Provider details and traces.

#### Scenario: A failed execution is retried

- **WHEN** a failed generation is explicitly retried
- **THEN** it reuses the same Snapshot and exact Writer Request
- **AND** increments only the technical attempt count
- **AND** does not silently read newer Brand, guidance or material input.

#### Scenario: A deterministic execution was abandoned

- **WHEN** a persisted `RUNNING` generation exceeds the bounded deterministic
  execution window and the customer explicitly retries it
- **THEN** the same generation and Snapshot start another technical attempt
- **AND** a recent `RUNNING` execution is only observed, not invoked again
- **AND** the later real-Writer change must replace this local timeout with its
  accepted ambiguity and cost policy.

### Requirement: The current Writer boundary is deterministic and fail-closed

The current backend SHALL provide one provider-neutral Writer Port with a
deterministic local Adapter and no real-Provider implementation.

#### Scenario: The deterministic Adapter receives a valid Request

- **WHEN** the Adapter is invoked with the supported generation policy
- **THEN** it returns one non-empty title and one complete Markdown body
  deterministically
- **AND** it produces no title candidates, summary, keywords, platform variants
  or customer-selectable style
- **AND** no model, Prompt/Skill choice, token, external cost or production
  success is claimed.

#### Scenario: Writer composition is unsafe or disabled

- **WHEN** an unknown Writer mode is configured or deterministic mode is selected
  for production
- **THEN** module composition fails before serving requests
- **AND** disabled mode never falls through to a Provider or deterministic
  production substitute.

### Requirement: Generation execution is idempotent and article-safe

GEO Optimization SHALL persist generation execution independently from Core
Article business state and SHALL permit at most one running generation per
Brand.

#### Scenario: A generation command is submitted

- **WHEN** one normalized idempotency key is submitted with the saved Brand
  revision and optional current article revision
- **THEN** the same Brand/key returns the original execution without another
  Writer call
- **AND** another key while a generation is running is rejected before Writer
  invocation
- **AND** Snapshot and `RUNNING` execution are committed before Writer runs
  outside the transaction.

#### Scenario: Writer fails or returns an invalid result

- **WHEN** Writer throws or its result violates the strict Result contract
- **THEN** the generation becomes `FAILED` with a customer-safe failure class
- **AND** any current article remains unchanged
- **AND** the failed generation can reuse its Snapshot through explicit retry.

#### Scenario: The authorized article revision changed during generation

- **WHEN** Writer succeeds but the current article no longer matches the exact
  replacement revision recorded by the generation
- **THEN** the generation becomes `NOT_APPLIED`
- **AND** the current article remains unchanged
- **AND** the result is discarded rather than retained as a candidate.

### Requirement: One current Core Article uses revision-conditional actions

Each Brand SHALL have at most one current unsubmitted Core Article with one
title, one Markdown body, `DRAFT | CONFIRMED` status and one content revision.

#### Scenario: First generation succeeds

- **WHEN** a Brand without an article completes generation
- **THEN** one `DRAFT` article is created at revision one
- **AND** it references the accepted generation and Snapshot source
- **AND** no candidate list or customer-visible article history is created.

#### Scenario: An existing article is regenerated

- **WHEN** the customer explicitly authorizes replacement using the exact current
  article revision and Writer succeeds before that revision changes
- **THEN** the same article row receives the generated title and body
- **AND** its revision increments once and status becomes `DRAFT`
- **AND** a missing or stale replacement revision cannot overwrite the article.

#### Scenario: The customer explicitly saves article content

- **WHEN** non-empty bounded title and Markdown body are saved with the exact
  expected revision
- **THEN** the article revision increments once
- **AND** a confirmed article returns to `DRAFT`
- **AND** confirmation metadata is cleared
- **AND** a stale or cross-account mutation changes nothing.

#### Scenario: The customer confirms a saved revision

- **WHEN** confirmation names the exact current article revision
- **THEN** status becomes `CONFIRMED` without changing the content revision
- **AND** the confirmation records that revision and time
- **AND** repeating the same confirmation is idempotent.

### Requirement: Workspace projection is customer-safe and freshness is advisory

GEO Optimization SHALL assemble one current-Brand workspace projection without
exposing protected Writer, Snapshot or Provider state.

#### Scenario: Current inputs differ from the article source

- **WHEN** the current Brand writing fingerprint or latest accepted guidance ID
  differs from the article's Snapshot
- **THEN** the projection reports separate Brand and guidance freshness facts
- **AND** returns customer-safe Brand fields, customer directions, execution
  status and current article
- **AND** excludes Writer guidance, Snapshot ID, idempotency key, fingerprints,
  contacts and Provider place internals
- **AND** freshness does not mutate, invalidate or block article confirmation.

#### Scenario: The account has no current Brand or no guidance

- **WHEN** no current Brand exists
- **THEN** the workspace returns an honest empty projection
- **BUT WHEN** a current Brand has no accepted guidance
- **THEN** Brand draft information remains readable and generation is unavailable
  without fabricating direction.

### Requirement: Future Order receives only an exact confirmed reference

GEO Optimization SHALL expose a narrow read boundary for future Publishing
Commerce without creating an order or freezing commercial data.

#### Scenario: Future Commerce requests an article source

- **WHEN** the account owns the Brand and its current article ID and revision are
  exactly confirmed
- **THEN** GEO Optimization returns account ID, Brand ID, article ID and revision
- **AND** draft, edited, stale-revision or cross-account references are rejected
- **AND** freshness does not block the confirmed reference.

## Current activation boundary

The GEO Optimization backend module and persistence contract are implemented and
verified but are not yet mounted in the customer API. Deterministic Writer mode
is local/test-only; real Writer, materials, Publishing Commerce, deployment and
production activation remain unavailable.
