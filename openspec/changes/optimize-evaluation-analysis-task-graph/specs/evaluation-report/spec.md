# Evaluation Report Delta

## MODIFIED Requirements

### Requirement: Controlled report-oriented analysis

The controlled experiment SHALL produce distinct sample-card summaries, target
content points with polarity, brand-name resolution/filtering, performance
assessment, brand perception, feature themes and media-content directions.
This delta does not activate or migrate the formal runtime report contract.

#### Scenario: Open and direct questions feed report analysis

- **WHEN** a valid fresh answer is parsed with its original question and kind
- **THEN** one full cleaned text enters the appropriate single-call parser
- **AND** the sample card remains separate from sufficiently informative points
- **AND** direct answers do not become open rankings or competitor occurrences.

#### Scenario: Resolution precedes full composition

- **WHEN** the report-oriented experiment has accepted first-layer results
- **THEN** every competitor input record receives a name or explicit null
- **AND** missing assignments reject the result rather than silently filter
- **AND** composition receives program-owned occurrence/position statistics
  and target content, without raw answers or full competitor descriptions
- **AND** it distinguishes performance assessment from brand perception.

#### Scenario: A feature has several points in one answer

- **WHEN** synthesis associates known content points with a feature
- **THEN** program support counts each distinct sample once
- **AND** unknown references reject the result
- **AND** malformed upstream results never become unmentioned valid samples.

### Requirement: Model output does not become report truth

GEO Intelligence SHALL preserve deterministic metrics and accept reports only
after evidence-grounded semantic and reference validation.

#### Scenario: Synthesis consumes compressed context

- **WHEN** sample context is reduced
- **THEN** relevant source meaning, attribution, qualifiers and references remain
- **AND** generated card prose does not replace its underlying evidence
- **AND** valid JSON or a resolvable citation alone does not prove faithful prose.

#### Scenario: A semantic probe succeeds

- **WHEN** an isolated candidate passes a quality probe
- **THEN** customer-quality closure still requires actual report-path integration
- **AND** no topology may rewrite accepted samples, metrics or report history.
