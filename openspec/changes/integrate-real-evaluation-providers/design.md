# Design: Real Evaluation Provider Integration

## Context and reuse decision

S1-S5 already provide the business workflow. S6 must not add another evaluator,
workflow engine, report pipeline, or retry authority. It activates the external
port already represented by `AiAttemptAdapter` and tightens the attempt boundary
where deterministic execution did not need to distinguish one logical attempt
from one paid outbound request.

The E0 runner is valid controlled evidence, not production architecture. Its
route mappings and response observations inform the implementation, but S6 must
leave one executable production owner. After the production adapters exist, the
runner either invokes those route definitions through a bounded harness or is
reduced to evidence reporting; it cannot retain a second editable provider map.

No new ADR is proposed. ADR 0001 already fixes the modular-monolith, inward port,
PostgreSQL truth, BullMQ delivery, and optional telemetry directions. The
provider choice and response mappings remain change-specific until controlled
evidence makes them accepted owner-local behavior.

## Module architecture card

### Outcome and boundary

- Owner and observable outcome: AI Execution can execute the accepted real
  routes and return one provider-neutral result; GEO Intelligence produces the
  same accepted evidence and report behavior as deterministic S1-S5.
- In: runtime selection, route resolution, HTTP transport, provider adapters,
  normalization, technical failures, protected attempt evidence, ambiguity
  recovery, and best-effort telemetry.
- Out: question generation, evaluation meaning, semantic acceptance, scores,
  reports, notifications, customer wording, production deployment, and
  commercial data approval.
- Upstream prerequisites: frozen GEO route policy, purpose input, objectivity or
  structured-output instruction, output schema, attempt number, and durable work
  identity.
- Downstream consumers: GEO accepts normalized answer or structured output;
  operators use durable attempt evidence and optional Langfuse traces.

### Ownership and dependency direction

| Owner | Owns | Must not own |
| --- | --- | --- |
| GEO Intelligence | platform set and customer-facing labels, purpose input, retry/fallback order, accepted answer and interpretation, semantic checks, metrics, report and retry state | provider HTTP fields, credentials, SDK state, telemetry delivery, queue retry counts |
| AI Execution | route allowlist, provider/service provenance, technical request mapping, one-call attempt ownership, response normalization, error taxonomy, raw protected attempt envelope and usage | whether a sample is valid, whether seventeen samples suffice, scores, report prose acceptance, customer status |
| Background Work | durable Outbox delivery, bounded Worker concurrency, scheduled reconciliation | provider retry policy, attempt identity, evaluation state, accepted evidence |
| Runtime configuration | explicit mode, URLs, credential values, timeout and optional telemetry endpoint | product route meaning, mutable workflow state, historical report truth |
| Langfuse | optional masked technical projection | business truth, retry authority, raw customer evidence, exact bill authority |

Dependency direction remains:

```text
Background Work -> GEO process coordinator -> AI Execution port
                                           -> resolve logical route
                                           -> persist resolved provider/model
                                           -> provider adapter
                                           -> bounded HTTP transport

AI Execution -> best-effort telemetry port -> no-op or Langfuse adapter
```

Provider adapters never call GEO repositories. GEO never imports provider SDKs,
reads provider environment variables, or parses provider envelopes.

### Earned extension seams

S6 earns two explicit dispatch seams and no generic plugin framework:

1. a mode factory selects `DeterministicAiAttemptAdapter` or
   `RealAiAttemptAdapter` once at Worker startup;
2. the real adapter uses an immutable route map from logical route policy to one
   provider adapter.

The map is validated at startup and is not hot-reloaded. A new route requires a
code/config change, focused adapter fixtures, and controlled evidence. There is
no reflective factory, service locator, provider discovery, or runtime plugin
installation.

## Runtime configuration and readiness

`loadWorkerConfig` gains a nested AI execution configuration assembled once at
startup. Adapters receive validated values through Nest providers and never read
`process.env` directly.

Minimum configuration:

