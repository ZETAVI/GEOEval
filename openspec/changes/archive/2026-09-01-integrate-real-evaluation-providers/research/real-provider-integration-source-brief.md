# Source Brief: S6 Real Provider Integration

- Change: [`integrate-real-evaluation-providers`](../proposal.md)
- Access date: 2026-08-28
- Decision: preserve the August 25 controlled route evidence, refresh only
  decision-critical interface facts, and implement provider-specific adapters
  behind one project-owned execution port

## Recommendation

Keep the five already accepted sampling routes. Use Alibaba Model Studio
`qwen3.8-flash` as the per-sample parser and overall-synthesis primary for
attempts one and two, with explicit `medium` reasoning effort, then use TokenHub
`hy3` as attempt-three fallback. Implement a small project-owned Node `fetch`
transport with one absolute abort deadline and no hidden HTTP retry, then place
request and response differences in route-specific adapters. Reuse Zod for
provider-envelope validation, compact model-facing JSON Schemas, deterministic
projection, and canonical semantic validation.

Do not adopt one OpenAI-compatible SDK as the provider abstraction. The routes
share surface syntax but differ in protocol, custom request fields, search
evidence, usage, reasoning, and error shapes. The official OpenAI Node SDK can
disable retries and expose the raw response, but its default retries conflict
with one durable attempt per call, provider extensions still need local typing,
and recent open issues identify response-body and long-header timeout caveats.
Node's built-in `fetch` is already exercised by the controlled E0 runner and
keeps the actual HTTP and raw-envelope boundary explicit.

Use Langfuse's current JS/TS tracing SDK manually, not its OpenAI wrapper, after
the provider boundary is stable. Export only masked technical observations and
keep the existing durable attempt tables as the source of truth.

## Decision Constraints

- One persisted AI attempt may start at most one outbound request; all retry and
  fallback decisions remain visible in numbered durable attempts.
- Every adapter must retain exact requested and returned model identity, the
  complete usable answer, all returned search/source fields, native usage,
  timing, request identity, and sanitized error evidence.
- DeepSeek evaluation sampling uses the TokenHub platform route and Chat API,
  never an official-direct service ID. It is not a parser or synthesis route.
- Semantic primary calls use Model Studio Chat Completions with exact model ID
  `qwen3.8-flash`, strict JSON Schema, and explicit `medium` reasoning effort;
  fallback calls use TokenHub Responses with exact model ID `hy3`.
- Automatic search is available to sampling routes and disabled for parser and
  overall-analysis routes. Missing source fields do not by themselves prove no
  search. Web-backed brand disambiguation is a later only-when-ambiguous step,
  not a reason to delay every report.
- Provider content, credentials, and raw customer prompts or answers do not go
  to logs or Langfuse by default.

## Evidence

