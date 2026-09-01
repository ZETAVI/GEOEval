# Tasks

## Explore, align, and propose

- [x] Confirm #12 is closed with the platform-level pricing, optional resource,
      administrator ownership, customer projection, revision, and non-blocking
      fulfilment decisions recorded.
- [x] Create #33 with architectural scope, assignee, Project status, priority,
      accepted outcome, non-goals, and observable acceptance boundaries.
- [x] Refresh `origin/main`, activate #33, and create its isolated Issue branch
      and Worktree from the exact current main revision.
- [x] Read current product, glossary, architecture, workflow, persistence,
      Identity, Notification revision, and module-boundary sources.
- [x] Define the Media Supply owner, normalized records, listing-only
      buyability, customer/admin projections, revisions, quote seam, optional
      candidate seam, migration, failure, and reconciliation boundaries.
- [x] Keep #34 as the only owner of the independent forty-platform and Logo
      research output; do not make its completion a #33 implementation gate.
- [x] Complete pre-implementation architecture review of this exact proposal,
      delta, and design; resolve every must-fix and should-fix finding.
- [ ] Obtain explicit product-owner approval of the concrete persistence,
      authorization, revision, API, migration, and reconciliation design.

## Persistence and domain implementation

- [ ] Add the Media Supply enums and normalized Prisma models for platform,
      category membership, listing, resource, source, catalog state, and audit.
- [ ] Add an additive migration with the catalog-state singleton, positive-price
      and on-shelf constraints, restrict foreign keys, uniqueness, indexes, and
      no legacy data rewrite.
- [ ] Add owner-local domain parsing and invariants for classification, states,
      first-publish/repost, hidden/full/masked, masked alias, quality tier,
      optional RMB-fen procurement cost, Listing revision, and deletion safety.
- [ ] Add repository ports and PostgreSQL adapters whose accepted mutations
      atomically write business facts, audit, commercial revision, and public
      catalog revision.
- [ ] Add focused repository tests for transaction rollback, concurrent Listing
      revision conflicts, empty-candidate buyability, source/resource filtering,
      and restrict deletion.

## Authorization and application contracts

- [ ] Add the smallest Identity-owned role guard over the existing authenticated
      one-role account and prove `ADMINISTRATOR` maintenance allow/deny behavior.
- [ ] Add administrator platform, category, Listing, resource, source, and audit
      commands/queries without exposing Prisma records as public DTOs.
- [ ] Add authenticated customer categories, paginated platform list, platform
      detail, and lightweight revision/conditional-query endpoints.
- [ ] Add explicit customer projection tests proving hidden/internal fields,
      source/contact/cost/case/notes, quality tier, and audit never leak.
- [ ] Add internal platform-quote and optional fulfilment-candidate application
      queries; do not create Commerce/Delivery adapters or direct table access.
- [ ] Regenerate OpenAPI/client contracts and remove any handwritten duplicate
      introduced during implementation.

## Migration and verification

- [ ] Apply the migration through the project command on an isolated clean
      database and record schema, singleton, constraint, rollback, and retained-
      data evidence.
- [ ] Verify category de-duplication; Draft/on-shelf/paused/off-shelf lifecycle;
      price and expected-revision conflicts; public revision changes; and
      internal-only edits that must not refresh the customer catalog.
- [ ] Verify full, masked, and hidden projections; fifty-example cap; quality
      ordering without public tier; no-resource on-shelf platform; and inactive-
      source candidate filtering.
- [ ] Verify administrator, terminal-customer, operations, and agent role matrix,
      audit before/after evidence, failed-transaction atomicity, and deletion
      restrictions.
- [ ] Run OpenAPI generation, typecheck, focused and full tests, build, project-
      framework validation, migration checks, formatting, and diff checks.
- [ ] Run fixed-diff architecture, code, and verification reviews and resolve
      every must-fix finding before requesting merge review.

## Reconcile and exit

- [ ] Move accepted Media Supply behavior to
      `openspec/specs/media-supply/spec.md` and replace the product-definition
      detail with an index-level link under its evolution marker.
- [ ] Update current product-definition operations/result scenarios and glossary
      terms so a stored resource is optional and the publication result owns
      completion.
- [ ] Update architecture overview with the proven Media Supply owner,
      PostgreSQL boundary, Identity role guard, and future Commerce/Delivery
      dependency direction.
- [ ] Review every touched evolution marker and remove competing active
      explanations before archiving this Change.
- [ ] Open a pull request that identifies `Closes #33`, implementation scope,
      migration and verification evidence, residual risks, skipped production
      checks, and separate #34 status.
- [ ] After explicit merge approval and Required Checks, verify merged `main`,
      archive the Change, move #33 to Done, and record branch/Worktree exit.
