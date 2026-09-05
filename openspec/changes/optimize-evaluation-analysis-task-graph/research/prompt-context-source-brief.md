# Source Brief: Prompt, Context and Structured Output

## Decision

Use positive semantic task instructions and sufficient source context, retain
strict structured output, and compare candidates before selecting task topology.
This is a testable engineering direction, not proof of Qwen quality.

## Evidence and implications

Primary sources accessed 2026-09-05:

| Fact | Source | Implication |
| --- | --- | --- |
| JSON Schema mode constrains output structure; the detailed support list includes Qwen3.8 Flash | [Alibaba Model Studio structured output](https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output) | The existing adapter already sends strict json_schema. Inspect task meaning and values rather than assume structure was never enabled |
| Context design covers instructions and the evidence supplied to the model; concise context still must be sufficient | [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Preserve source qualifiers/attribution when compressing; test losing or restoring evidence context |
| Simple composable workflows and measured iteration should precede added agent complexity | [Anthropic effective agents](https://www.anthropic.com/engineering/building-effective-agents) | One call, parallel tasks and dependent stages remain empirical alternatives |

The Alibaba page's summary table lists a narrower support statement than its
detailed model list; local Qwen3.8 Flash structured-response evidence and the
actual configured route remain necessary. Format support does not establish
correct facts or source-grounded prose. Anthropic guidance supplies design
hypotheses and is not a Qwen-specific guarantee.

## Local evidence and uncertainties

Main adapter: 
[Model Studio request construction](../../../../apps/backend/src/ai-execution/infrastructure/providers/model-studio-provider.adapter.ts).
Main Parser: [task context](../../../../apps/backend/src/geo-intelligence/sample-parser.policy.ts).
Main synthesis: [input builder](../../../../apps/backend/src/geo-intelligence/overall-synthesis.policy.ts).
#41 evidence: [rejected real candidate](https://github.com/ZETAVI/GEOEval/issues/41#issuecomment-5511017005).

The actual cause of each bad semantic result remains unproven. First isolate
Parser instruction; then compare source-preserving synthesis context before
choosing topology. See the [protocol](chain-quality-experiment.md).

## Reuse boundary

Reuse while the task, adapter, Schema mode and model route are unchanged.
Refresh on model/endpoint/mode changes or contradictory real behavior. No pricing,
quota, production access or Hy3 entitlement is inferred from these documents.

## P4 anomaly review — 2026-09-05

Rechecked the [official structured-output guide](https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output)
after the P4 failure. Its detailed list still includes Qwen3.8 Flash despite the
narrower summary table. It illustrates nullable types but does not enumerate
`anyOf` or all supported constraints; omission is not proof of incompatibility.

Controlled evidence is more specific: request input/instruction/Schema matched,
returned model matched, finish_reason was stop, no max_tokens cap was set, and
raw model content matched the normalized output. JSON satisfied local structural
validation but failed target identity/evidence semantics. Earlier real requests
using the same nullable structure returned target=null, so this failure does not
establish a universally unsupported branch or a decoder defect.

One observable instruction difference is that P4 shortened away P3's explicit
target=null workflow. The separately frozen control restored that mapping and
returned correct absence this time, but other semantic failures remained; see
the [results](chain-quality-experiment.md#brand-subject-results--2026-09-05).
This is not proof of causality or a reason to downgrade mode/change Provider.
The model's internal cause remains uncertain. Context7 was unavailable; official
pages and retained wire evidence were used without installing a global tool.
