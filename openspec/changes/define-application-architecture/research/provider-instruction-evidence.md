# Source Brief: Provider System Instruction Boundary

- Change: [`define-application-architecture`](../proposal.md)
- Access date: 2026-08-25
- Decision: Define five independently configurable evaluation-instruction
  profiles and verify each route's supported transport and behavioral effect
- Evidence state: documented capability varies by route; no instruction runtime
  probe has been authorized or executed

## Recommendation

Keep one independently versioned **evaluation instruction profile per logical
platform route**. The five profiles may use different text, transport, or an
explicit no-custom-instruction baseline. They are not five copies of one shared
prompt. Each profile is calibrated against that route's own API baseline and
the intended ordinary consumer posture.

Do not describe any profile as the hidden system prompt of a provider's Web or
App product. Public API documentation proves that several routes accept
higher-priority instructions; it does not disclose the consumer product's
private orchestration, safety policy, search routing, context assembly,
experiments, or prompt.

Each first profile should remain short and natural for its own platform. Across
profiles, the product preserves the same evaluation invariants: the frozen
brand/query input, no fabricated brand claims or hidden promotional preference,
automatic rather than forced search posture, complete evidence retention, and
the same downstream scoring rules. Brand profile and generated query remain
user input, not system instruction. No sampling profile may impose JSON,
ranking labels, report fields, or GEO-analysis language because those
constraints would move the answer away from ordinary consumer behavior.

## Decision constraints

- Each logical platform owns one independently replaceable profile identity,
  semantic version, content hash, route-specific transport, and calibration
  record. An explicit `none` profile is valid.
- Evaluation consistency comes from frozen inputs, shared evidence semantics,
  and shared scoring—not from forcing identical prompt text across providers.
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
| TokenHub Hy3 Responses accepts `instructions` and `system`/`developer` roles with priority over `user` | [Responses fields](https://cloud.tencent.com/document/product/1823/135873) and [Hy3 guide](https://cloud.tencent.com/document/product/1823/132252) | A/B, 2026-08-25 | `instructions` is a documented candidate transport for the Hy3 profile; verify exact behavior at runtime |
| Accessible Ark documentation proves the Responses and tool family but did not establish the exact product-specific `instructions` contract | [Ark Responses tool calling](https://www.volcengine.com/docs/82379/1958524?lang=zh) | B, 2026-08-25 | Treat Doubao instructions as unverified instead of assuming full OpenAI compatibility |
| Model Studio Qwen Responses accepts `instructions` and `system`/`developer` roles; linked-response state does not carry prior instructions automatically | [Model Studio Responses API](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses) | A, 2026-08-25 | `instructions` is a documented candidate transport for the Qwen profile; the dedicated-route R01-R03 probe now passes, while instruction priority remains untested |
| Qianfan V2 Chat examples accept a `system` message | [Qianfan system-message example](https://cloud.baidu.com/doc/qianfan-docs/s/7m8r1wke3) | B, 2026-08-25 | `system` is a protocol-family candidate for the ERNIE profile; exact ERNIE 4.5 Turbo instruction behavior remains untested |

## Product boundary

There are two different objectives:

1. **Consumer alignment:** use the selected consumer-oriented model, automatic
   search, natural user query, and a route-specific profile only when it makes
   that API route a better approximation of the intended platform posture.
2. **Evaluation comparability:** freeze the brand/query inputs, profile identity,
   route policy, evidence contract, and scoring rules for every sample. Do not
   hide profile differences; make them part of the immutable evaluation context.

They cannot be collapsed into a claim of exact App reproduction. If an
instruction materially changes mention rate, ordering, search frequency, or
answer style compared with no instruction, the product owner must choose the
tradeoff explicitly.

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| Five independent route profiles | Recommended | Allows provider-specific alignment without hiding differences; each route needs its own baseline and versioned evidence |
| One unified prompt for all routes | Reject for the current product | Apparent textual consistency can reduce consumer alignment and does not remove provider-level behavioral differences |
| No custom instruction | Valid per-route baseline | Closest observable API default; it may remain the selected profile when a custom instruction causes more distortion |
| Emulate an assumed hidden App prompt | Reject | The consumer prompts and orchestration are not public evidence, so this would create false equivalence |

## Unknowns and validation

Before freezing any route profile, use fictional data to verify only that
route:

- the exact route accepts the selected instruction transport and priority;
- a bounded conflicting user request exposes whether the intended minimum
  boundary is followed;
- requested and returned model identity, route-policy version, instruction
  profile ID/version/hash, search configuration, and complete answer are
  retained;
- one no-instruction baseline and one candidate-profile result expose any
  material shift in search frequency, mention/order, answer style, or fidelity
  without claiming that either is the hidden App prompt.

The owning evaluation policy selects profile content and version. Route policy
references that immutable profile, while the provider adapter only maps it to
the provider's `system`, `instructions`, or supported equivalent. A material
profile change affects later runs, never rewrites historical reports, and
requires product-owner confirmation plus route-local calibration evidence.

These follow-ups are five independent contract/calibration probes, not part of
the customer's twenty-position evaluation. They require a separate bounded
real-call authorization after the five profile purposes are confirmed.
