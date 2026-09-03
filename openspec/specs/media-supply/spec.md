# Media Supply Specification

## Requirements

### Requirement: Platform-owned customer catalog

Media Supply SHALL expose administrator-maintained media platforms as the
customer selection and pricing unit while keeping concrete resources as
non-selectable examples and operations references.

#### Scenario: A customer browses the media library

- **WHEN** an authenticated customer opens the media library
- **THEN** the customer first sees the fixed media categories and the enabled
  platforms associated with the selected category
- **AND** one platform associated with several categories remains one platform
  record and one platform-level price
- **AND** the customer can inspect the platform's display name, Logo reference,
  concise description, domestic or overseas scope, current availability,
  whole-number single-publication point price, and permitted resource examples
- **AND** the customer selects and purchases the platform rather than a concrete
  account or resource example.

#### Scenario: The first-release classification is maintained

- **WHEN** an administrator classifies a platform
- **THEN** the platform may use one or more of `CENTRAL_MEDIA`, `PORTAL_MEDIA`,
  `LOCAL_MEDIA`, `VERTICAL_MEDIA`, and `CONTENT_PLATFORM`
- **AND** its region scope is only `DOMESTIC` or `OVERSEAS`, defaulting to
  `DOMESTIC`
- **AND** geography is never duplicated in media category membership
- **AND** the first release does not require province, city, industry-tag, or
  platform-form sub-classification.

### Requirement: One platform is one priced sales unit

Media Supply SHALL keep the first-release price and availability on the media
platform itself and SHALL NOT introduce a separate one-to-one Listing lifecycle.

#### Scenario: An administrator prepares a platform before sale

- **WHEN** an administrator creates a platform
- **THEN** the platform defaults to `INACTIVE` while its identity,
  classification, description, Logo reference, resources, and optional point
  price can still be maintained
- **AND** only an `ACTIVE` platform with a positive whole-number point price is
  buyable
- **AND** changing the platform to `INACTIVE` immediately stops new orders
  without deleting its facts, resources, or history.

#### Scenario: A platform has no stored resource candidate

- **GIVEN** an active platform has a valid point price
- **WHEN** it has no active stored resource or every stored supplier is inactive
- **THEN** the platform remains buyable because its active state is the
  administrator's explicit sale decision
- **AND** the customer sees no unsupported resource example
- **AND** operations may arrange an unlisted account
- **AND** an administrator disables the platform when it can no longer accept
  orders.

#### Scenario: A commercial fact changes

- **WHEN** the point price, platform status, or another quote-visible platform
  fact changes
- **THEN** the platform revision advances atomically with the change
- **AND** a later quote returns the new fact and revision
- **AND** an earlier page or unpaid choice does not reserve the old price.

### Requirement: Simple concrete-resource records

Media Supply SHALL represent a concrete platform account or publishing resource
with one current internal supplier and no Offer, Endpoint, guarantee, or
SLA sub-system.

#### Scenario: An administrator records a known account

- **WHEN** an administrator adds `六安新周报` below `腾讯新闻`
- **THEN** the resource belongs to the `腾讯新闻` platform and may include an
  internal account identifier or account URL
- **AND** a separate `六安新周报` below `百家号` remains a different resource
- **AND** equal resource names across platforms are never merged automatically.

#### Scenario: A resource has no exact account identity

- **WHEN** the available arrangement names a channel, random account, or other
  non-specific resource without a stable account identity
- **THEN** the administrator records the truthful resource name and internal
  publication note while leaving account identity fields empty
- **AND** the system does not invent an Endpoint, account, or rule entity.

#### Scenario: An administrator records operating information

- **WHEN** an administrator creates or changes a resource
- **THEN** publication mode is only `FIRST_PUBLISH` or `REPOST`, defaulting to
  `FIRST_PUBLISH`
- **AND** quality tier is administrator-only `HIGH`, `MEDIUM`, or `LOW`,
  defaulting to `MEDIUM`
- **AND** the current supplier is one global internal record rather than a system
  role
- **AND** optional non-negative integer RMB-yuan procurement cost, case link, speed, inclusion,
  modification, and content constraints remain internal records or notes
- **AND** missing procurement cost cannot block platform activation.

### Requirement: Global suppliers and derived resource availability

Media Supply SHALL maintain a supplier once across all platforms and SHALL
derive a resource's effective availability from the resource's own status
and its current supplier's status without persisting a second effective state.
The administrator projection SHALL use `ACTIVE`, `RESOURCE_INACTIVE`, and
`SUPPLIER_INACTIVE`, displayed as `可用`, `停用`, and `因供应商停用`.

