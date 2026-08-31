---
name: reconcile-change
description: Reconciles an accepted GEOEval change into current specs, design owners, tests, tracker state, release candidates, and workspace exit. Invoke explicitly before closing a standard or architectural change or declaring its final pull request complete.
---

# Reconcile Change

Convert accepted change evidence into a new, singular current state.

## Workflow

1. Read the Issue, sub-issues, change record, PR diff, verification matrix,
   current specs, design owners, ADRs, tests, and workspace state.
2. Map every acceptance criterion to implementation and evidence. Identify any
   criterion reduced or changed by an explicit owner decision.
3. Record tests added, changed, or removed. Remove obsolete tests that preserve
   rejected behavior; never delete a failing test merely to make the suite green.
4. Promote accepted behavior into current specs or executable owners. Add or
   supersede an ADR only for durable cross-change rationale. Remove competing
   active explanations and resolve touched evolution markers.
5. Review residual work:
   - same parent outcome and independently verifiable: sub-issue;
   - later or independently valuable outcome: linked follow-up Issue;
   - failed original acceptance or premature close: reopen the original Issue.
6. Complete the PR lifecycle summary, release disposition, handoff disposition,
   and branch or worktree exit state.
7. Close only when `docs/process/change-tracking.md` is satisfied.

Do not merge, close, archive, or delete a worktree without the authority required
for that state change. Return a reconciliation patch and an explicit list of
blocked external actions when they remain.
