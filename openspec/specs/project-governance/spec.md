# Project Governance Specification

## Purpose

Keep project intent, current behavior, design knowledge, decision history, execution evidence, and release communication distinct and maintainable during AI-native delivery.

This spec is the normative governance contract. The operational admission, update, retirement, and reconciliation procedure lives in [Design Knowledge](../../../docs/process/design-knowledge.md).

## Requirements

### Requirement: Design knowledge has an explicit authority

The project SHALL distinguish executable facts, current design documents, change designs, durable decision history, and execution evidence so that one concept does not acquire multiple active authorities.

#### Scenario: An agent needs an existing design

- **WHEN** an agent needs to understand or extend a product, module, component, API, data, or design-system boundary
- **THEN** it SHALL search the owning executable source and current design contract before creating a new design artifact
- **AND** it SHALL treat change folders, PRs, and handoffs as supporting context rather than current authority

### Requirement: Durable design documents pass an admission test

A new durable design document SHALL be created only when the knowledge has a clear owner, scope, and lifetime and cannot be represented more reliably by an existing canonical or executable source.

#### Scenario: A proposed document duplicates current truth

- **WHEN** the same fact already belongs to code, schema, tests, generated references, or an active design contract
- **THEN** the existing owner SHALL be updated or linked
- **AND** a second maintained copy SHALL NOT be created

### Requirement: Current design evolves in place

Current design documents SHALL be updated, moved, merged, or deleted as their owned design changes; Git history SHALL carry previous versions.

#### Scenario: A design is replaced

- **WHEN** an accepted change replaces an existing current design
- **THEN** the canonical document SHALL be updated in place or moved to its new owner
- **AND** obsolete active explanations SHALL be removed
- **AND** durable decision history SHALL be preserved through an ADR when needed

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

### Requirement: Governance remains proportional

The project SHALL add design documents and automated controls only when they address a concrete ownership, continuity, or drift risk.

#### Scenario: A trivial or self-explanatory change is proposed

- **WHEN** existing executable and canonical sources already make the design clear
- **THEN** the change SHALL proceed without creating a new durable design document
- **AND** it SHALL still receive task-appropriate verification

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
  [branch and worktree lifecycle](../../../docs/process/human-agent-collaboration.md#branch-and-worktree-lifecycle)

### Requirement: Tracking artifacts have distinct contracts

Issues, sub-issues, pull requests, commits, current specifications, decision
records, and handoffs SHALL keep the responsibilities defined by the
[change-tracking contract](../../../docs/process/change-tracking.md).

#### Scenario: A consequential change is proposed

- **WHEN** an Issue coordinates a standard or architectural change
- **THEN** it SHALL distinguish the problem overview, current actual behavior
  and evidence, expected outcome, scope and non-goals, confirmed decisions,
  observable acceptance, and current-context pointers
- **AND** a sub-issue SHALL represent one independently verifiable vertical
  slice rather than a horizontal implementation layer
- **AND** a pull request SHALL explain the concrete implementation, evidence,
  reconciliation, risk, and follow-up boundary without copying the full diff or
  current specification

### Requirement: Completed work does not absorb later requirements

A closed Issue or stable change SHALL preserve its original acceptance history.

#### Scenario: Work is discovered after closure

- **WHEN** the original acceptance was not met, regressed, or was closed
  prematurely
- **THEN** the original Issue MAY be reopened with the failed criterion named
- **BUT WHEN** the delivered outcome was correct and a later requirement,
  product decision, or independently valuable adjustment appears
- **THEN** a linked follow-up Issue SHALL be created instead

### Requirement: Installed Skills are routed before invocation

The project SHALL pre-filter only installed, cataloged Skills by task lane,
change class, phase, workflow group, trigger description, and exclusions.

#### Scenario: The next Skill is not obvious

- **WHEN** an agent cannot identify the smallest relevant workflow directly
- **THEN** it SHALL use the project Router to return a bounded candidate set
- **AND** the Router SHALL NOT search for, install, or automatically execute
  external Skills
- **AND** state-changing orchestrators SHALL retain their explicit human gates