#### Scenario: A supplier is reused

- **WHEN** resources under one or more platforms use the same supplier
- **THEN** each resource references that one supplier identity
- **AND** the supplier projection derives its current resource count, platform
  count, and association list from those references
- **AND** normalized supplier names cannot be duplicated.

#### Scenario: Supplier availability changes

- **WHEN** an active resource's supplier is inactive
- **THEN** the resource is effectively `SUPPLIER_INACTIVE`, remains visible to
  administrators, and is excluded from customer examples and new fulfilment
  candidates
- **BUT WHEN** the supplier becomes active again
- **THEN** an active resource becomes effectively active without a
  resource write
- **AND** an inactive resource remains `RESOURCE_INACTIVE`.

### Requirement: Customer-safe resource examples

Media Supply SHALL project concrete resources explicitly for customers rather
than reusing administrator records or implying a resource-level commitment.

#### Scenario: A resource is hidden

- **WHEN** a resource's public visibility is `HIDDEN`
- **THEN** it is omitted from the customer response even when it remains an
  active operations reference.

#### Scenario: A resource is shown completely

- **WHEN** an effectively active resource's public visibility is `FULL`
- **THEN** the customer response may show its approved resource name
- **AND** it still omits account credentials, procurement cost, supplier,
  contacts, cases, and internal publication notes.

#### Scenario: A resource is shown with an approved mask

- **WHEN** an effectively active resource's public visibility is `MASKED`
- **THEN** an administrator-approved public alias or masked display value is
  returned instead of the internal resource name or account identifier
- **AND** the API does not improvise a mask that can accidentally reveal or
  misrepresent the account.

#### Scenario: A platform has many examples

- **WHEN** more than fifty active resources are eligible for customer display
- **THEN** the customer detail returns at most fifty examples
- **AND** it orders them by internal quality tier and then a stable system order
- **AND** neither the tier nor the ordering is presented as a customer quality
  guarantee.

### Requirement: Administrator-owned maintenance and audit

Media Supply SHALL allow only system administrators to mutate media facts,
availability or point price and SHALL record every accepted
mutation atomically with its audit evidence.

#### Scenario: An administrator changes catalog data

- **WHEN** an authenticated `ADMINISTRATOR` creates, edits, enables, disables,
  or prices a media platform or maintains a resource or supplier
- **THEN** the same database transaction records the actor, time, action,
  reason, entity identity, and before-and-after values
- **AND** a failed mutation leaves neither a partial business write nor an audit
  record claiming success
- **AND** the first release requires no second approver.

#### Scenario: Another role attempts maintenance

- **WHEN** a terminal customer, operations user, or agent calls an administrator
  media command
- **THEN** Identity rejects the command before repository mutation
- **AND** customer-safe catalog access does not grant access to administrator
  projections or audit data.

#### Scenario: A record has business dependents

- **WHEN** a platform, resource, or supplier is referenced by another
  durable record
- **THEN** it cannot be removed through cascading physical deletion
- **AND** the administrator uses inactive state to
  stop new use while preserving historical meaning
- **AND** platform deletion requires an inactive platform with zero resources,
  resource deletion requires an inactive resource, and supplier
  deletion requires an inactive supplier with zero resources
- **AND** every deletion requires the displayed owner revision and never
  cascades
- **AND** the administrator Web keeps the delete action visible, disables it
  while these prerequisites are unmet, and explains the next required action
- **BUT WHEN** deleting the last resource leaves an inactive supplier
  unreferenced
- **THEN** an administrator may explicitly request both deletions in one
  transaction after both revisions and reference counts are rechecked
- **AND** an eligible deletion uses an explicit in-product confirmation with a
  required reason rather than a browser-native prompt.

#### Scenario: An administrator changes many resource states

- **WHEN** an administrator selects resources from a platform or supplier
  association list and chooses enable or disable
- **THEN** one batch command contains the expected revision of every resource
- **AND** one stale or missing resource rejects the entire command without a
  partial update
- **AND** each accepted resource change receives its own audit record.

### Requirement: Role-specific administrator maintenance workspace

Media Supply SHALL provide a Web workspace that lets an authenticated system
administrator maintain media platforms, concrete resources, and global
suppliers through their owner-local contracts.

#### Scenario: An administrator signs in or returns to maintenance

- **WHEN** an account with role `ADMINISTRATOR` completes the existing login
  challenge or opens `/admin/media`
- **THEN** the Web enters the Media Supply administrator workspace without
  calling terminal-customer Brand APIs
- **AND** the workspace loads platform, supplier, resource, and audit projections
  only after confirming the account role
- **AND** the administrator can sign out through the authenticated shell.

