# Preparation: Controlled Provider Validation

- Change: [`define-application-architecture`](../proposal.md)
- Preparation gate: P0
- State: Entitlement and all fifteen unique R01-R03 positions passed; shared
  objectivity `0.2.0` passed five-route calibration and the product owner
  confirmed the shorter `0.3.0` implementation wording
- Owners: GEO evaluation owner, account and integration owner, verification owner
- Access date for provider facts: 2026-08-25

## Responsibility and boundary

This artifact owns the P0 route-readiness sheet, deterministic fixture catalog,
and the evidence manifest required before controlled provider execution. The
[external evidence brief](first-slice-external-evidence.md) owns researched
provider facts; the [implementation plan](../implementation-plan.md) owns lane
sequencing and work-package responsibility.

This preparation does not authorize service activation, quota changes, real
model calls, production traffic, or paid usage. F0 separately authorizes only
project-local dependencies, Compose-managed disposable images, and non-product
foundation evidence. This artifact contains no secret value. Raw provider
responses and account details must not be committed to Git. The sanitized
[entitlement evidence](provider-entitlement-evidence.md) records the completed
first gate.

## Confirmed consumer-aligned evaluation route sheet

The product owner confirmed on 2026-08-25 that evaluation should approximate
the ordinary free/default consumer experience instead of selecting each
provider's strongest API model. The logical model families below are therefore
confirmed for controlled validation. API documentation proves callable service
IDs, not equivalence with a provider's web or app routing; E0 must still verify
account entitlement, returned identity, evidence, latency, quality, and cost
before any route can replace a deterministic adapter.

| Logical route                       | Provider and service class                                          | Proposed model                                                                                             | Protocol family                                                      | Required behavior and retained evidence                                                                                                                                                                                  | Credential reference                                              | Decision state                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `evaluation.deepseek`               | Tencent Cloud TokenHub platform route, never official direct supply | `deepseek-v4-flash`                                                                                        | TokenHub Chat Completions                                            | Enable supported web search while letting the model decide; retain answer formatting, requested and returned model, search observation, queries, `message.search_results`, reasoning evidence, usage, timing, and errors | `TOKENHUB_API_KEY`                                                | exact identity and R01-R03 search/fidelity evidence passed                                      |
| `evaluation.doubao`                 | Volcengine Ark Doubao                                               | logical family `Doubao-Seed-2.0-lite`; current documented snapshot candidate `doubao-seed-2-0-lite-260428` | Ark Responses, intended Beijing account route                        | Enable built-in web search; retain response items, returned search/source evidence, reasoning summary when exposed, output text, usage, timing, and errors                                                               | `ARK_API_KEY`                                                     | exact identity and R01-R03 search/fidelity evidence passed                                      |
| `evaluation.qwen`                   | Alibaba Cloud Model Studio Qwen                                     | `qwen3.7-flash`                                                                                            | Workspace-scoped OpenAI-compatible Responses, intended Beijing route | Supply `web_search` and let the model decide; retain `web_search_call`, query and sources, reasoning summary, output items, text, usage, timing, and errors                                                              | `DASHSCOPE_API_KEY`                                               | dedicated Beijing route returned exact identity and passed R01-R03; R01 retained one search call and 40 sources after an additive normalizer correction |
| `evaluation.ernie`                  | Baidu AI Cloud Qianfan ERNIE                                        | logical family ERNIE 4.5 Turbo; provisional stable API ID `ernie-4.5-turbo-128k`                           | Qianfan V2 Chat Completions                                          | Use built-in search with `search_mode: auto`; retain trigger/status, trace, citations, search results, reasoning evidence when returned, answer, usage, timing, and errors                                               | `QIANFAN_API_KEY`                                                 | corrected R01-R02 and separately retried R03 passed with exact identity; R01 retained search evidence |
| `evaluation.hunyuan`                | Tencent Cloud TokenHub Hunyuan                                      | `hy3`                                                                                                      | TokenHub Responses                                                   | Supply `web_search` and let the model decide; retain search-call and citation evidence, reasoning summary when returned, answer, usage, timing, and errors                                                               | `TOKENHUB_API_KEY`                                                | exact identity and R01-R03 search/fidelity evidence passed                                      |
| `interpretation.sample.primary`     | Tencent Cloud TokenHub Hunyuan                                      | `hy3`                                                                                                      | TokenHub Responses with strict JSON Schema                           | Parse only retained sample evidence; web search is disabled; retain schema result, semantic-validation outcome, complete response, model, usage, timing, and errors                                                      | `TOKENHUB_API_KEY`                                                | confirmed logical primary; runtime quality pending                                             |
| `interpretation.sample.fallback`    | Alibaba Cloud Model Studio hosted DeepSeek                          | exact alias `deepseek-v4-flash`                                                                            | Model Studio Responses with structured output                        | Receive the same retained sample input only after primary failure; web search is disabled; never become a second platform sample                                                                                         | `DASHSCOPE_API_KEY`                                               | confirmed fallback route; runtime quality pending                                              |
| `interpretation.synthesis.primary`  | Tencent Cloud TokenHub Hunyuan                                      | `hy3`                                                                                                      | TokenHub Responses with strict JSON Schema                           | Synthesize only accepted brand and sample evidence; web search is disabled; cannot recalculate score or overwrite sample facts                                                                                           | `TOKENHUB_API_KEY`                                                | confirmed logical primary; runtime quality pending                                             |
| `interpretation.synthesis.fallback` | Alibaba Cloud Model Studio hosted DeepSeek                          | exact alias `deepseek-v4-flash`                                                                            | Model Studio Responses with structured output                        | Receive the same retained synthesis input only after primary failure; preserve the same business result identity                                                                                                         | `DASHSCOPE_API_KEY`                                               | confirmed fallback route; runtime quality pending                                              |
| `telemetry.export`                  | Langfuse candidate                                                  | configuration-defined, not a business model route                                                          | OpenTelemetry or current supported SDK                               | Export masked correlation, route, timing, usage, cost, and technical status only; exporter failure cannot fail a business result                                                                                         | `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_BASE_URL` | optional follower; deployment decision pending                                                 |

