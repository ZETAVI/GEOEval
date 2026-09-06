# GEO Optimization Delta

## ADDED Requirements

### Requirement: One current-brand optimization workspace

GEO Optimization SHALL provide one terminal-customer workspace over the current
Brand, latest successful guidance and current core article.

#### Scenario: A customer opens the workspace

- **WHEN** an authenticated terminal customer opens AI-search optimization
- **THEN** the page reads the current account-owned Brand
- **AND** presents latest customer-safe direction, existing Brand information,
  writing supplements and the current article in one vertical journey
- **AND** existing fields are prefilled from Brand rather than copied into an
  Optimization-owned profile
- **AND** another account, agent, operations user or administrator cannot mutate
  the customer's optimization state through this customer contract.

#### Scenario: Brand or guidance is unavailable

- **WHEN** there is no current Brand, no successful guidance, or Article
  Information is incomplete
- **THEN** the page presents the precise next customer action
- **AND** permits valid explicit draft saves where applicable
- **AND** does not fabricate direction, material processing or generation
  success.

### Requirement: Writer input is frozen once and resolved before invocation

GEO Optimization SHALL own one immutable WriterInputSnapshot for a generation
and SHALL keep Writer independent of upstream repositories.

#### Scenario: The customer starts a generation

- **WHEN** the saved current Brand is generation-ready and successful guidance
  exists
- **THEN** GEO Optimization freezes one Brand Writer-purpose projection
- **AND** references the immutable Evaluation guidance and generation policy
- **AND** records Brand revision and writing-context fingerprint
- **AND** uses `preparedMaterialDigest: null` in this Change
- **AND** resolves a strict provider-neutral Request before invoking Writer
- **AND** Writer receives no repository, raw file, complete report, score,
  original answer, Prompt trace or customer contact information.

#### Scenario: The same generation is technically retried

- **WHEN** a recoverable execution retry is requested
- **THEN** it reuses the same WriterInputSnapshot
- **AND** does not silently use newer Brand, guidance or material input
- **AND** does not create another customer generation action.

### Requirement: First delivery uses a deterministic local Writer

The first GEO Optimization delivery SHALL generate one structurally valid core
article without invoking a real Provider.

#### Scenario: Mock generation succeeds

- **WHEN** GEO Optimization calls the deterministic Writer Adapter with a valid
  Request
- **THEN** it returns one deterministic non-empty title and one complete
  Markdown body derived from the accepted input
- **AND** the Result contains no title candidates, summary, keywords, platform
  variants or customer-selectable style
- **AND** no Provider, model, Prompt/Skill selection, token, cost or production
  success is claimed.

#### Scenario: Mock generation fails

- **WHEN** the Adapter returns or throws a controlled failure
- **THEN** the execution records a technical failure
- **AND** any existing current article remains unchanged
- **AND** the customer can retry the same Snapshot without re-entering data.

### Requirement: Generation is idempotent and separate from article state

GEO Optimization SHALL persist generation execution independently from the
current article business state.

#### Scenario: A customer starts one generation

- **WHEN** the customer submits one idempotency key with the saved Brand revision
  and any current expected article revision
- **THEN** one generation execution becomes active for that Brand
- **AND** duplicate submission of the same key returns that execution
- **AND** a second active generation does not invoke Writer again
- **AND** Writer work runs outside a long database transaction.

#### Scenario: Input becomes older while generation runs

- **WHEN** the customer explicitly saves newer Brand writing facts or newer
  guidance/material context becomes available before completion
- **THEN** a successful result may still become the current draft from its
  frozen Snapshot
- **AND** the page derives and shows a concise non-blocking freshness notice
- **AND** the notice does not block editing, confirmation or Future Order
  handoff
- **AND** the system never starts another Writer call automatically.

#### Scenario: The article changed after replacement authorization

- **WHEN** a regeneration result completes but the current article revision no
  longer matches the revision explicitly authorized for replacement
- **THEN** the result is not applied to the current article
- **AND** the existing article remains unchanged
- **AND** the execution exposes one recoverable not-applied outcome
- **AND** it does not become a customer-visible candidate history.

### Requirement: One current core article uses explicit saves

Each Brand SHALL have at most one current unsubmitted core article with one
title, one complete body, one status and one revision.

#### Scenario: First generation becomes a draft

- **WHEN** the first generation succeeds
- **THEN** GEO Optimization creates one `DRAFT` article referencing its accepted
  generation
- **AND** no separate candidate or customer-visible history is created.

#### Scenario: A customer edits and saves

- **WHEN** the customer changes title or body and explicitly saves with the
  current expected revision
- **THEN** the article is validated and its revision increments once
- **AND** an already confirmed article returns to `DRAFT`
- **AND** unsaved browser content does not mutate server state
- **AND** a stale expected revision cannot overwrite newer content.

#### Scenario: A customer confirms

- **WHEN** the customer confirms the exact current saved article revision
- **THEN** its status becomes `CONFIRMED`
- **AND** confirmation records that exact revision
- **AND** unsaved local edits or a stale revision cannot be confirmed.

#### Scenario: A customer regenerates an existing article

- **WHEN** a current article exists and the customer requests generation again
- **THEN** the page explains that success will replace the current article
- **AND** requires explicit replacement authorization for the current revision
- **AND** keeps the existing article unchanged until generation succeeds
- **AND** successful replacement increments the article revision and returns it
  to `DRAFT`
- **AND** failure never removes the current article.

### Requirement: Freshness is informative and confirmation is decisive

GEO Optimization SHALL distinguish content freshness from write integrity.

#### Scenario: Current inputs differ from the article source

- **WHEN** Brand writing facts, successful guidance or future material content
  is newer than the article's generation Snapshot
- **THEN** the page shows a concise freshness notice
- **AND** the article remains editable and confirmable
- **AND** a confirmed article remains eligible for Future Order handoff
- **AND** no automatic regeneration or mandatory re-evaluation occurs.

### Requirement: Future Order receives only an exact confirmed article

GEO Optimization SHALL expose a narrow read boundary for later Publishing
Commerce without creating an order in this Change.

#### Scenario: Future commerce requests an article source

- **WHEN** the account owns the Brand and its current article is confirmed
- **THEN** GEO Optimization returns Brand ID, article ID and confirmed revision
- **AND** a future Order owner can use that reference to freeze its own immutable
  purchase snapshot
- **AND** freshness notices do not block the handoff
- **AND** draft, stale-revision or cross-account references are rejected.
