# Operating Principles

These eight principles are normative. Templates, skills, and automation should make them easier to follow, not restate them in full.

## 1. Intent before implementation

Do not convert ambiguity into code. State assumptions, surface competing interpretations, identify non-goals, and ask for a decision when the choice materially changes the outcome.

**Decision test:** Could two competent readers implement meaningfully different behavior from the current request? If yes, align first.

## 2. Design context; keep one home for each fact

Treat agent context as architecture. Keep always-loaded instructions short, place detailed knowledge near its owner, and give every durable fact one canonical home. Prefer executable truth—code, schemas, generated references, and tests—where practical.

**Decision test:** Does this information need every task's context, and if it changes tomorrow, is there exactly one place that must be edited?

## 3. Separate current truth from proposed change

Specifications describe what is true now. Change records describe what should become true. Merge the delta only after implementation and verification.

**Decision test:** Can a reader distinguish accepted behavior from an unapproved or unfinished proposal?

## 4. Simplicity first; reuse must be earned

Build the smallest coherent solution for the known problem. Search for existing semantics before creating something new, but do not invent abstractions for hypothetical reuse.

**Decision test:** Is the abstraction supported by multiple stable use cases, or only by imagined flexibility?

## 5. Stabilize hard boundaries; evolve details at the seam

Before implementation, stabilize decisions that are expensive to reverse or
spread across modules: ownership, public dependency direction, money and paid
promises, immutable history, sensitive data, external boundaries, and rollback
risk. For a material module, also establish its lifecycle, data invariants,
synchronous-versus-asynchronous boundary, failure and recovery policy, external
tool decision, and discriminating verification before implementation. Refine
reversible tables, internal contracts, abstractions, and local patterns one
small vertical slice at a time from implementation and verification evidence.
Every changed line should trace to the requested outcome or to cleanup caused by
that change; improve a local seam when the next feature exposes friction without
mixing unrelated cleanup into delivery.

**Decision test:** Is this a durable boundary that must be stable before work
starts, or a reversible detail that can be decided safely in the owning slice?

## 6. Prefer discriminating evidence; stop when it is enough

Translate work into observable claims and select the smallest evidence that can
disprove them. Before adding a check, artifact, abstraction, guard, or review
round, name the live uncertainty, a reachable failure, and what action would
change. Reuse still-relevant passing evidence when the affected code,
configuration, dependency, data, and environment have not changed. For external
technology, use current primary sources and controlled runtime observations
before designing an interface. Confidence, search summaries, configuration
presence, and HTTP status alone are not proof.

**Decision test:** What is the smallest evidence that could change the next
action, and has that boundary already been proven?

## 7. Establish boundaries before parallelism

Parallelize discovery, review, and isolated work. Parallel writes require fixed interfaces, disjoint ownership, and separate worktrees. Canonical specifications, contracts, shared design primitives, and release records have one writer at a time.

**Decision test:** Can two contributors complete and merge their work without negotiating the same files or redefining the same contract?

## 8. Humans own intent; agents own bounded execution

Humans decide product meaning, material tradeoffs, and accepted risk. Agents act autonomously inside approved scope, stop at authority boundaries, preserve recoverability, and return concise evidence and continuation state.

**Decision test:** Is the next action execution within an agreed boundary, or a new decision that changes that boundary?
