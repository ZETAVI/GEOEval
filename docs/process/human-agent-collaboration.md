# Human–Agent Collaboration

## Role model

### Human owner

- Defines intent and value.
- Resolves material ambiguity and tradeoffs.
- Approves consequential architecture, risk, and irreversible actions.
- Remains accountable for the result.

### Lead agent

- Builds and maintains the task model.
- Chooses the minimum workflow class.
- Protects canonical sources and write ownership.
- Delegates bounded work when parallelism helps.
- Integrates evidence and reports uncertainty honestly.

### Supporting agent

- Receives one bounded objective, relevant sources, expected output, and constraints.
- Returns findings, artifacts, evidence, risks, and continuation state.
- Does not redefine shared intent or edit another agent's owned surface.

## Multi-agent decision rule

Use parallel agents when at least one is true:

- independent read-only research can reduce latency;
- different reviewers can inspect genuinely distinct quality dimensions;
- implementation packages have fixed interfaces and disjoint files;
- tests or verification can run independently from implementation.

Do not parallelize writes when agents need to negotiate the same contract, canonical document, migration order, or shared component.
Do not fan out several agents to reread the same sources or produce interchangeable
summaries. Each delegation must add a distinct decision input, artifact, or
verification result.

## Single-writer rule

At any moment, one owner writes each of these:

- product intent;
- a capability spec;
- a public interface or schema;
- an ADR;
- shared design-system primitives;
- a release changelog.

Others may review or propose patches, but the lead owner reconciles them.

## Branch and worktree lifecycle

The unit of isolation is one independently mergeable write outcome, not one
agent, prompt, conversation, review, or session.

- Reuse the current task branch or worktree when new work serves the same
  approved outcome and owner. If it is dirty, attribute and preserve the current
  changes before continuing; do not create another branch to escape unknown
  state.
- Read-only exploration, research, review, and verification normally use the
  existing checkout and do not earn another branch.
- Create a branch or worktree for an independent write package only when it can
  be integrated or abandoned without redefining another package's contract.
- Supporting agents do not create branches unless the lead assigns them an
  owned write package.

Before creating one, inspect existing branches and worktrees, then define:

- base revision;
- outcome, owner, and merge destination;
- owned files or module;
- allowed interface assumptions;
- validation command;
- merge order when dependencies exist;
- handoff format;
- exit condition.

### Integration-test resource isolation

Worktrees that can run integration tests concurrently must use distinct
PostgreSQL databases and distinct Redis logical databases or instances. Pass
both targets explicitly through `DATABASE_URL` and `REDIS_URL`; a partial
override must fail before cleanup begins. Local defaults are only a single-owner
convenience and are not a parallel-test boundary.

Test composition may allowlist these resource targets, but must not inherit
real-provider, telemetry, credential, or production-mode environment variables.
Database cleanup and queue obliteration must use the same resolved worktree-
specific targets as the application under test. Verification for a changed
isolation boundary must prove both that the isolated resources were exercised
and that the shared defaults remained unchanged.

At handoff or task close, record exact checkout, branch, revision, dirty state,
verification state, merge status, and one of these exits:

- `retain`: active work continues here;
- `ready-for-integration`: verified and awaiting merge or review;
- `blocked-handoff`: unmerged state is intentionally preserved with next action;
- `remove-after-merge`: cleanup is safe only after merge and a clean-status check;
- `removed`: worktree is gone and no unique unmerged state was discarded.

One lead owns integration and cleanup. Never delete an unmerged branch or dirty
worktree merely because it appears old; first establish ancestry, ownership, and
recovery value.

Recovery branches are transitional. Record exactly one disposition in the
owning Issue:

- `retain`: the open Issue still needs unique state;
- `superseded`: a current Issue branch or merged owner contains the state;
- `archive-tag`: immutable historical input remains useful but is not active;
- `delete-after-merge`: formal integration will make the branch redundant.

Verify the replacement ref or archive tag remotely before deleting a recovery
branch. Do not use recovery branches as the project's permanent archive.

## Handoff rule

Every agent response should make its outcome recoverable. Persist a handoff only when work crosses a session, agent, branch, or owner boundary. A handoff records state and evidence, never hidden reasoning or a transcript.
