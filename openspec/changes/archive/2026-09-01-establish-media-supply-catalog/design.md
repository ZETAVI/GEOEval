# Design: Media Supply Catalog Foundation

## Design position

Media Supply is one module with several normalized records, not a collection of
independent platform, supplier, catalog, and fulfilment services. It owns live
media facts and the decision to offer a platform for sale. It does not own the
customer's paid agreement or the actual publication result.

The deletion test justifies the module: without it, administrator APIs,
customer catalog pages, Publishing Commerce, and Publication Delivery would all
need to understand pricing state, public projection, source validity, and
resource privacy. The module hides that complexity behind four narrow semantic
surfaces while retaining one PostgreSQL source of truth.

The first implementation follows the existing Nest module -> application
service -> repository port -> PostgreSQL adapter direction. Prisma types stay
inside infrastructure. HTTP DTOs and future internal caller views are explicit
projections rather than exported database records.

## Module Architecture Card: Media Supply catalog foundation

### Outcome and Boundary

- **Owner and observable outcome:** Media Supply lets an administrator maintain
  truthful platform listings and lets an authenticated customer query an
  on-shelf, platform-priced, privacy-safe catalog.
- **In:** platform identity and classification, platform listing and point
  price, optional resources, one current internal source, public projection,
  global catalog revision, commercial revision, and administrator audit.
- **Out:** packages, point balances, payment, order snapshots, actual-media
  selection, result upload, fulfilment completion, customer visual composition,
  Logo-file ingestion, supplier accounts, and production data import.
- **Upstream prerequisites and downstream consumers:** Identity supplies the
  authenticated account and one-role fact. Future Commerce consumes a quote;
  future Delivery consumes optional candidates. #34 supplies reviewed data only
  after a separate administrator/import decision.

### Lifecycle and Data

- **States and allowed transitions:** platform is `ACTIVE` or `ARCHIVED`;
  listing moves `DRAFT -> ON_SHELF`, `ON_SHELF <-> PAUSED`, and any listing
  state to `OFF_SHELF`, with an explicit administrator action to return an
  off-shelf listing on shelf. It does not return to Draft after first sale.
  Resource is `ACTIVE`, `PAUSED`, or `ARCHIVED`; source is `ACTIVE` or
  `INACTIVE`.
- **Authoritative records and invariants:** the platform is the customer unit;
  one platform has zero or one listing, many category memberships, and many
  optional resources. Each resource belongs to one platform and one current
  source. Listing state and positive point price decide buyability; resource
  state never silently overrides it.
- **Transaction, concurrency, and history boundary:** every accepted
  administrator command writes its entity changes and audit row in one Prisma
  transaction. Quote-visible listing changes advance the listing revision.
  Customer-visible changes advance the singleton catalog revision. A caller
  can provide an expected listing revision for commercial edits; mismatches are
  rejected instead of overwriting a concurrent price/status change.
- **Migration and rollback:** one additive migration creates empty owner-local
  tables and seeds the single catalog-state row. There is no legacy media data
  conversion. Before accepted production data exists, rollback can revert the
  module and migration in a controlled environment. After records are created,
  normal rollback disables the module while retaining tables and data; ordinary
  rollback never drops media or audit history.

### Contracts and Dependencies

- **Public commands, queries, and facts:** authenticated customer catalog and
  revision queries; administrator platform/listing/resource/source commands and
  audit queries; internal platform quote; internal optional candidate query.
- **Dependency direction:** HTTP -> Media Supply application -> repository
  ports -> Prisma adapter -> PostgreSQL. Media Supply depends on Identity's
  authenticated account and role guard. Commerce and Delivery later depend on
  Media Supply application contracts; there is no reverse dependency or direct
  table read.
- **External ports and failure boundary:** no external provider or runtime Logo
  fetch belongs to the backend. `logoUrl` is an administrator-approved public
  reference; the customer UI later owns placeholder behavior when it cannot
  load. Data research and file acquisition remain outside the runtime request.
- **Earned patterns or extension seams:** one module, explicit customer/admin/
  quote/candidate projections, one repository port, transactional audit, and
  durable revision rows. No factory, provider registry, event bus, generic
  catalog engine, read database, or resource-allocation strategy is earned.

### Failure and Recovery

