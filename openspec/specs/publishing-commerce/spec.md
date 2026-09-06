# Publishing Commerce Specification

## Activation boundary

This owner currently implements maintained random-package configuration,
administrator audit, terminal-customer offer visibility, account points,
granted-only administrator adjustments/history, saved selections, advisory quotes,
atomic point-funded purchases and customer-safe pending orders. Real payment and
fulfilment are not activated. Delivery acceptance remains in
[`establish-publishing-commerce`](../../changes/establish-publishing-commerce/proposal.md).

### Requirement: Maintained publishing packages

Publishing Commerce SHALL own each package's name, successful-publication
quantity, whole-point total, explicit platform scope, enabled state and revision.

#### Scenario: Administrator creates or updates a package

- **WHEN** an authenticated administrator explicitly saves valid package data
- **THEN** the configuration, scope references and actor audit commit together
- **AND** name is normalized and unique, quantity/price are positive integers,
  and scope contains 1–200 distinct existing platform IDs
- **AND** the editor starts new packages inactive with no invented quantity/price
- **AND** updating requires the displayed revision and a reason; stale writes
  fail without changing scope, configuration or audit
- **AND** failed scope replacement rolls back the complete save.

#### Scenario: Administrator reviews or retires a package

- **WHEN** the administrator reads the latest 50 package change records
- **THEN** each retains actor, time, reason and before/after configuration
- **AND** later edits do not rewrite historical records
- **AND** disabling removes the offer from customer lists while retaining its
  identity, scope and history; package deletion is not exposed.

### Requirement: Customer-safe offer visibility

The system SHALL show terminal customers only activated package offers using
the current Media Supply quote boundary, without copying sales availability.

#### Scenario: Customer browses a maintained offer

- **WHEN** the terminal customer opens `/publishing`
- **THEN** the page shows enabled package name, quantity, total points and named
  media scope, explaining random allocation without guaranteed destinations
- **AND** availability requires at least one currently buyable platform in scope,
  independently of stored resource count
- **AND** changing precise unit prices does not change the package's own total
- **AND** the response excludes administrator audit and supplier/procurement data
- **AND** unavailable offers and an empty list are explained truthfully
- **AND** browsing cannot debit points, create an order or reserve a price;
  purchase requires a separately reviewed and explicitly confirmed submission.

### Requirement: Protected HTTP and media references

The system SHALL use the existing Identity Principal/role boundary and durable
foreign keys for package scope.

#### Scenario: Unauthorized or malformed package command

- **WHEN** an unauthenticated or non-administrator caller attempts maintenance,
  or the request contains ownership overrides, unknown fields or invalid values
- **THEN** it is denied before mutation
- **AND** customer reads require the terminal-customer role
- **AND** request bodies and UUID paths are declared in generated OpenAPI.

#### Scenario: Media deletion races a package reference

- **WHEN** Media Supply receives a delete request for a referenced platform
- **THEN** it locks that identity and checks package scope alongside its existing
  resource/status/revision gates before deleting
- **AND** a clear business dependency rejection preserves the platform/categories
- **AND** concurrent reference creation and deletion cannot both succeed
- **AND** removing a current package scope reference may permit later deletion,
  while historical audit retains its original IDs as historical evidence.

### Requirement: Account-owned points and append-only changes

Publishing Commerce SHALL maintain one point account per terminal customer,
shared across Brands, with integer granted/funded balances and ordered history.

#### Scenario: Customer reads points before or after adjustment

- **WHEN** an authenticated terminal customer opens the account page
- **THEN** the response uses only that Principal's account and shows one total
  balance plus its account sequence, not separately usable point origins
- **AND** before the first write it returns zero without creating a wallet or
  registration step
- **AND** history is ordered/paginated by immutable account sequence and includes
  time, signed amount, resulting balance and a customer-facing reason
- **AND** origin, actor, request identity, internal notes and business references
  are excluded from the customer response.

#### Scenario: Administrator adjusts granted points

- **WHEN** an administrator explicitly confirms a signed nonzero integer delta
  for a terminal customer with a customer-visible reason
