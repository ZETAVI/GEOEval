---
name: code-review
description: Reviews a fixed GEOEval diff against approved intent, current project standards, and evidence continuity. Use for a branch or pull request after implementation. Keep requirement fidelity, engineering quality, and evidence findings distinct; do not implement fixes unless requested.
---

# Code Review

Review a named diff from a verified fixed point. Prefer a fresh context so the
implementation session's assumptions do not become the review's assumptions.

## Workflow

1. Verify the fixed point, HEAD, commit list, and non-empty diff.
2. Locate the Issue, active change, current specs, ADRs, and relevant AGENTS or
   engineering standards. Ask when the approved intent cannot be found.
3. Review three independent axes:
   - **Intent:** missing acceptance, wrong behavior, scope creep, or divergence
     from the approved change;
   - **Engineering:** ownership, interfaces, data integrity, failure behavior,
     security, migration, and repository conventions;
   - **Evidence and continuity:** tests that prove the claims, obsolete tests,
     current-truth reconciliation, follow-up ownership, and workspace exit.
4. For every finding cite the spec or rule and the exact diff location, explain
   a reachable consequence, and propose the narrowest remediation.
5. Report `ready`, `ready with follow-up`, or `not ready`. Verify material
   findings before acting; reviewer output is a hypothesis until checked.

Do not manufacture findings, merge the three axes into an average verdict, or
rerun the review repeatedly until a nondeterministic model says clean.
