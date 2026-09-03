# Architecture Review: Proposed Store Brand Evaluation Context

- Review scope: Issue #40 proposal, Amap Source Brief, Brand Knowledge delta,
  design, decision brief, tasks, and the current fixed implementation diff.
- Current authority: `main@f1b5ef4`, current Brand/product/evaluation specs,
  current Prisma/Nest/Web/central-snapshot implementation, archived #27 design,
  and live #26/PR #28 dependency state.
- Review type: pre-implementation architectural gate plus the fixed-diff
  implementation review recorded below.
- Non-goals: Query/Parser/Synthesis/report redesign, further Amap account/Key
  mutation, purchase, shared-development reset, production migration, or
  deployment.

## Review Contract

The design must let Brand own one trustworthy store-centered evaluation context
without making Amap or Query a second data owner. It must allow map-assisted
selection while keeping server verification authoritative, treat characteristics
as peers, activate one v3 contract through a development-only reset, keep
external calls outside the Brand transaction, prevent forged browser facts,
derive one maintained official-region identity from the verified place rather
than a second customer input, avoid browser/device location permission, minimize
credentials/provider data, and give #26 one frozen v3 projection. Accepted
implemented truth is reconciled into the current specs and executable owners;
the remaining activation detail stays in this active Change.

## Affected Slice

- Brand Knowledge gains one owned Store Location value, flagship product/service,
  derived MCA official region, peer characteristics, v3 readiness/fingerprint,
  and evaluation projection. Separate customer-writable region fields disappear
  after the authorized development reset.
- Web gains one Amap JavaScript API 2.0 map picker with a domain-restricted JS
  Key, server security-key proxy, nationwide candidate list, and POI Markers.
  It does not load Geolocation or ask for current position. Browser facts remain
  untrusted.
- A Brand-owned infrastructure adapter maps Amap place detail/reverse-geocoding
  into typed evidence; no other module imports it.
- Web uses generated GEOEval APIs and a server-sealed receipt; it never owns
  provider facts or credentials.
- GEO freezes only v3 after the development reset; #26 later consumes a narrow
  v3 Query projection. Parser, Synthesis, and report keep their current meaning.
- PostgreSQL owns current Brand/Store Location truth and immutable Definitions;
  no provider call occurs in a transaction and no search-session store is added.

## Findings

### Resolved product decision: Store Location is the only region source

- **Affected artifact:** design `Derived Official Region`, public Brand mutation,
  shared Web form, v3 fingerprint/snapshot, and Brand delta.
- **Boundary:** one owner for administrative identity and Store Location.
- **Decision and consequence:** the product owner removed the separate three-
  level region selection on 2026-09-03. The server derives one exact MCA path
  from verified POI detail/reverse-geocode evidence and stores it inside the
  owned Store Location. Replacing/removing the location atomically replaces/
  removes the derived region, so contradictory inputs and silent region-driven
  deletion are no longer reachable.
- **Origin:** user-confirmed simplification resolving the prior #40 ambiguity.

### Resolved follow-up: endpoint and special-city success contracts

- **Affected artifact:** Source Brief `Controlled Web Service Contract Evidence`;
  design `Verify` and `Choose Query Locality`.
- **Boundary:** provider interface correctness and official-region integrity.
- **Evidence and changed action:** twelve serial public-place calls established
  current success outcomes, `string | []` response variation, detail/reverse
  adcode agreement, present/absent detail business area, three extended reverse
  business-area candidates, and exact Dongguan towncode-to-MCA mapping. The
  adapter contract now uses `extensions=all`, normalizes optional scalar
  components, discards unrelated extended fields, and fails closed on
  unsupported terminal shapes.
- **Origin:** external uncertainty exposed and resolved within #40.

### Should-fix before production activation: browser security and failure contracts remain unobserved

- **Affected artifact:** design `Operational and Verification Boundary`; tasks
  `Conditional Verification and Reconciliation`.
- **Boundary:** credential containment, customer failure behavior, and release
  operability.
- **Consequence:** the Web Service success path is now evidenced, but the JS
  map/security proxy, nationwide full-address search, proof that no location
  permission is requested, approved-domain restriction, fixed-egress allowlist,
  timeout/error mapping, and zero-combined-business-area fallback have not run
  through implementation. Activating production without them could expose a
  credential, misclassify an operator fault as a customer retry, request an
  unintended permission, or offer no honest locality fallback.
- **Narrow remediation:** implement the existing fixture-first port and proxy,
  prove named failure/zero-locality cases without further real calls by default,
  then validate the browser path and release restrictions in their approved
  environments before production activation.
- **Origin:** external and release uncertainty exposed by #40; it does not block
  fixture-first runtime implementation.

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
  provider-to-MCA derived region, order-independent fingerprint, and no raw
  responses keep ownership reviewable. There is no second region write path.
- **Implementation locality:** the current Brand domain/service/repository and
  one Brand-local verification service absorb the change. The provider port has
  one resolve method; Amap protocol, config, and receipt details are not exported
  and no generic location module is introduced.
- **Receipt and minimization:** a signed exact-target-Brand receipt prevents
  cross-account/Brand mutation, a server-generated target ID prevents duplicate
  create from the same receipt, and only the final customer locality—not the
  candidate set—becomes durable.
- **Development data:** an exact non-production preflight plus empty-database
  rebuild removes v1/v2 migration complexity. The destructive path is explicitly
  unavailable once production/customer data exists.
- **Failure/recovery:** transient provider failure leaves drafts or an existing
  verified location intact; provider drift, unmappable region, missing business
  areas, quota/auth faults, and database rollback have distinct owners/actions.