- `AI_EXECUTION_MODE=deterministic|real`;
- `AI_PROVIDER_TIMEOUT_MS`, initially one reviewed absolute deadline shared by
  the bounded routes;
- the existing four base URLs and credential references;
- optional Langfuse keys, base URL, and environment.

Local defaults remain deterministic. Production continues to reject
deterministic execution. Real mode fails before the Worker consumes jobs when a
credential is blank, a URL is not HTTPS outside local tests, an expected route
is absent, a model does not match its allowlist, or the ambiguity deadline is
not longer than the outbound request deadline.

The configuration carries secrets in memory only. Readiness and errors report
route IDs and missing variable names, never values.

Configuration is passed through explicit dynamic-module registration rather
than a global service locator:

```text
WorkerModule.register(workerConfig)
  -> BackgroundWorkModule.register(aiConfig)
     -> GeoIntelligenceProcessModule.register(aiConfig)
        -> AiExecutionModule.register(aiConfig)
```

This is deliberate composition-root wiring. Only AI Execution sees credentials
and provider base URLs; GEO receives the exported execution services, not the
configuration object.

## Route policy and attempt sequences

GEO keeps the frozen platform/model snapshot used to explain a historical
evaluation. AI Execution independently validates that the requested frozen
model is allowed for the logical route and resolves the actual provider and
protocol. This duplicate-looking check has a real purpose: one value is product
history; the other is the external security and provenance allowlist.

| Purpose route | Provider protocol | Attempts owned by GEO |
| --- | --- | --- |
| `evaluation.deepseek` / `deepseek-v4-flash` | TokenHub Chat Completions | same route for attempts 1-2 |
| `evaluation.doubao` / accepted Seed 2.0 Lite snapshot | Ark Responses | same route for attempts 1-2 |
| `evaluation.qwen` / `qwen3.7-flash` | Model Studio Responses on the dedicated Beijing host | same route for attempts 1-2 |
| `evaluation.ernie` / `ernie-4.5-turbo-128k` | Qianfan V2 Chat Completions | same route for attempts 1-2 |
| `evaluation.hunyuan` / `hy3` | TokenHub Responses | same route for attempts 1-2 |
| `evaluation.interpretation.hy3-primary@1` / `hy3` | TokenHub Responses with strict JSON Schema | attempts 1-2 |
| `evaluation.interpretation.deepseek-fallback@1` / `deepseek-v4-flash` | Model Studio Responses with structured output | attempt 3 |
| `evaluation.overall-synthesis.hy3-primary@1` / `hy3` | TokenHub Responses with strict JSON Schema | attempts 1-2 |
| `evaluation.overall-synthesis.deepseek-fallback@1` / `deepseek-v4-flash` | Model Studio Responses with structured output | attempt 3 |

The objectivity profile remains one GEO-owned semantic input mapped as a Chat
`system` message or Responses `instructions`. Parser and synthesis adapters use
their existing versioned task instructions and JSON Schemas. Sampling enables
automatic search; interpretation and overall analysis do not.

S6 uses non-streaming requests. The selected routes already returned complete
format-preserving evidence in controlled calls, and streaming would add
assembly, partial-response, and restart states without a first-release customer
need. Reasoning text, summaries, or token counts are retained only when the
provider actually returns them; one form is never mislabeled as another.

## One-call attempt lifecycle

The current uniqueness constraints remain the business idempotency boundary.
AI Execution resolves and validates the logical route before `begin`, so the
attempt row records the actual provider/service identity rather than the
customer-visible platform key. The repository contract changes so `begin`
reports whether the current caller created and owns the started attempt.

```text
missing attempt
  -> insert STARTED and return ACQUIRED

existing SUCCEEDED/FAILED
  -> return TERMINAL

existing STARTED and younger than ambiguity deadline
  -> return DEFERRED(until); send no request

existing STARTED and older than ambiguity deadline
  -> atomically mark FAILED/AMBIGUOUS_INTERRUPTION/retryable
  -> return TERMINAL; send no request under this attempt identity
```

