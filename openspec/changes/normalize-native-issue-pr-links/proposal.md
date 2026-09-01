# Change: Normalize Native Issue and Final PR Links

- Status: Approved and in progress
- Class: Standard project-governance change
- Issue: [#29](https://github.com/ZETAVI/GEOEval/issues/29)
- Decision owner: Project owner
- Approval: 2026-09-01

## Why

Several completed parent Issues preserve their final PR and revision through
ordinary references but lack GitHub's native `Development` relationship. The PR
template says to link the Issue without distinguishing a final closing link, a
partial reference, or a Review Gate. Requested reviews have also been allowed to
finish after merge in two recent PRs.

## Outcome

Make the smallest workflow distinction that lets GitHub project the final PR,
keeps partial work from closing its Issue, leaves Review Gates lightweight, and
makes a completed requested review an observable merge condition.

## Scope

- In: the existing Change Tracking owner, Project Governance Spec, PR template,
  template validator, and the bounded historical parent-Issue links recorded in
  #29.
- Out: product behavior, S6 implementation, every historical mention, separate
  PRs for Review Gates, a new governance document, or a new Skill.

## Impact

Future final PRs use GitHub's native closing relationship. Partial PRs and
Review Gates retain ordinary references. The existing framework validator only
protects those template entry points; it does not attempt to query or duplicate
live GitHub state.

## Control State

- Project: Issue #29 in `GEOEval Delivery`, Status `In Progress`, Priority `P1`.
- Branch: `codex/issue-29-native-issue-pr-links` from current protected `main`.
- Exit: final PR reviewed and merged, Issue/Project reconciled, Change archived,
  and Worktree removed.

## Approval Boundary

The repository process, current governance spec, PR template, validator,
bounded historical Development relationships, commits, push, and pull request
are approved. Product behavior, production, deployment, and unrelated Issue
state remain outside this Change.