| Claim | Primary source | Version/date | Design implication |
| --- | --- | --- | --- |
| TokenHub web search uses Responses `tools` with citation annotations or Chat `web_search_options` with `search_results`; the model decides whether to search | [TokenHub web search](https://cloud.tencent.com/document/product/1823/132358) | Accessed 2026-08-28 | Keep distinct Chat and Responses normalizers and a three-state search observation |
| TokenHub currently assigns `hy3` to Responses or Chat and `deepseek-v4-flash` to Chat; explicit thinking settings differ by model | [TokenHub web search support matrix](https://cloud.tencent.com/document/product/1823/132358) | Accessed 2026-08-28 | Route DeepSeek through Chat, Hy3 through Responses, and snapshot actual reasoning evidence instead of assuming it |
| TokenHub Responses supports strict `json_schema` for Hy3 and requires `additionalProperties: false` | [TokenHub Responses fields](https://cloud.tencent.com/document/product/1823/135873) | Accessed 2026-08-28 | Reuse the strict owner schema and reject provider output locally after transport validation |
| Ark Responses supports built-in Web Search as a tool | [Volcengine Ark tool calling](https://www.volcengine.com/docs/82379/1958524?lang=zh) | Accessed 2026-08-28 | Keep Ark request and response mapping in its own adapter and retain returned tool/source items |
| Model Studio publishes exact model ID `qwen3.8-flash`; Qwen3.8 Flash supports Chat Completions and configurable reasoning effort | [Qwen3.8 Flash model](https://help.aliyun.com/zh/model-studio/qwen3-8-flash), [Model Studio Chat API](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions) | Accessed 2026-08-28 | Use the exact ID through the dedicated Beijing Chat endpoint and set `enable_thinking` plus `reasoning_effort` explicitly through the route mapping |
| Model Studio strict JSON Schema support includes Qwen3.8 Flash and requires a closed schema; hosted DeepSeek supports JSON Object but is not the same strict-schema route | [Model Studio structured output](https://help.aliyun.com/zh/model-studio/qwen-structured-output) | Accessed 2026-08-28 | Select Qwen3.8 for semantic structured output and retain local canonical validation; do not use hosted DeepSeek as the semantic fallback |
| Model Studio web search is enabled explicitly and the model still decides whether to search | [Model Studio web search](https://help.aliyun.com/zh/model-studio/web-search/) | Accessed 2026-08-28 | Keep three-state search evidence; default semantic routes remain search-off after the controlled strict-JSON plus search call timed out |
| Qianfan ERNIE 4.5 search is model-intent driven and returns search results separately from answer chunks | [Qianfan web search](https://cloud.baidu.com/doc/qianfan-docs/s/Wm8r4sw29) | Accessed 2026-08-28 | Normalize answer and source evidence separately; do not equate missing sources with a confirmed no-search decision |
| The official OpenAI Node SDK supports alternate base URLs, disabling its default retries, explicit timeouts, and `withResponse()` raw access | [OpenAI Node client configuration](https://github.com/openai/openai-node/blob/main/docs/configuration.md) | Accessed 2026-08-28 | It is technically viable but does not remove provider adapters; hidden defaults must be disabled if adopted later |
| Current OpenAI Node issues report response-body and long-header timeout edge cases in recent releases | [Body-read timeout issue](https://github.com/openai/openai-node/issues/1825), [Node header-timeout issue](https://github.com/openai/openai-node/issues/2153) | Accessed 2026-08-28 | Prefer the already controlled native-fetch boundary for this change and revisit only after observable provider convergence |
| BullMQ supports moving an active job to a future timestamp with `moveToDelayed` and requires `DelayedError` so the Worker neither completes nor fails it | [BullMQ process-step jobs](https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/patterns/process-step-jobs.md) | Accessed 2026-08-28; project uses 6.2.1 | Delay an in-progress duplicate without completing its Outbox event or spending a queue-failure retry |
| Langfuse JS/TS v5 uses OpenTelemetry-based tracing; manual tracing requires `@langfuse/tracing`, `@langfuse/otel`, and `@opentelemetry/sdk-node` | [Langfuse SDK overview](https://langfuse.com/docs/observability/sdk/overview) | Accessed 2026-08-28 | Add one optional telemetry adapter after route execution works; initialize before Worker logic and shut down cleanly |
| Langfuse supports pre-export masking and accepts explicit usage/cost details | [Langfuse masking](https://langfuse.com/docs/observability/features/masking), [Langfuse token and cost tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking) | Accessed 2026-08-28 | Mask before export and send provider-native exclusive usage buckets or explicit reconciled cost rather than guessing |
| The intended accounts already passed exact identity and R01-R03 route/search/fidelity evidence for all fifteen unique sampling positions | [Local controlled evidence](../../2026-08-25-define-application-architecture/research/provider-search-fidelity-evidence.md) | Executed 2026-08-25 | Do not repeat the full route batch; validate the production adapters and the remaining semantic/recovery boundary |
| The production harness returned exact requested identities for all five sampling routes, accepted Qwen3.8 parser P01/P03/P05/P07 and synthesis Y02/Y03, and accepted Hy3 fallback parser P03/P07 and synthesis Y02 | Protected ignored evidence under `apps/backend/.provider-evidence/s6-controlled/` | Executed 2026-08-28 | The Qwen3.8-primary/Hy3-fallback route order and compact-contract projection are supported by controlled runtime evidence, not documentation alone |
| Qwen3.8 default `xhigh` parser calls used roughly 8,700-10,900 reasoning tokens and 121-159 seconds; explicit `medium` accepted representative parser calls with roughly 347-574 reasoning tokens in 15-20 seconds | Protected ignored semantic-probe evidence | Executed 2026-08-28 | Pin semantic routes to `medium`; do not inherit a provider default that is disproportionate for extraction and synthesis |
| One Qwen3.8 strict-JSON plus web-search synthesis experiment reached the reviewed 180-second deadline | Protected ignored semantic-probe evidence | Executed 2026-08-28 | Keep default synthesis search off and design a separate only-when-ambiguous resolver if later evidence justifies it |

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| Node `fetch` transport plus provider-specific adapters and Zod normalization | Adopt | Standard runtime capability, no hidden retry, preserves custom envelopes, and matches the controlled runner |
| Official OpenAI Node SDK as one common provider client | Defer | Mature transport, but provider extensions, hidden retry defaults, raw evidence, and timeout caveats still require a project-owned boundary |
| One large provider switch inside the existing deterministic adapter | Reject | Couples fixtures, routing, transport, normalization, and semantic generation in one low-cohesion file |
| A generic plugin, hot-reload, or workflow framework | Reject | No current extension need justifies another runtime authority or configuration system |
| New route-specific rate-limiter dependency before measurement | Defer | Current single Worker and concurrency five are bounded; add only when controlled quota or concurrency evidence changes the action |
| Langfuse OpenAI wrapper | Reject for S6 | The chosen transport is not an OpenAI SDK client and automatic prompt/output capture conflicts with the default masking boundary |
| Manual Langfuse JS/TS tracing behind a no-op-capable port | Adopt in S6c | Provider-neutral, asynchronous, maskable, and unable to own business state |

## Unknowns and Validation

- Production adapter behavior: exercise recorded raw fixtures offline, then one
  named fictional call per sampling route with exact stop conditions.
- Parser and synthesis quality: the representative P01, P03, P05, P07, and
  Y02-Y03 primary/fallback subset passed; the remaining gate is one complete
  fictional 4-by-5 Worker evaluation and customer-report inspection.
- Ambiguous interruption: use a controlled deferred response and Worker restart
  to prove no second request uses the same attempt identity and a stale attempt
  cannot accept a late result.
- Account quota, measured cost, and latency: record native usage and reconcile
  the provider console or bill for the complete fictional run; one run is not a
  production capacity claim.
- Customer-data terms and retention: remain a release-owner decision and block
  real customer input, not fictional S6 implementation evidence.

## Reuse and Refresh Boundary

- Reusable while: the named commercial accounts, regions, base URLs, exact model
  IDs, route protocols, Qwen `medium` reasoning setting, search configuration,
  objectivity profile `0.3.0`, and structured-output contracts remain unchanged.
- Refresh when: a provider changes protocol or response fields, a returned model
  no longer matches, a route or region changes, a new account or credential is
  selected, search/source evidence disappears, a quota or price changes the
  delivery decision, or a different provider client is proposed.