Only `ACQUIRED` calls the adapter. `finish` remains conditional on `STARTED`.
If a suspended caller returns after another worker has closed the attempt as
ambiguous, its late result cannot change the row or GEO evidence; a masked
late-result diagnostic may be emitted. Reconciliation later reasserts the same
purpose event, observes the terminal ambiguous result, and lets GEO schedule the
next numbered attempt.

`DEFERRED` propagates through the GEO coordinator without completing its Outbox
event. `ProductWorkerRuntime`, which owns BullMQ mechanics, moves the same job to
the returned time with `job.moveToDelayed(...)` and throws BullMQ's
`DelayedError`. The delay therefore consumes neither a model attempt nor a
normal queue-failure retry. If the original call finishes first, it completes
the Outbox event and the delayed delivery later becomes a no-op. If the process
dies, the delayed delivery closes the expired attempt as ambiguous and advances
through the normal GEO retry policy. AI Execution never imports BullMQ, and
Background Work never interprets provider state.

This design does not claim provider-side exactly-once execution. A process can
die after the provider accepted a request but before the response is durably
stored. It guarantees the narrower honest boundary: one application attempt
sends at most one request, ambiguity is recorded, and any later retry has a new
attempt identity and known potential duplicate cost.

No lease table is added. The existing `startedAt`, a fixed ambiguity deadline,
and durable delayed delivery are sufficient even when a duplicate worker sees
the same attempt. Add renewable leases only if requests must extend their
deadline dynamically; a fixed maximum request duration does not require one.

## Attempt envelope and canonical evidence

The existing attempt tables remain the only technical attempt store.
`responseEnvelope` becomes a versioned protected document:

```json
{
  "schemaVersion": "ai-attempt-envelope@1",
  "normalizedOutput": {},
  "providerEvidence": {
    "providerKey": "...",
    "serviceClass": "...",
    "protocol": "...",
    "returnedModel": "...",
    "requestId": "...",
    "finishReason": "...",
    "searchObservation": "TRIGGERED | NOT_TRIGGERED | UNKNOWN",
    "reasoningEvidenceKind": "TEXT | SUMMARY | TOKEN_COUNT | NONE",
    "sanitizedRequest": {},
    "rawResponse": {}
  }
}
```

Failed attempts use the same envelope without `normalizedOutput` and include a
sanitized status, provider code, request ID, and body when safe. Credentials and
authorization headers are never captured. The terminal-outcome mapper supports
legacy deterministic envelopes while new writes use the versioned shape, so
existing accepted local history does not need a rewrite.

GEO copies only accepted canonical fields into sample evidence. Source metadata
is a derived internal projection over the retained provider response. It does
not enter the customer report. The canonical search field changes from a
boolean to:

- `TRIGGERED`: an explicit call count, tool item, trace, source result, or
  provider status proves search occurred;
- `NOT_TRIGGERED`: an explicit provider field proves the model declined search;
- `UNKNOWN`: the provider exposes neither positive nor negative evidence.

Missing sources, an empty citation list, or a normal answer alone never produce
`NOT_TRIGGERED`.

## HTTP transport and provider adapters

One small transport owns:

- HTTPS POST/GET, JSON encoding, sanitized headers, and correlation headers;
- an `AbortController` deadline that remains active while reading the complete
  response body;
- response status, headers, raw JSON or bounded text, and duration;
- no automatic retry, redirect-based credential forwarding, console output, or
  business classification.

Provider adapters own request and response syntax. Shared helpers are admitted
only for stable protocol semantics such as extracting OpenAI-style usage, never
because two JSON objects look similar. Each adapter maps a transport result to
one normalized success or stable failure:

- TokenHub DeepSeek Chat;
- TokenHub Hy3 Responses and strict structured output;
- Ark Doubao Responses;
- Model Studio Qwen and hosted-DeepSeek Responses;
- Qianfan ERNIE Chat.

