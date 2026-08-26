# Design Knowledge

## Purpose

Keep design knowledge current, singular, and cheap to maintain as product requirements and implementation evolve. The goal is not more documentation. The goal is to make the right owner easy to find and difficult to duplicate.

This document is the operational guide. The normative current requirements live in the [project-governance spec](../../openspec/specs/project-governance/spec.md).

## Five authorities

| Knowledge | Authority | Update rule |
| --- | --- | --- |
| Executable fact | Code, schemas, migrations, tokens, tests, generated references | Change and verify with implementation; do not copy values into prose |
| Current design | Product docs, current specs, architecture overview, or a short owner-local contract | Edit in place as the accepted design evolves |
| Proposed design | `openspec/changes/<id>/` | Describe only the delta; reconcile and archive on completion |
| Durable decision history | ADR | Preserve the accepted record; supersede with a new ADR |
| Execution evidence | Issue, PR, CI, runtime evidence, handoff, archived change | Keep as evidence; never treat as current design authority |

## Admission test

Before creating a durable design document:

1. Search current specs, product language, ADRs, owning code, schemas, tests, components, and nearby contracts.
2. Identify the single capability, boundary, or reusable asset the document would own.
3. Confirm the information cannot live more reliably in an existing executable or canonical owner.
4. State responsibility, non-responsibility, public contract, invariants, and extension boundaries.
5. Link evidence and decisions instead of copying them.

If ownership or lifetime is unclear, keep the idea in the active change until it becomes stable. Do not create a speculative current document.

## Current-design rule

Current design documents are living views of the accepted system:

- update the existing file instead of creating `v2`, `new`, `final`, `latest`, or copy variants;
- split only when sections have different owners or change independently;
- merge when two documents maintain the same fact;
- move with the owning module or capability and update inbound links;
- delete obsolete current explanations; Git preserves history;
- generate interfaces and reference data from executable sources where practical.

ADRs are the exception: preserve accepted ADRs and supersede them when the decision changes.

## Change reconciliation

At change start, identify documentation impact as one or more of:

- `none`
- `update`
- `add`
- `move`
- `merge`
- `delete`
- `generate`
- `supersede`

At verification and close:

1. confirm implementation and current design agree;
2. promote accepted behavior to current specs and owner-local contracts;
3. regenerate derived references;
4. remove, move, merge, or supersede obsolete material;
5. update links;
6. archive the change.

A completed design must not live only in `design.md`, a PR, or a handoff.

## Progressive decomposition

Split by stable ownership and change cadence, not by file length alone. A broad
current document may remain intact while its capability boundaries are still
product hypotheses. Split it when one of these conditions becomes true:

- an implementation change activates a capability with a clear owner-local
  spec or contract;
- sections have different owners or routinely change independently;
- completing one stage would otherwise leave accepted truth mixed with an
  unrelated open frontier;
- contributors must repeatedly load or edit unrelated sections to change one
  bounded capability.

When a split is useful but its destination is not yet stable, place this compact
marker near the top of the current owner:

```markdown
## Evolution marker

- State: `split-on-activation`
- Trigger: <observable event that makes the new owner stable>
- Target: <owner-local spec, contract, or index pattern>
- Reconciler: <change or role that must resolve the marker>
```

The marker is control state, not a permanent registry. Every standard or
architectural change that touches the document must either execute the split,
update the trigger, or explicitly retain it. After extraction, move the accepted
knowledge once, replace the old detail with an index-level scope and link, repair
inbound links, and remove the marker when no deferred split remains.

At every stable stage, review the active change and each touched current owner.
Archive a completed change once its accepted truth is reconciled; future work
with a different decision or activation boundary belongs in a later change, not
as an ever-growing tail of the completed one.

## Proportionality

- Do not require a design document for a trivial or self-explanatory local change.
- Use the active change's `design.md` when choices are still specific to that change.
- Create a durable design contract only for a stable boundary that future contributors must reuse or preserve.
- Add stronger indexes, metadata, or automation only after repeated discovery failures demonstrate the need.
- Do not split a broad specification into speculative owner documents merely to
  reduce its line count; use an evolution marker until implementation establishes
  those owners.

Use [the design contract template](../templates/design-contract.md) when a durable current-design document passes the admission test.
