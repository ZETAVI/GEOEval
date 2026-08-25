# Source Brief: First Evaluation Slice External Capabilities

- Change: [`define-application-architecture`](../proposal.md)
- Access date: 2026-08-24
- Evidence state: Official-source audit complete; controlled-account validation pending
- Research owner: Architecture owner

## Decision and recommendation

The approved five-platform evaluation route is technically plausible from the
current official documentation. The bounded application-stack comparison has
since completed in its own source brief, but this route is not yet authorized
for implementation or described as a verified real five-platform evaluation.

Use one provider-neutral internal execution envelope with a dedicated adapter
for each platform surface. Do not normalize every provider to the smallest
OpenAI-compatible response: search-trigger evidence, returned sources, model
identity, usage, errors, and structured-output behavior differ materially by
protocol and provider. The owning business records retain raw answers and
evaluation state; an observability product receives correlated technical
telemetry but is never their source of truth or a required commit dependency.

The next evidence gate is a small controlled-account matrix using the intended
commercial accounts. It must confirm model access, consumer-experience
alignment, search evidence, exact response preservation, rate and error
behavior, structured parsing, semantic quality, and measured cost. Provider
configuration or an HTTP 200 alone does not pass the gate.

## Decision constraints

A sampling route is unacceptable for the first slice if it cannot:

- call an explicitly recorded model representing the approved platform route;
- preserve the complete answer and returned structure without presentation
  rewriting;
- enable the provider's supported web-search capability and distinguish an
  observed search from no search when the provider exposes that fact;
- retain all source or citation metadata the provider returns;
- expose enough identity, timing, usage, and error information to correlate one
  attempt without treating a retry as another business sample;
- operate legally through the intended account, region, quota, and commercial
  terms.

A parser or synthesizer route is unacceptable if it cannot pass a purpose-owned
JSON Schema plus semantic validation on a controlled fixture set. A syntactically
valid JSON response is not proof that mention, relative position, evidence, or
characteristics were interpreted correctly.

## Evidence classification

| State | Meaning |
| --- | --- |
| Documented | Current official API reference or official product documentation directly supports the claim. |
| Account-dependent | The capability requires service activation, region, entitlement, quota, or a control-panel value. |
| Runtime-required | Only a controlled call can establish response semantics, quality, cost, or the intended account's behavior. |
| Unverified | Accessible official evidence is insufficient; do not design as if the claim were true. |

## Provider capability matrix

| Route | Current official evidence | Evidence state | Architecture implication |
| --- | --- | --- | --- |
| Tencent TokenHub: Hunyuan Hy3 | TokenHub documents `hy3` on both Responses and Chat APIs, optional model-decided web search, returned source metadata, and strict JSON Schema output. The documented search service is limited to 5 QPS and Guangzhou. | Documented; activation, quota, quality, and actual model access are account-dependent. | Hy3 remains a viable parser and synthesizer candidate. Use explicit JSON Schema validation and capture the concrete model/service ID. Provider Responses `background` is documented as effectively synchronous, so application workers still own background execution. |
| Tencent TokenHub: DeepSeek | TokenHub documents `deepseek-v4-flash` and `deepseek-v4-pro` web search through Chat Completions, with source data in `message.search_results`; these routes do not use the same Responses web-search surface as Hy3. Current terms describe the named DeepSeek V4 routes as third-party-provided and outside the TokenHub model SLA. | Documented; intended service, terms, account access, and runtime behavior require confirmation. | The DeepSeek platform adapter must not reuse the Hy3 Responses path blindly. Preserve provider-failure isolation and do not assume a Tencent model SLA for the upstream DeepSeek route. |
| Volcengine Ark: Doubao | Ark's official documentation surface lists Responses API and the built-in Doubao Web Search tool, and official tool guidance states that Responses can use built-in tools to search public network material. | Capability documented at product/API-guide level; exact search-trigger and citation/source response schema was not established from the accessible reference. Runtime-required. | Keep a dedicated Ark Responses adapter. Do not approve the evidence-retention contract until a real response proves how search occurrence, source URLs, original formatting, usage, and model version are returned. |
| Alibaba Cloud Model Studio: Qwen | Model Studio documents Qwen web search through Responses, OpenAI-compatible Chat, and native DashScope. Native DashScope can return `search_info.search_results`, citations, and an observed search signal; the documentation says OpenAI-compatible Chat cannot directly confirm whether search occurred. | Documented; account region, chosen model, and runtime behavior remain account-dependent. | Prefer a protocol that preserves the required evidence, currently native DashScope or a proved Responses route, rather than generic compatible Chat. Search remains automatic for this product; retain the observed trigger and sources when present. |
| Baidu AI Cloud Qianfan: ERNIE | Qianfan documents built-in ERNIE web search with `search_mode: auto`, optional trace and citation data, and `search_results` in the response. The current model list includes ERNIE 5.1, 5.0, X, and 4.5 families with capability differences; ERNIE does not support forced search. | Documented; exact current model, account access, source completeness, and non-streaming behavior require a controlled call. | Automatic search matches the accepted product meaning. The adapter must select and record one explicit current model and normalize streamed search/result events without losing the original answer. |
| Alibaba Cloud Model Studio: parser fallback | The current `deepseek-v4-flash` model page identifies Model Studio as the inference provider and marks structured output and web search supported. The dated `deepseek-v4-flash-0731` snapshot on the same page marks structured output unsupported. | Documented but version-sensitive; runtime-required. | Keep the logical fallback but do not finalize the model ID from the family name alone. Test the alias and snapshot separately, record the actual returned model/version, and require local schema and semantic validation. |
| Langfuse candidate | Current Langfuse documentation describes an OpenTelemetry-based trace model with trace, user, session, tag, and metadata attributes; custom model usage and cost definitions; pre-export masking; managed cloud and self-hosted options. | Documented; deployment, retention, privacy, scale, and operational cost are architecture decisions. | Langfuse is a viable observability candidate, not yet a selected dependency. The application must generate its own business correlation IDs, ingest provider usage/cost explicitly when necessary, mask sensitive values before export, and save business truth even when telemetry is unavailable. |

