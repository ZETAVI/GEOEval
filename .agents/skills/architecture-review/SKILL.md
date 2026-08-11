---
name: architecture-review
description: Reviews a proposed design or code change for cohesion, coupling, module boundaries, ownership, reuse, dependency direction, data integrity, and architectural drift. Use for standard or architectural changes, significant refactors, shared components, or when a change crosses module boundaries. Do not broaden into unrelated cleanup.
---

# Architecture Review

Review whether a change preserves understandable ownership and evolvable boundaries. Focus on risks introduced or exposed by the scoped change, not on redesigning the whole system.

## Workflow

### 1. Establish the Review Contract

Identify the authoritative proposal or spec, the exact design or diff, relevant ADRs, module contracts, and stated non-goals. If these disagree, report the inconsistency before reviewing implementation detail.

Identify which executable source or current design contract owns every affected design claim. Treat PRs, handoffs, and change designs as context, not current authority.

### 2. Map the Change

Describe only the affected slice:

- modules and their responsibilities;
- public contracts and dependency direction;
- data ownership and transaction boundaries;
- shared components or abstractions;
- external systems and failure boundaries.

### 3. Inspect Architectural Qualities

Use [the review checklist](references/review-checklist.md) and ask:

- Is each responsibility owned in one clear place?
- Does the change keep related behavior cohesive and dependencies explicit?
- Does it reach through another module's internals?
- Is reuse based on a stable semantic capability rather than superficial similarity?
- Are public contracts smaller than implementation details?
- Are failures, consistency, security, migration, and rollback handled at the correct boundary?
- Does the solution remain the simplest design that meets current requirements?
- Does any new document duplicate executable facts or an existing current design owner?
- Will the accepted design be reconciled in place, with obsolete active explanations removed?

### 4. Produce Actionable Findings

For each finding include:

- severity: `must-fix`, `should-fix`, or `consider`;
- affected artifact and location;
- violated boundary or quality;
- concrete consequence;
- narrow remediation;
- whether it is introduced by this change or pre-existing debt.

Order findings by consequence. If there are no material findings, say so and name any residual risk or unverified assumption.

### 5. Close the Review

State one of: `ready`, `ready with follow-up`, or `not ready`. Identify any ADR, spec, contract, or task that must be updated. Do not implement fixes unless the user requested implementation.

For a completed change, report `not ready` when accepted design remains only in a change folder, PR, or handoff.

## Guardrails

- Do not require abstraction merely to reduce duplicated lines.
- Do not turn style preferences into architectural findings.
- Do not broaden a scoped change into opportunistic cleanup.
- Do not approve from a diagram alone; verify the proposed dependency and data paths against code or contracts when available.
- Do not request a new design document when an existing canonical or executable owner can be updated.
