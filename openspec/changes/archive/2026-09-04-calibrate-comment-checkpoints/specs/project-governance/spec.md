# Project Governance Delta

## ADDED Requirements

### Requirement: Tracking comments preserve material coordination history

Issue and pull-request comments SHALL preserve material chronological evidence
without becoming a second current specification, task tracker, or session
diary. Issue and pull-request bodies SHALL remain the current transaction
snapshots, and accepted durable knowledge SHALL be promoted to its canonical
owner.

#### Scenario: A material checkpoint changes the next action

- **WHEN** a decision, coherent delivery result, Gate or failure, integration
  change, agent coordination result, handoff, or closeout changes what another
  reader may do next
- **THEN** the owning Issue or pull request SHALL receive one bounded checkpoint
  naming the revision and evidence, impact, next owner and action, unresolved
  authority boundary, and updated or linked canonical owner
- **AND** outcome, decision, acceptance, dependency, and owner changes SHALL be
  owned by the Issue, while revision, Diff, review, Check, base, merge, and
  branch-exit evidence SHALL be owned by the pull request; a cross-cutting event
  SHALL be published once and linked from the other transaction
- **AND** a correction SHALL link the superseded checkpoint and update the
  current body or canonical owner when the prior statement became inaccurate
- **AND** routine progress, native commit or Check events, credentials,
  sensitive raw evidence, large logs, transcripts, and hidden reasoning SHALL
  NOT be copied into the timeline

#### Scenario: A producer result affects another agent

- **WHEN** one agent's stable result changes another Issue, branch, Worktree, or
  agent's assumptions or next action
- **THEN** the producer SHALL publish one canonical coordination checkpoint in
  the artifact that owns the changed contract
- **AND** each consumer SHALL link that exact checkpoint, record only its local
  impact, and recheck the revision and live coordination/workspace state before
  writing
- **AND** implementation tasks, independent delivery slices, later outcomes,
  and planning order SHALL remain in the active Change, Sub-Issue, Follow-up
  Issue, and Project respectively rather than in comment-only checklists
- **AND** pull-request line findings SHALL remain in review conversations until
  resolved, rejected with evidence, or moved to a linked Follow-up
