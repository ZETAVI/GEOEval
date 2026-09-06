# GEO Optimization Delta

The accepted backend lifecycle is owned by the current
[GEO Optimization specification](../../../../../specs/geo-optimization/spec.md).
This remaining delta activates its terminal-customer HTTP and Web journey.

## ADDED Requirements

### Requirement: Customer API exposes the current optimization workspace

GEO Optimization SHALL provide terminal-customer REST contracts over the current
Brand workspace and its existing backend commands without exposing internal
Writer or persistence state.

#### Scenario: A terminal customer reads the workspace

- **WHEN** an authenticated terminal customer opens AI-search optimization
- **THEN** one combined read returns the current Brand information, latest
  customer-safe Evaluation direction, current Core Article, customer-safe latest
  generation status and freshness notices
- **AND** no current Brand, no guidance and incomplete Article Information each
  produce an honest actionable state
- **AND** Writer guidance, Snapshot, request, idempotency key, fingerprints,
  contacts and Provider internals remain excluded
- **AND** another account, agent, operations user or administrator cannot use the
  terminal-customer mutation contract.

#### Scenario: The customer invokes a command

- **WHEN** the customer generates, retries, saves or confirms through REST
- **THEN** the generated OpenAPI/client contract carries every required Brand or
  article revision and generation idempotency key
- **AND** domain conflicts become recoverable customer actions rather than raw
  database or Writer errors
- **AND** polling or repeat submission observes durable execution state without
  another automatic Writer call.

### Requirement: One responsive page preserves explicit customer control

The AI-search optimization page SHALL present current Brand completion,
Evaluation direction and one current Core Article as one responsive vertical
journey without auto-saving customer input.

#### Scenario: The customer completes writing information

- **WHEN** the current Brand exists but Article Information is incomplete
- **THEN** existing Brand fields are prefilled rather than copied into a second
  profile
- **AND** characteristic details, price, suitable customer/context items,
  supplemental background and desired positioning use the Brand-owned contract
- **AND** local changes remain visibly dirty until the customer selects Save
- **AND** generation remains unavailable until the saved Brand is ready.

#### Scenario: Generation is running or fails

- **WHEN** a generation is `RUNNING`
- **THEN** repeat Generate is disabled without locking Brand editing or the whole
  page
- **AND** a Brand save may make the running input older but never starts another
  Writer call
- **BUT WHEN** generation is `FAILED` or `NOT_APPLIED`
- **THEN** the page shows one safe retry, reload or review action while preserving
  the current article.

#### Scenario: The customer regenerates an existing article

- **WHEN** one current article already exists
- **THEN** the page explains that successful generation will replace it
- **AND** proceeds only after the customer authorizes its exact revision
- **AND** keeps the article visible until replacement succeeds
- **AND** never exposes a discarded result as candidate history.

#### Scenario: The customer edits and confirms

- **WHEN** title or body has local unsaved changes
- **THEN** the page does not silently replace or confirm the local buffer
- **AND** explicit Save carries the exact article revision
- **AND** Confirm is available only for the exact saved revision with no local
  dirty state
- **AND** editing a confirmed article visibly returns it to draft after save.

#### Scenario: The page previews generated or saved Markdown

- **WHEN** the current article body is rendered outside its plain-text editor
- **THEN** the page uses a safe Markdown projection with raw HTML execution
  disabled
- **AND** customer or generated content cannot inject script, iframe or an
  unreviewed active embed.

#### Scenario: Current inputs are newer

- **WHEN** Brand or guidance freshness differs from the article Snapshot
- **THEN** the page shows one concise non-blocking notice
- **AND** the article remains editable, confirmable and eligible for the later
  confirmed-reference handoff
- **AND** no automatic regeneration or mandatory re-evaluation occurs.
