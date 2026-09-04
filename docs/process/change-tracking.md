# Change Tracking Contract

## Purpose

Keep coordination, implementation, evidence, and current truth connected
without making any one artifact carry all four responsibilities.

## Artifact responsibilities

| Artifact | Owns | Does not own |
| --- | --- | --- |
| GitHub Project | Status, priority, ordering, and real target dates | Requirements, design, implementation, acceptance evidence, or a second Issue body |
| Issue | Problem, actual behavior, desired outcome, scope, accepted decisions, acceptance, owner, and status | Current system design or implementation detail already owned elsewhere |
| Sub-issue | One independently verifiable delivery slice or required Review Gate that contributes to a parent outcome | An independently prioritizable Follow-up or a horizontal layer such as all backend work or all tests |
| Pull request | The concrete change transaction, implementation explanation, evidence, reconciliation, risks, and follow-ups | Current product or architecture definition after merge |
| Commit | One coherent code or documentation checkpoint bound to an Issue and revision | Backlog, mutable project status, or session recovery state |
| Current spec or design owner | Accepted behavior and stable boundaries after merge | Proposal history and running task status |
| Decision record | A cross-change rationale that future work must understand | Every local implementation choice |
| Handoff | Temporary recovery state when normal artifacts cannot make continuation unambiguous | Permanent product truth or an append-only session diary |

## Issue contract

An Issue begins with a problem overview, then separates observed reality from
the desired outcome. For a standard or architectural change it records:

1. problem overview;
2. current actual behavior and evidence;
3. expected outcome;
4. scope and non-goals;
5. accepted decisions and bounded assumptions;
6. observable acceptance criteria;
7. current-context and change-record pointers;
8. change lane and class;
9. delivery slices and evidence requirements when known.

Candidate decisions remain in the active conversation until confirmed. Promote
confirmed change-local decisions into the Issue. Update current truth only when
the behavior is accepted and merged. Create a short decision record only when a
rationale constrains several future changes and would be surprising from code or
current design alone.

## GitHub control plane

