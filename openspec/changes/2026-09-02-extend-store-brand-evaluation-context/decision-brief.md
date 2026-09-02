# Decision Brief: Store Brand Evaluation Context

## Outcome

Let Brand Knowledge own one verified Store Location, one required flagship
product/service, and an ordered extensible characteristic list, then freeze that
meaning in Snapshot v3 for #26. Do not let Amap, the browser, or Query become a
second Brand fact owner.

## Proposed Decisions

| Decision | Proposed choice | Main tradeoff | Owner |
| --- | --- | --- | --- |
| Store cardinality | One current concrete Store Location per first-stage Brand | Meets the confirmed target market without introducing branch/store management | Product owner |
| Flagship field | `flagshipProductOrService`, customer label `主打产品或服务`, 2-80 characters and required for v3 readiness | Adds a concrete recommendation anchor while remaining distinct from industry and a future product catalog | Product owner |
| Characteristics | Ordered array; two fields by default; 2-6 distinct items; 2-120 characters each; order is priority and affects fingerprint | Gives #26 more useful angles while bounding profile and Prompt size | Product owner |
| Initial place UX | Explicit server-backed region-scoped search, at most ten address-labelled candidates; no initial JS map/autocomplete | Smaller credential and trust surface; less visual than a map picker | Product and architecture owners |
| Verification | v5 POI detail plus v3 reverse geocode; server-sealed short-lived receipt; Brand commits only receipt-covered facts | Adds one verification round but prevents forged client position data and external calls inside a DB transaction | Architecture owner |
| Query locality | Customer selects a verified business-area candidate; if none exists, use an honestly labelled verified address locality | Avoids invented business areas while keeping every verified store usable | Product owner |
| Provider data | Amap is a conditional adapter; retain only minimum licensed facts and never raw responses | Keeps provider replaceable and data minimized; requires explicit commercial/storage permission | Architecture and commercial/legal risk owners |
| Fingerprint | v3 includes Brand-owned Store Location semantic identity, flagship value, and complete ordered characteristics; excludes provider representation/provenance | Correct evaluation meaning without creating opportunities from provider refresh | Product and architecture owners |
| History | Preserve all v1/v2 JSON and keys; migrated Brand stays on v2 until its first real semantic edit; existing unchanged Definition remains discoverable before v3 readiness | Adds an explicit scheme transition but preserves unstarted Definition and Run opportunity continuity | Product and architecture owners |
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

- The customer chooses the official region, searches for the store, reviews
  address feedback, selects one verified result, and chooses a business area
  when candidates exist.
- If no business area exists, the form shows a precise address locality without
  calling it a business area.
- Two characteristic inputs appear by default; the customer may add up to six
  and adjust their priority order.
- Provider failure never invents a location. The customer can save other Brand
  fields as a draft and return later; an existing verified location remains.
- Existing reports and old Definitions/Runs remain truthful and unchanged.

## Decision Request and Next Gate

Requested now:

- product-owner confirmation or revision of field names, limits, ordering,
  locality fallback, and v1/v2 opportunity behavior;
- architecture-owner confirmation or revision of the BFF, verification receipt,
  persistence, fingerprint, snapshot, migration, and #26 seam;
- separate authority to initiate an Amap commercial/storage licensing inquiry.

Not authorized by approval of this brief: implementation, account/Key work,
purchase, live Amap call, Query/Parser/Synthesis/report change, real evaluation
Provider call, production migration, deployment, or Issue/PR merge.
