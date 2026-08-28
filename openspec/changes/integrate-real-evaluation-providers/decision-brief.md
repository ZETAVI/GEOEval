# Decision Brief: S6 Real Evaluation Integration

## Outcome

Run the accepted evaluation slice through the five real customer-visible model
routes and the real interpretation and overall-analysis routes while preserving
the same durable lifecycle, report meaning, retry behavior, and simple customer
experience proven by deterministic S1-S5.

## Scope

- In: real sampling, real structured interpretation and overall analysis,
  retained provider evidence, bounded recovery, cost and latency observation,
  optional non-blocking Langfuse export, and a complete fictional evaluation.
- Out: query-generation Agent work, optimization writing, publishing, payments,
  production release, real customer data, and visual redesign.

## Decisions

| Decision | Choice | Rationale | Owner |
| --- | --- | --- | --- |
| Delivery sequence | One S6 change delivered as sampling adapters, interpretation/overall analysis, then complete end-to-end acceptance | Isolates transport, semantic, and orchestration failures without reducing the final scope | Product owner |
| Business ownership | GEO Intelligence keeps questions, retry/fallback meaning, accepted evidence, semantic validation, metrics, and reports | External providers must not become a second workflow or product authority | Product and architecture owners |
| External ownership | AI Execution owns route validation, one-call transport, provider normalization, technical attempt evidence, and telemetry | Keeps provider differences behind the existing inward-facing execution port | Architecture owner |
| Retry identity | One persisted AI attempt represents at most one outbound provider request; duplicate delivery never starts another request for the same live attempt | Makes call count, cost, ambiguity, and recovery explainable | Architecture owner |
| Search observation | Retain `TRIGGERED`, `NOT_TRIGGERED`, or `UNKNOWN` internally; never infer no search merely from missing sources | Matches observed provider behavior and avoids false evidence | Architecture owner |
| Transport implementation | Proposed: small Node `fetch` transport with an absolute abort deadline and provider-specific adapters, not a shared SDK retry layer | Preserves raw custom envelopes and keeps every retry visible as a business-owned attempt | Architecture owner |
| Observability | Proposed: manual Langfuse JS/TS tracing through a best-effort port, exporting masked correlation, route, model, usage, latency, cost, and status rather than raw customer content | Langfuse remains useful without becoming business truth or a data-leak path | Architecture owner |

## Acceptance Boundaries

- Every successful sampling attempt retains a complete answer, exact returned
  model identity, normalized search observation, all returned source metadata,
  native usage, timing, request identity where exposed, and a protected provider
  envelope.
- One HTTP request is one durable attempt. Concurrent redelivery returns the
  in-flight or terminal attempt; a stale ambiguous attempt becomes a recorded
  retryable failure before a later numbered attempt can run.
- Acquisition retry stays on the same platform route. Per-sample interpretation
  and overall analysis use Hy3 primary, one Hy3 retry, then Alibaba Model Studio
  DeepSeek V4 Flash fallback. Schema success without semantic validity is a
  failed attempt, not accepted evidence.
- Provider, queue, and telemetry failures cannot create a second sample,
  overwrite accepted evidence, recalculate deterministic metrics, or expose
  technical details to the customer.
- One fictional 4-by-5 evaluation reaches either a complete reproducible report
  or the already accepted retry state with every missing position explained by
  durable internal evidence.

## Assumptions and Open Questions

- Assumption: the current single Worker and global concurrency of five are the
  initial capacity boundary; add a route-specific limiter only if controlled
  evidence reveals a real quota or concurrency failure.
- Assumption: the August 25 route, search, identity, and objectivity evidence is
  reusable because the account, route, model, and configuration are unchanged;
  S6 refreshes current official interface facts and validates the production
  adapters rather than repeating the earlier prompt-only batches.
- Open: account terms and data-processing approval for real customer content
  remain a commercial-release gate; all S6 calls use fictional data.
- Open: the exact maximum calls for the interpretation probe and complete
  evaluation are recorded after implementation makes the executable retry
  ceiling auditable and before either batch runs.

## Confirmation and Next Gate

- Confirmation: Confirmed for outcome, scope, staged delivery, and local
  implementation on 2026-08-28; transport and telemetry choices remain proposed
  until architecture review.
- Next action: complete the source brief and module architecture preflight, then
  implement the offline provider boundary and deterministic contract fixtures.
- Confirmation required before: each controlled paid-call batch, branch
  integration, customer-data use, production activation, or deployment.
