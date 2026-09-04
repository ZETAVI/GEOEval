# Project Governance Delta

## ADDED Requirements

### Requirement: Integration events do not infer planning completion

A review-backed change SHALL distinguish pre-integration reconciliation,
human-authorized integration, and post-integration reconciliation. GitHub link,
merge, and close events SHALL NOT by themselves make the owning Project item
`Done`.

#### Scenario: A Final PR integrates an accepted outcome

- **WHEN** verification and pre-integration reconciliation make a Final PR ready
  for integration
- **THEN** the intended current truth, residual work, recovery, and workspace
  exit SHALL be explicit before human-authorized merge
- **AND** GitHub MAY close the owning Issue through the Final relationship
- **BUT** the Project item SHALL remain non-`Done` until the target revision,
  actual relationship, invalidated evidence, Change state, and workspace exit
  have been verified after integration and reconciled
- **AND** automation SHALL NOT infer `In Progress` or `Done` solely from a PR
  link, PR merge, or Issue close event

#### Scenario: Closeout remains after accepted integration

- **WHEN** the integrated outcome still needs default-branch verification or
  workspace exit
- **THEN** the Project item SHALL retain a non-`Done` owner and status
- **AND** the Issue SHALL be reopened only if original acceptance failed or its
  closure was factually premature
- **AND** a deliberately retained workspace SHALL name its owner, purpose,
  recovery boundary, and removal trigger

#### Scenario: A non-code outcome completes

- **WHEN** a research, decision, release-gate, or human-operation Issue has
  accepted durable evidence and completed reconciliation
- **THEN** an explicit transition to `Done` MAY trigger Issue closure
- **AND** no artificial PR SHALL be created for that transition
