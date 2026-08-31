# Project Governance Delta

## Added Requirements

### Requirement: Planning state has one lightweight authority

The project SHALL use one repository-linked GitHub Project as the planning
projection for Status, Priority, ordering, and real target dates without
copying Issue, PR, OpenSpec, or current-design content.

#### Scenario: An Issue is recorded but not approved to start

- **WHEN** the Issue has no approved next action
- **THEN** its Project Status SHALL be `Backlog`
- **AND** it SHALL NOT receive a Branch or Worktree
- **AND** `blocked` SHALL be used only when a named dependency or decision
  actually prevents progress

### Requirement: Live coordination state is reconciled explicitly

Every open Issue SHALL have an Assignee, Project Status, and Priority, and a
standard or architectural close SHALL reconcile those fields with its PR,
Change, residual dependencies, and workspace exit.

#### Scenario: Implementation is ready but a human decision remains

- **WHEN** code and checks are ready but review, acceptance, or integration is
  still pending
- **THEN** the Project Status SHALL be `Review / Decision`
- **AND** the Issue and PR SHALL name the remaining decision
- **AND** the work SHALL NOT be described as complete

### Requirement: Parent and dependency relationships keep distinct meanings

Parent/Sub-Issue SHALL represent one parent outcome with independently
verifiable slices or Review Gates. Native Dependencies SHALL represent ordering
or blocking, and independently prioritizable outcomes SHALL be Follow-up Issues.

#### Scenario: A later outcome can be prioritized independently

- **WHEN** omitting the later outcome does not invalidate the original
  acceptance boundary
- **THEN** it SHALL NOT remain a required Sub-Issue of the original parent
- **AND** it SHALL use its own Project item and any genuine Dependency links

### Requirement: Sensitive execution evidence remains bounded

Sensitive, ignored, paid-call, or large runtime evidence SHALL use a short
manifest and explicit retention boundary rather than a permanent evidence
registry or copied raw responses in Git.

#### Scenario: Raw evidence cannot be committed

- **WHEN** a completion claim depends on local protected evidence
- **THEN** the active Change or Issue SHALL record its bounded purpose, date,
  sanitized result, locator, hash, owner, permissions, retention reason, and
  exit trigger
- **AND** the raw directory/file permissions SHALL be `0700`/`0600`
- **AND** reconciliation SHALL delete or explicitly retain it

### Requirement: Recovery branches are transitional

A recovery branch SHALL be retained only while an open Issue needs its unique
state and SHALL receive an explicit `retain`, `superseded`, `archive-tag`, or
`delete-after-merge` disposition.

#### Scenario: Formal work supersedes a recovery branch

- **WHEN** a current Issue-owned branch or merged current owner contains all
  required state
- **THEN** the recovery branch SHALL be deleted after verification
- **AND** immutable historical input MAY use a clearly named archive tag
- **AND** recovery branches SHALL NOT become the permanent history system
