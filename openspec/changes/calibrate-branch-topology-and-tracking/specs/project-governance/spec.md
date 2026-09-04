# Project Governance Delta

## Added Requirements

### Requirement: Delivery topology follows dependency and acceptance boundaries

Protected `main` SHALL be the default merge target. A Stacked PR SHALL represent
a linear dependency chain. A parent-scoped Integration Branch SHALL be used
only when parallel slices cannot safely enter `main` independently and require
one combined acceptance or rollback boundary.

#### Scenario: A large parent outcome has several child slices

- **WHEN** a slice is independently acceptable and compatible
- **THEN** it SHALL merge through protected `main`
- **BUT WHEN** one slice genuinely depends on the immediately lower branch
- **THEN** it MAY use a linear Stacked PR
- **BUT WHEN** parallel slices require atomic acceptance
- **THEN** they MAY use one short-lived Integration Branch with a parent Issue,
  integration owner, fixed interfaces, main-equivalent checks and review,
  current-main synchronization, final Gate, and delete-after-merge exit
- **AND** the project SHALL NOT maintain a permanent shared `dev` branch

### Requirement: Base changes invalidate affected integration evidence

#### Scenario: A PR changes base or stack position

- **WHEN** a PR moves between a non-default branch and the default branch, or
  changes its stack position
- **THEN** its affected Diff, review, CI, closing relationship, Issue acceptance,
  and workspace exit SHALL be re-evaluated before merge
- **AND** a non-default-base PR SHALL remain Partial or ordinarily referenced

### Requirement: Human discussion identifies coordinated work readably

#### Scenario: An Issue or PR first appears in a human-facing decision

- **WHEN** an agent first references the item in a response or decision section
- **THEN** it SHALL include both the number and current title
- **AND** later references MAY use the number alone after context is clear

## Modified Requirements

### Requirement: Final and non-final Issue relationships remain distinct

Native closing links SHALL be used only when merging into the default branch
should immediately close the fully accepted Issue. Partial, Review Gate,
research, decision, release-gate, or manual-operation work MAY correctly have no
native `Development` relationship. Work with no code transaction MAY close from
an explicit owner decision and durable evidence without an artificial PR.
