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
- different reviewers can inspect distinct quality dimensions;
- implementation packages have fixed interfaces and disjoint files;
- tests or verification can run independently from implementation.

Do not parallelize writes when agents need to negotiate the same contract, canonical document, migration order, or shared component.

## Single-writer rule

At any moment, one owner writes each of these:

- product intent;
- a capability spec;
- a public interface or schema;
- an ADR;
- shared design-system primitives;
- a release changelog.

Others may review or propose patches, but the lead owner reconciles them.

## Worktree rule

Use separate Git worktrees for concurrent implementation. Before delegation, define:

- base revision;
- owned files or module;
- allowed interface assumptions;
- validation command;
- merge order when dependencies exist;
- handoff format.

## Handoff rule

Every agent response should make its outcome recoverable. Persist a handoff only when work crosses a session, agent, branch, or owner boundary. A handoff records state and evidence, never hidden reasoning or a transcript.

