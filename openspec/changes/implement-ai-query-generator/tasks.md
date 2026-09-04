# Tasks: Implement AI Evaluation Query Generator

## 1. Alignment and branch recovery

- [x] Reopen the failed Query-quality acceptance boundary under Issue #26.
- [x] Confirm Snapshot v3 Query semantics and the compact single-result model output.
- [x] Record the confirmed Decision Brief and move #26 to `In Progress / P0`.
- [x] Rebase the Issue branch onto `main@82f7056`, dropping the crossed #41 synthesis commit and premature archive commit.
- [x] Restore the active OpenSpec Change.

## 2. Architecture and contracts

- [x] Review module ownership, lifecycle reuse, migration order, failure recovery, and cross-Issue boundaries.
- [x] Replace the v2 text context with the Snapshot v3 Query projection.
- [x] Add structured city, terminal-region, and typed locality context without exposing Amap evidence.
- [x] Reduce model output to `queryTargetName` and four final question strings.
- [x] Keep deterministic validation to the brand-name and four-role invariants.
- [x] Re-run architecture review against the implemented revision and resolve all material findings.

## 3. Prompt and deterministic evidence

- [x] Rewrite the Prompt around task outcome, reader, input responsibilities, planning order, and completion standard.
- [x] Add a small restaurant and enterprise-service example set without turning examples into templates.
- [x] Preserve flagship meaning, structured locality, complete peer-characteristic consideration, and complementary question roles.
- [x] Keep the deterministic adapter as an offline fixture rather than a customer fallback.
- [x] Pass focused Prompt identity, JSON Schema, projection, and semantic-boundary tests.

## 4. Durable preparation implementation

- [x] Reuse Product Outbox/BullMQ, AI Execution, append-only attempts, and the existing preparation state machine.
- [x] Reconcile the rebased Prisma schema with Snapshot v3 and current main modules.
- [x] Rename and replay the Query preparation migration after the current migration sequence.
- [x] Prove duplicate prepare/delivery, finite retry/fallback, exhaustion, explicit retry, stale-sequence rejection, and existing Definition reuse.
- [x] Regenerate Prisma, OpenAPI, and the API client from source.

## 5. Local verification

- [x] Pass focused Query contract and lifecycle tests.
- [x] Pass backend tests, workspace typecheck, formatting, build, framework validation, Markdown links, and diff checks.
- [x] Replay all migrations on an isolated empty database and verify a second deploy has no pending work.
- [x] Verify the browser journey for preparing, leave/return, ready four questions, and start; retain the focused automated `PLEASE_RETRY` evidence.

## 6. Controlled real validation

- [x] Recheck current Qwen3.8 and Hy3 route/model configuration without exposing credentials.
- [ ] Obtain explicit authorization for a bounded Query-only real call batch.
- [ ] Review exact outputs for a small restaurant, enterprise service, and another representative store; stop on the first material quality failure.
- [ ] Iterate Prompt versions from observed outputs without adding symptom-by-symptom prohibitions.
- [ ] After Query acceptance, obtain separate authorization for one representative 4×5 run under #39.

## 7. Reconciliation and exit

- [ ] Reconcile accepted behavior into the current evaluation-definition spec and architecture overview.
- [ ] Update Issue #26 and PR #28 with implementation, evidence, limitations, and cross-Issue handoffs.
- [ ] Notify #32 that its stacked PR must rebase onto the stable #26 head.
- [x] Complete fixed-diff code review.
- [ ] Pass required CI on the published revision.
- [ ] Archive this Change only after current truth is reconciled.
- [ ] Obtain explicit Merge authorization; after merge, verify Issue/Project/branch/worktree exit state.
