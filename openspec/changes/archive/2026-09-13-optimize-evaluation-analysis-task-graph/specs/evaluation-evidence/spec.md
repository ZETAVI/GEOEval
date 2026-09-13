# Evaluation Evidence Delta

## ADDED Requirements

### Requirement: Complete-answer analysis

The evaluation runtime SHALL preserve canonical sampled answers while giving
the parser one complete derived reading string.

#### Scenario: A sampled answer is prepared for parsing

- **WHEN** a valid answer enters controlled analysis
- **THEN** the immutable original answer remains unchanged
- **AND** only recognized Markdown emphasis delimiters are removed
- **AND** headings, lists, tables, links, code, order and business content remain
- **AND** no artificial line number or line-object decomposition enters the model.

### Requirement: Brand-record interpretation

The sample parser SHALL report how the answer presents concrete brand
subjects without treating the focus name as proof of presence.

#### Scenario: An open answer is interpreted

- **WHEN** the answer introduces, compares or evaluates concrete brands
- **THEN** each distinct brand receives one record in first-appearance order
- **AND** later aliases or repeats enrich that record without changing its order
- **AND** content points preserve positive, neutral and negative meaning
- **AND** content points remain grounded in the answer without requiring line
  numbers, character offsets, occurrence indexes or byte-for-byte quotation
- **AND** an absent focus brand produces no focus record
- **AND** categories, unnamed objects and location-only names do not become brands.

#### Scenario: A directed answer is interpreted

- **WHEN** the question directly asks about the focus brand
- **THEN** at most one focus record is returned
- **AND** generic category content is not attributed to the brand without an
  identity relationship
- **AND** the result does not create an open-answer position or competitor row.

### Requirement: Original answer remains the customer evidence

#### Scenario: A semantic interpretation cannot be mapped to an exact highlight

- **WHEN** an otherwise accepted parser result has no reliable exact-text range
  in the immutable original answer
- **THEN** the sample remains valid and the full original answer remains visible
- **AND** presentation uses the existing unannotated-answer fallback
- **AND** the product does not retry parsing or platform acquisition solely to
  create a visual highlight.

### Requirement: Aggregate analysis preserves accepted predecessors

#### Scenario: Name resolution succeeds before report composition

- **WHEN** all terminal sample positions meet the report threshold and the
  name-resolution output passes its complete exclusive partition checks
- **THEN** the accepted resolution is stored once for the run
- **AND** deterministic logic restores its observed names to source records and
  calculates competitor statistics
- **AND** repeated delivery cannot accept a second resolution for the run.

#### Scenario: A later aggregate stage fails

- **WHEN** name resolution or report composition exhausts its bounded internal
  attempts
- **THEN** the run enters the existing customer-level action-required outcome
- **AND** a customer retry reuses every accepted earlier component
- **AND** a composition-only retry does not repeat name resolution, sample
  parsing or platform acquisition.

### Requirement: Customer-safe platform progress

#### Scenario: A customer reads an active evaluation

- **WHEN** the run is not yet complete
- **THEN** every fixed platform exposes expected, acquired, analyzed and
  unavailable counts derived from persisted sample state
- **AND** one phase is derived from question preparation, acquisition, parsing,
  name resolution, composition and report acceptance
- **AND** internal retries, routes, Providers, models, queue state, failures and
  trace identities remain absent
- **AND** completion and 100% require durable report acceptance.
