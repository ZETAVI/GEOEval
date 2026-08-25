# Preparation: Controlled Provider Validation

- Change: [`define-application-architecture`](../proposal.md)
- Preparation gate: P0
- State: Non-secret preparation complete; F0 and E0 execution remain unauthorized
- Owners: GEO evaluation owner, account and integration owner, verification owner
- Access date for provider facts: 2026-08-25

## Responsibility and boundary

This artifact owns the P0 route-readiness sheet, deterministic fixture catalog,
and the evidence manifest required before controlled provider execution. The
[external evidence brief](first-slice-external-evidence.md) owns researched
provider facts; the [implementation plan](../implementation-plan.md) owns lane
sequencing and work-package responsibility.

This preparation does not authorize dependency installation, image download,
service activation, quota changes, real model calls, production traffic, or
paid usage. It contains no secret value. Raw provider responses and account
details must not be committed to Git.

## Proposed quality-first route sheet

The candidates below are the smallest current set worth validating. They are
recommendations, not accepted production configuration. Each exact route must
pass account entitlement, evidence, latency, quality, and cost checks before it
can replace a deterministic adapter.

| Logical route | Provider and service class | Proposed model | Protocol family | Required behavior and retained evidence | Credential reference | Decision state |
| --- | --- | --- | --- | --- | --- | --- |
| `evaluation.deepseek` | Tencent Cloud TokenHub platform route, never official direct supply | `deepseek-v4-pro`; `deepseek-v4-flash` is the lower-cost comparison candidate | TokenHub Chat Completions | Enable supported web search while letting the model decide; retain answer formatting, requested and returned model, search observation, queries, `message.search_results`, reasoning evidence, usage, timing, and errors | `TOKENHUB_API_KEY` | quality-first candidate; Pro-versus-Flash cost decision pending |
| `evaluation.doubao` | Volcengine Ark Doubao | `doubao-seed-2-1-pro-260628` | Ark Responses, intended Beijing account route | Enable built-in web search; retain response items, returned search/source evidence, reasoning summary when exposed, output text, usage, timing, and errors | `ARK_API_KEY` | quality-first candidate; account and runtime evidence pending |
| `evaluation.qwen` | Alibaba Cloud Model Studio Qwen | `qwen3.8-max` | Workspace-scoped OpenAI-compatible Responses, intended Beijing route | Supply `web_search` and let the model decide; retain `web_search_call`, query and sources, reasoning summary, output items, text, usage, timing, and errors | `DASHSCOPE_API_KEY` | quality-first candidate; workspace and cost confirmation pending |
| `evaluation.ernie` | Baidu AI Cloud Qianfan ERNIE | `ernie-5.1` | Qianfan V2 Chat Completions | Use built-in search with `search_mode: auto`; retain trigger/status, trace, citations, search results, reasoning evidence when returned, answer, usage, timing, and errors | `QIANFAN_API_KEY` | current flagship candidate; combined capability requires runtime proof |
| `evaluation.hunyuan` | Tencent Cloud TokenHub Hunyuan | `hy3` | TokenHub Responses | Supply `web_search` and let the model decide; retain search-call and citation evidence, reasoning summary when returned, answer, usage, timing, and errors | `TOKENHUB_API_KEY` | documented candidate; entitlement and runtime evidence pending |
| `interpretation.sample.primary` | Tencent Cloud TokenHub Hunyuan | `hy3` | TokenHub Responses with strict JSON Schema | Parse only retained sample evidence; web search is disabled; retain schema result, semantic-validation outcome, complete response, model, usage, timing, and errors | `TOKENHUB_API_KEY` | confirmed logical primary; runtime quality pending |
| `interpretation.sample.fallback` | Alibaba Cloud Model Studio hosted DeepSeek | exact alias `deepseek-v4-flash` | Model Studio Responses with structured output | Receive the same retained sample input only after primary failure; web search is disabled; never become a second platform sample | `DASHSCOPE_API_KEY` | confirmed fallback route; runtime quality pending |
| `interpretation.synthesis.primary` | Tencent Cloud TokenHub Hunyuan | `hy3` | TokenHub Responses with strict JSON Schema | Synthesize only accepted brand and sample evidence; web search is disabled; cannot recalculate score or overwrite sample facts | `TOKENHUB_API_KEY` | confirmed logical primary; runtime quality pending |
| `interpretation.synthesis.fallback` | Alibaba Cloud Model Studio hosted DeepSeek | exact alias `deepseek-v4-flash` | Model Studio Responses with structured output | Receive the same retained synthesis input only after primary failure; preserve the same business result identity | `DASHSCOPE_API_KEY` | confirmed fallback route; runtime quality pending |
| `telemetry.export` | Langfuse candidate | configuration-defined, not a business model route | OpenTelemetry or current supported SDK | Export masked correlation, route, timing, usage, cost, and technical status only; exporter failure cannot fail a business result | `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_BASE_URL` | optional follower; deployment decision pending |

### Route rejection rules

A route is rejected before or during E0 when any of the following is true:

