# Decision Brief: Store Brand Evaluation Context

## Outcome

Let Brand Knowledge own one verified Store Location, one required flagship
product/service, and a bounded peer characteristic collection, then freeze that
meaning in Snapshot v3 for #26. Amap JS API may own the map interaction, but
Amap, the browser, and Query do not become Brand fact owners.

## Confirmed Decisions

Confirmed by the product owner on 2026-09-02 with the map, characteristic,
locality, and development-reset revisions below.

| Decision | Proposed choice | Main tradeoff | Owner |
| --- | --- | --- | --- |
| Store cardinality | One current concrete Store Location per first-stage Brand | Meets the confirmed target market without introducing branch/store management | Product owner |
| Flagship field | `flagshipProductOrService`, customer label `主打产品或服务`, 2-80 characters and required for v3 readiness | Adds a concrete recommendation anchor while remaining distinct from industry and a future product catalog | Product owner |
| Characteristics | Peer collection; two fields by default; 2-6 distinct items; 2-120 characters each; presentation order has no priority and does not affect fingerprint | Gives #26 more useful angles while avoiding an unintended ranking contract | Product owner |
| Initial place UX | Amap JS API 2.0 map, autocomplete/search, accessible result list, and selectable POI Markers; arbitrary map coordinates cannot be committed | Better selection confidence; requires a separate Web(JS API) Key and server security-key proxy | Product and architecture owners |
| Verification | v5 POI detail plus v3 reverse geocode; server-sealed short-lived receipt; Brand commits only receipt-covered facts | Adds one verification round but prevents forged client position data and external calls inside a DB transaction | Architecture owner |
| Query locality | Customer selects a verified business-area candidate; if none exists, freeze an honestly labelled verified address locality that #26 may phrase naturally | Avoids invented business areas while keeping every verified store usable | Product owner |
| Provider data | Amap is a conditional adapter; retain only minimum licensed facts and never raw responses | Keeps provider replaceable and data minimized; requires explicit commercial/storage permission | Architecture and commercial/legal risk owners |
| Fingerprint | v3 includes Brand-owned Store Location semantic identity, flagship value, and the normalized characteristic set; excludes characteristic presentation order and provider representation/provenance | Correct evaluation meaning without treating field order or provider refresh as a new opportunity | Product and architecture owners |
| Development data | Recreate the project-named development database from empty and activate a single v3 contract; do not carry v1/v2/legacy runtime compatibility into #40 | Removes migration complexity while the product has no production/customer data; reset must never run against production | Product and architecture owners |
| #26 boundary | #40 owns the producer/schema; #26 consumes only the frozen v3 Query projection and owns Prompt/Model Contract/real review | Preserves one writer and prevents Query from learning Brand/Amap internals | Product and architecture owners |

## Must-fix External Gate

The official Amap agreement requires prior technical-service licensing for
corporate commercial use and says POI, address, coordinate, and related service
data may not be directly stored or cached without separately evaluated
cooperation. Before implementation or any controlled call, obtain:

1. applicable enterprise/commercial technical-service authorization; and
2. written confirmation that GEOEval may persist and later use the minimum POI
   identity, structured address, GCJ-02 coordinate, adcode/towncode, and
   business-area fields in Brand and immutable evaluation snapshots.

If that permission is unavailable, revise #40's provider or persistence contract.
Do not approve implementation by treating an available Key or quota as storage
authorization.

## Customer-visible Behavior

- The customer chooses the official region, searches on an Amap map, reviews
  candidate Markers plus an accessible address list, selects one POI, and then
  chooses a business area when candidates exist.
- If no business area exists, the form shows a precise address locality without
  calling it a business area.
- Two characteristic inputs appear by default; the customer may add up to six.
  They are peers, with no priority or reorder behavior.
- Provider failure never invents a location. The customer can save other Brand
  fields as a draft and return later; an existing verified location remains.
- Before implementation activation, the explicitly named development database
  is recreated from empty. No old Definition/Run/report is carried forward.

## Next Gate

The product and architecture direction is confirmed. The remaining decision is
separate authority to initiate an Amap commercial/storage licensing inquiry and,
if required after the commercial terms are known, authorize a specific API
purchase. The product owner has stated willingness to support paid APIs but has
not authorized an account action or purchase in this review.

Not authorized by this confirmation: implementation, development-data reset,
account/Key work, purchase, live Amap call, Query/Parser/Synthesis/report change,
real evaluation Provider call, production migration, deployment, or Issue/PR
merge.
