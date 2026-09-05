# Evaluation Report Delta

## MODIFIED Requirements

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
