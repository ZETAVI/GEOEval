# Source Brief: BullMQ Task Topology for M4 Analysis

## Recommendation

Reuse GEOEval's PostgreSQL Outbox and existing BullMQ queue. Let PostgreSQL own
the two accepted semantic components and their assembly; do not adopt BullMQ
Flows or Pro groups. Use the installed open-source queue's local/global
concurrency boundary, and add rate limiting or separate queues only after
observed Provider pressure changes the decision.

## Decision constraints

- Redis cannot become the authority for component acceptance, retry or report
  completion.
- Two task calls must overlap without allowing duplicate Provider requests.
- Several Worker processes must not silently multiply reviewed global
  concurrency.
- The solution cannot require BullMQ Pro or a new workflow framework.

## Evidence

| Claim | Primary source | Version/date | Design implication |
| --- | --- | --- | --- |
| Worker `concurrency` is local to one Worker and benefits asynchronous I/O | [BullMQ concurrency guide](https://docs.bullmq.io/guide/workers/concurrency) | Official guide, accessed 2026-09-04 | Current concurrency 5 can overlap two HTTP tasks in one Worker, but is not a multi-process global cap |
| A Queue can set global concurrency across Worker instances | [BullMQ global concurrency](https://docs.bullmq.io/guide/queues/global-concurrency) | Official guide; exact method also present in installed 6.2.1 types | Phase B can preserve aggregate queue concurrency 5 without another queue |
| Worker rate limiting is global to a queue; open-source group keys were removed from BullMQ 3+ | [BullMQ rate limiting](https://docs.bullmq.io/guide/rate-limiting) | Official guide, accessed 2026-09-04 | Do not claim per-purpose limiting in the current shared queue; require evidence before adding separate queues |
| FlowProducer stores parent/child dependencies and child results in BullMQ | [BullMQ flows](https://docs.bullmq.io/guide/flows/) | Official guide, accessed 2026-09-04 | Reject for this change because it would duplicate PostgreSQL business lifecycle and recovery |
| Installed Worker options expose one `concurrency` and one queue limiter with only `max` and `duration` | local `bullmq@6.2.1` package types and lockfile | Exact repository dependency, 2026-09-04 | No unverified group-limiter or Pro assumption enters the design |

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| Existing Outbox + one queue | Adopt | Already recoverable; two task facts remain PostgreSQL-owned and can execute concurrently |
| BullMQ FlowProducer | Reject | Adds a second dependency/result graph whose loss or cleanup could disagree with accepted business state |
| Separate queue per semantic purpose | Defer | Enables independent limiters but adds runtime surfaces without current 429/QPS evidence |
| BullMQ Pro groups | Reject | Paid dependency and group semantics are unnecessary for the known two-task boundary |

## Unknowns and validation

- Multi-Worker deployment count and Provider account QPS are not current
  production facts. Phase B must read named environment configuration before
  choosing a global rate limit.
- Initial 90/120-second task timeouts and Qwen low/medium reasoning are candidates
  derived from retained local evidence, not accepted runtime facts. Controlled
  task-specific probes decide them.

## Reuse and refresh boundary

- Reusable while BullMQ remains 6.2.x, Product Outbox remains the business
  delivery source, and no Provider-specific 429/QPS evidence requires a separate
  limiter.
- Refresh when BullMQ is upgraded, multiple Worker processes are deployed, a
  provider account limit is observed, or the product requires per-customer
  fairness.
