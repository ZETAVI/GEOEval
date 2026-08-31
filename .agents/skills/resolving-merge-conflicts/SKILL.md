---
name: resolving-merge-conflicts
description: Resolves an authorized in-progress Git merge or rebase conflict by tracing each side to its Issue, commit, spec, and current owner. Invoke explicitly only when a real conflict exists. Preserve intent, verify the result, and stop when the intents are incompatible or the operation should be aborted.
---

# Resolving Merge Conflicts

Resolve semantic intent, not just conflict markers.

## Workflow

1. Inspect `git status`, the operation type, target branch, merge base, commits,
   conflicting files, dirty state, and worktree ownership.
2. Trace each side to its Issue, change record, current spec, commit message, and
   tests. Identify the intent and authority of each edit.
3. Classify each hunk:
   - compatible intents: preserve both in one coherent result;
   - one side superseded: keep current authority and retain needed migration;
   - incompatible product or architecture decisions: stop for human choice;
   - wrong target or unsafe state: recommend aborting or restoring the operation.
4. Resolve only the authorized conflict surface. Do not introduce new behavior
   or opportunistic cleanup.
5. Run the smallest relevant checks, then the operation's required integration
   gate. Inspect the final diff and record any follow-up Issue.
6. Continue or commit only after the result is coherent and verified.

Never impose an unconditional “always resolve” rule. Aborting is correct when
the merge goal is wrong, evidence is missing, or preserving both intents would
silently redefine accepted behavior.