#### Scenario: Another role opens the maintenance route

- **WHEN** a terminal customer, operations user, or agent opens `/admin/media`
- **THEN** the Web presents an access-denied state without requesting or
  rendering administrator Media Supply projections
- **AND** the backend role guard remains the authoritative rejection boundary
  for direct administrator API calls.

#### Scenario: An administrator finds and maintains media facts

- **WHEN** the administrator searches or filters the workspace
- **THEN** one platform identity remains one result even when it belongs to
  several categories
- **AND** text, category, and one platform-status filter can narrow the result
  by `ACTIVE` or `INACTIVE`
- **AND** an empty catalog offers platform creation while a filtered-empty result
  offers filter recovery
- **AND** the workspace presents separate first-level `平台与资源` and
  `供应商管理` regions
- **AND** a supplier detail lists current resources and platforms with navigation
  back to the associated platform
- **AND** record actions share one neutral/destructive visual hierarchy instead
  of isolated browser-default buttons
- **AND** batch actions remain grouped with their selection count and form field
  hints share the field-heading row so paired controls align
- **AND** the Web uses concise Chinese business language rather than exposing
  internal names such as Listing or revision
- **AND** the Web does not expose internal names such as Listing, Draft,
  on-shelf, off-shelf, or a second sales-status concept
- **AND** create forms generate a bounded create reason without asking the
  administrator to type one, while later edits require a short change note
- **AND** every accepted mutation refreshes the projection and operation-history
  feedback after success.

#### Scenario: A create form uses the accepted defaults

- **WHEN** the administrator creates a platform, resource, or supplier
- **THEN** platform scope defaults to domestic and platform status to inactive
- **AND** resource mode defaults to first publish, status to active, customer
  visibility to hidden, and internal quality tier to medium
- **AND** supplier status defaults to inactive
- **AND** optional procurement cost is entered as nullable whole RMB yuan in the
  Web and stored and transported as the same integer-yuan unit
- **AND** a valid platform-icon address shows an immediate preview and the saved
  icon renders in the platform list and detail header
- **AND** masked customer display requires an explicit approved alias.

#### Scenario: Interactive maintenance does not complete cleanly

- **WHEN** initial or selected data is still loading
- **THEN** the workspace retains stable orientation and identifies the pending
  region
- **BUT WHEN** input needs correction or the backend rejects a business rule
- **THEN** entered values remain available and the relevant field or region
  explains the corrective action
- **BUT WHEN** an unauthenticated session, forbidden role, or temporary backend
  failure is returned
- **THEN** the Web respectively returns to login, presents access denial, or
  retains a retryable failure state without claiming a partial save
- **AND** accepted audit entries remain read-only and expose actor, time, action,
  reason, entity, and bounded before-and-after values only to administrators.

#### Scenario: The administrator uses a narrow viewport

- **WHEN** the desktop-first workspace is used on a tablet or mobile-sized Web
  viewport
- **THEN** navigation, platform selection, status inspection, forms, feedback,
  and ordinary save actions remain reachable without horizontal page overflow
- **AND** dense regions stack in a stable reading order
- **AND** the page does not become the terminal-customer media presentation.

### Requirement: Controlled first-batch import

Media Supply SHALL provide one offline, fixed-format `plan` / `apply` boundary
for the reviewed first batch without making its workbook a runtime or checked-in
data source.

#### Scenario: An operator plans the reviewed first batch

- **GIVEN** the input has the approved SHA-256, fixed sheet/header/count shape,
  40 row-anchored PNG Logos, valid mappings, and whole RMB-yuan costs
- **WHEN** an administrator actor runs `plan` against an explicitly selected
  database and Web public-asset root
- **THEN** it reports deterministic new, existing, conflict, skipped, warning,
  input, asset-bundle, database-target, and confirmation facts
- **AND** it does not write database records, audits, receipts, or asset files
- **AND** errors and warnings contain only bounded codes, row numbers, and
  hashes rather than workbook cell content or supplier/internal facts.

#### Scenario: The reviewed first batch is applied

- **GIVEN** the plan is ready and its confirmation still matches inside a
  serializable transaction
- **WHEN** the operator explicitly runs `apply`
- **THEN** exact existing records are reused, missing records are inserted, and
  any differing platform, supplier, resource, identity, asset, or actor blocks
  the operation without automatic update
- **AND** all newly inserted platforms have 1000 points and are inactive
- **AND** all newly inserted suppliers and resources are inactive and every
  resource is hidden from customers
- **AND** entity, category, relation, and `IMPORT_CREATE` audit writes commit in
  one PostgreSQL transaction or all roll back