Zod checks the minimum provider envelope needed before normalization. The
complete raw object is retained even when optional provider fields are unknown.
Local GEO validators remain the final authority for acquisition and semantic
acceptance.

## Failure and recovery

| Failure | Classification | Retry or recovery owner | Evidence |
| --- | --- | --- | --- |
| DNS, connection reset, absolute timeout | transient or ambiguous | GEO purpose policy after AI records attempt | attempt status, duration, sanitized transport kind |
| HTTP 408, 429, or 5xx | transient | GEO purpose policy | status, provider code, request ID, retryability |
| HTTP 400 invalid request or unsupported model | permanent configuration | no same-purpose hidden retry; stop controlled batch | status, sanitized response, startup/fixture regression |
| HTTP 401 or 403 | permanent credential/account boundary | operator fixes account; no automatic refresh or retry | route and missing/denied identity without secret |
| Provider safety/content rejection | permanent for this input unless explicitly classified otherwise | sample may become unavailable | provider code and sanitized category |
| HTTP success with malformed provider envelope | adapter contract failure, initially retryable once | GEO purpose policy | raw protected response and failed envelope schema |
| Structured JSON invalid or semantically incomplete | semantic contract rejection | GEO primary retry then fallback | exact attempt, output schema version, local validation error category |
| Duplicate queue event while call is live | delivery duplicate | delay the same delivery until the ambiguity deadline | unique attempt key, incomplete Outbox event, BullMQ delayed job, and no second transport invocation |
| Worker death during call | ambiguous interruption | stale attempt closure then next numbered attempt | started time, ambiguity deadline, conditional transition |
| Langfuse unavailable or slow | telemetry-only | drop or flush best effort; never repeat model call | local exporter error metric/log without content |

Provider error text is never customer wording. The existing user-visible
`EVALUATING` and `PLEASE_RETRY` states remain unchanged.

## Migration and rollback

The only planned relational change replaces `searchUsed Boolean` with an
internal search-observation value. Because no external or production database
exists, use one reviewed migration that converts `true` to `TRIGGERED` and
`false` to `UNKNOWN`, then removes the obsolete boolean rather than dual-writing
two truths. Rehearse the full migration chain and a representative S5 snapshot.

Attempt-envelope evolution is JSON-compatible and requires no new table or
backfill. Legacy envelopes remain readable; only new terminal attempts write
`ai-attempt-envelope@1`.

Operational rollback before commercial release is configuration-first: stop the
Worker and select deterministic mode for local development. Reverting real-mode
code does not delete completed reports or accepted evidence. A database rollback
is not advertised after new rows use the three-state field; restore the named
pre-migration local snapshot when reversal evidence is needed.

## Tool and framework decisions

| Candidate | Decision | Evidence and limitation | Exit or refresh trigger |
| --- | --- | --- | --- |
| Existing PostgreSQL, Outbox, BullMQ, reconciliation | Adopt/reuse | Already proves durable workflow and duplicate-safe business acceptance; BullMQ `moveToDelayed` plus `DelayedError` defers a live duplicate without consuming a failure retry | Revisit only for measured throughput or dynamic leases |
| Node 24 built-in `fetch` plus `AbortController` | Adopt | Existing E0 runner proved all routes; keeps raw custom envelopes and one visible request | Revisit if protocols converge and a client proves full raw evidence plus deadline behavior |
| OpenAI Node SDK | Defer | Mature base URL, raw response, timeout, and retry controls, but defaults retry and provider extensions remain custom; recent timeout issues add uncertainty | Re-evaluate after pinned-version contract tests show a concrete maintenance reduction |
| Zod 4 | Adopt/reuse | Already owns structured schemas and local validation | Replace only through a project-wide schema decision |
| Route plugin or hot reload | Reject | No current product need; would add another runtime authority | Reconsider after independently deployed providers or frequent zero-downtime route changes exist |
| New per-route limiter | Defer | One Worker with concurrency five is bounded; no current quota failure | Add after measured 429/concurrency evidence changes the action |
| Langfuse JS/TS v5 manual tracing with OTel | Adopt in S6c | Current official path, async, maskable, and provider-neutral | Refresh on SDK major change, self-hosting decision, or data-policy change |
| Langfuse OpenAI wrapper | Reject for S6 | Tied to a client not selected and captures prompt/output more broadly than the default data boundary | Revisit only with an approved raw-content export policy |

