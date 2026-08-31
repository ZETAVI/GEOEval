---
name: improve-codebase-architecture
description: Surveys GEOEval for evidence-backed architecture improvements in recently changing or repeatedly failing areas. Invoke explicitly for maintenance planning or before a large change. Produce candidates and follow-up Issues, not code, and allow a no-finding result.
---

# Improve Codebase Architecture

Find maintenance work that will reduce real delivery friction.

## Workflow

1. Establish scope from repeated defects, difficult tests, recent high-churn
   paths, a forthcoming change, or a user-named capability. Do not scan the
   entire repository merely because it is available.
2. Read current specs, ADRs, the affected code, tests, and recent history. Use
   `$codebase-design` vocabulary for ownership, interfaces, seams, depth, and
   locality.
3. Identify candidates where complexity leaks across callers, one behavior
   requires many unrelated edits, a public interface exposes internals, or no
   correct verification seam exists.
4. For each candidate state evidence, reachable consequence, narrow improvement,
   affected owner, expected leverage, migration risk, and why current delivery
   makes the work valuable now.
5. Rank candidates as `strong`, `worth exploring`, or `speculative`. A report
   containing no strong candidate is a valid result.
6. After the user selects a candidate, route it through normal alignment,
   change tracking, implementation, and verification. Do not refactor during
   the survey.

Do not schedule this by habit, hunt dormant code for cosmetic cleanup, or turn a
preference into a blocking architecture finding.
