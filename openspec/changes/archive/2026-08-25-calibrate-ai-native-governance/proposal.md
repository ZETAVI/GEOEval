# Change: Calibrate AI-Native Delivery Governance

- Status: Completed and reconciled
- Class: Standard
- Decision owner: Project owner
- Product implementation authorized: No

## Why

The framework already separates current truth, proposed change, evidence, and
handoff state, but three practical failure modes remained under-specified:

- evidence and review could continue after the next action was already clear;
- large current documents and active changes had no visible, durable trigger for
  progressive decomposition after a stable stage;
- branches and worktrees could be created per agent or session without a named
  merge outcome and exit condition.

The completed provider-validation stage exposed all three risks. The active
architecture change had become the continuing home for accepted foundation
decisions, provider evidence, future implementation planning, and open
integration gates even though those concerns now change at different times.

## Desired outcome

Keep GEOEval's existing eight-principle, GitHub-first delivery model while making
validation, document evolution, and workspace lifecycle proportional and
predictable for humans and agents.

## Scope

- Add an action-difference test, evidence-reuse rule, and explicit stopping
  condition to the current workflow and affected Skills.
- Define progressive document decomposition with a visible `Evolution marker`
  for deferred splits and a mandatory stable-stage reconciliation review.
- Define one branch or worktree per independently mergeable write outcome, with
  explicit ownership and exit state.
- Replace ritual PR checkboxes with conditional documentation, release,
  handoff, and workspace-impact declarations.
- Reconcile accepted evaluation-objectivity behavior into the current product
  specification and retire the completed architecture-entry change from the
  active workspace.

## Non-goals

- Adding a new anti-overdefense Skill, document registry, scoring system, or
  broad automation gate.
- Splitting the complete product specification before capability implementation
  establishes stable owner-local homes.
- Removing real security, privacy, money, migration, production, destructive,
  or external-cost boundaries.
- Authorizing product implementation, another provider call, deployment, branch
  deletion, or worktree deletion.

## Documentation impact

- `update`: current governance spec, process guides, root guidance, PR template,
  existing Skills, product vision, product specification, and architecture
  overview links.
- `move`: the completed `define-application-architecture` change to the archive.
- `add`: only this temporary change delta; it is archived after reconciliation.

## Approval boundary

The project owner authorized this governance and documentation correction on the
stable `codex/provider-validation` branch. Product scope, product implementation,
external calls, branch deletion, integration to `main`, and production changes
remain outside this change.
