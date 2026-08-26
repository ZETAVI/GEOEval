# Source Brief: First Evaluation Slice External Capabilities

- Change: [`define-application-architecture`](../proposal.md)
- Access date: 2026-08-25
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

## Intended route and credential-reference map

The product owner confirmed the intended provider route on 2026-08-25. The
table records logical ownership and no-secret configuration references; it does
not assert that the supplied accounts, models, quotas, or response semantics
have passed controlled validation.

| Customer-visible route or internal purpose     | Intended provider surface                             | Protocol candidate                                                                         | Credential reference                                              | Current boundary                                                                                                                                                                            |
| ---------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DeepSeek evaluation                            | Tencent Cloud TokenHub platform DeepSeek V4 route     | Chat Completions                                                                           | `TOKENHUB_API_KEY`                                                | Use bare platform ID `deepseek-v4-flash`; reject Pro, official-direct, namespaced, or dated service classes for this consumer-aligned sampling route.                                       |
| Doubao evaluation                              | Volcengine Ark Doubao Seed 2.0 Lite                   | Responses                                                                                  | `ARK_API_KEY`                                                     | Use the logical 2.0 Lite family; validate current documented snapshot candidate `doubao-seed-2-0-lite-260428` and prove search/source and reasoning-return behavior.                        |
| Qwen evaluation                                | Alibaba Cloud Model Studio `qwen3.7-flash`            | Responses preferred; native DashScope remains a fallback when it exposes stronger evidence | `DASHSCOPE_API_KEY`                                               | Do not use compatible Chat when the response cannot prove whether search occurred.                                                                                                          |
| ERNIE evaluation                               | Baidu AI Cloud Qianfan ERNIE 4.5 Turbo                | V2 Chat Completions                                                                        | `QIANFAN_API_KEY`                                                 | Validate provisional stable API ID `ernie-4.5-turbo-128k`, automatic search, and the required evidence profile without claiming API-to-consumer-route equivalence from documentation alone. |
| Hunyuan evaluation                             | Tencent Cloud TokenHub Hunyuan                        | Responses preferred                                                                        | `TOKENHUB_API_KEY`                                                | Use `hy3`; keep separate from the TokenHub DeepSeek Chat mapping even though the account is shared.                                                                                         |
| Sample parser and overall synthesizer primary  | Tencent Cloud TokenHub Hunyuan                        | Responses with strict JSON Schema                                                          | `TOKENHUB_API_KEY`                                                | Use `hy3` without web search over retained evidence; business validation remains purpose-owned.                                                                                             |
| Sample parser and overall synthesizer fallback | Alibaba Cloud Model Studio hosted `deepseek-v4-flash` | Responses                                                                                  | `DASHSCOPE_API_KEY`                                               | Use this exact Model Studio alias without web search, not a DeepSeek vendor endpoint or unapproved snapshot; fallback never creates another sample or report identity.                      |
| Trace export                                   | Langfuse Cloud US candidate                           | OpenTelemetry or current JS/TS SDK                                                         | `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_BASE_URL` | Non-blocking follower; masked technical telemetry only by default.                                                                                                                          |

The originally supplied names are migration aliases, not the application
contract: `DOUBAO_API_KEY` maps to `ARK_API_KEY`; `QWEN_API_KEY` maps to
`DASHSCOPE_API_KEY`; `WENXIN_API_KEY` maps to `QIANFAN_API_KEY`; and
`YUANBAO_API_KEY` maps to `TOKENHUB_API_KEY`. No separate
`DEEPSEEK_API_KEY` is part of the application contract: primary DeepSeek
execution uses the TokenHub reference and parser fallback uses the Model Studio
reference. The user-authorized local `.env` contains only canonical names, is
ignored by Git, and no supplied value is retained in source control.

### Explicit DeepSeek route constraints

Official TokenHub documentation catalogs official DeepSeek direct-supply IDs
separately from the bare TokenHub service IDs. The product decision selects the
bare platform service class. The customer-visible evaluation route allows only
`deepseek-v4-flash`; the documented `deepseek-v4-pro` platform route is outside
the consumer-aligned sampling selection. Other excluded IDs include
`deepseek-v4-pro-202606`, `deepseek-v4-flash-202605`, and all
`deepseek/deepseek-*` aliases.

