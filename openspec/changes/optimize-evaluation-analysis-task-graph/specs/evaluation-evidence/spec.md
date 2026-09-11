# Evaluation Evidence Delta

## ADDED Requirements

### Requirement: Controlled complete-answer analysis

The controlled candidate SHALL preserve canonical sampled answers while giving
the parser one complete derived reading string.

#### Scenario: A sampled answer is prepared for parsing

- **WHEN** a valid answer enters controlled analysis
- **THEN** the immutable original answer remains unchanged
- **AND** only recognized Markdown emphasis delimiters are removed
- **AND** headings, lists, tables, links, code, order and business content remain
- **AND** no artificial line number or line-object decomposition enters the model.

### Requirement: Controlled brand interpretation

The controlled parser SHALL report how the answer presents concrete brand
subjects without treating the focus name as proof of presence.

#### Scenario: An open answer is interpreted

- **WHEN** the answer introduces, compares or evaluates concrete brands
- **THEN** each distinct brand receives one record in first-appearance order
- **AND** later aliases or repeats enrich that record without changing its order
- **AND** content points preserve positive, neutral and negative meaning
- **AND** an absent focus brand produces no focus record
- **AND** categories, unnamed objects and location-only names do not become brands.

#### Scenario: A directed answer is interpreted

- **WHEN** the question directly asks about the focus brand
- **THEN** at most one focus record is returned
- **AND** generic category content is not attributed to the brand without an
  identity relationship
- **AND** the result does not create an open-answer position or competitor row.

### Requirement: Experimental evidence remains non-authoritative

#### Scenario: The controlled candidate succeeds

- **WHEN** its model output and local validation pass
- **THEN** the result remains experiment evidence
- **AND** it does not rewrite accepted samples, reports or runtime configuration.
