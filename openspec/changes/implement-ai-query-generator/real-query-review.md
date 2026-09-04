# Real Query Review
<!-- Reopened on 2026-09-04 after the real-chain location acceptance failed. -->

> **Acceptance withdrawn:** this review called the real Query Provider but
> bypassed the Brand and Amap path. The Interaction Pie fixture manually set
> `天河路`, which the source brief never established. The outputs below remain
> Prompt-iteration history only and are not real-chain acceptance evidence.

## Review contract

- Date: 2026-09-04
- Prompt: `evaluation.question-generation.profile@2.3.0+2.0.0`
- Model contract: `evaluation.question-generation-model@2`
- Primary route: Model Studio `qwen3.8-flash`, `medium` reasoning
- Fallback route: TokenHub `hy3`
- Scope: Query-only content generation for three representative store types;
  no sampling, parsing, synthesis, report, production activation, or customer
  data.

The calls used the production Provider adapters and strict structured-output
contract. The existing preparation lifecycle was not recreated in the harness;
its persistence, idempotency, retry, and recovery behavior remains covered by
the isolated integration suite. Credentials and raw Provider envelopes were not
written to this review.

## Prompt iterations from observed behavior

| Prompt | Fixture and result | Finding | Changed action |
| --- | --- | --- | --- |
| 2.0.0 | Restaurant succeeded in 13.8 s | The model treated `高端潮汕私房菜` both as a selectable merchant and as `私房菜服务`; one question widened to generic restaurants | Separate the selected merchant or service-provider category from the concrete product or service need |
| 2.1.0 | Restaurant succeeded in 17.5 s | Merchant grammar improved, but two characteristic questions still widened `高端潮汕私房菜` to `潮汕菜餐厅` | Require every open question to preserve the flagship's core category and distinguishing positioning after natural rewriting |
| 2.2.0 | Restaurant attempt one timed out at 180.0 s; same-route attempt two succeeded in 10.6 s | The accepted retry preserved complete flagship meaning; the timeout demonstrates real Provider latency variance | Retain one bounded same-route retry rather than changing the business contract or adding unbounded retries |
| 2.2.0 | Enterprise service succeeded in 7.3 s | The model selected `互动派` but used the full legal name in the direct question and repeated detailed characteristics there | Make `queryTargetName` the actual displayed brand expression and keep the direct question broad; reserve characteristics for the two need scenarios |
| 2.3.0 | Restaurant, enterprise service, and consumer electronics primary calls succeeded; restaurant fallback succeeded | The final Prompt preserved natural brand names, location, flagship meaning, merchant or provider type, and complementary characteristic scenarios across the reviewed types | Accept Prompt 2.3.0 for Query Generator reconciliation |

## Accepted Qwen3.8 Flash outputs

### Restaurant store

Natural brand name: `头家顺`

1. 广州天河猎德的头家顺潮汕菜馆怎么样，主打的高端私房菜有什么特色，整体口碑如何？
2. 想在广州天河猎德找一家高端潮汕私房菜餐厅，有哪些值得了解和比较？
3. 广州天河猎德有哪些适合商务宴请、带有独立包间的高端潮汕菜餐厅？
4. 广州天河猎德附近有哪些注重食材新鲜、保留潮汕本味的高端私房菜馆？

Latency: 15.3 s. Returned model identity matched `qwen3.8-flash`.

### Enterprise-service store

Natural brand name: `互动派`

1. 广州互动派这家数字营销公司怎么样，主要提供哪些业务和服务，市场口碑如何？
2. 我们准备做抖音和小红书推广，广州天河路附近有哪些广告代理公司值得了解？
3. 想找同时具备抖音和小红书官方代理资质的公司，广州天河路附近有哪些选择？
4. 项目需要策划到投放的一站式服务和本地执行团队，广州天河路附近有哪些广告代理公司可以承接？

Latency: 14.6 s. Returned model identity matched `qwen3.8-flash`.

### Consumer-electronics store

Natural brand name: `小米之家`

1. 广州天河路天河城的小米之家门店怎么样，主要提供哪些产品和服务，整体体验如何？
2. 想在广州天河路买小米手机和智能家居产品，有哪些消费电子门店值得了解和比较？
3. 广州天河路附近有哪些可以到店体验、且能一站式选购手机与智能家居的消费电子门店？
4. 在广州天河路选购小米手机或智能家居，哪些门店能提供本地售后咨询？

Latency: 15.4 s. Returned model identity matched `qwen3.8-flash`.

## Accepted Hy3 fallback output

The fallback used the restaurant fixture and returned natural brand name
`头家顺`:

1. 广州天河猎德的头家顺怎么样，主打哪些菜，整体口碑如何？
2. 想在广州天河猎德找主打高端潮汕私房菜的潮汕菜餐厅，有哪些值得了解和比较？
3. 广州天河猎德有哪些适合商务宴请、带独立包间且提供高端潮汕私房菜的潮汕菜餐厅？
4. 广州天河猎德附近有哪些注重食材新鲜和潮汕本味、提供高端潮汕私房菜的潮汕菜餐厅？

Latency: 36.7 s. Returned model identity matched `hy3`. Its 5,230 total
tokens, including 3,671 reasoning tokens, reinforce its position as a bounded
fallback rather than the primary Query route.

## Decision and limitations

`Withdrawn pending real-chain revalidation.`

- The final outputs are natural enough for the first commercial version and
  preserve the confirmed four-role product meaning without a Critic, candidate
  set, template fallback, or naturalness scorer.
- One Qwen timeout is retained as observed operational evidence. One successful
  same-route retry and the Hy3 cross-provider result support the existing
  bounded recovery sequence; this small batch is not production latency or
  capacity evidence.
- The Prompt should change again only when new representative behavior exposes
  a stable semantic gap. Future iterations should improve task or input meaning
  and examples rather than append phrase-level prohibitions.
- The representative 4 x 5 evaluation remains a separate #39 Integration Gate.
