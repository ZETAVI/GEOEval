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
| Provider data | Amap is a conditional runtime adapter; retain only the minimum verified facts and never raw responses | Keeps provider replaceable and data minimized; commercial/legal risk is accepted by its human owner | Architecture and commercial/legal risk owners |
| Fingerprint | v3 includes Brand-owned Store Location semantic identity, flagship value, and the normalized characteristic set; excludes characteristic presentation order and provider representation/provenance | Correct evaluation meaning without treating field order or provider refresh as a new opportunity | Product and architecture owners |
| Development data | Recreate the project-named development database from empty and activate a single v3 contract; do not carry v1/v2/legacy runtime compatibility into #40 | Removes migration complexity while the product has no production/customer data; reset must never run against production | Product and architecture owners |
| #26 boundary | #40 owns the producer/schema; #26 consumes only the frozen v3 Query projection and owns Prompt/Model Contract/real review | Preserves one writer and prevents Query from learning Brand/Amap internals | Product and architecture owners |

## Commercial and Legal Risk Disposition

The official agreement context remains recorded in the Source Brief. On
2026-09-02, the human commercial/legal risk owner stated that they had reviewed
the use and found no issue, and directed #40 not to gate engineering on a
separate licensing/storage inquiry. #40 therefore treats that risk as accepted
and no longer requires a work order or written permission as an implementation
prerequisite.

This disposition does not change the technical design: request and persist only
the minimum verified facts, never store raw responses, and use the actual
account's documented service grants, Key types, quotas, and security controls.

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

The design is ready for explicit implementation authorization. The application,
separate JS/Web Service Key types, enterprise certification, and test-scale
monthly quota are observed. A technical-service license is not active, the
production domain/IP restrictions are not verified, and no endpoint behavior
has been observed. Bounded controlled calls, production credential restrictions,
and any purchase remain technical/operational follow-ups with their own action
boundaries; they are not a remaining product decision.

#40 is the upstream v3 producer. PR #28 currently overlaps the Prisma schema,
evaluation service, snapshot parser, OpenAPI/client, and integration tests and
is merge-conflicted. The delivery order is therefore #40 producer first, then a
#26 rebase/adaptation to the stable v3 Query projection.

Not authorized by this confirmation: implementation, development-data reset,
additional credential changes, purchase, live Amap call,
Query/Parser/Synthesis/report change, real evaluation Provider call, production
migration, deployment, or Issue/PR merge.
