# Architecture Overview

- Status: Application foundation accepted; external and product-slice gates pending
- Entry condition: Approved product foundation and bounded first product slice
- Active change: [`define-application-architecture`](../../openspec/changes/define-application-architecture/proposal.md)

## Current state

The application foundation is a TypeScript modular monolith: one pnpm workspace,
a Next.js Web application, and one NestJS backend built once with separate API
and Worker entrypoints. PostgreSQL owns business truth; Redis/BullMQ delivers
recoverable background work through a transaction Outbox and durable business
idempotency. REST/OpenAPI owns the Web transport boundary, and SSE is a
recoverable hint over normal durable reads.

This shape passed the bounded
[F0 foundation evidence](../../openspec/changes/define-application-architecture/research/foundation-spike-evidence.md)
and is recorded by [ADR 0001](adr/0001-application-foundation.md). The checked
F0 routes and records are non-product probes. Product implementation, real
provider calls, production infrastructure, authentication, and customer-facing
interaction design remain outside the current authorization.

## Architecture qualities

When architecture work begins, it must preserve:

- high cohesion around product capabilities and data ownership;
- low coupling through small, explicit public contracts;
- dependency direction that can be checked in code and CI;
- reuse based on stable semantics rather than anticipated similarity;
- incremental migration and local refactoring instead of large rewrites;
- observable failure boundaries and task-appropriate verification;
- primary-source evidence for every consequential external dependency.

## Next architecture gates

1. Rotate exposed credentials and establish named provider accounts, routes,
   budget, and secure evidence retention before any E0 real model call.
2. Reconcile accepted provider evidence into route policy and adapter contracts.
3. Obtain explicit S0 authorization before implementing customer identity,
   brand, evaluation, notification, or report behavior.
4. Remove or isolate F0-only HTTP, schema, and page probes before a commercial
   deployment.

Do not use this document as a list of imagined future services.
