# Change: Calibrate Integration Closeout and Project Done

- Status: Repository slice verified; Partial PR pending; integration not yet
  authorized
- Class: Standard project-governance change
- Issue: [#55](https://github.com/ZETAVI/GEOEval/issues/55)
- Decision owner: Project owner
- Approval: 2026-09-04 discussion and annotations

## Why

GEOEval correctly distinguishes Final, Partial, and reference-only PR
relationships, but its Project automation still treats PR links, merges, and
Issue closure as planning-state facts. A Final PR can therefore close an Issue
and move it to `Done` before the integrated revision, Change state, and
workspace exit are reconciled.

This is a bounded consistency problem, not a reason to add another status,
document, Skill, or approval committee.

## Outcome

Keep GitHub relationships as context-rich delivery links while making semantic
status transitions explicit. A review-backed change becomes ready through
pre-integration reconciliation, integrates only with human authorization, and
becomes `Done` only after post-integration reconciliation and workspace exit.

## Scope

- Update the existing Change Tracking, Core Workflow, practical guide, current
  Project Governance Spec, and PR template owners.
- Preserve the existing Final / Partial / Review Gate and branch-topology
  contracts.
- At the authorized final integration gate, disable Project workflows that
  infer status from PR link, PR merge, or Issue close events, then verify the
  same branch as the Final repository transaction.
- Reconcile completed-item Worktrees only after their owner and recovery state
  are verified, before promoting the PR from Partial to Final.

## Non-goals

- No new Project Status, permanent process document, Skill, validator string,
  CI service, Integration Branch, or product behavior.
- No change to the abstract framework's portable template in this repository.
- No cleanup of active M4, Identity, Media Supply, modified, untracked, or
  otherwise owner-ambiguous Worktrees.
- No merge without a separate explicit authorization.

## Current Evidence

- `Done` currently means acceptance, reconciliation, and workspace exit.
- `GEOEval Delivery` has six enabled default workflows, including Issue closed
  to `Done`, PR linked to `In Progress`, and PR merged to `Done`.
- The Project currently contains Issue items and no PR items.
- Issue #53 closed two seconds after PR #54 merged, before local closeout could
  run; its eventual state is reconciled.
- Issue #44 is `Done`, while its clean closed-task Worktree and deleted-upstream
  branch remain locally after the owner recorded it safe to remove.

## Control State

- Project: Issue #55 in `GEOEval Delivery`, Status `In Progress`, Priority `P1`.
- Topology: `main-direct` from protected `main@9069cb8`.
- Branch: `codex/issue-55-integration-closeout`.
- Workspace: the live Issue-owned Worktree; its machine-local path is not a
  durable project fact.
- Exit: the documentation PR remains Partial and `ready-for-integration` until
  merge is authorized. At that gate, perform and verify the reversible cloud
  workflow and safe workspace changes, archive this Change on the same branch,
  promote the PR to Final, and then integrate once.

## Approval Boundary

Issue, Change, repository documents, current Spec, PR template, branch, commits,
push, and Partial PR are approved. Protected-main merge remains a separate
human authorization. Project workflow changes and safe workspace cleanup occur
only at that final gate; if integration cannot proceed, restore the prior cloud
workflow state and keep the PR Partial.
