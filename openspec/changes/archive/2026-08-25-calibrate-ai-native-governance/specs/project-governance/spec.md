# Project Governance Delta Specification

## ADDED Requirements

### Requirement: Additional control must change an action

A proposed check, artifact, abstraction, guard, or review round SHALL identify
the live uncertainty it addresses, a reachable failure, and the action that
would change based on its result.

#### Scenario: An agent proposes additional assurance

- **WHEN** the approved outcome is already supported by relevant evidence
- **AND** the proposed assurance would not change implementation, release,
  rollback, escalation, or risk acceptance
- **THEN** the agent SHALL stop the main task rather than add the assurance
- **AND** it MAY report the assurance as optional follow-up outside completion

### Requirement: Current design decomposes progressively

A current design owner SHALL be split only when accepted knowledge has distinct
owners or change cadence, or when an activating implementation change can move
the knowledge to a stable owner-local home.

#### Scenario: A large current document is not ready to split

- **WHEN** a current document is broad but its future owner-local boundaries are
  not yet stable
- **THEN** the document SHALL retain one visible `Evolution marker` naming the
  split trigger, target owner pattern, and responsible future change
- **AND** each standard or architectural close that touches the document SHALL
  resolve, update, or retain that marker explicitly
- **AND** file length alone SHALL NOT require a speculative split

### Requirement: Stable stages reconcile and retire working explanations

A standard or architectural stage SHALL review the active change and every
touched canonical owner when its approved outcome becomes stable.

#### Scenario: One stage is complete while later work remains

- **WHEN** accepted decisions and evidence have current owners
- **AND** remaining work has a different decision boundary or activation gate
- **THEN** the completed change SHALL be archived
- **AND** later work SHALL begin in a new change only when that outcome is ready
  to propose or authorize
- **AND** the completed change SHALL NOT remain active as a general backlog

### Requirement: Branches and worktrees have outcome-sized lifecycles

A write branch or worktree SHALL correspond to one independently mergeable
outcome and SHALL have a named owner, base, verification boundary, and exit
state.

#### Scenario: An agent begins related work

- **WHEN** an existing branch or worktree already owns the same outcome and its
  state is attributable to that work
- **THEN** the agent SHALL reuse it instead of creating a branch per agent,
  conversation, review, or handoff
- **AND** read-only research or review SHALL NOT require another branch
- **AND** on exit the owner SHALL record one lifecycle state defined by the
  [branch and worktree lifecycle](../../../../../../docs/process/human-agent-collaboration.md#branch-and-worktree-lifecycle)

## MODIFIED Requirements

### Requirement: Change closure reconciles design knowledge

A standard or architectural change SHALL NOT close until accepted behavior and
durable design knowledge are reconciled into their current owners, progressive
decomposition markers are resolved or retained with a concrete trigger, and
workspace exit state is known.

#### Scenario: Implementation or a stable decision stage is complete

- **WHEN** task-appropriate verification succeeds
- **THEN** the change SHALL record whether canonical design sources were
  updated, moved, split, merged, deleted, regenerated, or unaffected
- **AND** accepted truth SHALL NOT remain only in a change design, PR, or handoff
- **AND** the branch or worktree SHALL have an explicit integration, retention,
  handoff, or post-merge cleanup state
