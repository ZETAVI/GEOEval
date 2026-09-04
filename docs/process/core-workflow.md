# Core Delivery Workflow

## Principle

Use the smallest workflow that can preserve alignment, safety, and continuity. Process scales with ambiguity, blast radius, and reversibility—not with task size alone.

Use the [change-tracking contract](change-tracking.md) for the distinct roles of
Issues, sub-issues, pull requests, commits, reopening, and follow-up work.

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

## Module architecture readiness

The **engineering architecture steward** is a delivery responsibility, not a
product account role or a permanent approval committee. Before a module with a
material lifecycle, datastore, asynchronous process, AI boundary, external
effect, sensitive data, shared contract, or difficult rollback enters
implementation, the steward challenges the design from business ownership,
software architecture, database integrity, mature-tool reuse, operational
failure, and verification perspectives.

Scale the checkpoint to the reachable risk:

| Level | Typical change | Required readiness evidence |
| --- | --- | --- |
| Light | owner-local, reversible logic with no new durable or external boundary | state the owner, bounded assumption, and focused check in the task or PR |
| Standard | persistent lifecycle, bounded integration, public contract, or reusable module seam | add a short architecture card to the active design; verify existing semantics and affected external documentation |
| Critical | money, identity, AI execution, background orchestration, immutable history, sensitive data, migration, or difficult rollback | architecture card, source brief for consequential tools, failure/recovery matrix, data and migration constraints, explicit approval, and recovery evidence |

Use [`docs/templates/module-architecture-card.md`](../templates/module-architecture-card.md)
inside the active change's `design.md`; do not create a standalone card for
every module. Promote only stable, cross-change decisions to a current design
contract or ADR.

The checkpoint must answer:

1. What business capability and lifecycle does the module own, and what is out?
2. Which records, invariants, state transitions, and transactions does it own?
3. Which public commands, queries, and facts may other modules use?
4. Where do asynchronous delivery, timeout, retry, idempotency, backpressure,
   reconciliation, and manual recovery belong?
5. Which existing libraries or frameworks fit, what do they not guarantee, and
   what version, license, operating cost, and exit path matter?
6. Which pattern is earned by a real change point: state machine, strategy,
   adapter, factory/registry, outbox, saga/process coordinator, or projection?
7. What security, observability, capacity, migration, and rollback boundaries
   can fail in the first release?
8. Which smallest tests or runtime drills can disprove the completion claims?

Patterns and tools are consequences, not a checklist score. Do not require
factories, lazy loading, hot replacement, events, or a workflow framework when
the module has no corresponding variability or failure boundary. Conversely,
do not accept a happy-path-only implementation when retries, partial effects,
history, money, or external calls are reachable.

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

For a review-backed delivery, reconciliation spans both sides of the integration
transaction:

```text
Verify → Pre-integration Reconcile → Ready for Integration
       → Human-authorized Integrate → Post-integration Reconcile → Close
```

`Ready for Integration` is a checkable gate, not a new Project Status. A
non-code decision or operation omits the integration transaction but keeps the
same evidence and closeout boundary.

Before integration:

- Reconcile accepted behavior into current specs and executable owners in the
  review transaction.
- Add or supersede ADRs when a durable decision changed.
- Update generated or canonical references at their owner.
- Review every touched current owner for an `Evolution marker`; execute, update,
  or explicitly retain its progressive split trigger.
- Archive a stable final Change when remaining work has a different decision or
  activation boundary; keep a Partial outcome active with an accurate exit.
- Record residual work, skipped checks, risk, recovery, and the intended branch
  or Worktree exit.

After integration:

- Confirm the accepted revision on the target branch, applicable checks, and
  actual Issue/PR closing relationship.
- Re-run only evidence invalidated by the integration result or environment.
- Confirm current truth and Change state, then execute or explicitly retain the
  workspace exit with an owner and removal trigger.
- Add a release-note candidate only for user-visible or operator-visible change
  and promote durable handoff knowledge without retaining transient narration.

### 8. Close

- Ensure the PR explains scope, evidence, risks, skipped checks, and the owner
  of post-integration closeout.
- Ensure unresolved work has an owner and a durable tracking location.
- Use the PR summary as the completed handoff.
- Update `CHANGELOG.md` through the release workflow, not through every agent session.
- Record and execute whether the branch or worktree is retained, blocked with a
  handoff, removed after merge, or already removed.
- Move the Project item to `Done` only after post-integration reconciliation and
  workspace exit. Issue closure may already have occurred through the Final PR.
- Reopen an Issue for a failed original acceptance boundary, not for closeout-
  only work; create a linked follow-up Issue for a later requirement or
  independently valuable adjustment.

## Completion contract

A change is complete only when:

1. the approved behavior is implemented;
2. relevant evidence passes;
3. current truth is reconciled;
4. important risks and limitations are explicit;
5. continuation state is unnecessary or clear;
6. for review-backed delivery, the accepted revision is integrated into its
   intended target; non-code outcomes have accepted durable evidence;
7. the workspace exit is executed or deliberately retained with an owner,
   recovery boundary, and removal trigger.
