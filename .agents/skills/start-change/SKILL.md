---
name: start-change
description: Classifies a software change as trivial, standard, or architectural and creates the minimum OpenSpec-compatible artifacts needed before implementation. Use when starting a feature, consequential bug fix, external integration, refactor, migration, or behavior change after intent is sufficiently clear. Do not use for pure exploration or trivial edits.
---

# Start Change

Create just enough durable context to make a change safe, reviewable, and resumable. The change record is a temporary control surface, not a second permanent specification.

## Workflow

### 1. Load the Local Rules

Read the nearest `AGENTS.md`, relevant current specs, module contracts, product glossary, and ADRs. Link to the execution issue if one exists. Do not copy their contents into the change record.

Inspect active changes, branches, worktrees, and handoffs before creating
anything. Reuse an existing change workspace when it owns the same independently
mergeable outcome and its state can be attributed safely. If it is dirty,
understand and preserve the existing work; do not create another branch to
escape unknown state.

Before creating a Branch, verify the owning Issue is in `GEOEval Delivery`, has
an Assignee and Priority, and is `Ready`; move it to `In Progress` only when the
bounded write actually begins. A new agent, conversation, review, or session is
not a new change boundary.

If outcome, scope, or acceptance is materially ambiguous, run `$requirement-grill` before proceeding.

### 2. Classify the Change

Use [the classification reference](references/change-classification.md):

- **Trivial** — local, reversible, no contract or user-visible behavior change.
- **Standard** — meaningful behavior, integration, or module change with a bounded blast radius.
- **Architectural** — changes module ownership, dependency direction, public contracts, persistent data, security boundaries, or rollout strategy.

Choose the lowest level that honestly represents the risk. A large diff is not automatically architectural, and a small schema change may be.
Work crossing a session is not automatically standard; persist only the control
state that a new contributor cannot recover cheaply from the Issue, diff, and
verification evidence.

### 3. Run a Reuse, Ownership, and Documentation Check

Before proposing a new abstraction, component, API, or document, answer:

1. Does an equivalent capability already exist?
2. Is the similarity semantic and stable, or merely visual or incidental?
3. Which module owns the capability and its public contract?
4. Will this change create a second source of truth?
5. Which executable or canonical design sources already own the affected knowledge?
6. Is the documentation impact `none`, `update`, `add`, `move`, `merge`, `delete`, `generate`, or `supersede`?
7. Does a touched current document carry an `Evolution marker`, and will this
   change execute, update, or explicitly retain its trigger?

Prefer local implementation until repeated, stable use cases justify a shared abstraction.

Create a durable design document only when a stable capability, boundary, or reusable asset needs an owner that existing code, schemas, tests, specs, ADRs, or contracts cannot provide. Keep uncertain design inside this change. Never create a version-copy document in place of updating the current owner.

### 4. Create the Minimum Artifact Set

- **Trivial:** issue or PR description only. Do not create an OpenSpec change folder.
- **Standard:** `proposal.md`, delta spec, and `tasks.md`; add `design.md` only when implementation choices need review.
- **Architectural:** the standard set plus `design.md`, an ADR when a durable tradeoff is made, and migration or rollback notes when relevant.

Use a short kebab-case change ID and [the change record asset](assets/change-record-template.md). Write delta specs as observable requirements and scenarios. Keep task items independently verifiable.

Create or select a branch or worktree only when an independently mergeable write
outcome needs isolation. Record its base, owner, merge destination, verification
boundary, and exit condition; do not create one per agent or subtask.

### 5. Review Before Implementation

Confirm:

- the proposal describes outcome, scope, non-goals, and impact;
- delta specs express behavior rather than code structure;
- the design names boundaries, ownership, alternatives, and risks;
- tasks include validation and documentation promotion;
- documentation impact names the current owner and how obsolete material will be handled;
- any touched evolution marker has a planned disposition;
- the branch or worktree exit state is defined;
- material human-owned decisions are approved.

Stop for approval when product intent, irreversible architecture, external cost, security, migration, or destructive action remains undecided. Otherwise return the artifact paths and the first implementation step.

## Guardrails

- Do not open a change folder for research alone; produce a source brief first.
- Do not duplicate the issue backlog inside `tasks.md`.
- Do not turn design notes into permanent truth; archive the change after promoting accepted behavior and decisions.
- Do not create `v2`, `new`, `final`, `latest`, or copied current-design files; Git carries history.
- Do not modify implementation unless the user has also authorized implementation.
- Do not open a second change or branch when the current one already owns the
  same outcome and can be continued safely.
