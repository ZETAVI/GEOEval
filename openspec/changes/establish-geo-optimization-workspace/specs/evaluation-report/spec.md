# Evaluation Report Delta

## ADDED Requirements

### Requirement: GEO Optimization can read the latest successful guidance

Evaluation Report SHALL expose an account- and Brand-scoped read interface for
the latest accepted optimization guidance without exposing protected report
internals to Web.

#### Scenario: A customer enters GEO Optimization after a successful Evaluation

- **WHEN** GEO Optimization requests guidance for an account-owned Brand
- **THEN** Evaluation Report returns the latest accepted customer direction and
  one immutable internal guidance reference/value for server-side Writer input
- **AND** Web receives only the customer-safe direction
- **AND** complete report evidence, scores, answers, Provider details, Prompt,
  attempts and traces remain excluded.

#### Scenario: Brand information or Evaluation state is newer

- **WHEN** the current Brand differs from the guidance input or a newer
  Evaluation is running or awaiting retry
- **THEN** the latest successfully accepted guidance remains available to GEO
  Optimization
- **AND** the difference is a non-blocking freshness fact
- **AND** it does not invalidate a current article, force re-evaluation or block
  later article confirmation or purchase.

#### Scenario: No successful guidance exists

- **WHEN** the Brand has no accepted Evaluation guidance
- **THEN** GEO Optimization presents an honest no-guidance state
- **AND** article generation remains unavailable until the product's accepted
  journey prerequisite is met
- **AND** no direction or internal guidance is fabricated.
