# Evaluation Evidence Delta

## MODIFIED Requirements

### Requirement: Provider failures respect purpose policy

Transport, provider, and semantic failures SHALL remain explicit attempts whose
next action is owned by GEO Intelligence, while an otherwise valid parser
proposal SHALL not consume another attempt solely because its customer card
copy is a pure structural fragment.

#### Scenario: A parser proposal contains unreadable customer card copy

- **WHEN** a structurally valid proposal supplies `cardInterpretation` with no
  customer-readable letter or numeral
- **THEN** the deterministic model-to-domain projector replaces only that field
  with concise formal prose derived from the accepted mention and open-position
  facts
- **AND** a non-mention becomes `该回答未提及当前品牌。`
- **AND** readable model prose passes through unchanged
- **AND** Prompt and schema instructions require customer prose as the normal
  Agent output rather than relying on the fallback
- **AND** target mention, open position, evidence, retry, readiness, persistence,
  and report-projection semantics remain unchanged.