Alibaba Cloud identifies Model Studio as the inference service provider for
the selected `deepseek-v4-flash` alias and documents structured-output support
for that alias. The parser fallback therefore allows only that exact alias;
`deepseek-v4-flash-0731` is not selected because its documented structured-
output capability differs, and no direct DeepSeek vendor endpoint or credential
is used.

These constraints prove the chosen provider route and prevent configuration
drift; they do not prove that the cloud platforms alter the underlying model
weights or that an API route reproduces the public consumer product. Every
attempt still snapshots requested and returned model identity.

## Evidence collection semantics

Every adapter attempt captures and returns the complete provider payload or
completed stream artifact plus a normalized index. Normalization adds comparable
fields; it never replaces provider evidence. GEO Evidence Acquisition persists
the accepted attempt as the canonical business evidence. AI Execution retains
only bounded failed-attempt diagnostics under the technical-evidence policy, so
the report never depends on a second raw-response store or on telemetry.

- Always record requested and returned route identity, protocol, model, response
  identity, terminal status, finish reason, timing, usage, provider request
  identity where returned, and the format-preserving final answer.
- Record search as `triggered`, `not_triggered`, or `unknown`. Preserve generated
  queries, tool events, source URLs, titles, snippets, citation offsets or
  markers, search-call counts, and search-specific usage whenever returned.
- Record the requested reasoning mode and effort separately from the returned
  reasoning evidence. Classify returned evidence as `none`, `summary`, or
  `provider_exposed`; retain its text and token counts when the provider returns
  them.
- Preserve provider safety annotations, tool events, cache details, rate-limit
  evidence, and provider-native usage or cost fields when present.
- Do not make hidden model reasoning a required field. A provider may expose a
  summary or a protocol-specific reasoning field, but no route is assumed to
  reveal the model's complete internal chain of thought.
- Reasoning evidence, search diagnostics, and raw provider payloads are internal
  evidence. They are not customer-visible report content and are excluded from
  Langfuse export by default.

## Evidence classification

| State             | Meaning                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| Documented        | Current official API reference or official product documentation directly supports the claim.               |
| Account-dependent | The capability requires service activation, region, entitlement, quota, or a control-panel value.           |
| Runtime-required  | Only a controlled call can establish response semantics, quality, cost, or the intended account's behavior. |
| Unverified        | Accessible official evidence is insufficient; do not design as if the claim were true.                      |

## Provider capability matrix

