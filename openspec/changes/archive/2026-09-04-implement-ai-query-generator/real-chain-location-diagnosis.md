# Diagnosis: Query Review Used an Unverified Locality

## Symptom

The accepted Interaction Pie questions repeatedly used `广州天河路`, although
the company is in Tianhe District and the reviewed source did not place it in
the Tianhe Road business area.

## Proven root cause

The Query-only validation harness bypassed Brand creation, Store Location
verification, Amap place detail/reverse geocoding, receipt persistence, and
Snapshot v3 construction. Its enterprise fixture directly assigned:

```text
cityLabel = 广州市
terminalRegionLabel = 天河区
locality = BUSINESS_AREA / 天河路
```

The same unverified locality was then copied into the runtime Prompt reference
example, the contract fixture, and the Query review. The model correctly used
the supplied location; it did not invent it.

## Hypotheses tested

1. **Manual fixture supplied the locality — confirmed.** The ignored validation
   harness constructs the Query context directly and imports no Brand/Amap
   service.
2. **Amap returned the wrong business area — rejected for this run.** No Amap
   search, place-detail, or reverse-geocode request occurred before the Query
   call.
3. **The Query model hallucinated Tianhe Road — rejected.** `天河路` was already
   present in the structured user context and Prompt example.
4. **The source brief established Tianhe Road — rejected.** It establishes only
   Guangdong / Guangzhou / Tianhe District.

## Affected acceptance boundary

- The Query module shape, preparation lifecycle, model schema, retries, and
  Provider adapters are not disproved.
- The enterprise example, location fidelity, and the claim that the reviewed
  outputs represented the real customer path are disproved.
- Because the erroneous enterprise pair also exists in the runtime reference
  examples, correction must precede final Query acceptance.

## Correct feedback loop

For each representative Brand:

1. use the browser location picker to search and select the real Amap POI;
2. let the Backend fetch place detail and reverse-geocode evidence;
3. inspect the displayed place name, formatted address, official region, and
   automatically derived Query locality before save;
4. save the Brand and let the normal diagnosis endpoint create Snapshot v3 and
   durable Query preparation;
5. run the real Worker and review the four questions shown in Web;
6. retain the exact location lineage, Query output, latency, retries, and any
   mismatch without substituting a manual locality.

The first set is Interaction Pie, 广东星宇律师事务所, and
Gram&Gram·酸种披萨. An ambiguous or missing POI blocks that Brand's acceptance;
the test does not guess another place.

## Verified outcome

The browser path selected and saved one unambiguous Amap POI for each Brand:

| Brand | Selected address | Stored Query locality | Customer-facing use |
| --- | --- | --- | --- |
| 互动派科技股份有限公司 | 广州市天河区天盈广场西塔 15 楼 | 猎德社区 | Questions naturally shorten this to 广州天河猎德 |
| 广东星宇律师事务所 | 佛山市南海区南海大道北 51 号财汇大厦 | 桂城 | Questions use 佛山南海桂城 |
| Gram&Gram·酸种披萨 | 广州市越秀区惠吉东 29 号 | 东风 | Questions use 广州越秀东风 |

The product owner confirmed that Query locality is an understandable nearby
area, not a precise GIS classification. Adjacent labels such as 六榕、东风 and
西门口 are acceptable for the same small area; only a materially displaced or
misleading location requires correction. The temporary nearest-business-area
follow-up was therefore closed without implementation.

No real-chain run produced `天河路`. The runtime reference example and Query
contract fixture now use the verified Interaction Pie locality rather than the
manual placeholder. The final browser replay froze Prompt
`2.4.0+2.1.0` and model contract
`evaluation.question-generation-model@3`, then accepted four questions from
Qwen3.8 Flash on the first attempt in 14.6 seconds. That run exposed occasional
use of the full legal company name; the final contract `@4` changed only the
local target-name description and passed a real Qwen replay over the same
frozen Query projection in 14.6 seconds. Brand, Amap, Snapshot, lifecycle, and
Web boundaries were unchanged, so their browser evidence remains applicable.
