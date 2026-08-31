# Change: Deliver the First Evaluation Slice

- Status: Completed, reconciled on `main`, and archived on 2026-08-31;
  deterministic S1-S5 are accepted current behavior and the bounded frontend
  presentation outcome is tracked separately by Issue #13
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

S4 adds typed semantic interpretation, deterministic report calculation,
immutable reports, protected guidance, and a safe customer report projection.
S5 adds run-owned retry cycles, immutable report history, and a durable
Notification inbox whose SSE stream is only a recoverable refresh hint.

## Control State

- Documentation: accepted behavior is owned by the customer-entry,
  evaluation-definition, evaluation-evidence, evaluation-report, and
  notification current specs plus the architecture overview.
- Workspace: integrated through `main@aa48e96`; the historical Branch and
  Worktree were retired under Issue #3. This archive is decision and execution
  history, not a continuing backlog.

## Approval Boundary

The current authorization permits local dependencies already in the lockfile,
additive local migrations, deterministic identity and AI adapters, and product
code for S1-S5. It does not permit external provider calls, service activation,
production data, production resources, or deployment.

## Final Disposition

- Accepted S1-S5 behavior is executable on `main` and reconciled into current
  owner-local specs.
- Report presentation refinement moved to Issue #13 and does not keep this
  Change active.
- Real Provider execution remains the independent Issue #4 / Draft PR #20
  outcome.
- Production and Release remain outside this completed development Change.
