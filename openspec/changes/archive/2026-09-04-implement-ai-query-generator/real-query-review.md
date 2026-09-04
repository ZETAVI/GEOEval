# Real Query Review
<!-- Reopened on 2026-09-04 after the real-chain location acceptance failed. -->

> **Historical correction:** the first review called the real Query Provider
> but bypassed Brand and Amap and manually set `天河路`. Those outputs remain
> iteration history only. The final acceptance below combines the verified
> browser location lineage, one final complete browser replay, and real calls
> over the same three frozen Query projections.

## Review contract

- Date: 2026-09-04
- Final Prompt: `evaluation.question-generation.profile@2.4.0+2.1.0`
- Final model contract: `evaluation.question-generation-model@4`
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
| 2.3.0 | Restaurant, enterprise service, and consumer electronics primary calls succeeded; restaurant fallback succeeded | The Prompt improved semantics, but the enterprise locality came from an unverified manual fixture | Withdraw acceptance and replay the real Brand/Amap path |
| 2.4.0 | The real path for Interaction Pie, a law firm, and a restaurant removed the false locality and exposed two remaining wording gaps | Some characteristic questions weakened the flagship demand; one question lacked a complete interrogative intent | Clarify the shared location-plus-flagship demand line and align JSON Schema field descriptions |
| 2.4.0 + model contract 3 | Three parallel Qwen calls and one Hy3 fallback call succeeded over the verified frozen projections; a complete browser run exposed occasional use of the full legal company name | Every open question retained location and flagship meaning, but natural target-name selection was not yet stable | Strengthen the local target-name field description without adding a program rejection rule |
| 2.4.0 + model contract 4 | A final Interaction Pie Qwen call kept the same question semantics and selected `互动派` | The compact model contract now aligns target-name guidance with the approved ordinary-user behavior | Accept the final Prompt and model contract for reconciliation |

## Historical Prompt 2.3 outputs

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

## Historical Prompt 2.3 Hy3 fallback output

The fallback used the restaurant fixture and returned natural brand name
`头家顺`:

1. 广州天河猎德的头家顺怎么样，主打哪些菜，整体口碑如何？
2. 想在广州天河猎德找主打高端潮汕私房菜的潮汕菜餐厅，有哪些值得了解和比较？
3. 广州天河猎德有哪些适合商务宴请、带独立包间且提供高端潮汕私房菜的潮汕菜餐厅？
4. 广州天河猎德附近有哪些注重食材新鲜和潮汕本味、提供高端潮汕私房菜的潮汕菜餐厅？

Latency: 36.7 s. Returned model identity matched `hy3`. Its 5,230 total
tokens, including 3,671 reasoning tokens, reinforce its position as a bounded
fallback rather than the primary Query route.

## Final accepted evidence

### Complete browser replay: Interaction Pie

The final browser path selected the real Amap POI, stored `猎德社区`, froze
Prompt `2.4.0+2.1.0` and model contract `@3`, completed the durable preparation
on the first Qwen attempt in 14.6 seconds, and displayed all four questions.
The output retained location and flagship meaning but selected the full legal
company name, which motivated the final target-name description change.

Contract `@4` changed only that local JSON Schema description. A real Qwen call
over the same frozen Query projection succeeded in 14.6 seconds, selected
`互动派`, and returned:

1. 广州天河猎德社区的互动派这家公司怎么样，主要提供哪些服务，整体口碑如何？
2. 想找能做抖音和小红书广告代理的营销策划公司，广州天河猎德社区附近有哪些值得比较？
3. 需要抖音和小红书的官方广告代理资质，广州天河猎德社区有哪些营销策划或广告代理公司符合要求？
4. 希望从策划到投放由一家公司一站式搞定，广州天河猎德社区有哪些能做抖音和小红书广告代理的服务商？

### Final Qwen3.8 Flash projection replay

The same verified Query projections were replayed in parallel through the real
Provider adapter and final frozen task:

- Interaction Pie: 10.1 seconds, one successful attempt.
- 广东星宇律师事务所: 15.4 seconds, one successful attempt. Its open questions
  retained 企业法律顾问与民商事诉讼服务 while using 专业分工、团队协作、诉讼仲裁
  and 公司法律业务 as distinct selection conditions.
- Gram&Gram·酸种披萨: 16.6 seconds, one successful attempt. Its three open
  questions retained 酸种披萨, while the characteristic questions separately
  used 自然发酵 and 手工现烤.

### Final Hy3 fallback replay

The Gram&Gram projection succeeded through TokenHub Hy3 in 49.4 seconds. All
three open questions retained 酸种披萨 and the two characteristic questions
remained distinct. The call used 6,039 total tokens, including 4,442 reasoning
tokens, so Hy3 remains a bounded third-attempt fallback rather than the primary
route.

## Decision and limitations

`Accepted for Query Generator reconciliation.`

- The final outputs are natural enough for the first commercial version and
  preserve the confirmed four-role product meaning without a Critic, candidate
  set, template fallback, naturalness scorer, or phrase blacklist.
- Real Amap and browser evidence proves the location lineage. The product needs
  a useful nearby-area label, not exact ranking among adjacent business areas.
- Earlier timeout evidence plus the final Qwen and Hy3 results support the
  existing bounded route order; this batch is not production latency or
  capacity evidence.
- Change the Prompt again only when representative real behavior exposes a
  repeatable semantic gap. Improve task or input meaning rather than append
  symptom-level prohibitions.
- The representative 4 x 5 evaluation remains a separate #39 Integration Gate.
