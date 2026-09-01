# Project Governance Delta

## Added Requirements

### Requirement: Final and partial PR relationships remain distinct

The project SHALL use GitHub's native closing relationship only for the pull
request that owns an Issue's final acceptance transaction.

#### Scenario: One Issue advances through several reviewable transactions

- **WHEN** a PR completes the owning Issue's accepted outcome
- **THEN** it SHALL use `Closes #<owning-issue>` in the PR description
- **BUT WHEN** it delivers only part of that outcome
- **THEN** it SHALL use `Part of #<owning-issue> — does not close`
- **AND** a Review Gate MAY reference the integrated PR without owning an
  independent PR or native closing relationship

### Requirement: Requested review reaches a disposition before merge

A pull request SHALL NOT merge while a requested review remains in flight.

#### Scenario: Review returns a material finding

- **WHEN** a requested review finishes before merge
- **THEN** each material finding SHALL be fixed, explicitly rejected with
  evidence, or assigned to a durable follow-up that does not invalidate the
  approved result
- **AND** the work SHALL remain `Review / Decision` until that disposition is
  visible
