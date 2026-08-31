# Change: Initialize the GitHub Project Control Plane

- Status: Approved for implementation under GitHub Issue #1
- Class: Architectural project-governance change
- Decision owner: Project owner
- Approval: 2026-08-31

## Why

GEOEval has adopted repository-local AI-native governance, but its execution
layer only became real when the private GitHub repository was created. The
default checkout, historical branches, discussion worktrees, S6 integration,
Issue and PR flow, and full project CI need one reconciled starting point.

## Scope

- In: private remote activation, protected main, Issue hierarchy, discussion
  recovery, obsolete workspace cleanup, current-state navigation, bounded WIP,
  full deterministic project CI, and S6 migration entry.
- Out: S6 product acceptance, production deployment, paid calls, new product
  features, and post-initialization Skill overlap redesign.

## Impact

GitHub becomes the live coordination and evidence control plane. Local main
becomes the default checkout. Standard and architectural work starts from an
Issue-owned branch and reaches main through required framework and project
checks. Unique exploratory work is preserved as remote checkpoints and Backlog
Issues rather than permanent local worktrees.

## Approval boundary

Repository creation, private remote configuration, Issue and label creation,
branch protection, recoverable local cleanup, repository-local governance and
CI changes, commits, pushes, and pull requests are authorized. This change does
not authorize production or paid external execution.
