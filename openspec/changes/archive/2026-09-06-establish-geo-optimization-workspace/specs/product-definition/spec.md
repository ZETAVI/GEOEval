# Product Definition Delta

## MODIFIED Requirements

### Requirement: Progressive brand-profile completion

The product SHALL let a terminal customer progressively complete one current
Brand for Evaluation and later core-article generation without maintaining a
second task-specific profile.

#### Scenario: A customer completes Article Information

- **WHEN** a customer enters AI-search optimization with an Evaluation-ready
  current Brand
- **THEN** the same Brand presents its existing name, industry, verified
  location, Featured Offering and characteristics
- **AND** allows optional characteristic details, one through five suitable
  customer/context phrases, an RMB integer range or negotiated-price choice,
  optional supplemental background and optional desired positioning
- **AND** does not require separate company/brand introductions, business-
  district selection, industry-position selection or duplicate core strengths
- **AND** uses an explicit save rather than automatic persistence
- **AND** derives separate Evaluation and article-generation readiness.

#### Scenario: Optional materials are not active in the first slice

- **WHEN** the #57 customer workspace is delivered
- **THEN** it contains no material upload, parsing, preparation or success UI
- **AND** Mock Writer receives no material content
- **AND** the provider-neutral Writer Request retains only one optional prepared
  Markdown seam for a later Brand Materials capability
- **AND** that later capability cannot require Writer to read raw files or own
  material-processing state.

### Requirement: Customer-confirmed optimization and publishing service

The product SHALL establish one customer-confirmed core article before a later
paid publishing order can freeze its content basis.

#### Scenario: A customer finishes the first optimization slice

- **WHEN** the customer has generated, explicitly saved and confirmed the
  current core article
- **THEN** the article's exact ID and revision are available to the later
  publishing-purchase journey
- **AND** a newer Brand or guidance freshness notice does not invalidate that
  customer confirmation
- **AND** #57 does not itself select packages/media, spend points, create an
  order or claim publication.
