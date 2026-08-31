# Change: Close Governance Migration Debt

- Status: Approved for governance reconciliation
- Class: Architectural project-governance change
- Issue: [#21](https://github.com/ZETAVI/GEOEval/issues/21)
- Decision owner: Project owner
- Approval: 2026-08-31

## Why

GEOEval's GitHub-first control plane is live, but the first migration left
stable changes active, stale workspace references, ambiguous Project status,
Backlog items labeled as blocked, parent relationships that mix independent
outcomes, and no bounded lifecycle for recovery refs or sensitive local
evidence. Structural CI cannot detect most of this semantic drift.

## Outcome

Establish one lightweight planning projection and reconcile repository and
GitHub control state so a future agent can identify the current outcome,
owner, priority, dependency, active change, evidence boundary, and workspace
exit without relying on conversation memory.

## Scope

- In: one repository-linked GitHub Project; Status/Priority/Owner rules; Issue
  relationship calibration; stable Change retirement; current navigation;
  high-value static drift checks; live reconciliation triggers; lightweight
  Evidence and recovery-ref lifecycle; safe cleanup of superseded refs.
- Out: S6 product acceptance or merge; Release/Deploy/Observe/Feedback design;
  Product Vision/Product Definition reading-path optimization; Skill overlap
  calibration; product code, Schema, migration, or runtime-test changes.

## Impact

GitHub Project becomes the sole planning projection while Issues, PRs,
OpenSpec, current specs, code, tests, and ADRs retain their existing authority.
Agents gain explicit state transitions and reconciliation checks without a
second requirements tracker or a permanent evidence registry.

## Control State

- Project: `GEOEval Delivery` Project #1, private and linked to this repository.
- Workspace: `codex/issue-21-close-governance-migration` from protected
  `main@b8c2063`, single writer, merge destination `main`.
- Exit: Project/Issues and repository truth reconciled, superseded refs safely
  disposed, checks green, this Change archived, PR merged, and Worktree removed.

## Approval Boundary

Repository governance documents, templates, Skills, validation, GitHub Project
fields/items, Issue owner/status/relationships, recoverable ref cleanup,
commits, push, and PR are authorized. S6 acceptance, S6 merge, production,
customer data, paid calls, deployment, and unrelated product work remain
outside this Change.
