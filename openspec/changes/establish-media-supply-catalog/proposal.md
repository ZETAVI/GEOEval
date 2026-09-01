# Change: Establish Media Supply Catalog

- Status: Approved for implementation
- Class: Architectural implementation
- Owning Issue: [#33](https://github.com/ZETAVI/GEOEval/issues/33)
- Predecessor research: [#12](https://github.com/ZETAVI/GEOEval/issues/12)
- Parallel data research: [#34](https://github.com/ZETAVI/GEOEval/issues/34)
- Decision owners: Product owner and architecture owner
- Product-owner approval: 2026-09-01
- Authorization: deterministic implementation and pull-request preparation;
  no production data, deployment, or merge

## Why

The accepted product foundation describes an administrator-maintained media
library, but `main@3f8d815` has no Media Supply module, persistence, protected
maintenance API, customer-safe catalog query, sales revision, or audit trail.
The broad product definition also still treats a media-library entry as both
the customer-priced destination and a required fulfilment reference. The
confirmed product decisions in #12 refine that meaning:

- the customer selects and pays for a media platform, not a concrete account;
- concrete resources are optional customer examples and non-blocking operations
  references;
- operations may publish through an unlisted account, and a recorded accessible
  publication URL—not a catalog match or automated platform-recognition rule—
  completes future fulfilment;
- the platform listing is the administrator's sale decision and is not derived
  from whether the current database contains a candidate resource.

Without one owner for these facts, later administrator, customer, commerce, and
delivery work would either duplicate catalog logic or reach directly into
shared tables.

## Desired outcome

Create one deep Media Supply module that owns platform identity, fixed customer
classification, platform-level listing and point price, optional concrete
resources, current internal supply source, customer-safe projections, catalog
revision, and administrator audit. An administrator can maintain the catalog
through protected APIs, and an authenticated customer can query truthful
on-shelf platforms without seeing procurement or contact data.

The module exposes narrow quote and fulfilment-candidate application contracts
for future callers. Publishing Commerce owns paid snapshots and point
deduction. Publication Delivery owns actual media selection and successful
publication results. Neither caller reads Media Supply tables.

## Scope

- Add an owner-local `media-supply` Nest module with domain types, application
  services, repository ports, PostgreSQL adapters, and generated HTTP contracts.
- Add normalized persistence for platform, platform-category membership,
  zero-or-one platform listing, concrete resource, current supply source,
  catalog state, and module-local administrator audit.
- Add protected administrator commands and queries for platform, listing,
  resource, and source maintenance.
- Add authenticated customer-safe category, platform, detail, and catalog-
  revision queries.
- Add platform-level whole-point pricing, explicit listing lifecycle, per-
  listing commercial revision, and one global public-catalog revision.
- Add fixed multi-select customer categories, domestic/overseas scope,
  first-publish/repost resource mode, hidden/full/masked projection, and
  administrator-only three-level quality assessment.
- Add an Identity-owned administrator-role guard as the first reusable role-
  specific HTTP authorization seam; do not introduce a general policy engine.
- Define and test internal platform-quote and non-blocking fulfilment-candidate
  queries without creating Commerce or Delivery adapters before those callers
  exist.
- Reconcile accepted media-library behavior into an owner-local current
  specification and update affected product language when the implementation
  is accepted.

## Non-goals

- Administrator or customer visual pages.
- Publishing Commerce, point deduction, paid-order persistence, Publication
  Delivery, result upload, or order state machines.
- A requirement that actual fulfilment use a stored `MediaResource`.
- Media packages, package pricing, supplier accounts or login, a supplier role,
  Endpoint/Offer/CatalogItem layers, structured guarantees, SLA, or terms
  versioning.
- Full Excel import, automatic matching, the first forty production platforms,
  or automatic Logo publication; #34 owns the separate review dataset.
- Media-specific SSE, Redis fan-out, a message bus, CQRS framework, microservice,
  cache service, or generic catalog engine.
- Video or other publication formats beyond article publication.
- Production deployment, production data migration, or commercial-readiness
  claims.

## Impact

- **Media Supply:** becomes the only owner of live platform identity, sales
  listing, resource reference, internal source, public catalog projection,
  revision, and administrator audit.
- **Identity:** gains a small role guard over the existing one-role account
  fact; account and session ownership do not move.
- **Customer API:** gains a public-safe authenticated media-catalog surface.
- **Publishing Commerce:** later consumes only a platform quote containing the
  current platform identity, point price, buyability, and listing revision; its
  paid snapshot remains outside this Change.
- **Publication Delivery:** later consumes optional candidate resources and may
  complete a result with a null catalog-resource reference; its lifecycle
  remains outside this Change.
- **Data:** one additive migration creates new tables and a singleton catalog-
  state row. There is no legacy media data to transform.
- **Documentation:** accepted Media Supply scenarios move from the broad product
  definition to an owner-local current spec during reconciliation; the glossary
  and remaining cross-domain scenarios are updated in place rather than copied.

## Confirmed boundary

1. `MediaPlatform` is the customer selection and pricing unit.
2. `MediaPlatformListing` is a zero-or-one sales configuration owned inside
   Media Supply, not a separate Catalog/Offer domain.
3. An on-shelf active platform with a positive point price is buyable even when
   no concrete resource is stored. Resource/source state affects recommendations,
   not the administrator's platform sale decision.
4. `MediaResource` is an optional concrete account or resource reference with
   one current `SupplySource`. Procurement cost is optional administrator data
   and cannot block a listing.
5. Customer examples are capped by the query, are never selectable or priced,
   and use `HIDDEN`, `FULL`, or administrator-supplied `MASKED` presentation.
6. Operations may use an unlisted account. Future `mediaResourceId` is nullable,
   and a recorded accessible publication URL/result owns completion; the system
   does not infer or block on URL-to-platform identity.
7. PostgreSQL is the single source of durable media truth. Catalog polling is a
   disposable freshness mechanism and never replaces payment-time quote checks.

## Documentation impact

- `add`: this proposal, Media Supply delta, architecture design, review, and
  task plan.
- `move`: on acceptance, move the activated truthful-media-library behavior
  from `openspec/specs/product-definition/spec.md` to
  `openspec/specs/media-supply/spec.md`, leaving an index-level link.
- `update`: revise the product-definition operations/result scenarios and
  `docs/product/glossary.md` so a stored resource is optional and a valid
  publication result remains the completion fact.
- `update`: record the Media Supply boundary and dependency direction in
  `docs/architecture/overview.md` after implementation proves the module seam.
- `none`: no ADR is proposed. The owner-local spec, code, schema, constraints,
  and tests can make the accepted boundary discoverable without a separate
  cross-change rationale record.

## Control state

- Workspace: current isolated Codex worktree for #33; recover its location from
  live workspace state rather than a machine-local path
- Branch: `codex/issue-33-media-supply-foundation`
- Base: `main@3f8d815486755082f6334f4adac9480d982155d1`
- Writer: the current primary Codex agent; #34 owns only its independent data
  research output
- Merge destination: protected `main` through a later pull request
- Current phase: Implement
- Exit: verified implementation and current-truth reconciliation are delivered
  through a pull request; merge remains a separate product-owner decision

## Approval boundary

The product owner approved the persistence, authorization, revision, API,
migration, reconciliation, RMB procurement-cost, and URL-only fulfilment-
completion boundaries on 2026-09-01. This authorizes deterministic
implementation and verification. It does not authorize production data,
deployment, external publication activity, or pull-request merge.
