---
name: diagnosing-bugs
description: Diagnoses GEOEval defects and regressions by building a symptom-specific feedback loop, minimizing the reproduction, testing falsifiable hypotheses, and recording the root cause. Use before proposing a fix when the cause is not already proven. Diagnosis does not authorize implementation.
---

# Diagnosing Bugs

Find the cause before changing product behavior.

## Workflow

1. Read the Bug Issue, current contract, exact checkout, environment, and
   available logs. Redact credentials and sensitive content.
2. Build one command or repeatable procedure that exercises the user's exact
   symptom. Prefer a focused test, HTTP script, CLI fixture, browser flow,
   captured replay, differential run, or bounded human-assisted procedure.
3. Tighten the loop: make it faster, deterministic, and specific enough to go
   red on this defect and green after repair.
4. Reproduce and minimize until each remaining input or step is load-bearing.
5. Write three to five ranked, falsifiable hypotheses. Test one variable at a
   time with targeted instrumentation; do not log everything.
6. Record the proven root cause, affected boundary, original reproduction,
   repair options, and whether a correct regression-test seam exists.
7. Stop. Implement only when the user has requested or approved repair.

If the defect cannot be reproduced, report the evidence attempted and the
specific missing artifact or access. If no correct test seam exists, create an
architecture-maintenance candidate rather than adding a misleading test.