| Failure | Classification | Retry or recovery owner | Idempotency or reconciliation evidence |
| --- | --- | --- | --- |
| Invalid category, state, visibility, mode, tier, URL, price, or masked alias | Business validation | Administrator corrects input | Strict DTO/domain parsing; transaction writes nothing |
| Non-administrator calls a maintenance endpoint | Authorization failure | Caller uses the correct role/account | Identity-owned role guard; repository spy/row-count test |
| Two administrators change the same listing revision | Business conflict | Second administrator reloads and reapplies | Conditional update on expected revision; one succeeds, one returns conflict |
| Business write succeeds but audit or revision write fails | Transaction failure | Administrator retries the whole command | One database transaction; no partial entity, audit, or revision row |
| Catalog-state singleton is missing | Permanent migration/deployment fault | Operator repairs or reapplies migration before readiness | Startup/repository assertion and migration fixture |
| A source becomes inactive | Expected operating change | Administrator selects another source or edits the resource | Candidate query excludes it; platform listing remains explicit |
| Every stored resource is unavailable | Expected operating state | Operations uses an unlisted account or administrator pauses listing | Listing-only buyability test and empty-candidate contract |
| Customer polls during or after an update | Eventual freshness | Client retains current view and checks again; payment still requotes | Monotonic catalog revision and conditional-query integration test |
| External Logo URL is unavailable or changes | Presentation degradation | Future Web shows a neutral placeholder; administrator replaces reference | No backend fetch or sale-state dependency |
| Delete targets a referenced object | Business conflict | Administrator archives, pauses, or deactivates it | Restrict foreign keys and focused deletion tests |
| Customer projection accidentally includes internal fields | Security defect | Block merge and correct mapper/DTO | Explicit projection allowlist and response contract tests |

### Tool and Framework Decision

| Candidate | Adopt, defer, or reject | Evidence and limitation | Exit or refresh trigger |
| --- | --- | --- | --- |
| Existing Nest module/application/repository structure | Adopt | Already owns Brand, Identity, Notification, and GEO boundaries; no new dependency | Revisit only if a proven module seam cannot be expressed |
| Prisma plus PostgreSQL constraints and transactions | Adopt | Existing application persistence and migration owner; supports restrict FKs and atomic audit/revision | Revisit only for measured query or migration limits |
| Identity-owned role guard over existing `AccountRole` | Adopt | First administrator mutation surface needs one stable authorization seam | Extend only when a real multi-role or permission policy is approved |
| Singleton PostgreSQL public-catalog revision | Adopt | Monotonic, cheap to query, and atomic with public changes | Revisit if independent regional catalogs or write contention is measured |
| Per-listing commercial revision | Adopt | Prevents stale payment quotes and concurrent commercial overwrite | Keep while platform-level pricing remains the commercial unit |
| Conditional HTTP query / ETag | Adopt | Gives future pages low-cost automatic convergence without push infrastructure | Add SSE only after measured polling load or a strict latency requirement |
| Existing notification SSE | Reject for this module | Account-scoped notification hint has a different owner and revision meaning | Revisit through a generic app refresh design only with a proven shared contract |
| Product Outbox, Redis/BullMQ, or new message bus | Defer | No first-release asynchronous media side effect or delivery guarantee | Add `media.catalog.changed` only when a real asynchronous consumer exists |
| CQRS framework or read database | Reject | Separate DTOs are sufficient; no measured read/write scaling boundary | Revisit after query load or independent deployment proves the need |
| Generic supplier, Offer, Endpoint, or CatalogItem system | Reject | Reintroduces lifecycles and relationships removed by confirmed product scope | Revisit only after a concrete simultaneous-source or resource-level sale case |
| Runtime Logo proxy/download service | Defer | Adds external fetch, storage, validation, and lifecycle risk outside #33 | Open a separate asset-lifecycle Issue when approved Logo ingestion is required |

### Operational and Verification Boundary

- **Security and sensitive data:** administrator endpoints require
  `ADMINISTRATOR`. Customer projections use explicit allowlists and never
  contain procurement cost, source identity/contact, case URL, internal notes,
  audit snapshots, or hidden resources. Sensitive internal values stay out of
  ordinary logs.
- **Backpressure, capacity, and cost:** customer and administrator platform
  queries are paginated; resource detail caps public examples at fifty. Indexes
  cover listing status, category membership, platform-resource filtering, and
  source/resource activity. No cache, queue, or external cost is introduced.
- **Metrics, logs, traces, and operator recovery:** accepted mutations log only
  action, actor, entity, and resulting revision metadata; before/after details
  remain in the protected audit table. Repository failures retain the request
  correlation context already used by the application runtime. Manual recovery
  is edit, pause/off-shelf, restore, or migration repair—not direct table
  mutation through the customer path.
