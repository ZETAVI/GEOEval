# Change: Extend Store Brand Evaluation Context

- Status: Proposed; product, architecture, and external-authorization gates
  remain
- Class: Architectural
- Owning Issue: [#40](https://github.com/ZETAVI/GEOEval/issues/40)
- Parent outcome: [#39](https://github.com/ZETAVI/GEOEval/issues/39)
- Downstream consumer: [#26 Query Generator](https://github.com/ZETAVI/GEOEval/issues/26)
- Decision owners: Product owner, architecture owner, and commercial/legal risk
  owner for the external-location license
- Authorization: research and proposal documents only; no implementation,
  Amap Key/application/purchase, Provider call, production change, production
  data migration, Query change, or deployment

## Why

Current Brand Knowledge freezes a controlled industry subject, one official
province-city-terminal path, and exactly two characteristics. That proves broad
regional and category meaning but cannot identify the customer's real store,
its useful local recommendation area, or the concrete product or service that
should anchor discovery. #26 consequently generated a broad restaurant question
for the `头家顺` evidence and admitted unrelated categories into the evaluation.

All first-stage target brands are now confirmed to have one concrete store.
Brand Knowledge therefore needs a store-owned evaluation context before #26 can
finish its Prompt and Model Contract. Query must consume a frozen Brand
projection; it must not call Amap, read Brand tables, interpret provider data,
or invent a business area.

## Desired Outcome

One Brand can save a draft or become evaluation-ready with:

- one server-verified concrete storefront;
- the customer's search input, a structured display address, explicit GCJ-02
  coordinate, official region coherence, bounded business-area candidates, and
  one customer-confirmed Query locality;
- one required `主打产品或服务` value independent of industry classification;
- an ordered list of two to six customer characteristics, with two fields shown
  by default and accessible add/remove/reorder behavior;
- one version-3 semantic fingerprint and one
  `brand-evaluation-snapshot@3` projection that GEO Intelligence freezes and
  #26 consumes without accessing Brand persistence or Amap.

Historical legacy-v1 and structured-v2 snapshots, Definitions, Runs, attempts,
reports, and completed-evaluation meaning remain unchanged. Representation
migration alone creates no new Definition and releases no evaluation
opportunity.

## Scope

- Current official Amap place search, POI detail, reverse geocoding, business-
  area, coordinate, Key, quota, error, security, commercial authorization, and
  storage terms research.
- A conditional server-side Store Location adapter, explicit search and
  selection interaction, server-sealed verification receipt, typed provider
  outcomes, and customer-actionable failure fallback.
- Brand-owned current store-location value, structured address, source
  identity/provenance, chosen Query locality, `flagshipProductOrService`, and
  ordered `characteristics` collection.
- Web/API mutation and response boundaries that never accept client-provided
  coordinates, address components, provider IDs, or business areas as facts.
- Brand readiness, `brand-evaluation-input@3` fingerprint, evaluation-purpose
  projection, `brand-evaluation-snapshot@3`, and central v1/v2/v3 decoding.
- Migration classification, existing-Definition lookup continuity, stale-
  revision behavior after a real semantic edit, rollback, and isolated
  verification planning.
- An explicit #40 -> #26 integration/release gate so Query uses only the final
  frozen locality, flagship product/service, and ordered characteristics.

## Non-goals

- Query Prompt, Query lifecycle, Query Model Contract, question wording,
  Parser, Synthesis, evaluation metrics, report, publication, or Provider
  execution changes.
- A generic map platform, reusable geospatial framework, customer location
  history, several stores per Brand, bulk POI database, live place refresh,
  route planning, navigation, distance scoring, or monitoring.
- Direct browser use of a Web Service Key, a first-slice Amap JS map, browser-
  trusted place facts, raw Amap response storage, or Agent-invented location.
- Automatic choice of a business area from provider ranking; a missing business
  area is represented honestly by a verified address locality fallback.
- Amap account creation, Key request, enterprise verification, license purchase,
  work-order submission, controlled call, production migration, or production
  deployment without separate human authorization.
- Changing current product truth before the proposal is approved and later
  implemented.

## Confirmed Product Boundary from #39/#40

- Every first-stage target Brand has one concrete store and complete location is
  evaluation-relevant.
- The customer-facing field name is `主打产品或服务`.
- Characteristics retain customer order, show two inputs by default, and may be
  extended; Query still produces the existing two characteristic question
  roles rather than one question per characteristic.
- Amap may provide address and position facts only. Agent output cannot create
  an address or business area.
- Existing snapshots and history are immutable, and migration cannot
  manufacture an evaluation opportunity.

## Proposed Decisions Requiring Approval

1. Use internal field `flagshipProductOrService`, normalized to 2-80
   characters. It remains distinct from industry `otherProductOrService` and
   the broader maintained `recommendationSubject`.
2. Replace the two current characteristic columns with one ordered normalized
   collection. Evaluation readiness requires 2-6 non-empty, pairwise-distinct
   values; each is 2-120 characters. Order expresses customer priority and
   participates in the fingerprint.
3. Use an explicit server-side search action over Amap Web Service v5 rather
   than per-keystroke input tips or a JS map in the first slice. Return at most
   ten address-labelled candidates scoped to the current official region.
4. A server verifies the selected POI through ID detail plus reverse geocoding,
   reconciles the result with the Brand-owned official region, and issues a
   short-lived, account/Brand-bound sealed receipt. Brand commits only fields
   covered by that receipt and the customer's choice from its bounded locality
   candidates.
5. Prefer a customer-selected Amap business-area candidate. If none exists,
   freeze a precise verified `ADDRESS_LOCALITY` label and never display or
   describe it as a business area.
6. Keep one Brand-owned current `StoreLocation` value with an internal semantic
   fact identity. Provider display refresh for the same selected POI does not
   change the fingerprint; selecting another POI or another final Query
   locality does.
7. Existing Brands retain their exact v2 fingerprint across representation
   migration. They become incomplete for a new v3 Definition but any unchanged
   existing v1/v2 Definition remains discoverable and startable. The first
   evaluation-semantic edit moves the current Brand to v3 and follows ordinary
   stale-definition rules.
8. Do not implement, call, or persist Amap-derived facts until an applicable
   enterprise technical-service license and written storage/use permission
   cover this commercial design. If permission is unavailable, #40 must revise
   the provider or persistence contract rather than accepting legal risk.

## Impact

- **Brand Knowledge:** owns the current Store Location, official-region
  coherence, flagship product/service, ordered characteristics, readiness,
  fingerprint scheme transition, and the only evaluation-purpose projection.
- **Store Location adapter:** is Brand infrastructure. It owns external
  protocol mapping, timeout/error normalization, minimum-field requests, and
  credential redaction, but not readiness, customer choice, fingerprint, or
  Query meaning.
- **GEO Intelligence:** owns immutable Definition snapshots and central
  v1/v2/v3 decoding. It receives one complete Brand projection and never reads
  Brand or provider persistence. #26 owns the later Query consumer.
- **Web/API:** reuse registration and Brand editing. The browser sees safe
  candidate/verification projections and submits an opaque receipt plus one
  locality choice; it never submits authoritative provider fields.
- **Data:** add Store Location and v3 field persistence, migrate the two existing
  characteristics into one ordered collection, retain v1/v2 snapshot JSON and
  fingerprint keys, and introduce an explicit current fingerprint scheme.
- **Operations/security:** add a server-only Key, outbound-IP allowlist,
  response minimization, secret redaction, quota/error metrics, and a license
  evidence gate. No external call occurs in a Brand database transaction.
- **Delivery:** #40 is a Partial child of #39 and the upstream interface owner
  for #26. #39 cannot release the revised evaluation journey until both #40 and
  the rebased #26 consumer pass their own acceptance and the final integration
  gate.

## Documentation Impact

- `add`: this active proposal, source brief, delta, design, decision brief,
  architecture review, and tasks.
- `update after acceptance and implementation`: Brand Knowledge current spec,
  evaluation-definition seam, product-definition index, product vision field
  summary, glossary, and architecture overview.
- `generate after implementation`: OpenAPI and API client.
- `archive only at close`: this Change after implementation, reconciliation,
  final evidence, PR acceptance, and workspace exit.
- No current-truth document is changed in this proposal PR.

## Control State

- Branch: `codex/issue-40-store-brand-context`
- Base: `main@af72ba5f261925525b897c9124c28f5fb574c111`
- Workspace: the current isolated #40 Codex worktree; recover its path from live
  workspace state rather than preserving a machine-local location
- Writer: the #40 task owner; #26 remains a separate single writer for Query
- Current phase: Propose -> Review / Decision
- PR relationship: documentation-only Partial PR using
  `Part of #40 — does not close`
- Exit for this task: Draft PR and Issue #40 updated, then stop at the product,
  architecture, and external-authorization Gate

## Approval Boundary

The requested review may approve or revise the eight proposed decisions and the
module boundary. Approval does not authorize code implementation, an Amap
account/Key, license purchase, a work-order submission, a controlled call,
production data, production deployment, Query/Parser/Synthesis/report changes,
or Provider evaluation calls.

Implementation may begin only after product and architecture approval **and** a
separately authorized Amap licensing/storage inquiry resolves the must-fix
external-data boundary. Provider calls and production activation retain later
independent gates.
