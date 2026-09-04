# Evaluation Evidence Delta

## MODIFIED Requirements

### Requirement: Provider failures respect purpose policy

Transport, provider, and semantic failures SHALL remain explicit attempts whose
next action is owned by GEO Intelligence, while recoverable optional parser
details SHALL not consume another Provider attempt.

#### Scenario: A parser proposal contains optional structural deviations

- **WHEN** a Provider-successful interpretation proposal contains an unresolved
  optional observation or other-brand quote, duplicate other-brand record,
  incomplete optional position pair, or excess per-category observations
- **THEN** the deterministic projector drops, deduplicates, normalizes, or
  bounds only that optional detail
- **AND** the complete sample remains acceptable when target mention and any
  open-query position are still grounded in the original answer
- **AND** no fuzzy evidence, invented alias, or invented position is created.

#### Scenario: A parser proposal lacks metric-critical evidence

- **WHEN** the proposal claims a target mention without any target form that
  literally occurs in the original answer, or claims an open-query mention
  without a positive position
- **THEN** canonical semantic validation rejects that exact attempt
- **AND** the existing bounded Qwen retry and Hy3 fallback policy remains in
  force.

#### Scenario: Interpretation uses bounded reasoning

- **WHEN** Model Studio Qwen3.8 Flash performs per-sample interpretation
- **THEN** the interpretation route uses low reasoning effort
- **AND** Query generation and overall synthesis retain their independently
  owned medium reasoning policies.