- **Simplicity:** one JS map component, one server verification port, one
  one-to-one value, one sealed receipt, and one peer array are justified by real
  interaction/external/trust boundaries. No workflow engine, search database,
  Redis cache, reusable map platform, multi-store model, generic catalog, or
  speculative second provider is introduced.
- **Delivery ordering:** #40 remains the single writer for the v3 producer and
  central snapshot contract. The current merge-conflicted PR #28 overlaps those
  files, so it rebases and adapts only after #40 stabilizes the projection; #40
  does not absorb Query Prompt, Model Contract, or execution behavior.
- **Design knowledge:** candidate and remaining activation detail stay in this
  active Change, while accepted implemented behavior is reconciled into current
  specs, glossary/product language, executable contracts, and architecture.

## Residual Risks

- Provider facts can differ from reality; customer confirmation and server
  coherence checks reduce but cannot eliminate this. Product copy must not imply
  absolute geospatial accuracy.
- Provider POI identity stability is undocumented. The Brand-owned semantic fact
  identity prevents provider refresh alone from changing a fingerprint, but a
  deleted/replaced POI may require explicit reselection.
- The official provider-terms context remains recorded, but the human
  commercial/legal risk owner reviewed and accepted it on 2026-09-02. It is no
  longer an architecture must-fix or implementation prerequisite.
- The two-to-six, character bounds, peer semantics, map-assisted selection,
  address-locality fallback, and development reset are confirmed product
  decisions.
- #40 alone does not improve questions. Production activation of the revised
  evaluation path remains gated on #26's v3 consumer and #39 integration.

## Pre-implementation Review Result

`ready with follow-up`.

The deepened module, port, receipt, persistence-minimization, configuration, and
verification-package boundaries are coherent. The single-source Store Location/
derived-region decision closes the prior product/data-integrity finding. The
previous external license/storage must-fix is closed by explicit human risk
acceptance, and the endpoint/special-city follow-up is closed by controlled
evidence. JS map/security-proxy behavior without Geolocation, nationwide search,
named failure/zero-locality behavior, and production credential/license controls
remain follow-ups. No ADR is required; stable accepted behavior should later
reconcile into Brand Knowledge, the GEO snapshot seam, executable schemas/tests,
and architecture overview.

The Draft documentation PR may proceed as a Ready design artifact, and the
architecture is ready for explicit fixture-first runtime implementation
authorization. It must not be presented as runtime implementation, production
readiness, or #40 completion.

## 2026-09-03 Fixed-diff Implementation Review

### Review contract and affected slice

This review covers the fixture-first runtime diff against this Change design:
Brand domain/application/persistence, the Store Location Provider port and Amap
adapter, sealed verification receipt, authenticated HTTP contract, v3 central
snapshot/Query seam, generated client, shared Web form/map child, and the Next
security proxy. Query Prompt/Model Contract, evaluation Provider behavior,
production deployment, purchase, and the shared development reset remain out of
scope.

### Resolved findings

1. **must-fix — replay and lost-update integrity (introduced).** Keeping only
   the current `verificationId` meant a replacement could erase evidence that an
   older still-valid receipt had been consumed, while concurrent mutations could
   both read one old location and overwrite each other. The implementation now
   stores the receipt issue time, rejects non-newer receipts, locks the owned
   Brand row inside the aggregate transaction, verifies the expected current
   `verificationId`, and maps uniqueness/concurrency failures to explicit
   application outcomes. Sequential-old, same-receipt, concurrent-create, and
   concurrent-update cases are executable integration tests.
2. **must-fix — security-proxy capability breadth (introduced).** A generic
   pass-through `/_AMapService/[...path]` would have attached the server security
   code to arbitrary Amap REST paths. The Route Handler now accepts only GET,
   bounds path/URL shape, ignores browser-supplied `jscode`, and allowlists only
   the input-tips and text-place paths used by the approved first interaction.
3. **should-fix — obsolete second region contract (pre-existing, exposed).** The
   first implementation left public region-option routes and Brand selection
   helpers beside Store Location derivation. They are removed; the maintained
   offline region tree remains an internal derivation source only. Current specs,
   product language, and architecture now point to the single Store Location
   owner.
4. **must-fix — reverse-geocode landmark replaced the exact POI address
   (introduced).** Credentialed Chrome verification showed that reverse
   `formatted_address` can name a nearby plaza or containing resort even when
   v5 POI detail supplies the exact selected-store street address. The adapter
   now preserves normalized POI detail address and uses reverse formatted text
   only as a missing-detail fallback. A focused test failed on the former
   behavior and passes after repair; the repeated real flow persisted the
   Hunter Lane restaurant address and Sanya `海棠北路100号`.

### Current result and residual evidence

`ready with follow-up` for the fixture-first local implementation. Dependency
direction remains Web → generated HTTP contract → Brand application → narrow
Provider port/reference derivation → Brand aggregate transaction; GEO consumes
only the immutable v3 projection. No generic map/provider registry, search
session database, Redis cache, raw provider persistence, or Query-to-Brand
reach-through was added.

The real JS map, accessible candidate list, bounded security proxy, selected-POI
server verification, sealed-receipt commit, business-area choice, and real
address-locality fallback are desktop Chrome-proven with credentials held only
in process memory. Ten bounded multi-store search/detail/reverse chains across
eight cities also passed. Narrow-screen Chrome emulation, production domain/IP
allowlists, technical-service activation, shared-development reset, #26
adaptation, merge, and release remain explicit follow-ups; this review does not
claim them.
