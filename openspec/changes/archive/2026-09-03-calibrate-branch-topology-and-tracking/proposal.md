# Change: Calibrate Branch Topology and Human-Readable Tracking

- Status: Accepted and archived for integration through PR #54
- Class: Standard project-governance change
- Issue: [#53](https://github.com/ZETAVI/GEOEval/issues/53)
- Decision owner: Project owner
- Approval: 2026-09-03 discussion and annotations
- Merge authorization: 2026-09-03

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

- Issue #50 is still `Review / Decision`. Its own Identity and Access series
  shall evaluate direct-to-main slices, a true linear stack, or a short cutover
  Integration Branch only after its architecture is approved.
- Issue #37 and PR #38 are already accepted on `main`. Future Media Supply
  series shall make their own topology decision under their own parent outcome.
  Identity's consumer relationship with Media Supply does not combine the two
  series into one Integration Branch.
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

- Project: Issue #53 in `GEOEval Delivery`, Status `Review / Decision`, Priority
  `P1`.
- Branch: `codex/issue-53-branch-topology` from protected `main@fbc45ec`.
- Exit: PR #54 is authorized for squash merge; its native closing relationship
  closes Issue #53, Project automation moves it to `Done`, and the Worktree is
  removed only after `main` contains the verified result.

## Approval Boundary

The repository workflow documents, template, static validator, Issue, commits,
push, and PR are approved. Creating an Integration Branch, installing tooling,
changing cloud branch protection, retargeting another PR, merging, or modifying
#50/M4/product behavior remains a separate action.

## Final Disposition

- The accepted topology contract is reconciled into Human-Agent Collaboration,
  Change Tracking, Project Governance, AGENTS, and the PR template.
- Direct-to-main remains the default; Stacked PR means a linear dependency; an
  Integration Branch is parent-scoped, short-lived, and exceptional.
- Each large series evaluates topology independently. Issue #50 and future
  Media Supply work are not treated as one shared Integration Branch.
- PR #54 has a fixed-Diff review with no remaining must-fix, both Required
  Checks pass, and GitHub resolves its bare `Closes #53` relationship.
- No product behavior, Schema, dependency, deployment, cloud branch setting,
  existing PR base, or other task Worktree changed. Release remains
  `release:skip`.
