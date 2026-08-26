# ADR 0001: TypeScript Modular Application Foundation

- Status: Accepted
- Date: 2026-08-25
- Supersedes: None

## Context

The approved product needs a responsive customer Web application, one coherent
business model, long-running evaluation work, atomic commercial writes, durable
recovery, provider-specific AI adapters, and maintainable module ownership. A
page-first backend, early microservices, or a second general backend language
would multiply contracts and failure modes before the first product slice.

## Decision

Use one TypeScript pnpm workspace with:

- a Next.js App Router Web application;
- one NestJS backend source application built once and run through separate API
  and worker entrypoints;
- capability-owned modules with inward dependencies and small owner contracts;
- PostgreSQL as business authority through Prisma for ordinary access and
  reviewed SQL for material database behavior;
- a transaction Outbox and Redis/BullMQ as recoverable delivery, protected by
  durable business idempotency;
- REST/OpenAPI as the Web boundary and a generated client as the only shared
  transport contract;
- SSE as a disposable notification hint over normal durable reads;
- project-local dependencies and Compose-managed local infrastructure.

The F0 baseline pins Node.js 24.12.0, pnpm 11.9.0, TypeScript 5.9.3, Next.js
16.3.2, React 19.2.8, NestJS 11.2.2, Prisma 7.9.1, PostgreSQL 18.6, BullMQ
6.2.1, and Redis 8.2.8. Exact versions may advance through a separately
verified dependency change without reopening the logical architecture.

## Consequences

- API and Worker can scale and restart independently without duplicating
  backend rules or data ownership.
- Queue loss, duplicate delivery, SSE loss, and telemetry failure cannot become
  loss or duplication of committed business truth.
- Provider and protocol variation stays outside business use cases through
  ports and adapters, while raw evidence remains lossless.
- The team maintains one language, schema authority, migration order, lockfile,
  and generated Web contract for the initial application.
- PostgreSQL and Redis remain operational dependencies even though the initial
  deployment is a modular monolith.
- Test-only F0 endpoints and records must not become production product APIs.

## Alternatives considered

- Next.js as both product Web and independent business backend: rejected because
  it creates a second data and rule authority beside long-running workers.
- Early microservices, Kubernetes, Kafka, GraphQL, or a generic workflow engine:
  rejected because the current consistency and scale evidence does not earn the
  additional distributed boundaries.
- A Python general backend from day one: deferred until a concrete Python-only
  capability outweighs the two-language contract and operations cost.
- TypeScript 7.0.2: rejected for this baseline after the generated-contract tool
  declared only TypeScript 5.x support during F0.

## Revisit when

- one capability needs independent ownership, release cadence, security, or
  scaling that the modular process boundary cannot provide;
- a required production dependency is only practical in another runtime;
- PostgreSQL or Redis evidence invalidates the selected authority/delivery split;
- provider integration or the first real slice exposes a contract that the F0
  foundation cannot represent without crossing module ownership.

Execution evidence is recorded in the
[F0 foundation spike evidence](../../../openspec/changes/archive/2026-08-25-define-application-architecture/research/foundation-spike-evidence.md).
