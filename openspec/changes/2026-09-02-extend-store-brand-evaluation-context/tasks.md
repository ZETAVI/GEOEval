# Tasks

## Explore, Align, and Propose

- [x] Read AGENTS, product vision/glossary, product-definition, process and
      design-knowledge rules, Brand/evaluation current specs, and architecture
      overview.
- [x] Verify live #39/#40 scope, owner, Project status, priority, parent and #26
      dependency; verify no existing #40 PR or branch owns this write.
- [x] Read the archived #27 proposal, design, delta, decision brief, migration,
      architecture review, current implementation evidence, and #26 handoff.
- [x] Inspect current Prisma Brand/Definition/Run schema, Brand domain/application/
      repository/API, generated client, registration/Brand Web fields, central
      snapshot decoder, deterministic Query seam, and live #26/PR #28 state.
- [x] Research current official Amap place search/detail, input tips, reverse
      geocoding, business areas, coordinates, JS selection, Key/security,
      quotas, error codes, commercial authorization, and storage restrictions.
- [x] Recheck current Amap JavaScript API 2.0 map, AutoComplete, PlaceSearch,
      Marker, map-click, geocoder, lifecycle, and security-proxy documentation
      after the product owner requested map-assisted selection.
- [x] Define Store Location, Official Region, Query Locality, flagship product/
      service, peer characteristics, and their single owners.
- [x] Compare hybrid JS map plus server verification versus a server-only list,
      free-form mutation versus a
      sealed verification receipt, Brand columns versus an owned Store Location
      value, and characteristic rows versus a peer JSON collection.
- [x] Define Snapshot/Fingerprint v3, explicit development-database reset,
      empty-database activation, rollback, and #26 seam.
- [x] Complete a pre-implementation architecture review of this proposal.

## Product, Architecture, and Risk Acceptance Gate

- [x] Product owner confirms the 2-80 flagship bound, two-to-six peer
      characteristic count, 2-120 item bound, exact-distinct rule, no priority/
      reorder semantics, map-assisted selection, and verified-address locality
      fallback that #26 may phrase naturally.
- [x] Product owner authorizes an implementation-stage reset of the explicitly
      named development database instead of v1/v2 data compatibility. This task
      does not execute that destructive action.
- [x] Architecture direction is confirmed for hybrid JS map plus Brand-owned
      server verification, sealed receipt, one-to-one Store Location, peer JSON
      collection, v3 fingerprint/snapshot, development reset, rollback, and #26
      dependency direction.
- [x] Product owner acknowledges the Amap platform-service boundary and states
      willingness to support paid API capacity if later required; no purchase or
      account action is authorized yet.
- [x] Commercial/legal risk owner reviews the provider-terms boundary, accepts
      the proposed minimum-field use, and directs #40 not to require a separate
      licensing/storage work order as an engineering Gate.
- [x] Keep Key creation, purchase, controlled calls, and production activation
      as separate action boundaries; risk acceptance does not authorize them.

## Account-specific Controlled Contract Validation

- [ ] After separate Key/call authorization, inspect the actual Web(JS API) and
      Web Service Key types, domain restrictions, JS security proxy, service
      grants, quota/QPS, pricing, and outbound-IP allowlist without revealing
      credentials.
- [ ] Validate one approved non-customer ordinary district, municipality, and
      special no-county city across v5 text search, v5 ID detail, and v3 reverse
      geocoding; do not pressure/load test.
- [ ] Prove required response-type normalization, GCJ-02 handling, detail/regeo
      coherence, empty/multiple business areas, documented error mapping, and
      exact Amap-to-MCA adcode/towncode behavior; revise rather than guess.

## Conditional Implementation

- [ ] Add an accessible Amap JS API 2.0 map picker with AutoComplete/PlaceSearch,
      a candidate list and Markers, minimum-input/debounce/result bounds, map
      lifecycle cleanup, domain-restricted JS Key, and server security-key proxy.
- [ ] Add the Brand-owned Store Location verification port, fixture adapter,
      conditional Web Service adapter/config, typed outcomes, deadlines,
      redaction, and operation metrics.
- [ ] Add an authenticated verify endpoint and account/Brand-bound sealed
      receipts; prove arbitrary coordinates, altered, expired, replayed, and
      cross-account receipts fail.
- [ ] Add Store Location, flagship, peer characteristics, v3 fingerprint,
      readiness, v3 canonical hash vectors, atomic Brand write, and response
      projections.
- [ ] Add the single `brand-evaluation-snapshot@3` contract and separate
      historical/report and #26 Query projections without changing Query/Parser/
      Synthesis/report behavior in #40.
- [ ] Recreate only the explicitly named development database from empty after a
      preflight proves the target is non-production; remove v1/v2 compatibility
      requirements and prove the reset cannot address a production database.
- [ ] Reuse one responsive form in registration and Brand management with
      map/Marker/address feedback, candidate/locality selection, two default
      peer characteristics, max-six add/remove, narrow-screen, keyboard, and
      failure behavior.
- [ ] Regenerate OpenAPI/client and add focused domain, adapter-contract, HTTP,
      migration, snapshot, API, component, and browser tests.

## Conditional Verification and Reconciliation

- [ ] Run focused static/domain/contract checks before any authorized external
      probe; then run typecheck, tests, build, OpenAPI generation, framework
      validation, development reset/rebuild rehearsal, `git diff --check`, and
      browser inspection.
- [ ] Prove the Web Service Key and JS security key never enter browser assets,
      OpenAPI, generated client, logs, traces, snapshots, or fixtures; the
      domain-restricted JS Key is the only intentionally browser-loaded key.
- [ ] Perform fixed-diff architecture, code, and verification reviews; resolve
      every must-fix/should-fix finding within #40.
- [ ] Reconcile accepted behavior into Brand Knowledge and evaluation-definition
      current specs, product/glossary/vision index-level owners, architecture
      overview, executable schemas/tests, and evolution-marker state.
- [ ] Hand the stable v3 Query projection to #26; do not edit its Prompt, Model
      Contract, Parser, Synthesis, or report from #40.
- [ ] Archive the Change only after implementation acceptance, current-truth
      reconciliation, final PR integration, Issue/Project closure, and workspace
      exit. Production migration/deployment and real Provider evaluation remain
      separate authorization gates.

## Current Task Exit

- [x] Commit this proposal revision on the #40 branch.
- [x] Push the branch, open a Draft Partial PR with
      `Part of #40 — does not close`, and verify the remote head/base/check state.
- [x] Update #40 with the Source Brief, architecture review, decision request,
      Draft PR, and then-current `Review / Decision` status.
- [x] Stop at the documents-only authorization boundary; do not begin account
      validation or implementation.

## 2026-09-02 Product Decision Revision

- [x] Reconcile the confirmed map, peer-characteristic, address-locality, and
      development-reset decisions across every active Change artifact.
- [x] Rerun architecture review and document verification for the revised Diff.
- [x] Commit and push the revision to Draft PR #46.
- [x] Update PR #46 and Issue #40 with the confirmed decisions, then stop without
      implementation.

## 2026-09-02 Commercial and Legal Risk Acceptance Revision

- [x] Reconcile the human risk-acceptance decision across the active proposal,
      Source Brief, design, decision brief, architecture review, and tasks.
- [x] Rerun the architecture review and document verification with the prior
      licensing/storage must-fix removed.
- [x] Commit and push the revision to Draft PR #46.
- [x] Update PR #46 and Issue #40 to show `ready with follow-up`, then stop before
      implementation, Key creation, purchase, controlled calls, or database reset.