| Route                                       | Current official evidence                                                                                                                                                                                                                                                                                                                                                                                        | Evidence state                                                                                                                                                                  | Architecture implication                                                                                                                                                                                                                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tencent TokenHub: Hunyuan Hy3               | TokenHub documents `hy3` on both Responses and Chat APIs, model-decided web search, returned citations and search-call evidence, configurable reasoning effort, optional reasoning summary, and strict JSON Schema output. The documented search service is limited to 5 QPS and Guangzhou.                                                                                                                      | Documented; activation, quota, quality, and actual model access are account-dependent.                                                                                          | Prefer Responses for the richer event and citation shape. Use explicit JSON Schema validation and capture the concrete model/service ID. Application workers still own background execution.                                                                                                        |
| Tencent TokenHub: DeepSeek                  | TokenHub catalogs bare `deepseek-v4-flash` and `deepseek-v4-pro` separately from its official-direct IDs. The bare routes support web search through Chat Completions, with sources in `message.search_results`, search-call usage, and streamed `reasoning_content`; they do not use the same Responses web-search surface as Hy3.                                                                              | Service-class distinction and protocol capability documented; account access, terms, exact Pro/Flash selection, and runtime behavior require confirmation.                      | Permit only the bare platform IDs, reject official-direct IDs during route validation, and keep the DeepSeek Chat adapter distinct from the Hy3 Responses adapter.                                                                                                                                  |
| Volcengine Ark: Doubao                      | Ark's official documentation surface lists Responses API and the built-in Doubao Web Search tool, and official tool guidance states that Responses can use built-in tools to search public network material.                                                                                                                                                                                                     | Capability documented at product/API-guide level; exact search-trigger and citation/source response schema was not established from the accessible reference. Runtime-required. | Keep a dedicated Ark Responses adapter. Do not approve the evidence-retention contract until a real response proves how search occurrence, source URLs, original formatting, usage, and model version are returned.                                                                                 |
| Alibaba Cloud Model Studio: Qwen            | Model Studio documents Qwen web search through Responses, OpenAI-compatible Chat, and native DashScope. Responses can return `web_search_call.action.sources`, search queries, reasoning output items, reasoning-token usage, and final messages; native DashScope can return `search_info.search_results` and an observed search signal. Compatible Chat still cannot directly confirm whether search occurred. | Documented; account region, chosen model, and runtime behavior remain account-dependent.                                                                                        | Prefer Responses, with native DashScope as an evidence-preserving fallback. Search remains automatic for this product; retain the observed trigger and sources when present.                                                                                                                        |
| Baidu AI Cloud Qianfan: ERNIE               | Qianfan documents built-in ERNIE web search with `search_mode: auto`, optional trigger, trace and citation data, and `search_results`; current deep-thinking models can return `reasoning_content` under model-specific controls. The current model list includes ERNIE 5.1, 5.0, X, and 4.5 families with capability differences; ERNIE does not support forced search.                                         | Documented; exact current model, combined capability, account access, source completeness, and non-streaming behavior require a controlled call.                                | Automatic search matches the accepted product meaning. Select and record one explicit model and normalize streamed search, reasoning, and result events without losing the original answer.                                                                                                         |
| Alibaba Cloud Model Studio: parser fallback | The current `deepseek-v4-flash` model page identifies Model Studio as the inference provider and marks structured output and web search supported. The dated `deepseek-v4-flash-0731` snapshot on the same page marks structured output unsupported.                                                                                                                                                             | Selected alias and capability distinction documented but version-sensitive; runtime-required.                                                                                   | Pin the logical route to exact alias `deepseek-v4-flash`, reject unapproved aliases or snapshots, record the actual returned model/version, and require local schema and semantic validation.                                                                                                       |
| Langfuse candidate                          | Current Langfuse documentation describes an OpenTelemetry-based trace model with trace, user, session, tag, and metadata attributes; custom model usage and cost definitions; pre-export masking; managed cloud and self-hosted options.                                                                                                                                                                         | Documented; deployment, retention, privacy, scale, and operational cost are architecture decisions.                                                                             | Langfuse is a viable observability candidate, not yet a selected dependency. The application must generate its own business correlation IDs, ingest provider usage/cost explicitly when necessary, mask sensitive values before export, and save business truth even when telemetry is unavailable. |

## Primary evidence

