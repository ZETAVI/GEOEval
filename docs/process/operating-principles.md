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

## 5. Make surgical changes and refactor continuously at the seam

Every changed line should trace to the requested outcome or to cleanup caused by that change. Improve a local seam when the next feature exposes friction; do not mix unrelated cleanup into delivery or postpone all design repair to a future rewrite.

**Decision test:** Is this edit necessary for the requested outcome, its verified maintainability, or a safe incremental migration?

## 6. Prefer evidence over assumption

Translate work into observable claims and select evidence appropriate to each claim. For external technology, use current primary sources and controlled runtime observations before designing an interface. Confidence, search summaries, configuration presence, and HTTP status alone are not proof.

**Decision test:** What evidence would convince a skeptical reviewer that both the design premise and the resulting behavior are correct?

## 7. Establish boundaries before parallelism

Parallelize discovery, review, and isolated work. Parallel writes require fixed interfaces, disjoint ownership, and separate worktrees. Canonical specifications, contracts, shared design primitives, and release records have one writer at a time.

**Decision test:** Can two contributors complete and merge their work without negotiating the same files or redefining the same contract?

## 8. Humans own intent; agents own bounded execution

Humans decide product meaning, material tradeoffs, and accepted risk. Agents act autonomously inside approved scope, stop at authority boundaries, preserve recoverability, and return concise evidence and continuation state.

**Decision test:** Is the next action execution within an agreed boundary, or a new decision that changes that boundary?
