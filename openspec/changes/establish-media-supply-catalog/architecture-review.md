# Architecture Review: Proposed Media Supply Catalog Foundation

- Review scope: #33 proposal, Media Supply delta specification, design, and
  tasks at the initial Propose revision
- Current authority: `main@3f8d815`, current product definition and glossary,
  existing Nest/Prisma/Identity/Notification module contracts, and confirmed
  product decisions in #12/#33
- Review type: pre-implementation architecture gate

## Review contract

Media Supply must own a truthful platform-priced catalog without restoring the
historical Endpoint/Offer/CatalogItem hierarchy or moving paid snapshots and
publication results into the catalog. Administrator maintenance must not leak
internal cost/source/contact data. Platform buyability must follow the approved
Listing decision rather than a resource-count heuristic. A future stored
resource reference must remain optional for fulfilment completion.

The Change may add one role-specific Identity guard and one database migration.
It may not add customer/admin visual pages, Commerce/Delivery implementations,
SSE, async infrastructure, full data import, or production activation.

## Affected slice

- Media Supply becomes one module owning platform, category membership,
  zero-or-one Listing, optional resource, current source, catalog revision, and
  administrator audit.
- Identity remains the owner of account roles and supplies a small reusable
  administrator guard.
- Customer HTTP queries receive explicit safe projections. Administrator HTTP
  queries receive separate internal projections.
- Future Commerce receives a synchronous platform quote; future Delivery
  receives a possibly empty candidate list. Neither caller exists in #33 and
  neither may read Media Supply tables.
- PostgreSQL owns durable facts and transactional revisions. No Redis, Outbox,
  SSE, cache, or external Logo-fetch path is introduced.

## Review findings

### No must-fix findings

The proposed module has one coherent business owner and a smaller public
surface than its internal normalized model. Splitting Platform from Listing is
earned by different identity and sales lifecycles but remains an internal
one-to-one detail; the design does not recreate a generic CatalogItem or Offer
layer.

Listing-only buyability is explicit and testable. The design does not silently
derive a sale decision from incomplete resource data, and it preserves the
administrator's responsibility to pause an actually unfulfillable platform.
The empty-candidate case is a normal result instead of an integrity failure.

Customer and administrator DTOs are intentionally separate, the role guard is
owned by Identity, and audit/revision/entity writes share one transaction. The
global catalog revision and per-Listing commercial revision have different
callers and failure consequences, so keeping both is justified rather than
duplicative.

The proposal names the current product-definition and glossary conflict and has
an explicit reconciliation task. The active Change is the correct temporary
owner; current truth is not edited before implementation approval.

### Product-owner resolutions after review

- Procurement cost is uniformly RMB fen in the first release. No currency field
  or conversion behavior is required.
- A future successful publication requires a recorded accessible URL. It does
  not require a catalog-resource match or automated URL-to-platform identity
  validation. Media Supply remains outside completion ownership.

## Review result

`ready for implementation`.

There are no must-fix or should-fix findings in the proposed #33 boundary. No
ADR is required. The following evidence remains mandatory during implementation:

1. database constraints and transactions prove Listing-only buyability,
   positive on-shelf price, singleton catalog revision, atomic audit/revision,
   and restrict deletion;
2. role-matrix and response-contract tests prove administrator authorization
   and customer field allowlisting;
3. concurrent commercial updates prove expected Listing revision behavior;
4. catalog tests prove category de-duplication, empty candidate lists,
   hidden/full/masked examples, fifty-item cap, and public/internal revision
   separation;
5. accepted behavior is reconciled into owner-local Media Supply current truth,
   product-definition links/scenarios, glossary, and architecture overview
   before the Change can close.

Implementation, migration execution beyond isolated development verification,
PR merge, production data, and deployment remain separate gates.
