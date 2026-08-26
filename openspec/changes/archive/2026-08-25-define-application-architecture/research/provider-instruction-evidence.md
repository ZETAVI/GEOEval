# Source Brief: Shared Evaluation Objectivity Instruction

- Change: [`define-application-architecture`](../proposal.md)
- Access and execution date: 2026-08-25
- Decision: Use one shared semantic objectivity instruction for all five
  customer-visible evaluation routes while mapping it through each provider's
  verified instruction transport
- Evidence state: all five selected routes accepted candidate `0.2.0`; bounded
  semantic calibration passed with recorded limitations; the product owner
  confirmed the shorter `0.3.0` wording on 2026-08-25 without requesting a
  third prompt-only provider batch

## Recommendation

Use one short, versioned **evaluation objectivity instruction**, not five
provider-specific prompts. GEO Intelligence owns its semantic content. Route
policy references the same profile ID/version/hash for every platform, and each
provider adapter only maps that content to `system`, `instructions`, or another
verified transport.

The instruction corrects a known sampling bias—models tend to be agreeable or
overly positive when a brand is named—without forcing an artificial negative
opinion. Evaluation consistency still depends on frozen brand/query input,
automatic-search posture, complete evidence, and shared scoring. No prompt may
be described as a provider Web/App's hidden system prompt.

## Confirmed shared instruction `evaluation.objectivity@0.3.0`

The exact candidate ID, version, and text have one executable owner: the
[objectivity profile](../../../../../scripts/provider-validation/evaluation-objectivity.json).
It requires evidence-based, neutral evaluation; rejects automatic brand praise,
mechanically balanced criticism, unsupported certainty, and invented facts or
sources; and preserves a natural consumer-style answer. Search availability and
automatic trigger posture remain route configuration rather than semantic
prompt instructions.

The confirmed `0.3.0` content hash is
`902bd62d8a1d6f08003d587dd56ce463e9b5758e97ee5434eb04fc48b3d4249a`.
The earlier `0.2.0` content hash observed by all five calibration probes remains
`a95e870d12d625209e2642a66084828c4b48b659b886ca33611d16cf2d974dda`.

## Decision constraints

- All five routes use the same semantic text and version. Provider-specific
  code owns transport mapping, not alternate product wording.
- Every sample snapshots instruction profile ID, version, and content hash with
  its route-policy identity. Later changes affect later runs only.
- The instruction cannot contain customer promotion claims, report schema,
  ranking targets, hidden brand preference, or GEO-analysis language.
- “Objective” does not mean manufacturing one positive and one negative point.
  Unsupported criticism, praise, citation, and certainty are all invalid.
- Exact API documentation or controlled route evidence is required for every
  transport; OpenAI compatibility alone is insufficient.

## Evidence

