# Source Brief: S3 Background Work and Orchestration

- Status: Accepted and locally verified for deterministic S3
- Accessed: 2026-08-26
- Affected change: `deliver-first-evaluation-slice`, S3 resumable evidence

## Recommendation

Retain the accepted PostgreSQL plus transaction-Outbox plus Redis/BullMQ
foundation and use BullMQ 6.2.1 as a recoverable delivery and scheduling layer,
not as evaluation business truth. Add a GEO-owned persisted work planner, small
stage jobs, owner-local idempotent acceptance, and a scheduled reconciliation
scan. Do not add Temporal, Trigger.dev, a generic workflow engine, or a second
queue library for S3.

This recommendation has high confidence for deterministic S3. It does not claim
that BullMQ alone provides exactly-once effects or that current local Redis
settings are production-ready.

## Decision Constraints

- PostgreSQL must remain sufficient to discover current run state, retained
  evidence, unfinished work, and the correct next action.
- Queue loss, duplicate delivery, stalled jobs, worker restart, or telemetry
  failure must not duplicate accepted evidence or erase progress.
- Queue payloads contain identifiers and routing metadata only, not complete
  prompts, answers, sources, or sensitive customer content.
- Infrastructure redelivery and business provider-attempt budgets remain
  separate concepts.
- The first implementation must remain a modular monolith with API and Worker
  entrypoints from one backend artifact.
- New infrastructure must have a concrete current need and an exit or refresh
  trigger.

## Evidence

