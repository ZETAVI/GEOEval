# Change Tracking Contract

## Purpose

Keep coordination, implementation, evidence, and current truth connected
without making any one artifact carry all four responsibilities.

## Artifact responsibilities

| Artifact | Owns | Does not own |
| --- | --- | --- |
| Issue | Problem, actual behavior, desired outcome, scope, accepted decisions, acceptance, owner, and status | Current system design or implementation detail already owned elsewhere |
| Sub-issue | One independently verifiable delivery slice that contributes to a parent outcome | A horizontal layer such as all backend work or all tests |
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
3. create `codex/issue-<number>-<slug>` from current `main`;
4. create a worktree only when the branch is an independently mergeable write;
5. open a pull request before asking for final review or integration.

Protected `main` requires the project checks and normal pull-request path. Do
not push directly to bypass the lifecycle, reconstruct completed history merely
to create activity, or keep a branch for a Backlog Issue with no approved next
action.

For the small current team, allow one primary product-delivery parent Issue and
one non-conflicting research or maintenance Issue in progress. A verified urgent
Bug may preempt them. Sub-issues and PRs under the active parent do not each
consume another parent-level WIP slot.

## Sub-issues and scope pressure

Create a sub-issue when the work is required for the same parent outcome but can
be delivered and verified independently. Create a separate Issue when the new
outcome can be deferred, released, prioritized, or accepted independently.

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
2. merged PRs and evidence identify the delivered revision;
3. affected tests and current owners are reconciled;
4. residual work has a new owner and durable location;
5. the branch or worktree exit state is explicit.

Do not keep a completed Issue or OpenSpec change active as a general roadmap.
