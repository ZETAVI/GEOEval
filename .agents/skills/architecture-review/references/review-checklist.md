# Architecture Review Checklist

## Responsibility and Cohesion

- One module owns each business capability and durable data concept.
- Related rules change together; unrelated behavior is not bundled behind a generic service.
- Public entry points express domain intent rather than storage or framework details.

## Coupling and Dependencies

- Dependencies point toward stable contracts.
- A module does not query or mutate another module's private state.
- Cycles, callbacks, global state, and shared mutable caches are justified and controlled.

## Reuse

- Existing semantic capabilities were considered before creating new ones.
- Shared abstractions have multiple stable consumers or a clear platform boundary.
- Extension does not add flags and branches that couple unrelated use cases.

## Data and Failure

- The owner of each write, invariant, and transaction is explicit.
- Partial failure, retry, idempotency, concurrency, and consistency are addressed where material.
- Migrations are compatible, observable, and reversible when feasible.

## Evolution

- The design is the simplest one that satisfies current requirements.
- Compatibility and deprecation paths are explicit for public contracts.
- Tests protect behavior and boundaries without freezing private implementation.

## Design Knowledge

- Every durable design claim has one executable or current-document owner.
- A new design document has a stable scope, owner, and lifetime that existing sources cannot satisfy.
- Current documents are updated in place rather than copied into versioned variants.
- Change-specific design is reconciled into current specs, contracts, code, schemas, tests, or ADRs before close.
- Obsolete active explanations are moved, merged, deleted, regenerated, or superseded.
- A touched `Evolution marker` is executed, updated, or explicitly retained with
  its trigger and reconciler.

## Proportionality

- Every finding names a reachable consequence and changed action.
- Equivalent review evidence is reused when the scoped revision and boundary are
  unchanged.
- Optional hardening remains separate from merge-blocking findings.