| Claim | Primary source | Version/date | Design implication |
| --- | --- | --- | --- |
| BullMQ supports automatic retry with fixed, exponential, jittered, or custom backoff. | [BullMQ retrying failing jobs](https://docs.bullmq.io/guide/retrying-failing-jobs) | BullMQ 6 documentation; accessed 2026-08-26 | Use queue retry for transient delivery or worker failure, with bounded exponential backoff and jitter. Do not equate queue attempts with provider attempts. |
| BullMQ explicitly requires jobs to be atomic and idempotent for safe retry, and recommends splitting complex work. | [BullMQ idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs), [BullMQ flows](https://docs.bullmq.io/patterns/flows) | Accessed 2026-08-26 | Acquisition, interpretation, and readiness are separate owner operations; database acceptance remains the final duplicate barrier. |
| BullMQ Job Schedulers create recurring jobs through an upserted scheduler identity, while production reliability still depends on Redis persistence. | [BullMQ Job Schedulers](https://docs.bullmq.io/guide/job-schedulers/), [BullMQ production guide](https://docs.bullmq.io/guide/going-to-production) | BullMQ 6; accessed 2026-08-26 | Use a scheduler only for periodic reconciliation of unfinished database work, not for the primary customer-triggered process. Production Redis requires AOF, `noeviction`, reconnect behavior, and graceful worker shutdown. |
| BullMQ may recover stalled work, but graceful shutdown is still required and job data is stored in clear text. | [BullMQ production guide](https://docs.bullmq.io/guide/going-to-production), [BullMQ stalled jobs](https://docs.bullmq.io/guide/jobs/stalled) | Accessed 2026-08-26 | Workers close on termination; job payloads hold IDs only; retained database state is the recovery source. |
| PostgreSQL provides MVCC, row locking, unique constraints, and queue-like `SKIP LOCKED` processing when explicitly needed. | [PostgreSQL concurrency control](https://www.postgresql.org/docs/current/mvcc-intro.html), [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html), [PostgreSQL update batching](https://www.postgresql.org/docs/current/sql-update.html) | PostgreSQL current documentation; accessed 2026-08-26 | Use conditional owner transitions, unique accepted-result constraints, and short row locks; reserve `SKIP LOCKED` for future multi-consumer database claims rather than making the database a second general queue now. |
| Temporal provides durable workflow replay and automatic Activity retries, but workflow code must remain deterministic and be versioned as running definitions change. | [Temporal workflow definition](https://docs.temporal.io/workflow-definition), [Temporal retry policies](https://docs.temporal.io/encyclopedia/retry-policies) | Accessed 2026-08-26 | Temporal is valuable for numerous long-lived, signal-heavy workflows, but introduces a second durable execution history and deployment/versioning model that S3 does not yet justify. |
| Trigger.dev provides task queues, idempotency keys, checkpoint/resume, retries, and its own deployment or self-hosted runtime. | [Trigger.dev how it works](https://trigger.dev/docs/how-it-works), [Trigger.dev idempotency](https://trigger.dev/docs/idempotency), [Trigger.dev concurrency and queues](https://trigger.dev/docs/queue-concurrency) | Accessed 2026-08-26 | It could accelerate standalone task products, but would duplicate the already accepted worker, queue, persistence, and deployment boundary in GEOEval. |

## Proposed Work Topology

1. The owner transaction appends a product Outbox fact together with every
   state transition that requires later work.
2. The relay adds a small BullMQ job with a stable technical `jobId` derived
   from the Outbox event. Retained job IDs reduce duplicate delivery, but
   PostgreSQL constraints and owner state remain the correctness boundary.
3. A pure evaluation work planner reads one run's persisted stage and emits only
   currently valid intents: acquire one sample, interpret one accepted answer,
   or evaluate readiness.
4. A handler registry maps each intent type to one application operation. It is
   a command/strategy seam, not a runtime plugin system.
5. Every successful owner transition appends the next reliable fact in the same
   transaction. Direct enqueue after commit is not the only path to later work.
6. A BullMQ Job Scheduler periodically runs a reconciliation scan that finds
   unfinished database work and reasserts missing delivery. It never changes
   evaluation state directly.
7. Operational metrics cover pending and oldest Outbox age, queue waiting,
   active, stalled, and failed counts, run-stage duration, accepted coverage,
   attempt failure class, and recovery count.

## Retry and Failure Ownership

| Failure | Owner action |
| --- | --- |
| Redis disconnect, worker crash, database transient before an external attempt | BullMQ redelivery with bounded exponential backoff and jitter; no new provider attempt is counted |
| Duplicate Outbox or queue delivery | Stable job identity plus idempotent owner command; unique database constraints prevent duplicate accepted evidence |
| Provider timeout after a request may have escaped | Record one ambiguous AI attempt; later policy may start a distinct bounded attempt, but only one canonical result can be accepted |
| Provider rate limit or transient provider error | AI Execution returns a typed failure; purpose policy schedules a delayed next attempt within its own budget |
| Invalid credentials, unsupported route, malformed request, or owner semantic rejection | Non-retryable or purpose-specific fallback decision; do not consume unlimited queue retries |
| Parser failure after a valid answer | Preserve canonical answer; retry parsing only, never resample the platform for that reason |
| Telemetry export failure | Record or log the telemetry failure without rolling back or rejecting the business result |
| Missing Redis job or an exhausted poison job | Scheduled reconciliation reasserts unfinished database work; retained failed-job evidence supports operator diagnosis |

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| PostgreSQL owner state + Outbox + BullMQ 6.2.1 + reconciliation | Adopt for S3 | Reuses the verified stack, supports bounded parallel work and recovery, and keeps business truth in one datastore. |
| BullMQ Flow as the evaluation's authoritative state machine | Reject | Redis dependency graphs would compete with GEO-owned lifecycle and are harder to reconstruct after queue loss or policy change. Flows may later optimize technical fan-out only. |
| Temporal | Defer | Strong durable-execution semantics, but current S3 has one short bounded workflow and does not justify another service, replay history, worker-versioning discipline, or source of operational truth. |
| Trigger.dev | Defer/reject for current foundation | Useful managed task runtime, but duplicates the selected Worker and deployment model and changes the system's operational boundary. |
| Custom in-process timers or a database polling loop as the only dispatcher | Reject | Does not supply the selected queue's retry, backoff, stalled-work, concurrency, and scheduling mechanics. |
| Add a generic resilience or workflow abstraction before real providers | Reject for S3 | Deterministic S3 can prove the owner contract with BullMQ, PostgreSQL, Zod, and `AbortSignal`; real route evidence should drive S6 timeout, circuit-breaker, and rate-policy selection. |

## Validation and Remaining Unknowns

- Local 20/20, 17/20, and 16/20 flows passed with duplicate delivery,
  concurrent processing, Worker restart, telemetry failure, reconciliation,
  full Worker-module startup and shutdown, and accepted-attempt linkage.
- Production Redis persistence, high availability, TLS, memory sizing, retention,
  and backup remain an operational gate; local Compose evidence cannot approve
  them.
- Before S6, validate each route's timeout, rate-limit signal, retry-after
  semantics, ambiguous failure posture, concurrency, and cost. That evidence may
  justify per-route queue lanes, a circuit-breaker library, or stronger bulkhead
  isolation.

## Reuse and Refresh Boundary

- Reusable while BullMQ remains on the accepted major version, PostgreSQL owns
  business lifecycle, and evaluation remains a bounded fan-out/fan-in process.
- Reconsider Temporal or another durable workflow platform when several modules
  require long-lived waits, human signals, compensation, cross-service
  orchestration, workflow replay/versioning, or process histories that can no
  longer be expressed clearly as owner state plus small idempotent jobs.
- Refresh when BullMQ major version, Redis topology, provider concurrency model,
  deployment boundary, or multi-region requirements change.
