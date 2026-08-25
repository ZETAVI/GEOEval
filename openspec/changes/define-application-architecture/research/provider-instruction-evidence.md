# Source Brief: Provider System Instruction Boundary

- Change: [`define-application-architecture`](../proposal.md)
- Access date: 2026-08-25
- Decision: Determine whether the five evaluation routes accept a controlled
  system instruction and whether that can reproduce the public Web/App posture
- Evidence state: documented capability varies by route; no instruction runtime
  probe has been authorized or executed

## Recommendation

Keep one versioned, provider-neutral **evaluation instruction policy** and map it
to each provider's supported transport. Do not describe it as the hidden system
prompt of a provider's Web or App product. Public API documentation proves that
several routes accept higher-priority instructions; it does not disclose the
consumer product's private orchestration, safety policy, search routing,
context assembly, experiments, or prompt.

The first sampling policy should be short and neutral: answer as an ordinary
consumer-facing recommendation assistant, use current public information when
search is judged necessary, avoid promotional preference and fabricated facts,
and preserve a natural answer. Brand profile and generated query remain user
input, not system instruction. Do not impose JSON, ranking labels, report
fields, or GEO-analysis language on sampling because those constraints would
move the answer away from ordinary consumer behavior.

## Decision constraints

- One semantic instruction version must apply to all five routes; only the
  provider transport may differ.
- A provider route is not accepted because another OpenAI-compatible service
  supports the same field; exact product documentation or controlled runtime
  evidence is required.
- No prompt may be described as the provider App/Web system prompt without a
  primary source from that consumer product.
- Sampling instructions must not contain customer promotion claims, report
  schema, ranking targets, or hidden brand preference.

## Evidence

| Claim | Primary source | Level and date | Design implication |
| --- | --- | --- | --- |
| TokenHub DeepSeek Chat accepts an optional `system` message before user messages | [Chat fields](https://cloud.tencent.com/document/product/1823/135872) and [DeepSeek guide](https://cloud.tencent.com/document/product/1823/132248) | A/B, 2026-08-25 | Configurable; exact policy adherence and effect on search require runtime evidence |
| TokenHub Hy3 Responses accepts `instructions` and `system`/`developer` roles with priority over `user` | [Responses fields](https://cloud.tencent.com/document/product/1823/135873) and [Hy3 guide](https://cloud.tencent.com/document/product/1823/132252) | A/B, 2026-08-25 | Prefer `instructions` as the transport for the shared policy; verify exact behavior at runtime |
| Accessible Ark documentation proves the Responses and tool family but did not establish the exact product-specific `instructions` contract | [Ark Responses tool calling](https://www.volcengine.com/docs/82379/1958524?lang=zh) | B, 2026-08-25 | Treat Doubao instructions as unverified instead of assuming full OpenAI compatibility |
| Model Studio Qwen Responses accepts `instructions` and `system`/`developer` roles; linked-response state does not carry prior instructions automatically | [Model Studio Responses API](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses) | A, 2026-08-25 | Configurable, but the selected route remains blocked on the R01 search timeout |
| Qianfan V2 Chat examples accept a `system` message | [Qianfan system-message example](https://cloud.baidu.com/doc/qianfan-docs/s/7m8r1wke3) | B, 2026-08-25 | Configurable at the protocol family; verify exact ERNIE 4.5 Turbo behavior after repairing search |

## Product boundary

There are two different objectives:

1. **Consumer alignment:** use the selected consumer-oriented model, automatic
   search, natural user query, and the smallest stable neutral instruction.
2. **Evaluation consistency:** keep the same semantic instruction and its
   version across all twenty sample positions so platform differences are not
   caused by prompt drift.

They cannot be collapsed into a claim of exact App reproduction. If an
instruction materially changes mention rate, ordering, search frequency, or
answer style compared with no instruction, the product owner must choose the
tradeoff explicitly.

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| No custom instruction | Pilot baseline | Closest observable API default, but offers no cross-route objectivity policy |
| Short neutral instruction | Recommended pilot | Improves consistency while limiting behavior distortion; must be compared with the baseline |
| Emulate an assumed hidden App prompt | Reject | The consumer prompts and orchestration are not public evidence, so this would create false equivalence |

## Unknowns and validation

Before freezing the sampling prompt, use fictional data to verify:

- each exact route accepts the chosen instruction transport;
- a simple conflicting user request cannot override the neutral policy;
- requested and returned model identity, instruction-policy version, search
  configuration, and complete answer are retained;
- one no-instruction baseline and one neutral-instruction result expose any
  material behavior shift without claiming that either is the hidden App
  prompt.

This follow-up is a contract and calibration probe, not part of the customer's
twenty-position evaluation. It requires a separate real-call authorization.
