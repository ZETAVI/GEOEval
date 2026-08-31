# Change: Evolve the AI-Native Delivery Workflow

- Status: Approved for project-governance implementation
- Class: Architectural project-governance change
- Decision owner: Project owner
- Approval: 2026-08-31

## Why

GEOEval already separates current truth, proposed change, evidence, and handoff,
but its current templates combine problem and outcome, its pull-request
implementation section is too thin, its completed deterministic slice remains
active with later work, and its six pilot Skills do not yet cover installed-Skill
routing, domain and codebase design, diagnosis, full code review,
reconciliation, architecture maintenance, conflict resolution, or bounded
onboarding.

The next useful outcome is one project-owned governance revision that can enter
`main` once and then be merged into active delivery branches without maintaining
branch-specific copies.

## Scope

- In: current-phase correction; Issue, sub-issue, PR, commit, reopening, and
  follow-up contracts; installed-Skill routing; focused high-value Skills;
  workflow-group classification; stronger framework validation; and an explicit
  multi-worktree migration plan.
- Out: S6 product acceptance, provider code, current S6 uncommitted files,
  external Skill discovery or installation, GitHub remote creation, production
  deployment, and unrelated product or architecture cleanup.

## Impact

Project governance gains one tracking contract, three Issue forms, a stronger PR
template, eleven focused project Skills, catalog workflow groups, and structural
validation for the new contracts. Product and runtime behavior do not change.

## Control State

- Documentation: update current governance, process, templates, Skill catalog,
  and navigation; keep this active change until `main` and the real-provider
  branch both consume the same governance commit and the target continuation is
  reviewed under it.
- Workspace: branch `codex/ai-native-methodology-v2`, based on `main@aa48e96`,
  worktree `/private/tmp/GEOEval-methodology-v2`, merge destination `main` first
  and `codex/integrate-real-evaluation-providers` second. The S6 worktree remains
  a separate writer and its dirty state is not touched.

## Approval Boundary

Repository-local governance files, templates, Skills, validation, local commits,
and local branch integration are authorized. No remote push, external Issue/PR
creation, product-owner acceptance, paid provider call, production change, or
worktree cleanup is implied.