- **Completion claims and discriminating evidence:** migration on a clean
  database; database constraints and deletion restrictions; administrator role
  matrix; atomic audit/revision rollback; listing concurrency; public projection
  allowlist; category de-duplication; visibility/tier ordering; empty-candidate
  buyability; quote conflict; generated OpenAPI; typecheck, focused/full tests,
  build, and framework validation. No browser or SSE claim belongs to #33.
- **Residual risk accepted by:** the product owner accepts listing-only
  buyability, unlisted-account fulfilment, URL-only completion evidence, and RMB
  procurement cost. The architecture owner accepts first-release external Logo
  references and last-write-wins behavior for non-commercial platform/resource/
  source edits; audit preserves those edits, while listing price/status has
  optimistic concurrency.

## Domain ownership and language

### Media Platform

The publishing carrier or independent media site that the customer recognizes
and buys, for example `腾讯新闻`, `百家号`, or `人民网`. It is not an account,
supplier, paid order, or package.

### Media Platform Listing

The platform's current customer sales configuration. It answers only whether
the platform is on shelf, its single-publication point price, and which
commercial revision a quote observed. It has no supplier, resource, account, or
package relation beyond its owning platform.

### Media Resource

An optional concrete account, channel, or truthful non-specific resource below
a platform. `六安新周报 @ 腾讯新闻` and `六安新周报 @ 百家号` are different
resources. A resource is neither customer-selectable nor a prerequisite for
future publication completion.

### Supply Source

An administrator-only current sourcing record that may be shared by several
resources. It is not an account role and cannot log in. A source status affects
candidate eligibility, not platform buyability.

### Publication result

Remains owned by future Publication Delivery. A result may optionally reference
one stored resource, but the accessible publication link and result facts—not
that optional reference—are the fulfilment evidence.

## Candidate persistence shape

Exact Prisma naming is implementation-local, but the following facts and
constraints are part of the reviewed design.

### `MediaPlatform`

| Field | Meaning and constraint | Default/example |
| --- | --- | --- |
| `id` | Stable UUID | generated |
| `normalizedName` | Trimmed canonical matching key, unique | `腾讯新闻` |
| `displayName` | Administrator-approved customer name | `腾讯新闻` |
| `aliases` | Optional alternate names for administrator lookup | `[]` |
| `description` | Optional manual customer description | null |
| `logoUrl` | Optional administrator-approved HTTPS or project asset reference | null |
| `regionScope` | `DOMESTIC` or `OVERSEAS` | `DOMESTIC` |
| `status` | `ACTIVE` or `ARCHIVED` | `ACTIVE` |
| timestamps | Creation and last modification | database-managed |

Platform-name uniqueness prevents duplicate master records. It does not infer
that same-named resources across different platforms are identical.

### `MediaPlatformCategory`

Composite key `(platformId, category)` where category is one of
`CENTRAL_MEDIA`, `PORTAL_MEDIA`, `LOCAL_MEDIA`, `VERTICAL_MEDIA`,
`CONTENT_PLATFORM`, or `OVERSEAS_MEDIA`. This is normalized membership, not a
second platform copy or a customer-editable category tree.

### `MediaPlatformListing`

| Field | Meaning and constraint | Default/example |
| --- | --- | --- |
| `platformId` | Primary key and restrict FK to one platform | required |
| `status` | `DRAFT`, `ON_SHELF`, `PAUSED`, `OFF_SHELF` | `DRAFT` |
| `pointPrice` | Nullable positive integer points; required on shelf | null |
| `revision` | Positive integer commercial revision | `1` |
| timestamps | Creation and last modification | database-managed |

Database and domain checks reject `ON_SHELF` with no positive point price. A
platform must also be `ACTIVE`. No resource-count condition belongs to this
constraint.

### `SupplySource`

| Field | Meaning and constraint | Default/example |
| --- | --- | --- |
| `id` | Stable UUID | generated |
| `name` | Administrator source name | `渠道 A` |
| `contactName` | Optional internal contact | null |
| `contactMethod` | Optional internal contact value | null |
| `status` | `ACTIVE` or `INACTIVE` | `ACTIVE` |
| `notes` | Optional internal note | null |
| timestamps | Creation and last modification | database-managed |

The first release does not normalize contacts further or create a supplier
login lifecycle.

### `MediaResource`