- a TokenHub DeepSeek model is not one of the bare platform IDs allowed by the
  route policy, or an official-direct or `deepseek/deepseek-*` ID is requested;
- an Alibaba fallback uses a direct DeepSeek endpoint, separate DeepSeek vendor
  credential, `deepseek-v4-flash-0731`, or another unapproved alias;
- the requested and returned service or model identity cannot be retained;
- the original answer or completed stream cannot be reconstructed without
  presentation rewriting;
- documented search evidence, returned source fields, usage, or errors are lost
  by the adapter;
- a parser or synthesizer passes JSON Schema but fails the purpose-owned
  semantic fixture;
- account, region, quota, terms, data handling, or measured cost remains unknown
  at the point a commercial route would be accepted.

## Readiness ledger

| Prerequisite | Current state | Required to close |
| --- | --- | --- |
| Canonical secret references | `.env.example` and the local ignored `.env` use only the approved references | Keep values out of Git and command output |
| Credential safety | Current local values were exposed in conversation | Rotate every provider and Langfuse credential before E0; re-inject locally without recording values |
| Exact candidate set | Quality-first candidates are listed above | Product owner confirms the model/cost posture before paid validation |
| Account and workspace owner | Not recorded | Name the responsible commercial account or workspace for Ark, Model Studio, Qianfan, TokenHub, and Langfuse |
| Region and endpoint | Official candidate families are known; actual enabled account regions are unverified | Record the enabled region, workspace or account endpoint, and returned model identity per route |
| Quota and budget | Not recorded | Record documented quota plus one bounded E0 monetary ceiling and stop condition |
| Terms and data handling | Product documentation is known; account and contract settings are unverified | Confirm intended commercial use, retention, and any cross-border or sensitive-data constraint |
| Evidence location | Not selected | Select an access-controlled location outside Git for raw request and response envelopes; commit only sanitized summaries and hashes |
| Runtime evidence | Not run | Execute only after E0 authorization and retain the evidence manifest below |

## Deterministic fixture catalog

All fixtures use an explicitly fictional business and contain no customer,
credential, private account, or copyrighted source data. Final customer query
generation prompts are outside this artifact; the fixtures test stable product
semantics rather than one prompt wording.

### Common fictional context

- Brand: `星河咖啡实验店` (fictional)
- Region: Guangzhou, Tianhe District
- Category: independent coffee shop
- Declared characteristics: quiet work area, hand-brew coffee, moderate price
- Unfamiliar alias: `星咖实验室` (must not be treated as the brand)

### Provider-route fixtures

| ID | Input shape | Required observation |
| --- | --- | --- |
| R01 | Time-sensitive local recommendation query likely to need web search | A valid answer is retained; search is `triggered` when the provider exposes it; every returned query, source, citation, and usage field survives normalization |
| R02 | Stable brand-directed question that may not need search | A valid answer remains acceptable when search is `not_triggered`; use `unknown` only when the provider cannot expose the fact |
| R03 | Prompt requesting headings, paragraphs, a numbered list, and a table | Stored answer preserves order, Unicode, Markdown or equivalent formatting, and completed streamed content |
| R04 | Bounded invalid-request and timeout fixtures | Error maps to the technical taxonomy without provider text or retry count becoming customer wording; no second business sample is created |
| R05 | One primary failure followed by the approved fallback | Attempts retain separate identities under one purpose and one business result; only the first semantically valid result is accepted |

### Sample-parser fixtures

| ID | Retained answer condition | Expected semantic result |
| --- | --- | --- |
| P01 | Numbered recommendation list; brand is second | mentioned `true`, relative position `2`, evidence points to the complete list context |
| P02 | Comparison table; brand is third row after the header | mentioned `true`, relative position `3`, table structure is preserved |
| P03 | Three recommendation paragraphs with implicit ordering; brand is discussed second | mentioned `true`, relative position `2`; no ordinal-word or character-offset shortcut |
| P04 | Same brand name appears in the specific query context | Treat the occurrence as the customer brand and extract evidence-backed characteristics |
| P05 | Only unfamiliar alias `星咖实验室` appears | mentioned `false`; do not invent an alias relationship |
| P06 | No brand or alias appears | mentioned `false`; no position or characteristics; still a valid zero-mention sample |
| P07 | Brand is mentioned with both a service strength and a price complaint | Preserve both evidence-backed polarities for later broad-theme synthesis; the sample card interpretation remains concise and objective |
| P08 | Primary parser returns syntactically invalid or semantically incomplete output | Retry the primary within its bounded policy, then use the approved Alibaba fallback; attempts do not repeat platform sampling |
| P09 | Both parser routes fail | The position contributes no mention, rank, characteristic, or score data and may appear as a missing result if the report still has at least seventeen valid samples |

### Score and report fixtures

