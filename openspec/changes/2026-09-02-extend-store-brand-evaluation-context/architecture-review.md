# Architecture Review: Proposed Store Brand Evaluation Context

- Review scope: Issue #40 proposal, Amap Source Brief, Brand Knowledge delta,
  design, decision brief, and tasks at the Propose revision.
- Current authority: `main@d6d490d`, current Brand/product/evaluation specs,
  current Prisma/Nest/Web/central-snapshot implementation, archived #27 design,
  and live #26/PR #28 dependency state.
- Review type: revised pre-implementation architectural gate after enterprise
  account evidence, controlled Web Service contract validation, and
  implementation-package planning on 2026-09-03.
- Non-goals: implementation review, Query/Parser/Synthesis/report redesign,
  further Amap account/Key mutation, purchase, runtime implementation,
  production migration, or deployment.

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
  map/security proxy, approved-domain restriction, fixed-egress allowlist,
  timeout/error mapping, and zero-combined-business-area fallback have not run
  through implementation. Activating production without them could expose a
  credential, misclassify an operator fault as a customer retry, or offer no
  honest locality fallback.
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
- **Delivery ordering:** #40 remains the single writer for the v3 producer and
  central snapshot contract. The current merge-conflicted PR #28 overlaps those
  files, so it rebases and adapts only after #40 stabilizes the projection; #40
  does not absorb Query Prompt, Model Contract, or execution behavior.
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
- The official provider-terms context remains recorded, but the human
  commercial/legal risk owner reviewed and accepted it on 2026-09-02. It is no
  longer an architecture must-fix or implementation prerequisite.
- The two-to-six, character bounds, peer semantics, map-assisted selection,
  address-locality fallback, and development reset are confirmed product
  decisions.
- #40 alone does not improve questions. Production activation of the revised
  evaluation path remains gated on #26's v3 consumer and #39 integration.

## Review Result

`ready with follow-up`.

The revised module/data/reset boundaries are coherent, and the product,
architecture, commercial/legal risk, endpoint success, and special-city
direction is confirmed. The previous external license/storage must-fix is closed
by explicit human risk acceptance, and the previous endpoint/special-city
follow-up is closed by the controlled evidence. JS/browser security, named
failure/zero-locality behavior, and production credential/license controls
remain follow-ups before production activation. No ADR is required; stable
accepted behavior should later reconcile into Brand Knowledge, the GEO snapshot
seam, executable schemas/tests, and architecture overview.

The Draft documentation PR may proceed as a Ready design artifact, and the
architecture is ready for explicit fixture-first runtime implementation
authorization. It must not be presented as runtime implementation, production
readiness, or #40 completion.