The live coordination repository is
[`ZETAVI/GEOEval`](https://github.com/ZETAVI/GEOEval). Before a standard or
architectural write:

1. create or identify the Issue that owns the outcome;
2. link the relevant current owner and OpenSpec change;
3. choose `main-direct`, a true linear stack, or an approved parent-scoped
   Integration Branch under the
   [integration-topology contract](human-agent-collaboration.md#integration-topology);
4. create `codex/issue-<number>-<slug>` from current `main` by default, or from
   the exact approved lower-stack/integration base;
5. create a worktree only when the branch is an independently mergeable write;
6. open a pull request before asking for final review or integration.

Protected `main` requires the project checks and normal pull-request path. Do
not push directly to bypass the lifecycle, reconstruct completed history merely
to create activity, or keep a branch for a Backlog Issue with no approved next
action.

## Planning projection and status

[`GEOEval Delivery`](https://github.com/users/ZETAVI/projects/1) is the only
planning projection. Add every Issue when it is created, use the native
Assignee as Owner, and maintain:

- `Backlog`: recorded with no approved next action;
- `Ready`: outcome and acceptance are clear and work may enter WIP;
- `In Progress`: one active bounded write or execution package;
- `Review / Decision`: implementation or analysis is ready and a review,
  decision, integration gate, or post-integration closeout remains;
- `Done`: acceptance, post-integration reconciliation, and workspace exit are
  complete.

Priority is `P0` for current safety/delivery-critical work, `P1` for the next
valuable outcome, and `P2` for later work. Labels express type or orthogonal
risk. Use `blocked` only with a named dependency or decision; never use it as a
synonym for Backlog. Add target dates only for real commitments, so Roadmap
views do not manufacture schedules during open-ended development.

For the small current team, allow one primary product-delivery parent Issue and
one non-conflicting research or maintenance Issue in progress. A verified urgent
Bug may preempt them. Sub-issues and PRs under the active parent do not each
consume another parent-level WIP slot.

## Sub-issues and scope pressure

Create a sub-issue when the work is required for the same parent outcome but can
be delivered and verified independently. A sub-issue may be a Review Gate over
one integrated PR; it does not imply a separate Branch or PR. Create a separate
Follow-up Issue when the new outcome can be deferred, released, prioritized, or
accepted independently. Use native Dependency links for ordering or blocking,
not Parent/Sub-Issue merely to draw a sequence.

A Review Gate may use an ordinary reference to the integrated PR. Do not create
an otherwise unnecessary PR or native closing relationship merely to populate
the Gate's `Development` field.

Pause and request a split decision when any of these becomes true:

- a second independently valuable acceptance result appears;
- new work crosses a capability owner, risk class, or release gate;
- the original Issue is substantially complete and later work came from a new
  finding or product decision;
- a follow-up can be omitted without invalidating the approved result;
- one Issue begins mixing current delivery with an open-ended future backlog.

Use this prompt:

> The current Issue owns `<original outcome>`. `<new outcome>` now has an
> independent acceptance boundary. Keep it as a sub-issue only if both must
> complete the same parent result; otherwise create a linked follow-up Issue.

Do not split by line count, frontend/backend layer, or agent count alone.

## Pull request contract

A Pull Request may be one of several PRs that advance one open Issue. Each PR
must remain independently reviewable and must say what portion of the Issue it
delivers. The final PR or explicit close decision proves the Issue's full
acceptance boundary.

State the owning relationship in the PR description:

- a final acceptance PR uses `Closes #<owning-issue>` so GitHub records the
  native `Development` relationship and closes the Issue after merge to the
  default branch;
- a partial PR uses `Part of #<owning-issue> — does not close` and leaves the
  Issue open;
- a Review Gate uses an ordinary `Review Gate #<issue>` reference and does not
  require an independent PR.

Before using `Closes` or manually adding a PR under `Development`, answer:
**should merging this PR into the default branch immediately close the Issue
because its full acceptance boundary is met?** If not, use a Partial or ordinary
reference. An empty `Development` field is valid and must not be populated for
visual completeness.

A PR targeting a non-default branch is not the final closing transaction. Use a
Partial or ordinary reference while it targets a lower stack or Integration
Branch. Before changing its base to the default branch, re-evaluate its Diff,
review, Required Checks, closing keywords, Issue acceptance, and branch exit.
Research, decision, release-gate, and manual-operation Issues that have no code
transaction may close from an explicit owner decision plus durable evidence;
do not create an artificial PR.

When several PRs advance one Issue, only the final acceptance PR creates the
native closing relationship. Before merge, every requested review must have a
completed outcome, and each material finding must be fixed, explicitly rejected
with evidence, or moved to a durable follow-up when it does not invalidate the
approved result. An in-flight requested review is still `Review / Decision`, not
a completed merge gate.

The implementation explanation is concrete enough for a reviewer to understand
the design without reconstructing it from the diff. It covers, when applicable:

- execution path and participating modules;
- ownership and dependency direction;
- important interfaces, schemas, migrations, state transitions, and failure
  handling;
- alternatives or proposal deviations that materially changed the result;
- compatibility, rollout, rollback, and operational boundaries;
- why the implementation is the smallest coherent solution.

Link to files, specs, and ADRs. Do not paste the diff or duplicate complete
current specifications.

Before completion, map acceptance criteria to implementation and evidence,
record tests added, changed, or removed, reconcile current truth, and create
durable follow-up Issues for work outside the approved boundary.

For a review-backed change, follow the
[integration checkpoint](core-workflow.md#7-reconcile) without adding a new
Project Status. Before integration, reconcile the accepted slice into the
current owners in the PR, record residual work and the intended workspace exit,
and keep an unfinished parent Change active. After integration, confirm the
accepted revision, relationship, applicable evidence, current truth, and
workspace exit.

A Final PR may close its Issue automatically at integration before the
post-integration checks run. During that bounded closeout window the Project
item remains in `Review / Decision`; a closed Issue is not by itself evidence
for `Done`. Reopen the Issue only when its original acceptance failed or closure
was factually premature. Keep closeout-only work owned and non-`Done` without
rewriting an accepted delivery history.

## Multiple PRs, reopening, and follow-up Issues

Multiple PRs may serve one open Issue when each PR is a coherent vertical slice
and the Issue remains the same approved outcome.

Reopen a closed Issue only when its original acceptance was not actually met,
the delivered change regressed before a new product decision, or closure was
factually premature. Add a comment identifying the failed original criterion.

Create a new linked Issue when the original outcome was correctly delivered and
later feedback, a new requirement, a changed boundary, or a new release goal
requires adjustment. Do not rewrite history to make the later requirement look
like part of the original agreement.

## Commit contract

Use a concise subject that states intent and links the Issue:

```text
<type>(<scope>): <intent> (#<issue>)
```

Keep familiar Conventional Commit types in English: prefer `feat`, `fix`,
`docs`, `refactor`, `test`, and `chore`; use `build`, `ci`, `perf`, or `revert`
when those names are more exact. The intent after the colon may be concise
Chinese, for example `feat(governance): 优化 GitHub 协作语言 (#1)`.

Use the body only for a non-obvious constraint, rationale, or verification note.
Keep commits coherent and reviewable. A commit anchors code and evidence; it does
not replace the Issue, PR, current spec, or handoff.

## Closure contract

An Issue closes only when:

1. the approved acceptance boundary is met or explicitly reduced by the owner;
2. applicable merged PRs and evidence identify the delivered revision, or an
   explicit non-code decision and durable evidence identify the accepted result;
3. affected tests and current owners are reconciled;
4. residual work has a new owner and durable location;
5. the branch or worktree exit state is explicit.

Issue closure and Project `Done` are separate facts. A Final PR may close an
Issue after acceptance and pre-integration reconciliation when its post-merge
exit is explicit; the Project item moves to `Done` only after the integrated
revision, current truth, Change state, evidence, and workspace exit are
verified after integration and reconciled. The integration owner then
explicitly moves the Project item to `Done`. A deliberately retained workspace
counts as an exit only when its owner, purpose, recovery boundary, and later
removal trigger remain explicit.

The final reconciliation also removes stale blocked relationships and records
the next independent Issue without copying its backlog into the closed Issue.

Do not keep a completed Issue or OpenSpec change active as a general roadmap.
