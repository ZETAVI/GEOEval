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
| Initial place UX | Amap JS API 2.0 owns autocomplete, the `PlaceSearch` result panel, POI Markers, viewport fitting, and selection; GEOEval renders only the form shell and verified Brand summary | Keeps search interaction visually consistent with Amap while preserving a small business-authority boundary | Product and architecture owners |
| Verification | v5 POI detail plus v3 reverse geocode; server-sealed short-lived receipt; Brand commits only receipt-covered facts | Adds one verification round but prevents forged client position data and external calls inside a DB transaction | Architecture owner |
| Administrative region | Remove customer province/city/terminal selection; derive the maintained MCA path only from the verified Store Location | Eliminates two competing inputs; a place without an exact mapping remains a draft rather than accepting manual correction | Product and architecture owners |
| Device location | Do not load Geolocation or request browser/device/IP location by default | Avoids permission prompts and accidental proximity semantics; customers search by store name plus city/address/landmark text | Product owner |
| Query locality | Brand automatically uses the selected POI detail business area, then the first reverse-geocode business area; if none exists, freeze an honestly labelled verified address locality that #26 may phrase naturally | Removes a redundant customer choice while avoiding invented business areas | Product owner |
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

- The customer searches by a concrete store name plus city/address/landmark text
  through Amap autocomplete, reviews Amap's own full-address panel and Markers,
  and selects one POI entirely through that component.
- The form has no separate province/city/terminal controls and does not request
  device-location permission. The server displays the official region derived
  from the verified POI for confirmation rather than manual editing.
- Brand automatically derives the Query locality from the verified POI. If no
  business area exists, the form shows a precise address locality without
  calling it a business area; the customer does not make a second locality
  choice.
- Two characteristic inputs appear by default; the customer may add up to six.
  They are peers, with no priority or reorder behavior.
- Provider failure never invents a location. The customer can save other Brand
  fields as a draft and return later; an existing verified location remains.
- Before implementation activation, the explicitly named development database
  is recreated from empty. No old Definition/Run/report is carried forward.

## Next Gate

The application, separate JS/Web Service Key types, enterprise certification,
test-scale monthly quota, and bounded Web Service success shapes are observed.
The single-source Store Location/derived-region decision removed the last
product ambiguity, and the owner explicitly authorized fixture-first runtime
implementation on 2026-09-03. A technical-service license is not active, and
production domain/IP restrictions are later Amap release controls rather than a
current development gate. Those controls and any purchase remain operational
boundaries rather than product decisions.

#40 is the upstream v3 producer. PR #28 currently overlaps the Prisma schema,
evaluation service, snapshot parser, OpenAPI/client, and integration tests and
is merge-conflicted. The delivery order is therefore #40 producer first, then a
#26 rebase/adaptation to the stable v3 Query projection.

Not authorized by this confirmation: runtime implementation, development-data
reset, additional credential changes, purchase, further live Amap calls beyond
a separately justified bounded validation,
Query/Parser/Synthesis/report change, real evaluation Provider call, production
migration, deployment, or Issue/PR merge.
