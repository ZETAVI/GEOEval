---
name: project-router
description: Classifies a GEOEval task by lane, risk, and phase, then pre-filters the installed project Skills that can help. Use when the next workflow or Skill is not already obvious. Do not search for or install external Skills.
---

# Project Router

Select a small, relevant path through the Skills already governed by
`.agents/skill-catalog.yaml`. Routing is context selection, not a new approval
layer and not external capability discovery.

## Workflow

1. Read the request, nearest `AGENTS.md`, current Issue, its `GEOEval Delivery`
   Status/Priority/Assignee/Dependencies, relevant change, repository status,
   and the Skill catalog. If the Issue is absent from the Project or live state
   conflicts with repository control text, report the reconciliation need
   before routing writes.
2. Classify the lane: `feature`, `bug`, `maintenance`, `release`, or `read-only`.
3. Classify the change as trivial, standard, or architectural using
   `docs/process/core-workflow.md`.
4. Identify the current phase: Explore, Align, Propose, Approve, Implement,
   Verify, Reconcile, Close, or Release.
5. Filter cataloged Skills first by `workflow_group`, then by each Skill's
   description and exclusions. Return no more than three candidates.
6. State the mandatory context pointers and any explicit human gate before
   execution.

Return:

```text
Lane / class / phase
Required context
Live Project state and dependencies
Selected Skill and why
Optional candidate Skills
Explicit gate or next safe action
```

Do not invoke every candidate. Prefer no Skill when the normal project workflow
already makes the action obvious. Never search the network, install a Skill,
create an Issue, or mutate project state merely because routing ran.
