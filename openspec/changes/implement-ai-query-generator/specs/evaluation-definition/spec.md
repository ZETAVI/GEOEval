# Evaluation Definition Delta

## MODIFIED Requirements

### Requirement: Durable definition preparation

GEO Intelligence SHALL prepare one immutable Agent-generated definition for
each evaluation-ready brand fingerprint without requiring an external call to
finish inside the initiating HTTP request.

#### Scenario: A ready brand enters diagnosis

- **WHEN** an authenticated terminal customer first prepares diagnosis for an
  active, account-owned, evaluation-ready brand
- **THEN** the system atomically stores one evaluation-purpose brand snapshot,
  one idempotent preparation identity, and one reliable generation fact before
  returning
- **AND** repeated or concurrent preparation of the unchanged fingerprint
  returns that same preparation or its accepted definition
- **AND** duplicate delivery cannot send a second provider request for the same
  numbered generation attempt
- **AND** the customer may leave and later reopen the diagnosis page without
  losing accepted preparation state.

#### Scenario: The Query Agent produces a complete question set

- **WHEN** one accepted structured Agent response contains the selected
  brand-directed, industry-recommendation, characteristic-one, and
  characteristic-two questions
- **THEN** the system atomically creates one immutable definition and its four
  ordered questions from that selected set
- **AND** only those four questions become business truth
- **AND** candidate alternatives and selection notes remain protected technical
  evidence rather than customer-visible questions.

#### Scenario: Generation does not produce an acceptable structure

- **WHEN** the primary route and its retry fail or return an invalid structural
  contract
- **THEN** the system uses the approved provider-distinct fallback as a new
  recorded attempt
- **BUT WHEN** the bounded route sequence is exhausted
- **THEN** the preparation becomes `please retry` without consuming an official
  evaluation opportunity
- **AND** one explicit retry resumes the same brand-fingerprint preparation in
  a new internal cycle rather than creating a second accepted definition.

#### Scenario: The brand changes during preparation

- **WHEN** an evaluation-relevant brand field changes while an earlier
  fingerprint is preparing
- **THEN** the earlier preparation and any accepted definition remain an
  immutable record of their snapshot
- **AND** the current diagnosis journey prepares the new fingerprint
- **AND** the existing stale-definition rule prevents the earlier definition
  from starting an official run.

### Requirement: Natural complete question-set meaning

The Query Agent SHALL produce the four questions as one coherent set from the
same frozen brand and industry context.

#### Scenario: The Agent constructs candidate angles

- **WHEN** the Agent receives the brand name, region, approved industry
  category and recommendation subject, and two brand characteristics
- **THEN** it may propose multiple candidate phrasings or angles for the four
  required roles and select the best complete set in the same response
- **AND** the selected questions use concise, natural Chinese similar to an
  ordinary person's real information or recommendation request
- **AND** they are specific enough to the brand context without sounding like a
  rigid field template or exposing internal question-role terminology.

#### Scenario: The application accepts Agent output

- **WHEN** the structured response is projected into the durable question set
- **THEN** program logic verifies only the required four roles, order,
  non-empty bounded content, structural schema, and the exact-name invariant
- **AND** the brand-directed question contains the current exact company or
  store name while the three open questions do not contain that exact name
- **AND** it does not replace product judgment with subjective keyword rules,
  alias expansion, style scoring, or a second automatic reviewer.

### Requirement: Honest preparation presentation

The Web SHALL distinguish question preparation from evaluation execution while
keeping both inside the existing diagnosis journey.

#### Scenario: Questions are still being prepared

- **WHEN** the current brand's preparation has not reached a terminal state
- **THEN** the diagnosis page shows a concise question-preparation state and
  refreshes from durable server state
- **AND** it does not show fabricated questions, model details, retry counts,
  queue state, or technical errors.

#### Scenario: Questions are ready or need a retry

- **WHEN** preparation is ready
- **THEN** the existing four-question review and explicit official-start action
  are shown
- **BUT WHEN** preparation is exhausted
- **THEN** the page shows a concise retry action that does not imply an
  evaluation was consumed.

## Dependency

The separate brand-reference-data activation change must first make Brand
Knowledge the executable industry owner, establish the maintained
province-city-terminal-region source, and expose one stable evaluation-purpose
projection. This delta consumes that projection and does not redefine industry
or region selection, persistence, fingerprint, or migration meaning.
