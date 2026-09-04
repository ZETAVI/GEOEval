# Change: Calibrate Comment Checkpoints and Multi-Agent Coordination

- Status: Accepted and ready for final review
- Class: Standard project-governance change
- Issue: [#59](https://github.com/ZETAVI/GEOEval/issues/59)
- Decision owner: Project owner
- Approval: current discussion and explicit continuation instruction

## Why

GEOEval already uses Issue and pull-request comments to preserve delivery,
rebase, Gate, coordination, and closeout evidence. The artifact model correctly
keeps current truth, proposed change, execution evidence, and handoff separate,
but it does not yet define when a comment is material, how a later agent resumes
from it, or how stable information returns to its canonical owner.

Without that boundary, useful checkpoints depend on local judgment, the same
coordination contract can be copied into several Issues, and long-running work
can require a future agent to reread an entire timeline.

## Outcome

Treat Issue and pull-request comments as a durable chronological evidence and
asynchronous agent-coordination surface. Keep bodies as current transaction
snapshots, publish only checkpoints that change the next action, and promote
accepted knowledge to one canonical owner.

## Scope

- Add the complete Comment and Checkpoint Contract to Change Tracking.
- Map producer/consumer coordination and dedicated handoff admission in the
  existing Human-Agent Collaboration owner.
- Add only short operational pointers to How We Work.
- Reconcile the normative Project Governance current spec and this delta.

## Non-goals

- No new Project Status, Label, Skill, permanent process document, comment
  template file, bot, Action, or brittle validator string.
- No requirement to comment on every commit, Check, test run, or ordinary
  progress update.
- No product behavior, WIP rule, branch topology, existing Issue/PR state, or
  production configuration change.
- No publication of credentials, sensitive raw evidence, large logs, session
  transcripts, or hidden reasoning.

## Current Evidence

- Issue #50 delivery checkpoints, PR #28 rebase handoffs, and Issue #55
  post-integration closeout show that structured comments preserve useful
  continuity across sessions and Worktrees.
- The duplicated Issue #50/#57 coordination note and the long Issue #39
  timeline show the drift and recovery cost when no single-owner or progressive
  disclosure rule exists.
- Current process owners already define artifact authority and handoff
  proportionality; the missing behavior fits them without a new document.

## Verification

- Project framework, OpenSpec lifecycle, and local Markdown-link validation
  pass for all 17 cataloged Skills and the changed documentation.
- Validator Python syntax and staged Diff whitespace checks pass.
- Fixed-Diff review is `ready`: intent, instruction ownership, progressive
  disclosure, proportionality, and evidence continuity have no unresolved
  finding.
- Product typecheck, tests, build, runtime, and browser checks are not run
  because this Change modifies only governance prose and no executable product
  boundary.

## Control State

- Project: Issue #59 in `GEOEval Delivery`, Status `In Progress`, Priority `P1`.
- Topology: `main-direct` from protected `main@82f7056`.
- Branch: `codex/issue-59-comment-checkpoints`.
- Change: `openspec/changes/archive/2026-09-04-calibrate-comment-checkpoints/`.
- Exit: retain until review and integration; merge remains a separate human
  authorization Gate.

## Approval Boundary

Issue, Change, process/current-spec edits, branch, commits, push, and pull
request creation are authorized. Protected-main merge, product behavior,
Provider calls, production changes, deployment, and unrelated Worktrees remain
outside this Change.
