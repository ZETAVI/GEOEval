---
name: verify-change
description: Builds and executes a task-appropriate verification plan that maps each completion claim to concrete evidence such as tests, contracts, builds, runtime state, logs, or visual inspection. Use before declaring a feature, fix, refactor, document, or deployment complete. Report skipped or failed checks explicitly.
---

# Verify Change

Make completion claims proportional to evidence. Verification is a reasoning task: choose checks that can actually disprove the claim.

## Workflow

### 1. Enumerate Claims

Derive claims from the acceptance criteria, change tasks, risk notes, and actual diff. Include negative claims such as backward compatibility, unchanged behavior, absence of a regression, or safe rollback.

Identify the exact code, configuration, dependency, data, environment, and
documentation boundaries that changed. Do not reopen unaffected claims merely
because another verification session began.

For standard or architectural work, include a design-reconciliation claim: accepted design is represented by its current executable or canonical owner, and obsolete active explanations no longer compete with it.

### 2. Map Claims to Evidence

Choose the smallest discriminating evidence using [the evidence-selection reference](references/evidence-selection.md):

- static checks for syntax, types, formatting, dependency, and policy constraints;
- unit or property tests for local rules and edge cases;
- integration or contract tests for module and API boundaries;
- build and packaging checks for deployable artifacts;
- runtime checks for the named environment and configured capability;
- visual or accessibility inspection for rendered user interfaces and documents;
- operational evidence for migrations, observability, rollback, and deployment state.
- documentation evidence for current-spec reconciliation, generated references, canonical links, and removal or supersession of obsolete design material.

Do not use a broad test suite as a substitute for a missing targeted check.

For every proposed check, name the live uncertainty, reachable failure, and the
implementation, release, rollback, escalation, or risk-acceptance action that
would change. Reuse equivalent passing evidence when the exercised boundary and
its relevant inputs are unchanged.

### 3. Execute in Feedback Order

Run cheap, high-signal checks first, then boundary and runtime checks. Confirm the exact checkout, revision, environment, configuration, and target before interpreting results. Preserve commands or links needed to reproduce evidence.

Stop when each material claim has the smallest discriminating evidence required
by its risk. Keep optional confidence-building, exploratory load, and speculative
hardening outside the completion gate.

### 4. Resolve Failures Honestly

Classify every planned check as `passed`, `failed`, `blocked`, or `not run`. A skipped or unavailable check is not a pass. If fixing is within the requested scope, make the smallest correction and rerun the relevant evidence; otherwise report the blocker.

### 5. Return the Evidence Matrix

Report:

| Claim | Evidence | Result | Notes |
| --- | --- | --- | --- |
| What is asserted | Test, command, inspection, or runtime link | Passed/failed/blocked/not run | Scope and limitations |

Conclude with `verified`, `partially verified`, or `not verified`. State residual risk and any evidence that belongs in the PR or handoff.

Do not mark a standard or architectural change verified when accepted behavior or design remains only in a change record, PR, or handoff.

## Guardrails

- Do not claim production delivery from local tests or a merged branch.
- Do not claim runtime support from configuration presence alone.
- Do not hide failing output or omit skipped checks.
- Do not run destructive tests, migrations, external writes, or deployments without the required authority.
- Do not rerun relevant passing evidence solely because ownership, agent, or
  session changed.
