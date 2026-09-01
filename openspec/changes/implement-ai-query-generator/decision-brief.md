# Decision Brief: AI Evaluation Query Generator

## Outcome

Replace deterministic question templates with one coherent Agent-generated
four-question set while preserving the accepted one-brand-revision,
one-definition, and explicit-start journey.

## Material decisions

| Decision                           | Proposed choice                                                                                                                                                                                                      | Main tradeoff                                                                                                                                  | Owner                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Generation shape                   | One Agent call proposes several angles and selects the final four questions together                                                                                                                                 | Better coherence and fewer moving parts than four independent calls; one failure affects the whole set                                         | Product owner                   |
| Question quality                   | Natural, concise Chinese from a potential customer, consumer, or demander perspective; the Agent receives brand, region, industry recommendation subject, both characteristics, and reviewed diverse examples        | Relies on Prompt candidates and product review instead of one repeated sentence template                                                       | Product owner                   |
| Natural target name                | The Agent selects the full name or a natural continuous substring such as `互动派`, then uses it in the brand-directed question                                                                                      | Avoids legal-name phrasing while rejecting invented translations or unrelated aliases                                                          | Product and architecture owners |
| Application validation             | Validate the output schema, four required roles and order, bounded content, candidate membership, and the target-name invariant; the three open questions contain neither the selected target name nor the full name | Protects recommendation-index meaning without quality scoring or a Critic                                                                      | Product and architecture owners |
| External research                  | No web search or automatic brand enrichment inside Query generation                                                                                                                                                  | Lower latency and less factual drift; brand-profile quality remains the input boundary                                                         | Product owner                   |
| Request lifecycle                  | Persist a preparation and Outbox fact, run generation asynchronously, then atomically accept the final definition                                                                                                    | Adds one small lifecycle and public preparation state but avoids synchronous timeout, duplicate cost, and lost failure state                   | Architecture owner              |
| Route sequence                     | Qwen3.8 Flash, one same-route retry, then Hy3 fallback                                                                                                                                                               | Reuses S6-proven structured routes; no silent template fallback in the real path                                                               | Product and architecture owners |
| Candidate storage                  | Store only selected questions as business records; retain full candidate output in protected attempt evidence                                                                                                        | Keeps the product model small while preserving diagnosis evidence                                                                              | Architecture owner              |
| Brand reference-data dependency    | Deliver industry and administrative-region activation as one independently mergeable Brand Knowledge change, then rebase #26 and consume its stable projection                                                       | Both selectors share the brand form, readiness, fingerprint, snapshot, and migration boundary; their data semantics remain separate            | Product and architecture owners |
| Existing deterministic definitions | Preserve every existing definition as the accepted question set for its original brand fingerprint; Agent preparation starts only for a fingerprint with no definition                                                        | Avoids destructive migration and preserves both used and unstarted evaluation opportunities; old fingerprints keep their historical template result | Product and architecture owners |
| Validation sequence                | Query-only review across representative profiles, then one authorized 互动派 four-by-five run                                                                                                                        | Finds question-quality problems before paying for and interpreting twenty platform samples                                                     | Product owner                   |

## Customer-visible behavior

- Entering diagnosis may show “正在准备评测问题”.
- When ready, the customer reviews the same four read-only questions and starts
  the same twenty-sample evaluation.
- If bounded generation fails, the customer sees a short retry action; no
  evaluation opportunity has been used.
- The customer never sees candidate questions, Prompt, model, attempts, queue,
  traces, or internal error classifications.

## Confirmed test profile

- Company: 互动派科技股份有限公司
- Region: 广东省广州市天河区
- Industry: `IND-06 / IND-06-07 营销策划与广告代理`
- Recommendation subject: 营销策划或广告代理公司
- Characteristic one: 抖音、小红书双平台官方授权一级广告代理
- Characteristic two: 从策划到落地执行的一站式数字营销服务

The second characteristic is a concise inference from the company's official
description of full-process service and is test input, not a permanent platform
claim. The source boundary is recorded in `research/interaction-pie-test-profile-source-brief.md`.

## Confirmation and Next Gate

- Confirmation: `Confirmed` by the product owner on 2026-09-01 for one Agent,
  multiple candidate angles, four selected questions, natural ordinary wording,
  no refresh/edit, the validated natural-name metric invariant, the durable
  asynchronous preparation boundary, the Qwen3.8-primary/Hy3-fallback route,
  the additive compatibility rule, and the two-change delivery sequence.
- Next action: review the deterministic durable-preparation slice on the
  accepted #27 / PR #31 Brand Knowledge baseline, then run the separately
  authorized Query-only quality batch if the fixed Diff is accepted.
- Confirmation required before: the first controlled paid Query-only batch;
  the later four-by-five real evaluation; PR merge; or production activation.