| Claim                                                                                                                                                                                                                  | Primary source                                                                                                                                                                                                                                                                                   | Version or date                            | Design implication                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TokenHub supports Hy3 and DeepSeek V4 web search, but protocol support differs; Chat responses can return source URL, title, snippet, and site.                                                                        | [Tencent Cloud TokenHub web search](https://cloud.tencent.com/document/product/1823/132358)                                                                                                                                                                                                      | Updated 2026-08-05; accessed 2026-08-24    | Implement provider/protocol-specific adapters and retain raw search metadata.                                                                                                        |
| TokenHub catalogs bare DeepSeek V4 service IDs separately from official-direct and namespaced IDs.                                                                                                                     | [Tencent Cloud TokenHub DeepSeek calling guide](https://cloud.tencent.com/document/product/1823/132248) and [language-model overview](https://cloud.tencent.com/document/product/1823/130079)                                                                                                    | Accessed 2026-08-25                        | Enforce service class with an explicit model-ID allowlist rather than relying on a similar display name.                                                                             |
| TokenHub's Responses surface supports strict JSON Schema for Hy3 and DeepSeek V4 Flash, but provider-background input is not actual asynchronous execution.                                                            | [Tencent Cloud TokenHub Responses API](https://cloud.tencent.com/document/product/1823/135873)                                                                                                                                                                                                   | Accessed 2026-08-24                        | Use schema validation for parser output; keep long-running orchestration in application-owned workers.                                                                               |
| Old Tencent LKEAP DeepSeek access is being replaced by TokenHub.                                                                                                                                                       | [Tencent Cloud TokenHub migration guide](https://cloud.tencent.com/document/product/1823/131382)                                                                                                                                                                                                 | Updated 2026-08-05; accessed 2026-08-24    | Do not build the first slice against the legacy LKEAP endpoint.                                                                                                                      |
| Ark exposes Responses API and built-in Web Search as current platform capabilities.                                                                                                                                    | [Volcengine Ark documentation](https://www.volcengine.com/docs/82379/?lang=zh) and [Ark Responses tool calling](https://www.volcengine.com/docs/82379/1958524?lang=zh)                                                                                                                           | Accessed 2026-08-24                        | Candidate route is plausible, but response evidence still requires an account test.                                                                                                  |
| Current Doubao Seed 2.0 services expose model-specific `reasoning_effort` control, while the exact model and returned reasoning form remain route-specific.                                                            | [Volcengine model API reference](https://api.volcengine.com/api-docs/view?action=DescribeBaasAIModels&serviceCode=aidap&version=2025-10-01) and [Ark deep-thinking guide](https://www.volcengine.com/docs/82379/1956279?lang=zh)                                                                 | Accessed 2026-08-25                        | Record requested effort and returned evidence independently; prove the selected Doubao route at runtime.                                                                             |
| Ark's current deep-thinking guide lists `doubao-seed-2-0-lite-260428` and `doubao-seed-2-1-turbo-260628` among current explicit model IDs.                                                                             | [Ark Responses deep-thinking guide](https://www.volcengine.com/docs/82379/1956279?lang=zh)                                                                                                                                                                                                       | Updated 2026-08-19; accessed 2026-08-25    | Validate 2.0 Lite for consumer-aligned sampling and retain 2.1 Turbo only as a stronger-purpose candidate; documentation does not prove account access or web/App route equivalence. |
| Qwen search-source evidence is available through native DashScope, while compatible Chat cannot directly prove a search occurred.                                                                                      | [Alibaba Cloud Model Studio web search](https://help.aliyun.com/zh/model-studio/web-search/)                                                                                                                                                                                                     | Accessed 2026-08-24                        | Select the protocol from evidence requirements, not from superficial SDK uniformity.                                                                                                 |
| Model Studio currently lists `deepseek-v4-flash` structured output as supported but the `0731` snapshot as unsupported.                                                                                                | [Alibaba Cloud Model Studio DeepSeek V4 Flash](https://help.aliyun.com/en/model-studio/deepseek-v4-flash)                                                                                                                                                                                        | Accessed 2026-08-24                        | Model alias and pinned snapshot are not interchangeable; runtime validation is mandatory.                                                                                            |
| Model Studio identifies itself as the inference service provider for its current DeepSeek V4 Pro and Flash model pages.                                                                                                | [Alibaba Cloud Model Studio DeepSeek V4 Pro](https://help.aliyun.com/zh/model-studio/deepseek-v4-pro) and [DeepSeek V4 Flash](https://help.aliyun.com/zh/model-studio/deepseek-v4-flash)                                                                                                         | Accessed 2026-08-25                        | Treat the selected alias as a Model Studio hosted route without claiming the underlying weights were modified.                                                                       |
| ERNIE built-in search can return trigger, trace, citation, and search-result information under model-specific limits.                                                                                                  | [Baidu Qianfan web search](https://cloud.baidu.com/doc/qianfan-docs/s/Wm8r4sw29)                                                                                                                                                                                                                 | Updated 2026-05-21; accessed 2026-08-24    | Normalize search events and retain sources without requiring search to fire for every question.                                                                                      |
| Current Qianfan deep-thinking routes can return `reasoning_content`, but support and controls are model-specific.                                                                                                      | [Baidu Qianfan deep thinking](https://cloud.baidu.com/doc/qianfan-docs/s/Wm95lyynv) and [model list](https://cloud.baidu.com/doc/qianfan-docs/s/7m95lyy43)                                                                                                                                       | Updated 2026-05-27 and accessed 2026-08-25 | Treat reasoning as an optional provider capability, not a universal response field.                                                                                                  |
| Model Studio Responses can return reasoning items, reasoning summaries, search calls, queries, sources, and reasoning-token usage for supported Qwen and DeepSeek routes.                                              | [Alibaba Cloud Model Studio Responses API](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses) and [web search](https://help.aliyun.com/zh/model-studio/web-search/)                                                                                                          | Accessed 2026-08-25                        | Prefer the evidence-rich Responses surface when its exact model and account pass controlled validation.                                                                              |
| Model Studio's current model list includes `qwen3.7-flash` and `qwen3.7-plus`; Responses and web-search behavior remains model- and account-specific.                                                                  | [Alibaba Cloud Model Studio model list](https://help.aliyun.com/zh/model-studio/models), [Responses API](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses), and [web search](https://help.aliyun.com/zh/model-studio/web-search/)                                           | Accessed 2026-08-25                        | Validate Flash for customer-visible sampling and retain Plus only as a stronger-purpose candidate.                                                                                   |
| Qianfan's current model list exposes ERNIE 4.5 Turbo IDs including `ernie-4.5-turbo-32k`, `ernie-4.5-turbo-128k`, and a dated snapshot; built-in search uses the V2 Chat endpoint with model-specific evidence fields. | [Baidu Qianfan model list](https://cloud.baidu.com/doc/qianfan-docs/s/7m95lyy43) and [web search](https://cloud.baidu.com/doc/qianfan-docs/s/Wm8r4sw29)                                                                                                                                          | Accessed 2026-08-25                        | Use `ernie-4.5-turbo-128k` as the provisional stable API candidate and verify actual enabled identity and consumer alignment at E0.                                                  |
| TokenHub's current model-list endpoint returns concrete model IDs and its official example includes `hy3`.                                                                                                             | [Tencent Cloud TokenHub model list](https://cloud.tencent.com/document/product/1823/130078)                                                                                                                                                                                                      | Accessed 2026-08-25                        | Query and snapshot the enabled account model list before E0; use `hy3` for the Hunyuan, parser, and synthesis route candidates.                                                      |
| Langfuse traces use OpenTelemetry and support trace-level identity, custom model cost, pre-export masking, and managed or self-hosted deployment.                                                                      | [Langfuse data model](https://langfuse.com/docs/observability/data-model), [cost tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking), [masking](https://langfuse.com/docs/observability/features/masking), and [self-hosting](https://langfuse.com/self-hosting) | Accessed 2026-08-24                        | Integrate through a non-blocking telemetry port; evaluate cloud versus self-hosting later against privacy and operations constraints.                                                |

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
6. **Service provenance is validated configuration.** Similar DeepSeek display
   names do not make platform-hosted and official-direct routes equivalent. The
   route policy validates the selected service class and model-ID allowlist
   before execution.
7. **Observability is an optional follower.** Business correlation IDs originate
   in GEOEval. Trace export is buffered or best-effort and cannot make an
   otherwise valid evaluation write fail.
8. **Consumer-platform equivalence is not assumed.** Official API availability
   does not prove that its model/search behavior matches the named public
   consumer product. The intended model for each platform requires a recorded
   operating decision and a controlled comparison before the product calls the
   result a real five-platform evaluation.

## Controlled-account validation matrix

Run the smallest test below with non-sensitive fixtures and the intended
commercial accounts. Store request/response evidence outside this document and
link the resulting record; never paste keys or private account details here.

| Test                    | Minimum evidence                                                                                                                             | Pass boundary                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route and entitlement   | account, region, requested model/service ID, returned model identity, endpoint family, terms acknowledged                                    | The intended account can call the exact route through a supported, commercially usable interface.                                                        |
| Search behavior         | one query likely to search and one likely not to; raw trigger/source/citation fields                                                         | Automatic behavior is observable where documented, and all returned source metadata can be retained.                                                     |
| Answer fidelity         | list, table, headings, paragraphs, Unicode, streaming and non-streaming assembly where supported                                             | The stored answer is complete and format-preserving enough for report cards and non-destructive highlights.                                              |
| Retry and errors        | invalid credential in an isolated test key where safe, invalid request, rate-limit or documented fixture, timeout, provider safety rejection | Errors are classifiable; retries do not create another business sample; provider text is not leaked to the user.                                         |
| Parser semantics        | controlled answers covering explicit rank, implicit order, table order, no mention, same name, unfamiliar alias, and mixed sentiment         | JSON Schema passes and human-reviewed expected mention, position, evidence, and broad characteristics meet the later agreed regression threshold.        |
| Synthesis semantics     | a retained multi-sample fixture with positive, negative, conflicting, and sparse evidence                                                    | Output respects evidence, maximum display counts, optimization boundaries, and never recalculates the index.                                             |
| Capacity and cost       | measured latency, input/output/search usage, actual billed or console-reconciled cost, documented quotas                                     | Twenty sampling positions plus parsing and synthesis can finish within the later service objective and accepted cost without hidden concurrency failure. |
| Observability isolation | trace correlation for one run including retry and fallback; telemetry endpoint deliberately unavailable                                      | Business state and raw evidence remain correct when trace export fails; sensitive data follows the approved export policy.                               |

## Unknowns and next gate

### Current controlled-account readiness

The 2026-08-25 route names, DeepSeek service classes, and no-secret
configuration references are recorded, and `.env.example` defines only
canonical variable names. The product owner confirmed credential rotation and
approved a four-call, CNY 5 entitlement sub-gate. That gate passed for the
selected endpoint families, credentials, TokenHub model-list presence, and the
exact basic-inference identities returned by Ark, Model Studio, and Qianfan.
See the sanitized [entitlement evidence](provider-entitlement-evidence.md).

The controlled matrix is still **partially run** because parser, synthesis,
resilience, capacity/cost, and telemetry evidence remain. Its route portion is
complete: the initial, repair, and one-call retry batches produced successful
R01-R03 search plus coarse answer-fidelity evidence for all five routes and all
fifteen unique positions. Shared objectivity `0.2.0` also passed five-route
transport and a narrow R02 semantic calibration; the product owner then
confirmed the shorter `0.3.0` implementation wording without another prompt-
only batch. See the
[search and fidelity evidence](provider-search-fidelity-evidence.md) and
[instruction evidence](provider-instruction-evidence.md).
Provider-console cost reconciliation, account and region ownership, quotas,
applicable terms, and the later parser, synthesis, resilience, capacity, and
observability rows remain unverified.

Before any call, the owning team supplies a non-secret route sheet for each
platform containing account owner, region, endpoint/protocol family,
service/model ID, search configuration, quota or budget, data-handling boundary,
and credential-reference name. Secret values enter only through the approved
local or CI secret mechanism and are never written into this brief, source
control, command output, or evidence fixture.

Fixture, schema, semantic expectation, evidence-directory, and cost-ledger
preparation may proceed without another provider call. Every later network
batch, service activation, quota change, or paid-usage ceiling remains a
separate explicit authorization.

- The consumer-aligned evaluation candidates for all five customer-visible
  platforms are recorded in the [P0 provider validation preparation](provider-validation-preparation.md).
  Basic entitlement evidence does not yet prove their search behavior or
  equivalence to the providers' default free Web or App routes.
- Ark's exact search-trigger and source contract was observed for R01; lack of
  source evidence in R02-R03 remains `unknown` rather than proven no-search.
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

The smallest viable stack comparison is now complete. Deterministic S1-S5
implementation may be authorized separately because it does not claim real
provider behavior. Final provider-adapter approval and S6 real-provider
integration still require the applicable controlled-account matrix above.
