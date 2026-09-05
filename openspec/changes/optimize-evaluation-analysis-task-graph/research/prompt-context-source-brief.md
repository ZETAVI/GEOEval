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
