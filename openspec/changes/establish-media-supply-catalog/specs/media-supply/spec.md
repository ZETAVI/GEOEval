# Media Supply Delta Specification

## ADDED Requirements

### Requirement: Platform-owned customer catalog

Media Supply SHALL expose administrator-maintained media platforms as the
customer selection and pricing unit while keeping concrete resources as
non-selectable examples and operations references.

#### Scenario: A customer browses the media library

- **WHEN** an authenticated customer opens the media library
- **THEN** the customer first sees the fixed media categories and the on-shelf
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
  `LOCAL_MEDIA`, `VERTICAL_MEDIA`, `CONTENT_PLATFORM`, and `OVERSEAS_MEDIA`
- **AND** its region scope is only `DOMESTIC` or `OVERSEAS`, defaulting to
  `DOMESTIC`
- **AND** the first release does not require province, city, industry-tag, or
  platform-form sub-classification.

### Requirement: Independent platform and listing lifecycles

Media Supply SHALL keep stable platform identity separate from its zero-or-one
customer sales listing without introducing a separate catalog-offer domain.

#### Scenario: An administrator prepares a platform before sale

- **WHEN** an administrator creates a platform
- **THEN** the platform identity, classification, description, and Logo
  reference can exist without a customer listing
- **AND** a listing can later move through `DRAFT`, `ON_SHELF`, `PAUSED`, and
  `OFF_SHELF`
- **AND** only an active platform whose listing is `ON_SHELF` with a positive
  whole-number point price is buyable.

#### Scenario: A platform has no stored resource candidate

- **GIVEN** an active platform has an on-shelf listing and valid point price
- **WHEN** it has no active stored resource or every stored source is inactive
- **THEN** the platform remains buyable because the listing is the
  administrator's explicit sale decision
- **AND** the customer sees no unsupported resource example
- **AND** operations may arrange an unlisted account under the committed
  platform
- **AND** an administrator pauses or takes the listing off shelf when the
  platform as a whole can no longer be fulfilled.

#### Scenario: A commercial fact changes

- **WHEN** the point price, listing status, or another quote-visible platform
  fact changes
- **THEN** the listing commercial revision advances atomically with the change
- **AND** a later quote returns the new fact and revision
- **AND** an earlier page or unpaid choice does not reserve the old price.

### Requirement: Simple concrete-resource records

Media Supply SHALL represent a concrete platform account or publishing resource
with one current internal supply source and no Offer, Endpoint, guarantee, or
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
- **AND** the current supply source is one internal record rather than a system
  role
- **AND** optional procurement cost, case link, speed, inclusion, modification,
  and content constraints remain internal records or notes
- **AND** missing procurement cost cannot block platform listing.

### Requirement: Customer-safe resource examples

Media Supply SHALL project concrete resources explicitly for customers rather
than reusing administrator records or implying a resource-level commitment.

#### Scenario: A resource is hidden

- **WHEN** a resource's public visibility is `HIDDEN`
- **THEN** it is omitted from the customer response even when it remains an
  active operations reference.

#### Scenario: A resource is shown completely

- **WHEN** an active resource's public visibility is `FULL`
- **THEN** the customer response may show its approved resource name
- **AND** it still omits account credentials, procurement cost, supply source,
  contacts, cases, and internal publication notes.

#### Scenario: A resource is shown with an approved mask

- **WHEN** an active resource's public visibility is `MASKED`
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
availability, listing state, or point price and SHALL record every accepted
mutation atomically with its audit evidence.

#### Scenario: An administrator changes catalog data

- **WHEN** an authenticated `ADMINISTRATOR` creates, edits, archives, restores,
  prices, pauses, publishes, or takes a media record off shelf
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

- **WHEN** a platform, listing, resource, or source is referenced by another
  durable record
- **THEN** it cannot be removed through cascading physical deletion
- **AND** the administrator uses pause, off-shelf, inactive, or archive state to
  stop new use while preserving historical meaning
- **BUT WHEN** an erroneous test record has no dependents
- **THEN** an explicit administrator delete may remove it while preserving the
  deletion audit.

### Requirement: Durable catalog and commercial revisions

Media Supply SHALL use PostgreSQL as the only durable catalog source and SHALL
separate customer freshness revision from per-listing commercial revision.

#### Scenario: A customer-visible fact changes

- **WHEN** an administrator commits a change that alters categories, an
  on-shelf platform projection, point price, listing availability, or visible
  resource examples
- **THEN** one global public-catalog revision advances in the same transaction
- **AND** a lightweight revision or conditional catalog request can detect the
  change
- **AND** internal-only source, procurement, contact, case, or note edits do not
  create unnecessary customer refreshes.

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
  name, buyability, whole-number point price, and listing revision
- **AND** Commerce rejects or reconfirms an unavailable or changed quote and
  owns the paid platform, price, revision, and quantity snapshot
- **AND** catalog polling never substitutes for this synchronous check.

### Requirement: Non-blocking fulfilment candidates

Media Supply SHALL provide concrete resources only as optional operations
candidates and SHALL not own actual-media selection or publication completion.

#### Scenario: Operations asks for platform candidates

- **WHEN** future Publication Delivery asks for candidates under a purchased
  platform
- **THEN** Media Supply returns resources that belong to that platform, are
  active, and have an active current source
- **AND** it orders them by internal quality tier and stable system order
- **AND** customer visibility does not affect candidate eligibility.

#### Scenario: Operations publishes through an unlisted account

- **GIVEN** a publishing work item commits to a platform rather than a concrete
  account
- **WHEN** operations publishes successfully through an account not stored as a
  `MediaResource` under that platform
- **THEN** Publication Delivery may retain a null media-resource reference
- **AND** the valid article link and required publication-result facts can
  complete the work item
- **AND** Media Supply does not reject completion or automatically create a new
  resource from the fulfilment result.

#### Scenario: Operations would use another platform

- **WHEN** the available result belongs to a platform different from the paid
  platform commitment
- **THEN** the result is not treated as an ordinary same-platform fulfilment
- **AND** replacement or point-return handling remains owned by the future
  Commerce and Delivery exception workflow.