| ID | Accepted open-question evidence | Expected result |
| --- | --- | --- |
| S01 | Fifteen valid open samples; six mentions at positions 1, 2, 3, 5, 6, and 2 | Mention rate `0.4`; mean position score `0.633333...`; raw index `1.78`; display `1.8`; star graphic rounds to `2.0` |
| S02 | Thirteen valid open samples because two open positions failed; five mentions at positions 1, 2, 3, 5, and 6 | Failures are outside the denominator; mention rate `5/13`; mean position score `0.6`; raw index about `1.6923`; display `1.7`; star graphic `1.5` |
| S03 | Valid open samples with zero mentions | Index `0.0` and five empty stars; the report remains valid when total coverage is at least seventeen |
| S04 | Brand-directed samples mention the brand but every open sample does not | Brand-directed evidence may inform interpretation and broad themes but contributes nothing to mention rate, position score, or index |
| S05 | Seventeen total valid positions | Produce the complete report, show `17/20`, and show a simple missing-result card for each failed position |
| S06 | Sixteen total valid positions after retries | Do not issue an incomplete official report; enter `Please retry` while retaining completed evidence |

### Synthesis and reliability fixtures

| ID | Condition | Expected result |
| --- | --- | --- |
| Y01 | Similar positive phrases appear across several samples and platforms | Merge into no more than five broad positive themes; count each theme at most once per independent sample and retain involved platforms |
| Y02 | Positive and negative evidence conflicts | Present an objective overall assessment without erasing either side or inventing certainty |
| Y03 | Sparse but report-eligible evidence | Produce no more than three customer optimization cards plus fuller internal guidance; state limitations and avoid guaranteed outcomes |
| Y04 | Synthesis primary and fallback both fail | Retain completed samples and parses; issue no incomplete report; retry synthesis later without resampling or reparsing successes |
| O01 | Provider attempt times out and its retry succeeds | One expected position produces one valid sample; retry count never increases business weight |
| O02 | The accepted attempt is delivered twice | The second delivery is idempotently ignored and cannot overwrite canonical evidence |
| O03 | Langfuse export is unavailable | Business evidence and lifecycle commit successfully; telemetry failure remains independently observable |

## Evidence manifest for each E0 run

Each retained run records, without embedding credentials:

- run, fixture, purpose, sample, attempt, and route-policy version identities;
- provider, service class, account reference, region, protocol, endpoint family,
  requested model, and returned model;
- request configuration excluding secrets, terminal status, finish reason,
  timing, provider request identity, native usage, search usage, and reconciled
  monetary cost;
- search observation, query and source counts, reasoning evidence kind, schema
  and semantic-validation outcomes, and hashes or secure references for the
  complete request and response artifacts;
- retry or fallback relation, accepted-result identity, reviewer, review time,
  and pass, fail, or blocked result for every controlled-matrix claim.

## Proposed E0 execution ceiling

E0 should use progressive stop gates rather than immediately running the full
twenty-position evaluation:

1. **Entitlement read:** query the account-visible model list or equivalent
   non-generation capability when available and confirm exact route identity.
2. **One-route evidence probe:** for each customer-visible platform, run R01,
   R02, and R03 one route at a time; stop that route when identity, answer
   fidelity, or required evidence cannot be retained.
3. **Interpretation probe:** run the bounded P01-P09 and Y01-Y04 fixtures against
   primary and fallback policies without web search.
4. **One complete fictional evaluation:** only after the earlier gates pass,
   execute the four-by-five synthetic run and reconcile latency, usage, search,
   parser, synthesis, and total billed cost.

The recommended initial hard ceiling is **CNY 100 total** across all E0 calls,
including retries and search charges. This is a conservative safety limit, not
a cost forecast or production budget. Stop before the ceiling when a provider
cannot expose usage, its console cost cannot be reconciled, an unexpected paid
feature is required, or any route would need an account or quota change. A later
performance or load run requires a new budget and authorization.

Public price tables for [Volcengine Ark](https://www.volcengine.com/docs/82379/1544106?lang=zh),
[Alibaba Cloud Model Studio](https://help.aliyun.com/zh/model-studio/model-pricing),
and [Baidu Qianfan](https://cloud.baidu.com/doc/qianfan-docs/s/Jm8r1826a) are
model-, region-, time-, token-, and sometimes search-dependent. They support
cost planning but cannot prove the intended account's final bill. TokenHub route
pricing also requires confirmation against the intended account. E0 therefore
records native usage and reconciles the provider console or bill rather than
embedding a brittle unit-price copy in the architecture.

## Activation checklist

- [x] Current official provider facts and route families are recorded.
- [x] Quality-first model candidates and explicit DeepSeek exclusions are recorded.
- [x] Canonical no-secret configuration references are present.
- [x] Deterministic provider, parser, score, synthesis, retry, and telemetry fixtures are defined.
- [x] Evidence manifest and route rejection conditions are defined.
- [ ] Product owner confirms the proposed quality-first model set.
- [ ] Account owner, enabled region, quota, terms, and data boundary are recorded.
- [ ] Exposed credentials are rotated and injected through the approved local mechanism.
- [ ] E0 budget ceiling, stop condition, and secure raw-evidence location are approved.
- [ ] E0 controlled calls are explicitly authorized.

F0 remains a separate gate. Approving this route sheet or E0 does not authorize
dependency installation, container-image download, the foundation spike, or
product implementation.
