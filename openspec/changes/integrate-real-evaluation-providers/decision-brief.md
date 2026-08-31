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
| Transport implementation | Small Node `fetch` transport with an absolute abort deadline and provider-specific adapters, not a shared SDK retry layer | Preserves raw custom envelopes and keeps every retry visible as a business-owned attempt | Architecture owner |
| Semantic route order | Model Studio Qwen3.8 Flash with `medium` reasoning effort for attempts one and two; TokenHub Hy3 for attempt three | Controlled evidence showed accepted semantics with materially lower Qwen latency and tokens than its default reasoning posture, while preserving a provider-distinct fallback | Product and architecture owners |
| Semantic contracts | Compact model-output schemas followed by deterministic projection into strict canonical domain contracts | Keeps internal IDs, references, calculations, and durable meaning under application control | Architecture owner |
| Observability | Manual Langfuse JS/TS tracing through a best-effort port, exporting masked correlation, route, model, usage, latency, cost, and status rather than raw customer content | Langfuse remains useful without becoming business truth or a data-leak path | Architecture owner |

## Acceptance Boundaries

- Every successful sampling attempt retains a complete answer, exact returned
  model identity, normalized search observation, all returned source metadata,
  native usage, timing, request identity where exposed, and a protected provider
  envelope.
- One HTTP request is one durable attempt. Concurrent redelivery returns the
  in-flight or terminal attempt; a stale ambiguous attempt becomes a recorded
  retryable failure before a later numbered attempt can run.
- Acquisition retry stays on the same platform route. Per-sample interpretation
  and overall analysis use Model Studio Qwen3.8 Flash primary, one same-route
  retry, then TokenHub Hy3 fallback. Model-schema success without valid
  deterministic projection and domain semantics is a failed attempt, not
  accepted evidence.
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
- Open: provider-console billed cost remains a commercial-release reconciliation
  item. Retained native usage is evidence of consumption, not a final invoice.

## Product-owner review entry

S6 does not add a second customer page. It replaces the deterministic execution
behind the already reviewed evaluation journey with the five real sampling
routes and real semantic routes. The completed report previously reviewed in the
Web is therefore the product surface for this change; adapter, queue, attempt,
schema, and telemetry internals are architecture-owner evidence rather than a
second product review surface.

| Review item | Observed result | Proposed disposition |
| --- | --- | --- |
| Customer journey and report meaning | One fictional brand completed the normal authenticated four-question by five-platform journey with 20/20 valid positions; the customer contract stayed unchanged | `Proposed`: accept the existing journey and report semantics for S6 |
| Real-route recovery | All twenty sampling calls succeeded on their first route call. Interpretation used ten first Qwen3.8 attempts, eight same-route retries, and two Hy3 fallbacks. Overall synthesis recovered through Hy3 after one semantic rejection and one timeout | `Proposed`: accept the bounded Qwen3.8-primary/Hy3-fallback policy as a locally verified recovery boundary, not as production-capacity evidence |
| Customer information boundary | The report exposes complete original answers and business conclusions, while provider sources, search observations, model identities, attempts, traces, and internal synthesis notes remain hidden | `Proposed`: accept this public-versus-protected projection |
| Visual and copy refinement | The product owner already identified report order, wording, chart, empty-state, and visual refinements; current specs retain those semantics while final presentation remains a separate frontend workstream | `Explicitly skipped for S6`: do not hold the provider integration open for visual redesign |
| Commercial readiness | Billed cost, commercial data-processing approval, production pacing and quota behavior, and deployment evidence remain unresolved | `Not proposed`: S6 is not approval for real customer data, pricing, production activation, or deployment |

The product-owner decision needed to exit this branch is narrow: confirm that
the real execution preserves the accepted customer journey and information
boundary, and that the observed bounded recovery is sufficient for a local S6
integration checkpoint with the listed commercial gates still open. The product
owner does not need to approve provider envelope fields, database rows, hashes,
retry implementation details, or raw traces.

## Confirmation and Next Gate

- Confirmation: Outcome, scope, staged delivery, local implementation, sampling
  smoke, representative semantic calls, and one complete fictional 4-by-5
  Worker evaluation were confirmed for execution on 2026-08-28. Final
  product-owner acceptance of the observed S6 result is still `Proposed`.
- Next action: obtain that bounded review decision, record the verified branch
  checkpoint, and request a separate integration decision. After S6 is
  integrated, open a separate bounded change for the AI question generator
  behind GEO Intelligence's existing question-generation port.
- Confirmation required before: each controlled paid-call batch, branch
  integration, customer-data use, production activation, or deployment.
