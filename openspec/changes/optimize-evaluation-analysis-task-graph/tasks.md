# Tasks

## Phase A — architecture Partial

- [x] Re-read #39, #41, #42, current main, the single-synthesis lifecycle,
      attempt persistence, Product Outbox and Worker topology.
- [x] Reconcile #32 completion and remove stale/circular native blockers before
      activating #42.
- [x] Compare one broad call, two parallel semantic tasks and sequential
      analysis-then-writing against the real semantic and latency failures.
- [x] Verify BullMQ 6.2.1 concurrency, global-concurrency, limiter and Flow
      capabilities from official/current sources.
- [x] Propose the smallest task contracts, persistence, retry, queue, progress,
      migration, rollback and verification boundaries.
- [ ] Complete fixed intent, architecture, source and evidence review with no
      unresolved material finding.
- [ ] Obtain product/architecture-owner approval and merge only a Partial PR
      using `Part of #42 — does not close`.

## #41 semantic consumer

- [ ] Rebuild PR #48 on the accepted Phase A revision without carrying the
      rejected broad Prompt as current behavior.
- [ ] Implement owner-local brand-relationship and report-narrative Prompt/model
      contracts plus deterministic semantic validation.
- [ ] Run focused replay and a separately authorized, capped real semantic Gate;
      close #41 only when customer quality passes.

## Phase B — runtime and evidence

- [ ] Add backward-compatible synthesis task-kind and accepted-component
      persistence with migration and rollback rehearsal.
- [ ] Append both task events atomically, execute them through current Product
      Outbox/Worker delivery, and retain task-local idempotency and retries.
- [ ] Assemble the existing canonical synthesis/report only after both supported
      components are accepted.
- [ ] Add authoritative queue-wait, Provider, projection, retry and assembly
      timing plus customer-safe per-platform progress.
- [ ] Prove concurrency, duplicate delivery, crash recovery, late result,
      one-task exhaustion, retry reuse and legacy history.
- [ ] Run the separately authorized same-store 4x5 comparison and decide the
      final timeout/model/cost budgets from evidence.
- [ ] Reconcile current specs/architecture, archive this Change, use the final
      PR's native `Closes #42`, and complete branch/worktree exit.

## #43 and parent Gate

- [ ] Hand the generated customer-safe progress contract to #43 after Phase B.
- [ ] Enter #39 final Integration Gate only after #41, #42 and #43 are complete.
