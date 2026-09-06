# Brand Knowledge Delta

## MODIFIED Requirements

### Requirement: Peer extensible characteristics

Brand Knowledge SHALL store one collection of two through six peer
characteristics whose stable items contain an ID, title and optional writing
detail.

#### Scenario: A customer maintains characteristics

- **WHEN** the customer creates, edits, removes or reorders characteristics
- **THEN** each stored item has one server-owned stable ID, one normalized title
  and an optional normalized detail
- **AND** title retains the current 2–120-character and exact-duplicate rules
- **AND** a present detail is writing-only and contains 2–1000 normalized
  characters
- **AND** presentation order implies no Evaluation priority
- **AND** the customer can maintain two through six items without also entering
  a second core-strength or product-feature collection.

#### Scenario: Evaluation consumes structured characteristics

- **WHEN** Brand prepares the existing v3 Evaluation projection
- **THEN** it projects only canonical normalized titles
- **AND** IDs, details and presentation order do not enter the Evaluation
  snapshot or fingerprint
- **AND** changing a detail alone creates no Evaluation opportunity
- **AND** the one-time representation migration preserves the existing v3
  fingerprint whenever normalized titles did not change.

## ADDED Requirements

### Requirement: One revision controls the current Brand aggregate

Every update to current Brand facts SHALL use one optimistic-concurrency
revision rather than field-local or Article Information revisions.

#### Scenario: A customer explicitly saves Brand information

- **WHEN** the customer submits a Brand save with the current expected revision
- **THEN** Brand validates and writes the complete mutation atomically
- **AND** increments the Brand revision once
- **AND** returns the new revision and both purpose fingerprints
- **AND** no external or Writer call runs inside the transaction.

#### Scenario: A customer saves from stale information

- **WHEN** expected revision does not match the current Brand revision
- **THEN** no field is overwritten
- **AND** the customer receives a recoverable refresh-and-review conflict
- **AND** location verification checks remain part of the same Brand write rather
  than becoming a second general concurrency mechanism.

### Requirement: Brand owns progressive Article Information

Brand Knowledge SHALL own writing-only customer information as one strict value
object inside the same current Brand.

#### Scenario: A customer saves incomplete optimization information

- **WHEN** the customer explicitly saves Article Information before it is ready
  for generation
- **THEN** Brand stores the partial value object without changing Evaluation
  readiness
- **AND** the value object may contain an incomplete price choice, zero suitable
  customer/context items, optional positioning and optional supplemental
  background
- **AND** no automatic save, second Brand record, Article task copy or separate
  Article Information revision is created.

#### Scenario: Article Information becomes generation-ready

- **WHEN** the current Brand is Evaluation-ready, has one through five distinct
  normalized suitable customer/context phrases of 2–80 characters, and contains
  either a complete positive-integer RMB price range or a negotiated-price choice
- **THEN** Brand derives Article Information readiness as ready
- **AND** a range contains both minimum and maximum, maximum is not lower than
  minimum, and equal values mean a fixed price
- **AND** decimals, one-sided price, currency selection and pricing-unit text are
  rejected
- **AND** supplemental background remains optional and is limited to 2000
  normalized characters
- **AND** desired positioning remains optional, contains at most five distinct
  customer-confirmed items and bounds each item to 2–80 normalized characters.

### Requirement: Purpose fingerprints remain consumer-specific

Brand Knowledge SHALL derive Evaluation and Writer fingerprints from separate
normalized projections over the one current aggregate.

#### Scenario: Writing-only meaning changes

- **WHEN** a characteristic detail, price, suitable customer/context,
  supplemental background or desired positioning changes
- **THEN** `writingContextFingerprint` changes
- **AND** `evaluationFingerprint` remains unchanged
- **AND** no new Evaluation opportunity is created.

#### Scenario: A non-writing field changes

- **WHEN** only contact name or contact mobile changes
- **THEN** Brand revision changes after a successful save
- **AND** both purpose fingerprints retain their prior semantic values
- **AND** the current article is not described as based on older writing facts.

### Requirement: Brand exposes a frozen Writer-purpose projection

Brand Knowledge SHALL expose a narrow value projection for GEO Optimization
without exposing persistence or unrelated customer data.

#### Scenario: GEO Optimization prepares generation input

- **WHEN** an account-owned current Brand is generation-ready
- **THEN** Brand returns company/store name, controlled industry meaning,
  verified location, Featured Offering, characteristic titles/details,
  Article Information, Brand revision and writing fingerprint
- **AND** excludes contact name, mobile number, mutation internals and Brand
  repository access
- **AND** GEO Optimization may freeze that returned value but cannot query Brand
  tables or compute a competing readiness policy.
