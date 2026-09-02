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
- [x] Define Store Location, Official Region, Query Locality, flagship product/
      service, ordered characteristics, and their single owners.
- [x] Compare direct JS API versus a server BFF, free-form mutation versus a
      sealed verification receipt, Brand columns versus an owned Store Location
      value, and characteristic rows versus an ordered JSON collection.
- [x] Define Snapshot v3, fingerprint v3, strict v1/v2/v3 decoding, migration,
      unchanged Definition/Run opportunity continuity, rollback, and #26 seam.
- [x] Complete a pre-implementation architecture review of this proposal.

## Product, Architecture, and External Authorization Gate

- [ ] Product owner confirms or revises the 2-80 flagship bound, two-to-six
      characteristic count, 2-120 item bound, distinct/order-as-priority rule,
      and verified address locality fallback.
- [ ] Product owner confirms that migrated unchanged v1/v2 Definitions remain
      startable while a first semantic edit moves the current Brand to v3.
- [ ] Architecture owner accepts or revises the Brand-owned adapter, server-
      sealed receipt, one-to-one Store Location, ordered JSON, fingerprint scheme,
      central decoder, migration/rollback, and #26 dependency direction.
- [ ] Commercial/legal risk owner separately authorizes an Amap inquiry and
      obtains an applicable enterprise technical-service license plus written
      permission for the exact durable POI/address/coordinate/business-area use.
- [ ] Stop and revise the provider/persistence contract if storage/use permission
      is unavailable; do not request a Key, purchase, or call the API by inference.

## Conditional Controlled Contract Validation

- [ ] After separate authorization, inspect the actual account's Key type,
      service grants, quota/QPS, pricing, and outbound-IP allowlist without
      revealing credentials.
- [ ] Validate one approved non-customer ordinary district, municipality, and
      special no-county city across v5 text search, v5 ID detail, and v3 reverse
      geocoding; do not pressure/load test.
- [ ] Prove required response-type normalization, GCJ-02 handling, detail/regeo
      coherence, empty/multiple business areas, documented error mapping, and
      exact Amap-to-MCA adcode/towncode behavior; revise rather than guess.

## Conditional Implementation

- [ ] Add the Brand-owned Store Location port, fixture adapter, conditional Amap
      adapter/config, typed outcomes, deadlines, redaction, and operation metrics.
- [ ] Add authenticated search/verify endpoints and account/Brand-bound sealed
      receipts; prove altered, expired, replayed, and cross-account receipts fail.
- [ ] Add Store Location, flagship, characteristics, explicit fingerprint scheme,
      readiness, v3 canonical hash vectors, atomic Brand write, and response
      projections.
- [ ] Add `brand-evaluation-snapshot@3` plus one strict v1/v2/v3 decoder and
      separate historical/report and #26 Query projections without changing
      Query/Parser/Synthesis/report behavior in #40.
- [ ] Add exact migration preflight/backfill and prove v2 fingerprint retention,
      unchanged Definition/Run keys and snapshot JSON, existing Definition lookup
      before new readiness, stale transition after semantic edits, and rollback.
- [ ] Reuse one responsive form in registration and Brand management with
      address feedback, candidate/locality selection, two default characteristics,
      max-six add/remove/reorder, narrow-screen, keyboard, and failure behavior.
- [ ] Regenerate OpenAPI/client and add focused domain, adapter-contract, HTTP,
      migration, snapshot, API, component, and browser tests.

## Conditional Verification and Reconciliation

- [ ] Run focused static/domain/contract checks before any authorized external
      probe; then run typecheck, tests, build, OpenAPI generation, framework
      validation, migration rehearsal, `git diff --check`, and browser inspection.
- [ ] Prove no Key/raw response/provider URL enters browser assets, OpenAPI,
      generated client, logs, traces, snapshots beyond approved minimum fields,
      or fixtures.
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

- [ ] Commit this proposal revision on the #40 branch.
- [ ] Push the branch, open a Draft Partial PR with
      `Part of #40 — does not close`, and verify the remote head/base/check state.
- [ ] Update #40 with the Source Brief, architecture review, unresolved external
      authorization, exact decision request, Draft PR, and `Review / Decision`
      status.
- [ ] Stop at the product/architecture/external-authorization Gate; do not begin
      conditional validation or implementation.
