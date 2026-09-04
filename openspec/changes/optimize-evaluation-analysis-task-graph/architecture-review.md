# Architecture Review: Evaluation Analysis Task Graph

- Review base: `main@ddadf7718a6896c5682603be9ec87de77556a98d`
- Scope: proposal, design, task sequence, BullMQ source brief and two delta specs
- Review type: Phase A pre-implementation architecture gate

## Review contract

The design must remove the proven single-request overload without creating a
second workflow authority, changing deterministic metrics, pre-implementing
#41 semantics, or adding more orchestration than the known two-task boundary
requires. It must preserve legacy reports and state a credible migration,
recovery and evidence path.

## Findings resolved

1. **Rollback compatibility:** the first draft implied that a default task kind
   made the widened attempt uniqueness key compatible with arbitrary old code.
   Once parallel rows exist, an old client can no longer safely assume one row
   per cycle/attempt number. The design now requires a two-stage migration and
   schema-aware legacy runtime mode instead of promising old-binary rollback.
2. **Workflow duplication:** BullMQ Flows can represent parent/child jobs, but
   using their dependency/result state would duplicate PostgreSQL component and
   report truth. The design keeps two ordinary Outbox facts and one existing
   queue.
3. **Premature platform expansion:** separate queues, BullMQ Pro groups, extra
   API accounts and a third analysis Agent lack observed need. They are excluded
   or deferred behind a named 429/QPS or semantic failure.
4. **Evidence overstatement:** the 90/120-second timeouts, Qwen low/medium split
   and four-call ceiling are labeled initial engineering candidates. They do not
   become a customer SLA or accepted Provider fact before controlled evidence.

## Intent review

`ready for product-owner review`.

- The selected split follows the actual failure boundary: brand identity
  coverage changes independently from evidence-grounded customer writing.
- Four questions, five platforms, 17/20 readiness, metrics, history, report
  visibility and Notification remain unchanged.
- #41 retains Prompt/model/customer-quality ownership; #42 owns only task
  topology, persistence, budgets and progress.

## Architecture and engineering review

`ready for product-owner review`.

- The two task interfaces are smaller than the current combined model contract
  and neither consumes the other's output, so they can execute concurrently.
- GEO-owned accepted components prevent AI Attempt or BullMQ state from becoming
  report truth and let one successful task survive another task's retry.
- The existing Product Outbox, Worker and canonical synthesis/report assembly
  remain the deep modules; no generic workflow graph is introduced.
- Task-local uniqueness, late-result protection, input fingerprint, retry reuse,
  legacy compatibility and final atomic assembly have explicit owners.
- The progress projection is derived from durable sample/component/report state
  and remains separate from #43 presentation.

## Evidence and continuity review

`ready for Partial PR review`.

- #41's controlled Prompt 3.0/3.0.1/4.0 results distinguish the semantic fault
  from transport or JSON-shape failure.
- The current Prisma schema and repositories prove that one synthesis attempt
  key and one atomic report transaction are the actual migration seams.
- The installed `bullmq@6.2.1` types plus official documentation support local
  concurrency, queue global concurrency and queue-wide rate limiting; open-source
  per-group limits are not assumed.
- Phase A changes only proposed design. Runtime tests, migrations, browser
  progress and Provider comparisons remain correctly unclaimed.

## Residual gates

- #41 must define and prove the two exact model-facing contracts.
- Phase B must rehearse both migration stages and legacy runtime fallback.
- Task-specific timeout, model effort, QPS and semantic quality require explicit
  controlled-call authority; current Hy3 entitlement remains unavailable.
- The final same-store 4x5 and customer progress browser evidence remain #42/#43
  and #39 gates.

Overall result: `ready for product-owner review`. No runtime implementation is
authorized by this review.
