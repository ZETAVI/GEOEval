# Core Delivery Workflow

## Principle

Use the smallest workflow that can preserve alignment, safety, and continuity. Process scales with ambiguity, blast radius, and reversibility—not with task size alone.

## Change classes

| Class | Use when | Minimum persistent artifacts |
| --- | --- | --- |
| Trivial | Local, obvious, reversible, no public behavior or contract change | Issue or PR note only; verification evidence |
| Standard | User-visible behavior, non-trivial bug, integration, or bounded module change that needs a durable delta | Change proposal, behavior delta, tasks when useful, PR evidence |
| Architectural | Cross-module ownership, public contract, data model, security boundary, migration, infrastructure, or difficult rollback | Standard artifacts plus design, ADR when durable, rollout and rollback plan, explicit approval |

When uncertain between two classes, start with the lighter path and add the missing artifact before the risky decision—not after implementation.

Crossing a session or involving another agent does not raise the class by itself.
Persist a handoff only when the existing Issue, change, diff, and evidence cannot
make continuation unambiguous.

## Workflow

### 1. Explore

Understand the problem without committing to a solution.

- Inspect current code, specs, decisions, and reusable assets.
- Identify unknowns, constraints, and likely affected capabilities.
- Use primary-source research when external technology may shape the design.
- Do not create a formal change merely to brainstorm.

### 2. Align

Resolve ambiguity that would produce materially different implementations.

- Confirm goal and non-goals.
- Surface assumptions and tradeoffs.
- Define observable acceptance boundaries.
- Keep the human owner in control of product meaning and risk decisions.

### 3. Propose

Create the minimum durable change record for standard or architectural work.

- `proposal.md`: why, scope, non-goals, impact.
- delta `spec.md`: requirements and scenarios that will change.
- `design.md`: only when implementation choices need review.
- `tasks.md`: only when sequencing or handoff benefits from a checklist.
- ADR: only when the decision should outlive this change.

The Issue tracks coordination. It links to the change record rather than copying it.

### 4. Approve

Before implementation, obtain explicit agreement for consequential scope, public behavior, architecture, external dependencies, or irreversible operations. Trivial work does not need a ceremony.

### 5. Implement

- Work in small vertical slices.
- Search for existing semantics before creating a reusable asset.
- Refactor the local seam when necessary to make the requested change coherent.
- Keep unrelated cleanup out of scope.
- Use isolated worktrees for parallel writes.

### 6. Verify

Map each material claim to evidence.

- Static evidence: types, lint, schemas, dependency rules.
- Behavioral evidence: unit, integration, contract, or end-to-end tests.
- Runtime evidence: logs, API responses, database state, browser state.
- Visual evidence: rendered documents, screenshots, or visual diffs.
- Operational evidence: smoke test, health check, rollout observation, rollback readiness.

Before adding a check, name the live uncertainty, reachable failure, and action
that would change. Reuse relevant passing evidence when the affected code,
configuration, dependency, data, and environment are unchanged. Do not use a
passing command unrelated to the changed behavior as proof, and stop when the
approved outcome has the smallest discriminating evidence it needs.

### 7. Reconcile

- Merge accepted behavior into current specs.
- Add or supersede ADRs when a durable decision changed.
- Update generated or canonical references at their owner.
- Review every touched current owner for an `Evolution marker`; execute, update,
  or explicitly retain its progressive split trigger.
- Archive a stable change when remaining work has a different decision or
  activation boundary.
- Add a release-note candidate only for user-visible or operator-visible change.
- Promote durable knowledge from the handoff; discard transient narration.

### 8. Close

- Ensure the PR explains scope, evidence, risks, and skipped checks.
- Ensure unresolved work has an owner and a durable tracking location.
- Use the PR summary as the completed handoff.
- Update `CHANGELOG.md` through the release workflow, not through every agent session.
- Record whether the branch or worktree is retained, ready for integration,
  blocked with a handoff, or safe to remove after merge.

## Completion contract

A change is complete only when:

1. the approved behavior is implemented;
2. relevant evidence passes;
3. current truth is reconciled;
4. important risks and limitations are explicit;
5. continuation state is unnecessary or clear;
6. the result is located in the expected branch, PR, or release artifact.
7. the workspace has an explicit exit state.
