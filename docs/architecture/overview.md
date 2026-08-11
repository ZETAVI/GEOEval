# Architecture Overview

- Status: Not selected
- Entry condition: Approved product foundation and bounded first product slice

## Current state

No application architecture, module structure, data model, external integration, or deployment platform has been approved. This is intentional: architecture should answer an agreed product problem rather than define it accidentally.

## Architecture qualities

When architecture work begins, it must preserve:

- high cohesion around product capabilities and data ownership;
- low coupling through small, explicit public contracts;
- dependency direction that can be checked in code and CI;
- reuse based on stable semantics rather than anticipated similarity;
- incremental migration and local refactoring instead of large rewrites;
- observable failure boundaries and task-appropriate verification;
- primary-source evidence for every consequential external dependency.

## First architecture deliverables

After the product foundation is approved:

1. Map the first user journey and the capabilities required to complete it.
2. Assign each capability one responsibility and data owner.
3. Identify public contracts, prohibited dependencies, and external systems.
4. Record consequential alternatives and tradeoffs in an ADR.
5. Choose the smallest deployable architecture that satisfies the first slice.

Do not use this document as a list of imagined future services.