- **THEN** the wallet update and new ledger row commit or roll back together
- **AND** each successful change advances one account sequence
- **AND** subtraction cannot exceed granted balance or consume funded balance
- **AND** no origin or total becomes negative, and total cannot exceed the
  supported integer bound
- **AND** internal notes/business references are optional; no history edit,
  balance replacement or funded-credit command is exposed.

#### Scenario: Target identity or command is invalid

- **WHEN** the target is not a terminal customer, the request overrides identity
  or point origin, or an amount/reason is invalid
- **THEN** no adjustment is written
- **AND** target facts come from Identity's narrow read-only directory
- **AND** inactive terminal targets remain readable for administrators but
  accept no new adjustments; previously committed success remains recoverable.

#### Scenario: Concurrent or interrupted adjustment

- **WHEN** the same account-scoped request key and normalized actor/intent repeat
- **THEN** the original ledger result is returned without another delta,
  including after subsequent changes or target inactivity
- **BUT WHEN** actor, delta or reasons differ for that key
- **THEN** the request conflicts without another effect
- **AND** distinct requests serialize balance checks so concurrent subtraction
  cannot overdraw and a ledger insertion failure cannot leave a balance update.

#### Scenario: Administrator reloads after losing a response

- **WHEN** a submitted adjustment's outcome is uncertain
- **THEN** one actor-bound pending request/key, saved before sending in the
  current browser tab, is restored on reload
- **AND** the administrator can explicitly retry that same operation, not create
  a fresh grant while the prior one is unresolved
- **AND** customer identity is read again from the server; tab storage is not
  authority for role, balance or successful completion
- **AND** the browser cannot start an adjustment when it cannot retain the
  recovery intent; unsent edits require explicit submission.

#### Scenario: Customer considers payment or publishing

- **WHEN** this stage shows available points and maintained packages
- **THEN** customers can explicitly buy publishing services using available points
- **AND** recharge remains unavailable; no external payment success, invoice or
  fulfilment is fabricated.

### Requirement: One explicitly saved publishing selection per Brand

Publishing Commerce SHALL own one unpaid selection for each account/Brand,
referencing its exact confirmed article and either a random package or precise
platform quantities. It SHALL use the existing owner APIs for article and media
facts, without reading their private persistence or duplicating Writer context.

#### Scenario: Customer saves a publishing choice

- **WHEN** the current Brand owns the named exact confirmed article and the
  customer explicitly saves one available package or 1–200 unique media targets
- **THEN** the selection is persisted with a conditional revision, using zero
  only for first creation and positive whole-number quantities
- **AND** both first-save races and stale updates reject without overwriting
  another saved intention; article/account/Brand identity has a composite FK
- **AND** no client-provided account, price or balance override is accepted
- **AND** a customer can leave and return to the saved choice, while changing
  current Brand exposes only that Brand's separate choice.

#### Scenario: Customer changes or returns to an unpaid choice

- **WHEN** an article is edited or reconfirmed after a selection was saved
- **THEN** the selection remains available and the quote identifies unconfirmed
  or changed article content; explicit save rebinds it to the new confirmed revision
- **AND** current Brand or Evaluation freshness alone does not invalidate it
- **AND** newly unavailable selections are rejected on save, without deleting
  the previous selection; removed unpaid media remain identifiable as unavailable
- **AND** unsaved page edits require explicit save or discard, with a leaving
  warning, and are not represented as already saved or purchased.

### Requirement: Advisory quote is distinct from a paid agreement

The system SHALL calculate an observation of the saved choice using current
owner-provided facts, not a price reservation, order, or authorization to debit.

#### Scenario: Customer reviews quantity, terms and shortage

- **WHEN** the customer loads or explicitly refreshes the publishing workspace
- **THEN** random mode shows package quantity/total/scope and non-guaranteed
  destinations; precise mode shows each named platform, quantity, unit and total
- **AND** the quote shows unified balance, shortfall and a whole-renminbi
  suggested recharge amount at ten points per yuan, with recharge still unavailable
- **AND** precise prices refresh without rewriting intent; random totals do not
  change merely because precise platform unit prices changed
- **AND** unavailable media or checked-integer overflow cannot produce a usable
  low quote; relevant problems are explicit rather than silently clamped