## Staged implementation and verification

### S6a: offline and sampling boundary

Implement runtime mode, one-call attempt ownership, route registry, transport,
five adapters, three-state search, and recorded raw-fixture tests. No paid call
is needed to prove malformed envelopes, failures, duplicate delivery, stale
attempt recovery, or migration behavior.

After offline verification, propose a maximum five-call production-adapter
smoke—one fictional request per sampling route, no automatic retry—to prove that
the new production code preserves the already observed route identity and
evidence.

### S6b: structured semantic routes

Implement the Hy3 primary/retry and Model Studio DeepSeek fallback mappings.
Reuse the deterministic P01-P09 and Y01-Y04 catalog locally. The first proposed
paid semantic batch remains the previously bounded nine calls: primary parser
P01/P03/P05/P07, fallback parser P03/P07, primary synthesis Y02/Y03, and fallback
synthesis Y02, with no automatic transport retry.

### S6c: complete fictional evaluation and telemetry

Add manual masked Langfuse tracing and verify exporter failure isolation. One
complete real evaluation has an executable maximum of 103 model calls under the
current policy: twenty samples times two acquisition attempts, twenty samples
times three interpretation attempts, and three synthesis attempts. It will
normally use materially fewer calls. Together with the proposed five-call smoke
and nine-call semantic batch, the maximum S6 controlled envelope is 117 calls.

This calculation is not execution authorization. Before each paid batch, record
its exact fixture, route, maximum, retry behavior, and stop conditions. Stop on
systematic configuration or schema failure rather than consuming the theoretical
ceiling. The complete run records latency and cost but does not establish a
production service-level objective or load capacity.

Completion requires:

- deterministic regression remains green;
- offline fixtures cover every provider mapping and failure class;
- migration replay and representative S5 upgrade preserve evidence;
- controlled calls prove the production adapters, semantic routes, and
  telemetry isolation;
- one authenticated browser journey produces the complete report or the
  accepted retry outcome using fictional data;
- current specs and architecture are reconciled and duplicate E0 route truth is
  removed or made generated/consuming.

## Preflight architecture review

- Status: `ready` for S6a offline implementation; controlled paid calls remain a
  later explicit gate.
- Resolved must-fix: a live duplicate cannot simply return and let its Outbox
  event complete. The design now propagates a durable deferral time and lets
  Background Work use BullMQ delayed delivery without consuming a model or
  queue-failure retry.
- Resolved must-fix: the current attempt row receives `providerKey` from GEO's
  platform key. S6 resolves the logical route inside AI Execution before the
  attempt begins, so persisted provider provenance is technical truth while GEO
  retains only the frozen product route and requested-model snapshot.
- Resolved must-fix: the shared two-attempt recovery helper cannot express the
  confirmed three-step interpretation fallback. Reconciliation must read the
  purpose-owned route sequence and never cap every purpose with one constant.
- Resolved should-fix: real configuration is passed through the composition root
  into AI Execution rather than read from environment variables inside adapters.
- Resolved should-fix: the broad product-definition evolution marker is not
  ignored. S6 reconciliation moves only activated provider-execution behavior
  to the existing evaluation-evidence and evaluation-report owners and leaves
  unrelated product meaning in place.
- No new attempt table, workflow engine, provider plugin framework, hot reload,
  route-specific limiter, or SDK retry layer is justified by the current scope.
  Migration SQL, exact adapter envelopes, BullMQ delayed behavior, provider
  contract fixtures, and telemetry shutdown remain implementation evidence, not
  claims established by this design review.