| Claim | Primary source or controlled evidence | Level and date | Design implication |
| --- | --- | --- | --- |
| TokenHub DeepSeek Chat accepts a `system` message before user messages | [TokenHub Chat fields](https://cloud.tencent.com/document/product/1823/135872) plus `e0-20260825-objectivity-02` | A, 2026-08-25 | Map the shared policy to the first `system` message |
| TokenHub Hy3 Responses accepts `instructions` | [TokenHub Responses fields](https://cloud.tencent.com/document/product/1823/135873) plus `e0-20260825-objectivity-02` | A, 2026-08-25 | Map the same policy to top-level `instructions` |
| The selected Ark Doubao Responses route accepted top-level `instructions` | Controlled account run `e0-20260825-objectivity-02`; the accessible exact Ark page did not prove this field | A runtime, 2026-08-25 | Treat support as selected-route evidence, retain a contract test, and do not generalize it to every Ark model |
| Model Studio Qwen Responses documents `instructions` as a system instruction and accepted the selected dedicated route | [Model Studio Responses API](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses) plus `e0-20260825-objectivity-02` | A, 2026-08-25 | Map the shared policy to top-level `instructions` and resend it for every independent response |
| Qianfan V2 Chat documents `system` messages and the selected ERNIE route accepted one | [Qianfan quick start](https://cloud.baidu.com/doc/qianfan-docs/s/qm8qxemze) plus `e0-20260825-objectivity-02` | A/B, 2026-08-25 | Map the shared policy to the first `system` message |

## Controlled calibration

Both batches used the same fictional R02 brand-directed input and one call per
route, with no retry. Complete responses remain under ignored, access-controlled
`.provider-evidence/`.

| Candidate | Result | Semantic observation |
| --- | --- | --- |
| `0.1.0` | All five transports returned HTTP 200 with exact model identity | No route invented a negative claim, but DeepSeek emitted `[1]` while returning no source, citation, annotation, or search-result metadata. The candidate was rejected for encouraging an unsupported citation marker. |
| `0.2.0` | All five transports returned HTTP 200 with exact model identity | No output invented a material negative claim, emitted an unsupported citation, exposed GEO internals, or became promotional. One Hy3 answer added a mild suitability inference, and DeepSeek compressed the requested two sentences into one; natural-format and inference variance therefore remain regression concerns rather than guarantees. |

The `0.2.0` route observations were:

| Route | Transport | Duration | Raw response SHA-256 |
| --- | --- | ---: | --- |
| TokenHub DeepSeek | first `system` message | 2,113 ms | `81ae88226105d1531f15639bfa0fe83b1d24e397dea0e6f51d95ed3390970417` |
| TokenHub Hy3 | top-level `instructions` | 4,888 ms | `d800c186d384d8ceb01f554440a13b41b6201840a2ff1b0f1db4ac8fcc6f84db` |
| Ark Doubao | top-level `instructions` | 17,452 ms | `4f126ac0dc9bfb4eb9594518661a53f560ce5c5b93501d9d905198467db54df5` |
| Model Studio Qwen | top-level `instructions` | 7,871 ms | `8645ae79828eb763df017aecae3fe6e4bbade8610eb97d7e0e2905a5a33c07ad` |
| Qianfan ERNIE | first `system` message | 2,101 ms | `c9adfb948a145ccb7aceae2591a7a24f10d819547cf1095db01500ecf651da17` |

All five R02 calls supplied search capability but exposed no search decision or
sources, so their search state remains `unknown`, not `not_triggered`. The test
proves transport acceptance and one narrow semantic condition. It does not
prove exact consumer Web/App equivalence, stable behavior across all four query
types, or future model-version behavior.

The product owner subsequently confirmed `0.3.0` as the implementation wording.
It removes the prompt-level search and citation-presentation directions and
merges repeated caution language so that the shared policy corrects positivity
bias with less interference in each model's ordinary answer style. This is an
owner-approved semantic simplification, not a new claim of provider behavior.
No third standalone five-route calibration is required; the next authorized
integration run snapshots and observes `0.3.0` through the already verified
transport mappings.

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| One shared semantic policy with verified transport mappings | Recommended | Directly addresses positivity bias while keeping evaluation meaning and versioning consistent |
| Five separately written prompts | Reject for the first release | Adds avoidable prompt drift and review burden without a confirmed product need |
| No custom instruction | Retain as regression baseline | Useful for comparison, but does not counter named-brand agreeableness |
| Assumed provider App prompt | Reject | Consumer prompts and orchestration are not public evidence, so this would create false equivalence |

## Next gate

Use `0.3.0` as the versioned implementation input. Do not calibrate five
separate prompts or run another prompt-only provider batch. Observe the profile
inside the next authorized integration evidence, while the immediate planning
frontier moves to parser, synthesis, resilience, capacity/cost, telemetry, and
deterministic first-slice authorization. Neither the earlier R02 probe nor the
wording confirmation proves exact consumer Web/App equivalence or production
quality.
