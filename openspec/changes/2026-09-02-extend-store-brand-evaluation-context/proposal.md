# Change: Extend Store Brand Evaluation Context

- Status: Product, architecture, commercial/legal risk, and external API design
  direction confirmed on 2026-09-02; ready for explicit implementation
  authorization, while live activation still requires account follow-up
- Class: Architectural
- Owning Issue: [#40](https://github.com/ZETAVI/GEOEval/issues/40)
- Parent outcome: [#39](https://github.com/ZETAVI/GEOEval/issues/39)
- Downstream consumer: [#26 Query Generator](https://github.com/ZETAVI/GEOEval/issues/26)
- Decision owners: Product owner and architecture owner; the commercial/legal
  risk owner has reviewed and accepted the provider-terms boundary
- Authorization: research, proposal documents, and separately approved Amap
  application/Key preparation only; no implementation, API purchase, live call,
  production change, production data migration, Query change, or deployment

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
- a peer collection of two to six customer characteristics, with two fields
  shown by default and accessible add/remove behavior but no priority ordering;
- one version-3 semantic fingerprint and one
  `brand-evaluation-snapshot@3` projection that GEO Intelligence freezes and
  #26 consumes without accessing Brand persistence or Amap.

The checked environments contain development data only. #40 activation uses an
explicit development-database reset and a single v3 contract rather than
building runtime v1/v2 data compatibility. No production or customer database
may use that reset path.

## Scope

- Current official Amap place search, POI detail, reverse geocoding, business-
  area, coordinate, Key, quota, error, security, and account guidance research;
  provider terms are retained as context rather than an engineering Gate.
- Non-secret account-contract preparation: observed JS/Web Service Key types,
  pending identity entitlement, published zero unverified quota/QPS, exact
  endpoint/parameter mapping, and post-certification validation plan.
- A conditional Amap JavaScript API 2.0 map/search interaction, a separate
  server-side Store Location verification adapter, server-sealed receipt, typed
  provider outcomes, and customer-actionable failure fallback.
- Brand-owned current store-location value, structured address, source
  identity/provenance, chosen Query locality, `flagshipProductOrService`, and
  peer `characteristics` collection.
- Web/API mutation and response boundaries that never accept client-provided
  coordinates, address components, provider IDs, or business areas as facts.
- Brand readiness, `brand-evaluation-input@3` fingerprint, evaluation-purpose
  projection, and the single `brand-evaluation-snapshot@3` contract.
- Explicit development-database reset, empty-database activation, rollback, and
  isolated verification planning without a production migration path.
- An explicit #40 -> #26 integration/release gate so Query uses only the final
  frozen locality, flagship product/service, and peer characteristics.

## Non-goals

- Query Prompt, Query lifecycle, Query Model Contract, question wording,
  Parser, Synthesis, evaluation metrics, report, publication, or Provider
  execution changes.
- A generic map platform, reusable geospatial framework, customer location
  history, several stores per Brand, bulk POI database, live place refresh,
  route planning, navigation, distance scoring, or monitoring.
- Direct browser use of a Web Service Key or JS security key, browser-trusted
  place facts, arbitrary map-click persistence, raw Amap response storage, or
  Agent-invented location.
- Automatic choice of a business area from provider ranking; a missing business
  area is represented honestly by a verified address locality fallback.
- Additional Amap credentials, account-type changes, license/traffic purchase,
  work-order submission, controlled call, production migration, or production
  deployment without their separate authorization.
- Executing the approved development reset, changing current product truth, or
  implementing behavior in this documentation revision.

## Confirmed Product Boundary from #39/#40 and 2026-09-02 Review

- Every first-stage target Brand has one concrete store and complete location is
  evaluation-relevant.
- The customer-facing field name is `主打产品或服务`.
- Characteristics are peers rather than priorities, show two inputs by default,
  and may be extended to six. Presentation order is not business meaning and
  does not participate in the fingerprint. Query still produces the existing
  two characteristic question roles rather than one question per characteristic.
- The first Web interaction includes an Amap map, POI search, accessible result
  list, and selectable candidate Markers. A free map click may reposition the
  search but cannot become a Store Location without selecting and verifying a
  concrete POI.
- Amap may provide address and position facts only. Agent output cannot create
  an address or business area.
- If Amap provides no business area, Brand freezes an honest verified
  `ADDRESS_LOCALITY`; #26 may phrase it naturally but cannot call it or invent a
  business area.
- Because all current data is development-only, implementation may explicitly
  recreate the development database and activate only Snapshot/Fingerprint v3;
  no v1/v2 runtime compatibility or opportunity migration is required.
- The commercial/legal risk owner has reviewed the applicable platform-service
  boundary and accepts the proposed minimum-field use without requiring a
  separate licensing work order in #40. Paid API capacity may be supported if
  account evidence later shows it is needed; purchase remains a separate action.
- The approved `GEOEval` application now has separate JS and Web Service Key
  types. The identity review remains pending, so the published account tier has
  zero quota/QPS and no live call is attempted. Recharge is deferred until a
  certified account's actual quota proves insufficient.

## Confirmed Decisions

1. Use internal field `flagshipProductOrService`, normalized to 2-80
   characters. It remains distinct from industry `otherProductOrService` and
   the broader maintained `recommendationSubject`.
2. Replace the two current characteristic columns with one peer normalized
   collection. Evaluation readiness requires 2-6 non-empty, pairwise-distinct
   values; each is 2-120 characters. Presentation order is excluded from both
   meaning and fingerprint.
3. Use Amap JavaScript API 2.0 for a responsive map, autocomplete/search,
   accessible candidate list, and selectable POI Markers. Use a separate
   Web(JS API) Key plus server security-key proxy; never expose the Web Service
   Key or accept arbitrary map coordinates as a Store Location.
4. The server independently verifies the selected POI through Web Service v5 ID
   detail plus v3 reverse geocoding,
   reconciles the result with the Brand-owned official region, and issues a
   short-lived, account/Brand-bound sealed receipt. Brand commits only fields
   covered by that receipt and the customer's choice from its bounded locality
   candidates.
5. Prefer a customer-selected Amap business-area candidate. If none exists,
   freeze a precise verified `ADDRESS_LOCALITY` label and never display or
   describe it as a business area. #26 may turn that fact into a natural
   location phrase without changing its meaning.
6. Keep one Brand-owned current `StoreLocation` value with an internal semantic
   fact identity. Provider display refresh for the same selected POI does not
   change the fingerprint; selecting another POI or another final Query
   locality does.
7. Before v3 activation, recreate the project-named development database from
   empty and remove v1/v2/legacy runtime compatibility from the new path. Do
   not write a migration workflow for data that has never reached production.
8. Treat the current official API documentation plus later controlled account
   evidence as the technical contract. The commercial/legal risk owner accepts
   the proposed minimum-field persistence boundary; #40 does not require a
   separate licensing inquiry. Continue to minimize fields, never store raw
   responses, and stop live activation if the actual account cannot expose the
   required services or security configuration.

## Impact

- **Brand Knowledge:** owns the current Store Location, official-region
  coherence, flagship product/service, peer characteristics, readiness, the v3
  fingerprint, and the only evaluation-purpose projection.
- **Store Location adapter:** is Brand infrastructure. It owns external
  protocol mapping, timeout/error normalization, minimum-field requests, and
  credential redaction, but not readiness, customer choice, fingerprint, or
  Query meaning.
- **GEO Intelligence:** owns immutable v3 Definition snapshots. It receives one
  complete Brand projection and never reads Brand or provider persistence. #26
  owns the later Query consumer.
- **Web/API:** reuse registration and Brand editing. The browser sees safe
  Amap map and untrusted candidate markers, then submits a selected POI for
  server verification and an opaque receipt plus one locality choice; it never
  submits authoritative provider fields.
- **Data:** add Store Location and v3 field persistence on a recreated empty
  development database. Characteristics become one peer collection; no v1/v2
  data conversion or runtime compatibility owner remains.
- **Operations/security:** add a domain-restricted Web(JS API) Key, server-side
  JS security-key proxy, separate server-only Web Service Key with outbound-IP
  allowlist, response minimization, secret redaction, quota/error metrics, and a
  controlled account-contract check. No external call occurs in a Brand database
  transaction.
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
- Base: `main@d6d490d215389ce6fb1d687eda72ffa21703a0b7`
- Workspace: the current isolated #40 Codex worktree; recover its path from live
  workspace state rather than preserving a machine-local location
- Writer: the #40 task owner; #26 remains a separate single writer for Query
- Current phase: API contract preparation complete; ready for explicit
  implementation authorization, while live-adapter validation waits for
  identity approval and actual account entitlement
- PR relationship: documentation-only Partial PR using
  `Part of #40 — does not close`
- Exit for this task: Draft PR and Issue #40 updated with the non-secret Amap
  account/API contract evidence, then stop before implementation and live calls

## Approval Boundary

The product, architecture, and commercial/legal risk decisions above were
confirmed with the recorded revisions on 2026-09-02. The risk owner explicitly
accepts proceeding from current official API documentation without a separate
licensing/storage inquiry. That decision removes the previous external legal
must-fix. A later explicit action authorized creation of the application and two
scoped Key types only; it does not authorize code implementation, a
development-data reset, API purchase, controlled call, production data,
production deployment, Query/Parser/Synthesis/report changes, or Provider
evaluation calls.

Implementation still requires an explicit implementation instruction.
Additional credential changes, API purchase, controlled calls, the destructive
development reset, Provider calls, and production activation retain their own
later authorization boundaries.
