# Change: Deliver the First Evaluation Slice

- Status: Approved through deterministic S1-S5; S1 accepted and checkpointed,
  S2 locally verified and checkpointed, S3 resumable evidence verified and
  checkpointed
- Class: Architectural implementation
- Decision owners: Product owner and architecture owner
- Implementation authorization: Deterministic S1-S5 only, confirmed 2026-08-25

## Why

The product definition, modular application foundation, and first-slice
ownership are accepted. The next useful outcome is no longer another planning
artifact: a terminal customer must be able to enter the product, establish an
account, intentionally continue without a brand or create one, and use one
current brand as the source for the later evaluation journey.

## Scope

- In: S1-S5 against deterministic adapters, beginning with terminal-customer
  entry, passwordless identity boundary, session handling, optional first-brand
  onboarding, brand creation/editing/selection, and the responsive My brands
  service home.
- Out: real SMS delivery, agent acquisition attribution, real AI providers,
  S6 provider integration, production infrastructure, optimization, publishing,
  points, payments, fulfilment, commission, and administration features.

## Impact

S1 introduces Identity and Access plus Brand Knowledge. S2 introduces GEO
Intelligence definition and run ownership, immutable brand/question snapshots,
twenty sample identities, and a reliable product outbox fact. Both use additive
PostgreSQL migrations, authenticated REST/OpenAPI contracts, and generated Web
client types. S3 adds GEO-owned execution cycles, canonical evidence,
interpretation and readiness state; AI-attempt evidence; and an isolated
Outbox/BullMQ Worker path with scheduled reconciliation. The existing F0 probes
remain isolated evidence and do not become product APIs.

## Control State

- Documentation: keep increment deltas in this active change; promote each
  verified increment to its owner-local current spec and update the architecture
  overview. The product-definition spec remains the product-meaning authority
  and is not copied wholesale.
- Workspace: branch `codex/first-evaluation-slice`, based on `7ec4cea` from
  `codex/provider-validation`; current agent is the single writer; intended
  merge destination is `main` with its existing ancestry; exit only after the
  implemented increment is verified and current truth is reconciled.

## Approval Boundary

The current authorization permits local dependencies already in the lockfile,
additive local migrations, deterministic identity and AI adapters, and product
code for S1-S5. It does not permit external provider calls, service activation,
production data, production resources, or deployment.
