# Source Brief: Evaluation providers, web search, and tracing

- Decision: Whether the proposed provider routes can support the fixed five-
  platform evaluation and what must remain explicit before architecture
- Affected change: `define-product-foundation`
- Researched: 2026-08-19
- Status: Documented capability only; actual company-account behavior and final
  architecture remain unverified

## Recommendation

Use the proposed provider mapping as the validation target, not as a completed
architecture:

- Doubao: Volcengine Ark;
- Qwen: Alibaba Cloud Model Studio;
- ERNIE Bot: Baidu AI Search or the corresponding approved Baidu Cloud route;
- DeepSeek and Tencent Hunyuan: Tencent Cloud TokenHub.

Do not rely on an undefined "default model." Maintain an explicit evaluation
profile for each platform containing provider, model identifier or version,
protocol, search configuration, and relevant region or account settings. Snapshot
the profile used by every evaluation. Validate each route with the actual account
before implementation approval.

Enable supported web-search capability for every sample while allowing the
provider to decide whether to invoke it, matching the approved public-default
evaluation meaning. Record actual search use and all returned sources or
citations internally. A non-search answer remains a valid sample and the source
metadata is not shown to the customer.

Langfuse is a plausible observability candidate because its model supports
traces, nested observations, users, sessions, generations, tools, usage, and
cost. It should not own customer evaluations or reports. The trace contract and
sensitive-data boundary must be defined before choosing or configuring it.

Tencent Hunyuan Hy3 is the current parser-model candidate. This is not an
architecture commitment: it must be tested against a representative, human-
annotated set of outputs from all five evaluation platforms, including lists,
tables, headings, narrative paragraphs, aliases, no-mention answers, and
ambiguous order, before selection.

Alibaba Cloud Model Studio DeepSeek V4 Flash is the proposed cross-provider
fallback when the Hy3/TokenHub route remains unavailable or invalid after
retries. Alibaba documents `deepseek-v4-flash` and recommends the stable
`deepseek-v4-flash-0731` snapshot. The exact account, region, model identifier,
structured-output contract, and failure switching still require controlled
validation.

## Decision Constraints

- Every researched provider requires an explicit model or service identifier;
  model support for web search is not universal.
- Enabling search may still allow the model to decide whether to search. The
  approved evaluation mirrors that automatic behavior and records the actual
  outcome rather than requiring a search call.
- Provider citations, search-call evidence, token usage, cost, errors, and retry
  relations should be normalized without discarding the raw provider response.
- Complete customer-visible sample output and report data remain product business
  records even if an observability service also receives a redacted trace.

## Evidence

| Claim | Primary source | Date | Design implication |
| --- | --- | --- | --- |
| Volcengine Ark Responses API uses an explicit model and supports built-in Web Search as a tool. | [Volcengine Ark tool-calling documentation](https://www.volcengine.com/docs/82379/1958524?lang=zh) | Updated 2026-03-10; accessed 2026-08-19 | Doubao needs a chosen model ID and validated Web Search profile rather than an implicit default. |
| Alibaba Cloud Model Studio requires an explicit Qwen model; web search is model-dependent, can be enabled or forced for supported models, and can be skipped under some conditions. | [Alibaba Cloud Model Studio web-search documentation](https://help.aliyun.com/zh/model-studio/web-search) | Accessed 2026-08-19 | The Qwen profile must pin a supported model and decide automatic versus forced search. |
| Baidu AI Search V2 exposes an OpenAI-compatible endpoint and accepts an explicit model; its search application supports configurable search behavior. | [Baidu AI Search API documentation](https://cloud.baidu.com/doc/qianfan-docs/s/hm984mh32) | Updated 2025-05-27; accessed 2026-08-19 | The ERNIE-labelled platform still needs an explicitly validated Baidu model and search mode. |
| TokenHub web search currently lists Hy3, Hy3 preview, DeepSeek V4 Pro, and DeepSeek V4 Flash with explicit model IDs, API-specific search fields, a 5 QPS limit, and Guangzhou region. | [Tencent Cloud TokenHub web-search documentation](https://cloud.tencent.com/document/product/1823/132358) | Updated 2026-08-05; accessed 2026-08-19 | DeepSeek and Hunyuan routes are documented but must be pinned, costed, rate-limited, and tested on the actual account. |
| DeepSeek official documentation now describes web search in its Claude Code integration. | [DeepSeek Claude Code integration](https://api-docs.deepseek.com/quick_start/agent_integrations/claude_code/) | Accessed 2026-08-19 | "DeepSeek official API never supports web search" is not a safe durable rationale; use current protocol evidence and controlled testing when comparing routes. |
| Langfuse groups LLM calls, tool calls, and other steps as observations within traces, supports user and session attributes, and records model usage and cost on generation observations. | [Langfuse data model](https://langfuse.com/docs/observability/data-model), [Langfuse tracing guidance](https://langfuse.com/docs/observability/best-practices) | Accessed 2026-08-19 | Langfuse can be evaluated for multi-provider and multi-agent tracing after the product-owned trace contract and privacy boundary are agreed. |
| Alibaba Cloud Model Studio documents `deepseek-v4-flash`, recommends the stable `deepseek-v4-flash-0731` snapshot, and supports Responses API access in selected regions. | [Alibaba Cloud DeepSeek V4 Flash model information](https://help.aliyun.com/zh/model-studio/deepseek-v4-flash), [Alibaba Cloud DeepSeek API](https://help.aliyun.com/zh/model-studio/deepseek-api) | Accessed 2026-08-19 | The fallback exists as documented capability, but the project must pin and validate the actual region, snapshot, schema, latency, and account access. |

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| Explicit per-platform model and search profiles | Adopt for validation | Prevents provider defaults or model retirement from silently changing evaluation meaning. |
| Treat provider platform name as the complete execution identity | Reject | It cannot explain which model, search behavior, prompt, cost, or failure produced a sample. |
| Treat Langfuse as the customer business-record store | Reject | Observability and customer-facing evaluation ownership have different retention, access, and reliability responsibilities. |

## Unknowns and Validation

- Architecture and security owners: decide trace payload, pseudonymous identity,
  access, retention, region, deployment, and deletion behavior.
- Provider workstream: run a controlled sample on every actual account to verify
  chosen model availability, search triggering, citations, complete raw response,
  token and cost fields, QPS, timeouts, errors, and retry behavior.
- Provider workstream: compare DeepSeek first-party and TokenHub behavior before
  documenting the final reason for using TokenHub.
- Evaluation workstream: compare the Hy3 parser candidate against annotated
  expected mention, position, characteristic, and uncertainty results and record
  accuracy, disagreement, latency, cost, and structured-output reliability.
- Evaluation workstream: prove primary-retry-fallback behavior using actual
  TokenHub Hy3 and Alibaba Model Studio DeepSeek V4 Flash accounts, including
  schema validation, timeout isolation, retry limits, and trace continuity.
