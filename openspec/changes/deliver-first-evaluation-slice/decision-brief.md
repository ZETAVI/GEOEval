# Decision Brief: S3 Resumable Evaluation Evidence

## Outcome

Turn the twenty sample identities created by S2 into durable deterministic
answers and per-sample interpretations that survive duplicate delivery and
worker restart, so S4 can build a report without repeating accepted work.

## Scope

- In: initial execution cycle, deterministic acquisition and interpretation
  attempts, canonical answers and returned sources, per-sample structured
  interpretation, exhausted positions, durable progress, and the
  seventeen-of-twenty ready-for-synthesis boundary.
- Out: real providers, overall synthesis, score and report production,
  optimization guidance, notifications, customer retry execution, production
  pacing, capacity claims, and external observability activation.

## Decisions

| Decision | Choice | Rationale | Owner |
| --- | --- | --- | --- |
| S3 stopping point | Stop at accepted per-sample interpretations and `READY_FOR_SYNTHESIS` or `PLEASE_RETRY` | Proves the most consequential recovery and evidence boundaries without mixing report design or real-provider integration into one increment | Product owner and architecture owner |
| Business ownership | GEO Intelligence owns canonical evidence and sample state; AI Execution owns attempts only; Background Work owns delivery only | Prevents queues, provider traces, or a workflow coordinator from becoming competing business truth | Architecture owner |
| Delivery framework | Retain PostgreSQL owner state, transaction Outbox, and BullMQ 6.2.1; add a scheduled reconciliation scan and do not add Temporal or Trigger.dev in S3 | Reuses the verified stack and its mature retry, backoff, concurrency, scheduling, and stalled-work mechanics without adding a second durable workflow authority | Product owner and architecture owner |
| Work planning | A pure evaluation planner emits small acquisition, interpretation, and readiness intents; each transition reliably appends the next fact | Keeps jobs atomic and resumable and prevents one long job or a Redis Flow from owning the business lifecycle | Architecture owner |
| Retry ownership | BullMQ retries infrastructure delivery; persisted AI purpose policy owns provider attempts and fallback; PostgreSQL acceptance owns final idempotency | Prevents queue restarts from silently multiplying paid provider attempts or accepted samples | Architecture owner |
| Customer boundary | Expose concise durable progress and public status only; keep ready-for-synthesis customer-visible as evaluating until S4 | Shows real progress without leaking technical failures or fabricating a report | Product owner |

## Acceptance Boundaries

- Deterministic 20/20 and 17/20 runs retain accepted evidence and become ready
  for synthesis; a 16/20 run becomes `PLEASE_RETRY`.
- A valid answer that does not mention the brand remains an accepted sample.
- Duplicate delivery, concurrent handling, restart, and telemetry failure do not
  create a second canonical answer or erase an accepted interpretation.
- The database, not BullMQ or telemetry, is sufficient to resume unfinished
  work and later reconstruct report evidence.
- No external provider call or production service activation occurs.

## Assumptions and Open Questions

- Assumption: S3 uses small stage jobs plus a run planner and reconciliation
  scheduler; S6 may partition provider-route queue lanes and refine concurrency
  and pacing without changing business ownership or accepted evidence.
- Assumption: exact parser prompt and production model selection remain behind
  the pre-S6 semantic evidence gate; deterministic fixtures protect the owner
  contract now.
- Open: production provider timeouts, ambiguous post-call failures, rate limits,
  cost controls, and Langfuse retention are S6 or operational decisions and do
  not block deterministic S3.

## Confirmation and Next Gate

- Confirmation: S3 outcome, stopping point, S4-S6 non-goals, and the PostgreSQL,
  transaction-Outbox, BullMQ small-work planner, and scheduled-reconciliation
  framework were confirmed by the product owner on 2026-08-26.
- Next action: enter the bounded S4 synthesis-and-report decision gate.
- Confirmation required before: real-provider integration, S4 synthesis and
  report behavior, or a change to the confirmed S3 ownership boundaries.
