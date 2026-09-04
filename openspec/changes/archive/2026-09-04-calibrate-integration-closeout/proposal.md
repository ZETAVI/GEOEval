# Change: Calibrate Integration Closeout and Project Done

- Status: Accepted and ready for final integration through PR #56
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

## Final Gate Evidence

- The Project now keeps three workflows enabled: Auto-add sub-issues, Item
  added to `Backlog`, and explicit `Done` to Issue close.
- Issue close to `Done`, PR link to `In Progress`, and PR merge to `Done` are
  disabled; the visible enabled-workflow count changed from six to three.
- The completed Issue #44 workspace was not deleted. Its source tree is already
  represented by the accepted squash merge, but unique ignored local
  configuration and active use make deletion unsafe.
- That workspace therefore exits as `retain`, owned by ZETAVI. Its removal
  trigger is the end of active use plus confirmation that the ignored
  configuration is recoverable or disposable, followed by a fresh clean/tree
  audit.
- Active M4, Identity, Query Generator, report, parser, and parent-Change
  workspaces remain untouched.

## Control State

- Project: Issue #55 in `GEOEval Delivery`, Status `Review / Decision`, Priority
  `P1`.
- Topology: `main-direct` from protected `main@9069cb8`.
- Branch: `codex/issue-55-integration-closeout`.
- Workspace: the live Issue-owned Worktree; its machine-local path is not a
  durable project fact.
- Exit: cloud workflow and workspace decisions are verified. PR #56 is Final and
  its native closing relationship resolves Issue #55. Push this archived Change,
  rerun invalidated checks, and integrate once through protected `main`.

## Approval Boundary

Issue, Change, repository documents, current Spec, PR template, branch, commits,
push, Project workflow changes, workspace reconciliation, Final relationship,
and protected-main merge are authorized by the 2026-09-04 owner instruction.
Provider calls, product behavior, production changes, and unrelated workspaces
remain outside this Change.

## Final Disposition

- Integration and closeout semantics are reconciled into the existing process,
  template, and current Project Governance owners.
- Project automation now supplies context and safe defaults without inferring
  acceptance or lifecycle completion from link, merge, or close events.
- The only completed-item workspace found is deliberately retained with an
  owner and removal trigger because immediate deletion is unsafe.
- PR #56 is the Final transaction for Issue #55; its archived revision and
  invalidated checks remain to be integrated.
