---
name: codebase-design
description: Designs or reviews deep modules, small public interfaces, clean seams, and explicit dependency direction. Use when a GEOEval change introduces a module, shared interface, adapter boundary, or structural refactor. Do not require abstraction without a real variability or ownership boundary.
---

# Codebase Design

Design a coherent module that hides meaningful complexity behind a small,
stable interface at the correct seam.

## Vocabulary

- **Module:** one owned capability with an interface and implementation.
- **Interface:** everything a caller must know, including invariants, errors,
  ordering, configuration, and performance constraints.
- **Seam:** a location where behavior can vary without callers knowing internals.
- **Adapter:** a concrete implementation that satisfies an interface at a seam.
- **Depth:** useful behavior and hidden complexity per unit of interface.
- **Locality:** change, bugs, and verification concentrate at the owner.

## Workflow

1. Map the requested behavior, owner, callers, dependencies, state, failures,
   and current tests.
2. Apply the deletion test: if the proposed module vanished, would complexity
   disappear or leak into many callers?
3. Prefer an existing seam. Add a new seam only for a real owner, external
   boundary, test substitute, or demonstrated variability.
4. Compare at least two materially different interfaces when the choice is hard
   to reverse. Judge them by depth, locality, migration cost, and verification.
5. Recommend the smallest coherent interface and name what remains internal.

Do not use line-count ratios, generic service layers, speculative factories, or
test-only interfaces as substitutes for clear ownership.
