# Tasks

## Current-state contract

- [x] Confirm current `main`, Issue/PR closing semantics, Project fields and
      enabled workflows, Project item types, and existing Worktrees.
- [x] Confirm the portable enum leak belongs to the abstract framework rather
      than GitHub-first GEOEval.
- [x] Record Issue #53/PR #54 timing and the retained Issue #44 Worktree as
      discriminating evidence.

## Repository slice

- [x] Distinguish pre-integration reconciliation, human-authorized integration,
      post-integration reconciliation, Issue closure, and Project `Done` in the
      existing process owners.
- [x] Reconcile the current Project Governance Spec and delta.
- [x] Add checkable pre/post-integration fields to the existing PR template.
- [x] Preserve Final / Partial / Review Gate and branch-topology behavior without
      adding a status, Skill, permanent document, or brittle validator marker.

## Verification and review

- [x] Run framework, Markdown-link, OpenSpec structure, Python syntax, and Diff
      checks appropriate to the documentation slice.
- [x] Review the fixed Diff for intent, instruction clarity, ownership,
      proportionality, and evidence continuity.
- [x] Push the verified branch and open Partial PR #56 using `Part of #55 — does
      not close`.

## Final integration gate

- [ ] After explicit merge authorization, revalidate the fixed Diff, review,
      Required Checks, Project, Change, and workspace state before mutation.
- [ ] Disable `Item closed → Done`, `PR linked → In Progress`, and `PR merged →
      Done`; retain Auto-add sub-issues, Item added → Backlog, and Done →
      Auto-close Issue.
- [ ] Re-query Project workflows and exercise only the smallest safe status
      evidence needed to confirm the new direction.
- [ ] Audit completed-item Worktrees, clean only owner-confirmed safe exits, and
      preserve active or ambiguous work.
- [ ] Reconcile and archive this Change on the same branch, promote the PR from
      Partial to Final, and rerun invalidated checks.
- [ ] Integrate once, verify protected `main`, complete post-integration
      reconciliation, move Issue #55 to `Done`, and verify final closure.
