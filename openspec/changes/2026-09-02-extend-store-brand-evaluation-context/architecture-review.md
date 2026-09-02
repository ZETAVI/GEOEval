# Architecture Review: Proposed Store Brand Evaluation Context

- Review scope: Issue #40 proposal, Amap Source Brief, Brand Knowledge delta,
  design, decision brief, and tasks at the Propose revision.
- Current authority: `main@af72ba5`, current Brand/product/evaluation specs,
  current Prisma/Nest/Web/central-snapshot implementation, archived #27 design,
  and live #26/PR #28 dependency state.
- Review type: revised pre-implementation architectural gate after product-owner
  confirmation on 2026-09-02.
- Non-goals: implementation review, Query/Parser/Synthesis/report redesign,
  Amap account/Key/license action, live provider calls, production migration, or
  deployment.

## Review Contract

The design must let Brand own one trustworthy store-centered evaluation context
without making Amap or Query a second data owner. It must allow map-assisted
selection while keeping server verification authoritative, treat characteristics
as peers, activate one v3 contract through a development-only reset, keep
external calls outside the Brand transaction, prevent forged browser facts,
minimize credentials/provider data, and give #26 one frozen v3 projection.
Current truth remains unchanged until implementation.

## Affected Slice

- Brand Knowledge gains one owned Store Location value, flagship product/service,
  peer characteristics, v3 readiness/fingerprint, and evaluation projection.
- Web gains one Amap JavaScript API 2.0 map picker with a domain-restricted JS
  Key, server security-key proxy, candidate list, and POI Markers. Browser facts
  remain untrusted.
- A Brand-owned infrastructure adapter maps Amap place detail/reverse-geocoding
  into typed evidence; no other module imports it.
- Web uses generated GEOEval APIs and a server-sealed receipt; it never owns
  provider facts or credentials.
- GEO freezes only v3 after the development reset; #26 later consumes a narrow
  v3 Query projection. Parser, Synthesis, and report keep their current meaning.
- PostgreSQL owns current Brand/Store Location truth and immutable Definitions;
  no provider call occurs in a transaction and no search-session store is added.

## Findings

### Must-fix: commercial authorization and durable provider-data use are not established

- **Affected artifact:** Source Brief `Decision Constraints` and design
  `Operational and Verification Boundary`.
- **Boundary:** external authorization, legal use, data ownership, and recovery.
- **Consequence:** the proposed product must persist POI identity, address,
  coordinate, and business-area facts in Brand and v3 snapshots, while the
  current official Amap agreement both requires prior technical-service licensing
  for corporate commercial use and prohibits direct storage/cache absent
  separately evaluated cooperation. Implementing or calling the adapter without
  written permission could make the central data contract unauthorized and force
  a destructive provider/persistence redesign after customer data exists.
- **Narrow remediation:** before implementation or any controlled call, obtain
  the applicable enterprise/commercial license and a written work-order/license
  answer permitting the exact minimum durable fields and later snapshot use. If
  permission is denied or narrower, revise #40 before code.
- **Origin:** introduced by #40's required external place persistence, not
  pre-existing Brand debt.

### Should-fix before adapter activation: JS/Web Service account and special-city contracts need controlled evidence

- **Affected artifact:** Source Brief `Unknowns and Validation`; design `Verify`.
- **Boundary:** provider interface correctness and official-region integrity.
- **Consequence:** official documentation does not prove the actual GEOEval
  JS/Web Service account entitlement/QPS, domain/security-proxy configuration,
  POI-ID lifecycle, latency, or exact Amap `towncode` compatibility with the
  checked MCA township identities used by special cities. Assuming those facts
  could make the map unavailable, reject valid stores, accept a wrong terminal,
  or make retry/capacity behavior misleading.
- **Narrow remediation:** after the must-fix authorization and separate call
  approval, run the named bounded fixtures, inspect actual console grants, and
  block unsupported special-city readiness rather than guessing.
- **Origin:** external uncertainty exposed by #40.

## Supported Boundaries

- **Cohesion:** Store Location stays inside Brand Knowledge with readiness,
  fingerprint, and projection. The adapter owns only protocol mapping. There is
  no generic map service or shared provider registry.
- **Dependency direction:** Web -> Amap JS API is limited to transient map/
  selection; Web -> Brand -> Web Service adapter remains the authoritative write
  path, and GEO -> Brand projection remains explicit. Query never reaches
  through to Brand/Amap, and provider results never flow directly from browser
  mutation to persistence.
- **Interface depth:** map/select/verify/commit separates visual confidence from
  business authority and hides security keys, Web Service credentials, response
  quirks, region checks, receipt integrity, and atomicity. Arbitrary coordinates
  and raw-field mutations are rejected for concrete integrity consequences.
- **Data integrity:** one Store Location value, bounded peer JSON collection,
  external-call-free transaction, explicit coordinate system, locality kind,
  order-independent fingerprint, and no raw responses keep ownership reviewable.
- **Development data:** an exact non-production preflight plus empty-database
  rebuild removes v1/v2 migration complexity. The destructive path is explicitly
  unavailable once production/customer data exists.
- **Failure/recovery:** transient provider failure leaves drafts or an existing
  verified location intact; provider drift, region mismatch, missing business
  areas, quota/auth faults, and database rollback have distinct owners/actions.
- **Simplicity:** one JS map component, one server verification port, one
  one-to-one value, one sealed receipt, and one peer array are justified by real
  interaction/external/trust boundaries. No workflow engine, search database,
  Redis cache, reusable map platform, multi-store model, generic catalog, or
  speculative second provider is introduced.
- **Design knowledge:** all candidate decisions remain in this active Change.
  Current specs/glossary/architecture are intentionally not edited before
  approval; reconciliation targets are explicit.

## Residual Risks

- Provider facts can differ from reality; customer confirmation and server
  coherence checks reduce but cannot eliminate this. Product copy must not imply
  absolute geospatial accuracy.
- Provider POI identity stability is undocumented. The Brand-owned semantic fact
  identity prevents provider refresh alone from changing a fingerprint, but a
  deleted/replaced POI may require explicit reselection.
- The two-to-six, character bounds, peer semantics, map-assisted selection,
  address-locality fallback, and development reset are confirmed product
  decisions.
- #40 alone does not improve questions. Production activation of the revised
  evaluation path remains gated on #26's v3 consumer and #39 integration.

## Review Result

`not ready for implementation`.

The revised module/data/reset boundaries are coherent and the product and
architecture direction is confirmed, but external commercial/storage
authorization remains a must-fix prerequisite. The actual JS/Web Service account
configuration and special-city contract evidence are should-fix items before
adapter activation. No ADR is required; stable accepted behavior should later
reconcile into Brand Knowledge, the GEO snapshot seam, executable schemas/tests,
and architecture overview.

The Draft documentation PR may proceed as a Review / Decision artifact. It must
not be presented as implementation approval, provider entitlement, production
readiness, or #40 completion.
