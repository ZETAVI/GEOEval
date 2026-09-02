## MODIFIED Requirements

### Requirement: Model output does not become report truth

GEO Intelligence SHALL accept real parser and overall-synthesis output only
after deterministic projection into its canonical semantic contracts.

#### Scenario: Overall synthesis receives compact evidence

- **WHEN** GEO Intelligence prepares one overall-synthesis request
- **THEN** the model receives customer-meaningful brand context, deterministic
  performance facts, concise evidence observations, and request-local references
- **AND** it does not receive owner UUIDs, raw question-family or parser-profile
  enums, complete evidence-anchor structures, or duplicated competitor metrics
- **AND** program logic resolves accepted request-local references back to the
  immutable sample, observation, and brand-mention identities
- **AND** unknown, duplicate, or cross-group references fail canonical semantic
  acceptance rather than changing evidence

### Requirement: Evidence-preserving customer presentation

The report SHALL be understandable to a non-expert customer without exposing
internal analysis terminology or replacing evidence with decorative output.

#### Scenario: Overall synthesis writes customer narrative

- **WHEN** the model returns the report assessment, brand perception, theme, or
  optimization-direction copy
- **THEN** the instruction and strict output descriptions require formal,
  concise natural language grounded in the supplied evidence
- **AND** customer copy does not contain internal enums, field names, local or
  owner references, UUID fragments, or JSON structural residue
- **AND** the backend public-document boundary omits an unsafe optional theme or
  direction and uses restrained deterministic copy only where a required public
  section would otherwise expose an observed boundary failure
- **AND** the frontend does not repair or hide malformed backend narrative

#### Scenario: Overall synthesis groups compact brand candidates

- **WHEN** accepted sample interpretations contain repeated other-brand names
- **THEN** program logic folds exact formatting duplicates into compact
  candidates without deciding semantic identity
- **AND** the overall-synthesis Agent may group two or more candidates that are
  obvious aliases, abbreviations, store forms, or subordinate brand lines from
  the supplied answer context
- **AND** program logic expands each accepted candidate group to every retained
  source mention and preserves every ungrouped candidate as an independent group
- **AND** uncertain relations stay separate and the default request performs no
  external investigation