- **AND** there is no stored quote entity, media reservation, point-account
  creation, point change, order or automatic purchase from these operations
- **AND** final purchase recomputes article and terms inside its shared
  transaction before debiting; this read model is not that Gate.

### Requirement: Atomic purchase of the exact confirmed article and terms

Commerce SHALL submit one purchase through a short PostgreSQL transaction.
Owner-bound article/media readers SHALL participate on the same connection;
the domain and application interface SHALL not expose a database transaction.

#### Scenario: Customer confirms an affordable saved selection

- **WHEN** the customer explicitly confirms the displayed article revision,
  selection revision and complete relevant commercial terms with a request key
- **THEN** the transaction locks wallet, selection, exact article, optional
  package and sorted media identities in that order
- **AND** it rechecks account/Brand/article ownership, current confirmation,
  sale availability and accepted terms, not unrelated Brand/Evaluation freshness
- **AND** random mode buys successful-publication quantity within named scope,
  without promising specific platforms/accounts; precise mode buys the exact
  named platform quantities at their summed unit prices
- **AND** it consumes granted before funded points, advances the wallet sequence,
  appends one origin-preserving negative change and creates one pending order
- **AND** the order freezes article title/body and purchased agreement once,
  references existing source identities and does not copy Brand/Writer/report data
- **AND** it clears only the consumed intent and increments its selection revision;
  the workspace exposes this revision even with no active selection, so the next
  explicit save never resets to zero or admits an old page's conditional write
- **AND** all writes commit together, with no network, Writer, queue, payment or
  user interaction inside the transaction; generation/edit/confirmation remain free.

#### Scenario: Source, balance, storage or competing request changes

- **WHEN** article/terms have changed, a sale becomes unavailable, balance is
  insufficient, values overflow or any write fails
- **THEN** no partial wallet change, spending entry, order or consumed intent persists
- **AND** changed article/price/scope requires fresh explicit customer confirmation,
  never automatic submission at a new price
- **AND** source locks prevent a concurrent edit from mixing old checks with new
  content or price; wallet locks serialize both purchases and administrator adjustments
- **AND** a failed purchase retains the unpaid selection; quotes/recharge hints
  do not reserve inventory or automatically purchase after a later balance change.

#### Scenario: Duplicate submit or lost response

- **WHEN** an account-scoped key repeats the same normalized request
- **THEN** an existing successful order is recovered before checking mutable
  sources, even after later article, price or selection changes
- **AND** changed intent or a key already used for another point operation conflicts
- **AND** a different key cannot buy the same consumed selection again
- **AND** the customer client stores its actor-bound exact pending request before
  sending, restores it across reload and offers explicit same-key recovery
- **AND** uncertain network/server outcomes do not enable a new purchase; inability
  to retain the request prevents sending, and tab storage is not financial authority.

### Requirement: Owned immutable pending orders and linked history

Commerce SHALL expose a customer-owned order list and detail using safe DTOs.

#### Scenario: Customer revisits a purchased order

- **WHEN** the customer opens `/orders` or its order detail
- **THEN** the list is scoped to the current Brand (or all owned Brands when none
  is current), deterministically paginated by order sequence
- **AND** detail shows number, submission time, pending-handling status, exact
  purchased terms/points and safely rendered frozen article
- **AND** later editing the current article or catalog does not alter the order;
  the purchased article itself has no customer edit command
- **AND** point history distinguishes purchase spending from adjustment and links
  the related order; customers still see one unified balance without origin selection
- **AND** origin composition remains internal for future settlement/returns;
  this slice exposes neither funded credit nor commission/return behavior
- **AND** foreign order IDs return not found, and internal actors, requests,
  origin, procurement and audit notes never enter customer projections
- **AND** there are no invented results, dates, progress, self-refund/cancellation,
  or real fulfilment controls in the pending-only stage.

#### Scenario: Media identity has been purchased

- **WHEN** a platform referenced by any paid order is deleted
- **THEN** the existing Media Supply gate returns a clear dependency conflict,
  even after the platform is disabled or removed from a current package scope
- **AND** restrictive database references protect article/account/Brand identity,
  media identities and the unique spending-order relationship; retained orders
  remain readable independently of source maintenance.
