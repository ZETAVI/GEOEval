---
name: start-change
description: Classifies a software change as trivial, standard, or architectural and creates the minimum OpenSpec-compatible artifacts needed before implementation. Use when starting a feature, consequential bug fix, external integration, refactor, migration, or behavior change after intent is sufficiently clear. Do not use for pure exploration or trivial edits.
---

# Start Change

Create just enough durable context to make a change safe, reviewable, and resumable. The change record is a temporary control surface, not a second permanent specification.

## Workflow

### 1. Load the Local Rules

Read the nearest `AGENTS.md`, relevant current specs, module contracts, product glossary, and ADRs. Link to the execution issue if one exists. Do not copy their contents into the change record.

If outcome, scope, or acceptance is materially ambiguous, run `$requirement-grill` before proceeding.

### 2. Classify the Change

Use [the classification reference](references/change-classification.md):

- **Trivial** — local, reversible, no contract or user-visible behavior change.
- **Standard** — meaningful behavior, integration, or module change with a bounded blast radius.
- **Architectural** — changes module ownership, dependency direction, public contracts, persistent data, security boundaries, or rollout strategy.

Choose the lowest level that honestly represents the risk. A large diff is not automatically architectural, and a small schema change may be.

### 3. Run a Reuse and Ownership Check

Before proposing a new abstraction, component, API, or document, answer:

1. Does an equivalent capability already exist?
2. Is the similarity semantic and stable, or merely visual or incidental?
3. Which module owns the capability and its public contract?
4. Will this change create a second source of truth?

Prefer local implementation until repeated, stable use cases justify a shared abstraction.

### 4. Create the Minimum Artifact Set

- **Trivial:** issue or PR description only. Do not create an OpenSpec change folder.
- **Standard:** `proposal.md`, delta spec, and `tasks.md`; add `design.md` only when implementation choices need review.
- **Architectural:** the standard set plus `design.md`, an ADR when a durable tradeoff is made, and migration or rollback notes when relevant.

Use a short kebab-case change ID and [the change record asset](assets/change-record-template.md). Write delta specs as observable requirements and scenarios. Keep task items independently verifiable.

### 5. Review Before Implementation

Confirm:

- the proposal describes outcome, scope, non-goals, and impact;
- delta specs express behavior rather than code structure;
- the design names boundaries, ownership, alternatives, and risks;
- tasks include validation and documentation promotion;
- material human-owned decisions are approved.

Stop for approval when product intent, irreversible architecture, external cost, security, migration, or destructive action remains undecided. Otherwise return the artifact paths and the first implementation step.

## Guardrails

- Do not open a change folder for research alone; produce a source brief first.
- Do not duplicate the issue backlog inside `tasks.md`.
- Do not turn design notes into permanent truth; archive the change after promoting accepted behavior and decisions.
- Do not modify implementation unless the user has also authorized implementation.