## Stronger-purpose candidate pool

`hy3`, `qwen3.7-plus`, and the current documented
`doubao-seed-2-1-turbo-260628` snapshot may be compared later for sample
interpretation, overall synthesis, optimization guidance, or writing. They do
not replace the five customer-visible sampling routes above. Inclusion in this
pool is not a production selection and does not override the separately owned
writing-agent Skill work; each purpose needs its own fixtures, quality/cost
evidence, and explicit route decision.

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

| Prerequisite                | Current state                                                                                                              | Required to close                                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Canonical secret references | `.env.example` and the local ignored `.env` use only the approved references                                               | Keep values out of Git and command output                                                                                           |
| Credential safety           | Rotated TokenHub, Ark, Model Studio, and Qianfan credentials authenticated successfully; `.env` remains mode `0600` and ignored by Git | Langfuse remains uncalled; keep every value out of Git and command output                                                            |
| Exact candidate set         | TokenHub exposes both selected bare IDs; Ark, Model Studio, and Qianfan returned the exact requested evaluation identities | Search, evidence, consumer equivalence, quality, and commercial acceptance remain separate gates                                     |
| Account and workspace owner | Rotated credentials are present, but account and workspace ownership is not recorded in Git                                        | Record an opaque account reference plus the observed region, endpoint, and returned route identity                                  |
| Region and endpoint         | Official candidate families are known; actual enabled account regions are unverified                                       | Record the enabled region, workspace or account endpoint, and returned model identity per route                                     |
| Quota and budget            | The entitlement sub-ceiling completed; R01-R03 was later bounded by at most fifteen calls without a monetary ceiling; native usage was captured but console billing is unreconciled | Every later paid batch still requires explicit call and stop boundaries; a monetary ceiling is optional when the product owner declines it |
| Terms and data handling     | E0 is restricted to fictional, non-sensitive fixtures; commercial customer-data use and final account terms remain unverified | Do not treat a successful probe as production data-processing approval                                                              |
| Evidence location           | Raw envelopes use local ignored `.provider-evidence/`, directories mode `0700`, files mode `0600`; only sanitized summaries and hashes may enter Git | Retain or move the restricted evidence according to the later team evidence policy                                                   |
| Runtime evidence            | Entitlement and all fifteen unique R01-R03 positions passed after eighteen bounded calls; two five-call shared-instruction calibrations also completed; exact `0.3.0` wording is owner-confirmed | Complete only the later parser, synthesis, resilience, capacity/cost, and observability gates needed before real-provider integration |

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

| ID  | Input shape                                                          | Required observation                                                                                                                                           |
| --- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R01 | Time-sensitive local recommendation query likely to need web search  | A valid answer is retained; search is `triggered` when the provider exposes it; every returned query, source, citation, and usage field survives normalization |
| R02 | Stable brand-directed question that may not need search              | A valid answer remains acceptable when search is `not_triggered`; use `unknown` only when the provider cannot expose the fact                                  |
| R03 | Prompt requesting headings, paragraphs, a numbered list, and a table | Stored answer preserves order, Unicode, Markdown or equivalent formatting, and completed streamed content                                                      |
| R04 | Bounded invalid-request and timeout fixtures                         | Error maps to the technical taxonomy without provider text or retry count becoming customer wording; no second business sample is created                      |
| R05 | One primary failure followed by the approved fallback                | Attempts retain separate identities under one purpose and one business result; only the first semantically valid result is accepted                            |

