# Architecture Review

- Result: `ready`
- Reviewed boundary: platform persistence, Media Supply domain/repository/API,
  generated client, administrator Web workspace, migration, current contracts
- Authoritative decision: confirmed product-owner direction recorded in this
  Change and reconciled into ADR 0002 and the current Media Supply specification

## Map

- `MediaPlatform` owns one first-release price, enabled or disabled state, and
  optimistic-concurrency revision.
- `MediaResource` remains the owner of concrete publishing references and
  customer-example visibility.
- `MediaSupplySource` remains the owner of partner contact and internal source
  availability.
- Web depends on the generated REST contract and owner-local media components;
  it does not read Prisma or maintain a second lifecycle table.

## Findings

No material architecture findings remain. Removing the zero-or-one Listing
eliminates an unearned seam and its duplicated status, transition, endpoint, and
revision concepts. The platform interface is smaller while resource and source
boundaries remain independently meaningful.

The review also exposed and resolved a pre-existing partial-update defect:
creation defaults were being applied to omitted update fields. Create and update
validation are now separate for platforms, resources, and sources, so a focused
edit no longer clears unrelated facts.

## Integrity and rollback

Database checks require positive revisions and prices and require an active
platform to have a price. The migration preserves price and revision, maps only
the previously active and on-shelf combination to active, retains historical
audit JSON, and removes the Listing table only after backfill. The proposal
records the required reverse-backfill order if rollback is ever required after
durable activation.

## Residual risk

Production migration and data import were not authorized or executed. A future
requirement for multiple independently priced variants must revisit ADR 0002
instead of overloading the platform fields.