- **AND** repeating the same valid apply creates no duplicate entity, category,
  relation, or audit.

#### Scenario: Logo assets and the apply receipt use separate durable owners

- **WHEN** the first-batch command verifies deployment readiness
- **THEN** the 40 approved Logos already exist as exact versioned Web public
  assets and apply performs no file write
- **AND** a missing, changed, extra, corrupt, or wrongly anchored Logo blocks
  apply before the database transaction
- **AND** a post-commit safe receipt records hashes, versions, counts, bounded
  warnings/conflicts, and final status without supplier names, contacts,
  procurement values, cases, notes, or raw cells
- **AND** if receipt finalization fails after commit, idempotent replay can
  recreate it without another business or audit write.

#### Scenario: Workbook-only text has no compatible Media Supply field

- **WHEN** a case-reference cell is not a valid HTTPS URL
- **THEN** its source row is reported as a warning and `caseUrl` remains null
- **AND** the text is not copied into another business field, log, or receipt
- **AND** display names, descriptions, aliases, resource identifiers, and
  internal notes otherwise preserve reviewed text while only matching keys use
  deterministic normalization.

#### Scenario: Implementation acceptance does not activate the batch

- **WHEN** the import implementation and isolated review-database rehearsal are
  accepted or merged
- **THEN** no formal database write, deployment, activation, customer
  publication, order, fulfilment, or external supplier call is implied
- **AND** each later gate requires its own explicit authority and evidence.

### Requirement: Durable catalog and commercial revisions

Media Supply SHALL use PostgreSQL as the only durable catalog source and SHALL
separate customer freshness revision from each platform's optimistic-concurrency
revision.

#### Scenario: A customer-visible fact changes

- **WHEN** an administrator commits a change that alters categories, an
  enabled platform projection, point price, platform availability, or visible
  resource examples or supplier availability changes those examples
- **THEN** one global public-catalog revision advances in the same transaction
- **AND** a lightweight revision or conditional catalog request can detect the
  change
- **AND** internal-only supplier, procurement, contact, case, or note edits do not
  create unnecessary customer refreshes.

#### Scenario: Two administrator pages edit the same platform revision

- **GIVEN** two pages show the same current platform revision
- **WHEN** one page saves a platform change and the other later submits the
  older revision
- **THEN** every existing-platform mutation includes the revision displayed by
  that page as `expectedRevision`
- **AND** the stale request cannot overwrite the accepted price or state
- **AND** the Web explains that platform data changed elsewhere
- **AND** the administrator must refresh to the latest revision, review the new
  price and state, and submit again before another change can succeed.

#### Scenario: Two administrator pages edit a resource or supplier

- **GIVEN** two pages show the same resource or supplier revision
- **WHEN** one page accepts a change and the other submits the older revision
- **THEN** the stale update or deletion is rejected without overwriting data
- **AND** the administrator refreshes and reconfirms before retrying.

#### Scenario: An already-open page checks for changes

- **WHEN** a future customer page periodically checks the catalog revision or
  regains browser focus
- **THEN** it can detect a different revision and reload the customer-safe
  catalog without manual refresh
- **AND** the first release does not require a media SSE channel or a seconds-
  based delivery guarantee.

#### Scenario: Commerce requests a current quote

- **WHEN** future Publishing Commerce requests a quote before deducting points
- **THEN** Media Supply returns the platform identity, current customer display
  name, buyability, whole-number point price, and platform revision
- **AND** Commerce rejects or reconfirms an unavailable or changed quote and
  owns the paid platform, price, revision, and quantity snapshot
- **AND** catalog polling never substitutes for this synchronous check.

### Requirement: Non-blocking fulfilment candidates

Media Supply SHALL provide concrete resources only as optional operations
candidates and SHALL not own actual-media selection or publication completion.

#### Scenario: Operations asks for platform candidates

- **WHEN** future Publication Delivery asks for candidates for an order platform
- **THEN** Media Supply returns resources that belong to that platform, are
  active, and have an active current supplier
- **AND** it orders them by internal quality tier and stable system order
- **AND** customer visibility does not affect candidate eligibility.

#### Scenario: Operations publishes through an unlisted account

- **GIVEN** a publishing work item does not commit to a concrete account
- **WHEN** operations records a successful publication through an account not
  stored as a `MediaResource`
- **THEN** Publication Delivery may retain a null media-resource reference
- **AND** a recorded accessible article URL and required publication-result
  facts can complete the work item
- **AND** Media Supply does not reject completion or automatically create a new
  resource from the fulfilment result
- **AND** the system does not require a catalog match or automated URL-to-
  platform identity check before completion.
