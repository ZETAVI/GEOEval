# Change: Calibrate Branch Topology and Human-Readable Tracking

- Status: Ready for Review
- Class: Standard project-governance change
- Issue: [#53](https://github.com/ZETAVI/GEOEval/issues/53)
- Decision owner: Project owner
- Approval: 2026-09-03 discussion and annotations

## Why

The current workflow protects `main` and sizes Worktrees by independently
mergeable outcomes, but it does not distinguish direct-to-main delivery, a true
linear PR stack, and exceptional parallel fan-in through an Integration Branch.
That gap can turn a convenient Git base into a false product dependency or make
a permanent `dev` branch look like the default answer to a large feature.

The Issue/PR relationship contract also needs one explicit closing decision,
non-default-base revalidation, and a human-readable first-reference rule.

## Outcome

Keep protected `main` as the default. Use a Stacked PR only for a real linear
dependency; use one short-lived parent Integration Branch only when parallel
slices cannot safely enter `main` independently and require combined
acceptance. Make base changes re-open the affected Diff/review/CI/closing
evidence, and make Agent discussion name an Issue or PR on first reference.

## Scope

- Update existing collaboration, tracking, Project Governance, AGENTS, PR
  template, and template validation owners.
- Record the three topology choices, their entry/exit criteria, and closing
  behavior.
- Clarify that an empty `Development` field may be correct and that work without
  a code transaction can close from explicit evidence.

## Non-goals

- No permanent `dev`, #50/M4 Integration Branch, product code, Schema,
  dependency, deployment, or existing PR retargeting.
- No `gh stack` installation or mandatory use of GitHub's public-preview stack
  feature.
- No unused cloud branch protection; configure an approved Integration Branch
  only when a real parent outcome creates it.
- No cleanup of another task's Worktree.

## Current Application

- Issue #50 is still `Review / Decision`; its shared Identity Schema, Session
  lifecycle, Access Contract, Governance, and consumer migration first require
  an approved architecture and are more likely to form ordered slices than
  parallel writes to one shared contract.
- Issue #37 and PR #38 are already accepted on `main`; Media Supply is an
  existing Identity consumer and regression boundary, not a future sibling
  branch under #50.
- Current M4 remains on its approved dependency-wave and final-parent-Gate
  route. This Change does not restructure it.

## External Facts

- GitHub defines a stack as a linear chain where each upper PR targets the
  branch below it; stacks may use `main` or another branch as trunk and require
  linear history plus the trunk's checks and review rules:
  <https://docs.github.com/en/pull-requests/reference/stacked-pull-requests>.
- Closing keywords are interpreted only for PRs targeting the default branch:
  <https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue>.
- Changing a PR base can remove commits and invalidate review comments:
  <https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/changing-the-base-branch-of-a-pull-request>.

## Control State

- Project: Issue #53 in `GEOEval Delivery`, Status `In Progress`, Priority `P1`.
- Branch: `codex/issue-53-branch-topology` from protected `main@fbc45ec`.
- Exit: reviewed PR, current-owner reconciliation, Change archive, Issue/Project
  closure, and Worktree removal after merge.

## Approval Boundary

The repository workflow documents, template, static validator, Issue, commits,
push, and PR are approved. Creating an Integration Branch, installing tooling,
changing cloud branch protection, retargeting another PR, merging, or modifying
#50/M4/product behavior remains a separate action.