### Sample-parser fixtures

| ID  | Retained answer condition                                                         | Expected semantic result                                                                                                                                             |
| --- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P01 | Numbered recommendation list; brand is second                                     | mentioned `true`, relative position `2`, evidence points to the complete list context                                                                                |
| P02 | Comparison table; brand is third row after the header                             | mentioned `true`, relative position `3`, table structure is preserved                                                                                                |
| P03 | Three recommendation paragraphs with implicit ordering; brand is discussed second | mentioned `true`, relative position `2`; no ordinal-word or character-offset shortcut                                                                                |
| P04 | Same brand name appears in the specific query context                             | Treat the occurrence as the customer brand and extract evidence-backed characteristics                                                                               |
| P05 | Only unfamiliar alias `星咖实验室` appears                                        | mentioned `false`; do not invent an alias relationship                                                                                                               |
| P06 | No brand or alias appears                                                         | mentioned `false`; no position or characteristics; still a valid zero-mention sample                                                                                 |
| P07 | Brand is mentioned with both a service strength and a price complaint             | Preserve both evidence-backed polarities for later broad-theme synthesis; the sample card interpretation remains concise and objective                               |
| P08 | Primary parser returns syntactically invalid or semantically incomplete output    | Retry the primary within its bounded policy, then use the approved Alibaba fallback; attempts do not repeat platform sampling                                        |
| P09 | Both parser routes fail                                                           | The position contributes no mention, rank, characteristic, or score data and may appear as a missing result if the report still has at least seventeen valid samples |

### Score and report fixtures

| ID  | Accepted open-question evidence                                                                             | Expected result                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01 | Fifteen valid open samples; six mentions at positions 1, 2, 3, 5, 6, and 2                                  | Mention rate `0.4`; mean position score `0.633333...`; raw index `1.78`; display `1.8`; star graphic rounds to `2.0`                              |
| S02 | Thirteen valid open samples because two open positions failed; five mentions at positions 1, 2, 3, 5, and 6 | Failures are outside the denominator; mention rate `5/13`; mean position score `0.6`; raw index about `1.6923`; display `1.7`; star graphic `1.5` |
| S03 | Valid open samples with zero mentions                                                                       | Index `0.0` and five empty stars; the report remains valid when total coverage is at least seventeen                                              |
| S04 | Brand-directed samples mention the brand but every open sample does not                                     | Brand-directed evidence may inform interpretation and broad themes but contributes nothing to mention rate, position score, or index              |
| S05 | Seventeen total valid positions                                                                             | Produce the complete report, show `17/20`, and show a simple missing-result card for each failed position                                         |
| S06 | Sixteen total valid positions after retries                                                                 | Do not issue an incomplete official report; enter `Please retry` while retaining completed evidence                                               |

### Synthesis and reliability fixtures

| ID  | Condition                                                            | Expected result                                                                                                                        |
| --- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Y01 | Similar positive phrases appear across several samples and platforms | Merge into no more than five broad positive themes; count each theme at most once per independent sample and retain involved platforms |
| Y02 | Positive and negative evidence conflicts                             | Present an objective overall assessment without erasing either side or inventing certainty                                             |
| Y03 | Sparse but report-eligible evidence                                  | Produce no more than three customer optimization cards plus fuller internal guidance; state limitations and avoid guaranteed outcomes  |
| Y04 | Synthesis primary and fallback both fail                             | Retain completed samples and parses; issue no incomplete report; retry synthesis later without resampling or reparsing successes       |
| O01 | Provider attempt times out and its retry succeeds                    | One expected position produces one valid sample; retry count never increases business weight                                           |
| O02 | The accepted attempt is delivered twice                              | The second delivery is idempotently ignored and cannot overwrite canonical evidence                                                    |
| O03 | Langfuse export is unavailable                                       | Business evidence and lifecycle commit successfully; telemetry failure remains independently observable                                |

## Evidence manifest for each E0 run

Each retained run records, without embedding credentials:

- run, fixture, purpose, sample, attempt, route-policy version, and shared
  instruction profile ID/version/content-hash identities;
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

## E0 execution boundary

E0 should use progressive stop gates rather than immediately running the full
twenty-position evaluation:

1. **Entitlement read:** query the account-visible model list or equivalent
   non-generation capability when available and confirm exact route identity.
2. **One-route evidence probe:** for each customer-visible platform, run R01,
   R02, and R03 one route at a time; stop that route when identity, answer
   fidelity, or required evidence cannot be retained.