| Field | Meaning and constraint | Default/example |
| --- | --- | --- |
| `id` | Stable UUID | generated |
| `platformId` | Restrict FK to owning platform | `腾讯新闻` ID |
| `supplySourceId` | Restrict FK to one current source | `渠道 A` ID |
| `resourceName` | Truthful administrator resource name | `六安新周报` |
| `accountIdentifier` | Optional internal account ID/name | null |
| `accountUrl` | Optional administrator-only account URL | null |
| `publicationMode` | `FIRST_PUBLISH` or `REPOST` | `FIRST_PUBLISH` |
| `status` | `ACTIVE`, `PAUSED`, or `ARCHIVED` | `ACTIVE` |
| `publicVisibility` | `HIDDEN`, `FULL`, or `MASKED` | `HIDDEN` |
| `publicAlias` | Required customer-safe value only for `MASKED` | null |
| `qualityTier` | `HIGH`, `MEDIUM`, or `LOW` | `MEDIUM` |
| `procurementCostFen` | Optional non-negative internal RMB-fen record | null |
| `caseUrl` | Optional internal publication case | null |
| `publicationNotes` | Inclusion, speed, edit, content, or other internal notes | null |
| timestamps | Creation and last modification | database-managed |

Procurement cost is uniformly recorded in RMB fen for the first release. Media
Supply performs no currency conversion or exchange-rate behavior.

### `MediaCatalogState`

One migration-seeded singleton row owns a monotonically increasing
`publicRevision` and `updatedAt`. Publicly meaningful writes increment it with
the entity and audit write. Internal source/contact/cost/note-only changes do
not.

### `MediaCatalogAudit`

An append-only row records actor account, entity type and ID, action, normalized
reason, protected before/after JSON, and occurrence time. The audit table does
not become a generic platform-wide audit framework. Administrator projections
may read it; customer and ordinary operations projections cannot.

## Application surfaces

### Customer catalog

The semantic HTTP surface is:

- fixed categories in stable display order;
- paginated on-shelf platforms by category;
- one platform detail with at most fifty safe examples;
- one lightweight public-catalog revision or conditional request.

All endpoints require an authenticated session and return the same public-safe
projection regardless of the caller's supporting role. UI navigation remains
role-specific outside this Change.

### Administrator maintenance

Administrator commands create and change platform, category membership,
listing, resource, and source records; explicit archive/restore, pause/on-shelf/
off-shelf, and dependency-safe deletion are commands rather than raw CRUD table
exposure. Commands include an action reason. Administrator list/detail queries
may expose internal cost, source, contacts, notes, and audit history.

The first role-specific mutations add Identity-owned `RequireRole` metadata and
a small role guard over the authenticated account. Media Supply does not
implement role semantics or trust a request body role.

### Platform quote

The internal query accepts `platformId` and optionally an expected listing
revision. It returns platform ID, current display name, buyability, point price,
and listing revision. It has no resource or supplier field. A future Commerce
adapter calls this query synchronously before point deduction and owns the paid
snapshot.

### Fulfilment candidates

The internal query accepts the order's platform ID and returns active
resources with active current sources in quality/stable order. It includes the
internal information operations requires. The result may be empty and never
allocates, reserves, or selects a resource. Future Delivery owns optional
selection reference and publication result. A recorded accessible publication
URL can complete future Delivery without a candidate match or automated URL-to-
platform recognition.

## Revisions and transaction rules

1. A listing commercial revision advances for price, status, or quote-visible
   platform identity changes.
2. The public catalog revision advances for changes to on-shelf platform cards,
   category membership, price/availability, and visible resource examples.
3. A hidden resource's internal account, cost, source, case, or note change does
   not advance the public catalog revision.
4. Every accepted administrator mutation writes business facts, audit, and any
   required revision in one database transaction.
5. The revision endpoint is a freshness hint. It does not reserve a price,
   authorize a payment, or promise real-time delivery.

No first-release Outbox event is written because there is no asynchronous Media
Supply consumer. If a later measured need adds `media.catalog.changed`, the
transactional Outbox carries only a refresh fact; PostgreSQL catalog reads stay
authoritative.

## Reconciliation and evolution

Implementation activates the product-definition evolution marker for Media
Supply. Before close:

1. create `openspec/specs/media-supply/spec.md` from the accepted behavior;
2. replace the detailed truthful-media-library section in product-definition
   with index-level meaning and a link;
3. update supporting-role and publication-result language so stored resources
   are optional references;
4. update the glossary in place for Media library, Publication work item,
   Publication result, and any operations wording affected by the same fact;
5. add the proven module and dependency direction to architecture overview;
6. archive this Change only after code, schema, generated API, tests, and current
   owners agree.

No ADR is needed unless implementation discovers a surprising cross-change
constraint that current specs, schema, and module contracts cannot explain.
