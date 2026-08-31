# Design: Governance Control-State Reconciliation

## Authority model

| Concern | Authority | Projection or evidence |
| --- | --- | --- |
| Problem, outcome, acceptance, owner | GitHub Issue | Project item, PR links |
| Status, priority, ordering | `GEOEval Delivery` Project | Issue state and labels |
| Proposed engineering delta | Active OpenSpec Change | Issue pointer, PR Diff |
| Accepted system truth | Code, Schema, tests, current specs | CI and runtime evidence |
| Concrete transaction | PR and Commit history | Project `Review / Decision` |
| Durable rationale | ADR | Links from Change/PR |

Project is deliberately not a requirement store. Labels express work type or a
real orthogonal risk; they do not duplicate Project Status.

## Planning state

Status is `Backlog`, `Ready`, `In Progress`, `Review / Decision`, or `Done`.
Priority is `P0`, `P1`, or `P2`. Assignee is the Issue owner.

- `blocked` requires a named GitHub dependency or decision and does not replace
  Backlog.
- Parent/Sub-Issue means one parent outcome with independently verifiable
  slices or review gates. Independently prioritizable outcomes are linked
  Follow-ups.
- Roadmap dates are added only for real commitments; ordering and dependencies
  express sequence during the current development stage.
- One product parent and one non-conflicting governance/research package may be
  active. A verified safety Bug may be `Ready` at P0 without creating a branch.

## Drift control

Three controls have different jobs:

1. CI checks repository-owned structure and high-value static contradictions,
   including completed active Changes, absolute temporary workspace paths, and
   non-Issue branch names in current control text.
2. `$project-router` reads live Project/Issue state before selecting work.
3. `$reconcile-change` verifies Issue/Project status, current owners, Change
   retirement, residual dependencies, evidence disposition, and workspace exit
   before completion.

Live GitHub state is not copied into repository status documents and cannot be
fully proven by a repository-only CI job.

## Lightweight Evidence

PR and CI links are the default evidence. Sensitive, ignored, paid-call, or
large runtime evidence receives only a short Manifest in the active Change or
Issue: purpose/date, bounded inputs, sanitized result, locator, content hash,
owner, permissions, retention reason, and exit trigger.

Raw evidence stays outside Git, uses `0700` directories and `0600` files, and
is deleted or deliberately retained at Change close. No global evidence ledger
or copied raw response archive is introduced.

## Recovery refs

Every recovery ref receives one disposition:

- `retain`: open Issue still needs the unique state;
- `superseded`: a formal branch/PR contains the needed state; delete the ref;
- `archive-tag`: immutable historical input remains useful but is not active;
- `delete-after-merge`: formal integration will make the ref redundant.

Recovery branches are transitional and never serve as the permanent project
archive.