3. **Interpretation probe:** keep P01-P09 and Y01-Y04 as the complete local
   deterministic regression catalog. After the owner schemas and semantic
   validators exist, limit the first paid quality probe to representative
   boundary cases: primary parser P01, P03, P05, and P07; fallback parser P03
   and P07; primary synthesis Y02 and Y03; fallback synthesis Y02. Web search
   stays disabled, there is no automatic retry, and the batch stops on wrong
   route identity, invalid structure, or a material semantic failure.
4. **One complete fictional evaluation:** defer the four-by-five integrated run
   to S6, after deterministic S1-S5 acceptance and the interpretation probe.
   Reconcile latency, usage, search, parser, synthesis, and total billed cost
   there rather than blocking provider-neutral implementation on a premature
   load-shaped call batch.

The earlier CNY 100 proposal was not adopted for the R01-R03 batch. The product
owner instead approved at most fifteen named calls without a monetary ceiling.
Future batches must still state exact maximum calls, routes, fixtures, retry and
stop conditions, even when no monetary ceiling is requested. Stop when a
provider cannot expose required evidence, an unexpected paid feature is
required, or a route would need an account or quota change. A later performance
or load run requires its own authorization.

The representative interpretation probe above is a proposed maximum of nine
calls with no automatic retry. This document does not authorize those calls;
their exact schemas, retained fictional inputs, and evidence manifest must be
ready before a separate execution approval is requested.

### Completed entitlement authorization

The product owner approved **CNY 5 maximum** for
exactly four calls, expected to cost materially less. No request enables web
search, no service or quota change is allowed, and every generation prompt is
the fictional text `这是一次接口资格检查。请只回复：OK`.

1. `GET https://tokenhub.tencentmaas.com/v1/models` using
   `TOKENHUB_API_KEY`; no generation.
2. `POST https://ark.cn-beijing.volces.com/api/v3/responses` using
   `ARK_API_KEY`, model `doubao-seed-2-0-lite-260428`, with storage and
   thinking disabled.
3. `POST https://dashscope.aliyuncs.com/compatible-mode/v1/responses` using
   `DASHSCOPE_API_KEY`, model `qwen3.7-flash`, with thinking disabled. The
   official shared Beijing pay-as-you-go host supports cross-workspace keys;
   a workspace-dedicated production host remains preferred and unselected.
4. `POST https://qianfan.baidubce.com/v2/chat/completions` using
   `QIANFAN_API_KEY`, model `ernie-4.5-turbo-128k`, non-streaming.

The four calls completed on 2026-08-25 and are summarized in the
[entitlement evidence](provider-entitlement-evidence.md). Responses are written
only below ignored `.provider-evidence/` with directory
mode `0700` and file mode `0600`; the console receives model, status, duration,
usage, and hashes, never the secret or answer body. Approval of these four calls
did not itself approve R01-R03 web-search probes or the remaining E0 matrix.
The product owner subsequently authorized at most fifteen R01-R03 calls without
a monetary ceiling. Eleven were made before the Qwen and ERNIE route stop
conditions removed four later calls; see the
[search and fidelity evidence](provider-search-fidelity-evidence.md).

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
- [x] Consumer-aligned evaluation models, stronger-purpose candidates, and explicit DeepSeek exclusions are recorded.
- [x] Canonical no-secret configuration references are present.
- [x] Deterministic provider, parser, score, synthesis, retry, and telemetry fixtures are defined.
- [x] Evidence manifest and route rejection conditions are defined.
- [x] Product owner confirms the consumer-aligned evaluation model set.
- [ ] Account owner, enabled region, quota, terms, and data boundary are recorded.
- [x] Exposed credentials are rotated and injected through the approved local mechanism, as confirmed by the product owner.
- [x] The four-call CNY 5 entitlement sub-ceiling, stop conditions, and restricted raw-evidence location were approved and verified.
- [x] The four named entitlement calls were explicitly authorized and executed.
- [x] At most fifteen initial R01-R03 calls were authorized without a monetary ceiling; eleven executed under route stop conditions.
- [x] The Qwen and ERNIE repair batch was continued after the dedicated endpoint update; six calls executed, five passed, and ERNIE R03 stopped on one network error without retry.
- [x] One explicitly bounded ERNIE R03 retry passed, completing successful evidence for all fifteen unique route/fixture positions.
- [x] Two bounded five-call batches verified one shared objectivity instruction on all routes; candidate `0.1.0` was rejected for an unsupported citation marker and `0.2.0` passed the narrow R02 semantic calibration with recorded limitations.
- [x] Confirm exact shared instruction wording as `evaluation.objectivity@0.3.0`; no third prompt-only five-route batch is required.
- [ ] Complete the remaining parser, synthesis, resilience, capacity/cost, and telemetry matrix before real-provider integration.

F0 was separately authorized on 2026-08-25 for project-local dependencies and
Compose-managed disposable services. Credential rotation and runner
preparation do not authorize E0 calls or product implementation.
