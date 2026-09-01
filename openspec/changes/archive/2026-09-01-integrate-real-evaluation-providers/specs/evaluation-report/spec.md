# Evaluation Report Delta

## Added Requirements

### Requirement: Real semantic execution preserves deterministic report truth

Real interpretation and overall analysis SHALL satisfy the existing semantic
contracts without acquiring authority over customer-visible metrics or report
history.

#### Scenario: Real interpretation and overall analysis succeed

- **WHEN** real structured outputs pass local schema and semantic validation
- **THEN** GEO Intelligence accepts them through the same immutable evidence,
  interpretation, synthesis, and report records used by deterministic S1-S5
- **AND** program logic alone calculates counts, rates, positions, recommendation
  index, coverage, and platform comparisons
- **AND** provider prose cannot add unsupported evidence, revise a metric, hide a
  missing sample, or replace a complete original answer

#### Scenario: Structured output remains invalid after fallback

- **WHEN** primary retry and approved fallback fail schema or semantic validation
- **THEN** the existing missing-sample or synthesis-retry outcome is used
- **AND** no partial, repaired-by-program, or manually accepted AI conclusion is
  presented as an official report