## Primary evidence

| Claim | Primary source | Version or date | Design implication |
| --- | --- | --- | --- |
| TokenHub supports Hy3 and DeepSeek V4 web search, but protocol support differs; Chat responses can return source URL, title, snippet, and site. | [Tencent Cloud TokenHub web search](https://cloud.tencent.com/document/product/1823/132358) | Updated 2026-08-05; accessed 2026-08-24 | Implement provider/protocol-specific adapters and retain raw search metadata. |
| TokenHub's Responses surface supports strict JSON Schema for Hy3 and DeepSeek V4 Flash, but provider-background input is not actual asynchronous execution. | [Tencent Cloud TokenHub Responses API](https://cloud.tencent.com/document/product/1823/135873) | Accessed 2026-08-24 | Use schema validation for parser output; keep long-running orchestration in application-owned workers. |
| Old Tencent LKEAP DeepSeek access is being replaced by TokenHub. | [Tencent Cloud TokenHub migration guide](https://cloud.tencent.com/document/product/1823/131382) | Updated 2026-08-05; accessed 2026-08-24 | Do not build the first slice against the legacy LKEAP endpoint. |
| Current TokenHub DeepSeek V4 routes may be directly supplied by a third party and excluded from the TokenHub model SLA. | [Tencent Cloud TokenHub service terms](https://cloud.tencent.com/document/product/301/129852) | Accessed 2026-08-24 | Preserve fallback and provider-failure isolation; review applicable terms before production. |
| Ark exposes Responses API and built-in Web Search as current platform capabilities. | [Volcengine Ark documentation](https://www.volcengine.com/docs/82379/?lang=zh) and [Ark Responses tool calling](https://www.volcengine.com/docs/82379/1958524?lang=zh) | Accessed 2026-08-24 | Candidate route is plausible, but response evidence still requires an account test. |
| Qwen search-source evidence is available through native DashScope, while compatible Chat cannot directly prove a search occurred. | [Alibaba Cloud Model Studio web search](https://help.aliyun.com/zh/model-studio/web-search/) | Accessed 2026-08-24 | Select the protocol from evidence requirements, not from superficial SDK uniformity. |
| Model Studio currently lists `deepseek-v4-flash` structured output as supported but the `0731` snapshot as unsupported. | [Alibaba Cloud Model Studio DeepSeek V4 Flash](https://help.aliyun.com/en/model-studio/deepseek-v4-flash) | Accessed 2026-08-24 | Model alias and pinned snapshot are not interchangeable; runtime validation is mandatory. |
| ERNIE built-in search can return trigger, trace, citation, and search-result information under model-specific limits. | [Baidu Qianfan web search](https://cloud.baidu.com/doc/qianfan-docs/s/Wm8r4sw29) | Updated 2026-05-21; accessed 2026-08-24 | Normalize search events and retain sources without requiring search to fire for every question. |
| Langfuse traces use OpenTelemetry and support trace-level identity, custom model cost, pre-export masking, and managed or self-hosted deployment. | [Langfuse data model](https://langfuse.com/docs/observability/data-model), [cost tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking), [masking](https://langfuse.com/docs/observability/features/masking), and [self-hosting](https://langfuse.com/self-hosting) | Accessed 2026-08-24 | Integrate through a non-blocking telemetry port; evaluate cloud versus self-hosting later against privacy and operations constraints. |

## Confirmed architecture consequences

1. **One internal contract, several adapters.** AI Execution owns a normalized
   attempt contract and returns the complete provider envelope. The owning
   business domain persists the canonical raw business evidence; a provider
   adapter may retain only bounded technical diagnostics under the approved
   policy. A common SDK may reduce transport code; it cannot erase protocol
   differences.
2. **Application-owned background work.** Provider asynchronous-looking fields
   are not the evaluation state machine. The application owns correlation,
   resumability, retry boundaries, and the distinction between one business
   sample and several attempts.
3. **Evidence is separate from presentation.** Search sources and provider
   diagnostics are retained internally but are not copied into the main customer
   report. The format-preserving original answer remains a business record.
4. **Structured output is necessary but insufficient.** Every parser and
   synthesizer result passes local schema validation plus purpose-owned semantic
   checks before GEO Intelligence accepts it.
5. **Model aliases are configuration, not history.** Every attempt records the
   requested route and the concrete returned model identity or version. A later
   alias change does not rewrite an evaluation snapshot.
6. **Observability is an optional follower.** Business correlation IDs originate
   in GEOEval. Trace export is buffered or best-effort and cannot make an
   otherwise valid evaluation write fail.
7. **Consumer-platform equivalence is not assumed.** Official API availability
   does not prove that its model/search behavior matches the named public
   consumer product. The intended model for each platform requires a recorded
   operating decision and a controlled comparison before the product calls the
   result a real five-platform evaluation.

## Controlled-account validation matrix

Run the smallest test below with non-sensitive fixtures and the intended
commercial accounts. Store request/response evidence outside this document and
link the resulting record; never paste keys or private account details here.

| Test | Minimum evidence | Pass boundary |
| --- | --- | --- |
| Route and entitlement | account, region, requested model/service ID, returned model identity, endpoint family, terms acknowledged | The intended account can call the exact route through a supported, commercially usable interface. |
| Search behavior | one query likely to search and one likely not to; raw trigger/source/citation fields | Automatic behavior is observable where documented, and all returned source metadata can be retained. |
| Answer fidelity | list, table, headings, paragraphs, Unicode, streaming and non-streaming assembly where supported | The stored answer is complete and format-preserving enough for report cards and non-destructive highlights. |
| Retry and errors | invalid credential in an isolated test key where safe, invalid request, rate-limit or documented fixture, timeout, provider safety rejection | Errors are classifiable; retries do not create another business sample; provider text is not leaked to the user. |
| Parser semantics | controlled answers covering explicit rank, implicit order, table order, no mention, same name, unfamiliar alias, and mixed sentiment | JSON Schema passes and human-reviewed expected mention, position, evidence, and broad characteristics meet the later agreed regression threshold. |
| Synthesis semantics | a retained multi-sample fixture with positive, negative, conflicting, and sparse evidence | Output respects evidence, maximum display counts, optimization boundaries, and never recalculates the index. |
| Capacity and cost | measured latency, input/output/search usage, actual billed or console-reconciled cost, documented quotas | Twenty sampling positions plus parsing and synthesis can finish within the later service objective and accepted cost without hidden concurrency failure. |
| Observability isolation | trace correlation for one run including retry and fallback; telemetry endpoint deliberately unavailable | Business state and raw evidence remain correct when trace export fails; sensitive data follows the approved export policy. |

## Unknowns and next gate

### Current controlled-account readiness

The 2026-08-25 local readiness audit found no repository configuration file or
current process variable name for TokenHub, Volcengine Ark, Alibaba Cloud Model
Studio, Baidu Qianfan, or Langfuse. No credential value was read. The controlled
matrix therefore remains **not run**, not failed: the intended commercial
account, region, service/model identity, quota, billing boundary, applicable
terms, and secret injection are not yet available to this worktree.

Before any call, the owning team supplies a non-secret route sheet for each
platform containing account owner, region, endpoint/protocol family,
service/model ID, search configuration, quota or budget, data-handling boundary,
and credential-reference name. Secret values enter only through the approved
local or CI secret mechanism and are never written into this brief, source
control, command output, or evidence fixture.

Fixture, schema, semantic expectation, evidence-directory, and cost-ledger
preparation may proceed without credentials. Network calls, service activation,
quota changes, and paid usage remain a separate explicit authorization.

- Exact first-slice model/service IDs for all five customer-visible platforms
  remain operating configuration choices backed by controlled evidence.
- Ark's exact returned search-trigger and citation/source contract remains
  unverified from the accessible official API reference.
- Provider account activation, regional access, current quotas, safety behavior,
  billing, data handling, retention, and commercial terms remain account- or
  contract-specific.
- Parser and synthesizer semantic quality, latency, and cost are not established
  by structured-output support; they require the controlled regression fixtures.
- Langfuse Cloud versus self-hosting, or another OpenTelemetry-compatible
  destination, remains part of stack and operations comparison. The current
  self-hosting documentation describes a meaningful operational footprint, so
  self-hosting is not assumed to be the simpler first-release choice.
- The application stack has since selected PostgreSQL, Redis/BullMQ, SSE, and an
  S3-compatible boundary. Exact hosting products and provider-specific operating
  values remain outside this provider-capability audit and follow their owning
  operational gate.

The smallest viable stack comparison is now complete. Final provider-adapter
approval and first-slice implementation authorization still require the
controlled-account matrix above.
