# Change: Evolve the AI-Native Delivery Workflow

- Status: Completed, reconciled, and archived on 2026-08-31
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

- Documentation: governance, process, templates, Skill catalog, and validation
  are current owners. Remaining S6 review moved to Issue #4 and Draft PR #20.
- Workspace: the historical methodology Branch/Worktree was integrated and
  removed through Issue #1/#3. S6 now uses the independent Issue-owned Branch
  `codex/issue-4-s6-real-provider-integration`.

## Approval Boundary

Repository-local governance files, templates, Skills, validation, local commits,
and local branch integration are authorized. No remote push, external Issue/PR
creation, product-owner acceptance, paid provider call, production change, or
worktree cleanup is implied.

## Final Disposition

The accepted governance is on `main` and has been consumed by the current S6
branch. S6 acceptance remains an independent outcome and cannot keep this
completed governance Change active. Later Skill calibration is tracked by Issue
#14 and governance migration debt by Issue #21.
