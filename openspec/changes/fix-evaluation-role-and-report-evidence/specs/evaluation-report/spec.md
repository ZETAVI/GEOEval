## MODIFIED Requirements

### Requirement: Model output does not become report truth

GEO Intelligence SHALL accept real parser and report-composition output only
after deterministic projection into its canonical semantic contracts.

#### Scenario: Open parsing distinguishes query use from sentiment

- **WHEN** an open-answer parser identifies concrete brands in one complete
  sampled answer
- **THEN** it preserves each brand in first-appearance order and separately
  records the answer's sentiment and how each non-current brand is used for the
  current query
- **AND** a candidate is one the answer offers as a choice even when ordinary
  conditions or drawbacks are present
- **AND** a comparison, example, historical or background reference remains
  parsed but does not become a competitor occurrence
- **AND** a brand explicitly described as failing an important query constraint
  remains parsed but does not become a competitor occurrence
- **AND** the parser judges only the supplied question and answer and performs no
  external fact or branch verification
- **AND** deterministic program logic assigns competitor eligibility and
  recommendation positions from the accepted role rather than from sentiment

#### Scenario: Report composition uses sample-level provenance

- **WHEN** accepted name resolution and deterministic report facts are ready
- **THEN** report composition receives current-brand content grouped under
  stable sample references
- **AND** positive and negative themes and GEO directions identify their
  supporting samples without returning content-point identifiers
- **AND** program logic validates and restores those references and derives
  independent sample count and involved platforms
- **AND** the complete original platform answer remains the canonical evidence
  for customer review
- **AND** exact quote, line, occurrence, character and highlight anchors remain
  optional presentation aids rather than report-success requirements
