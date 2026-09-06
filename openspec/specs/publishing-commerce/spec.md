# Publishing Commerce Specification

## Activation boundary

This owner currently implements maintained random-package configuration,
administrator audit, terminal-customer offer visibility, account points and
granted-only administrator adjustments/history. Saved selections, purchase,
payment and fulfilment are not activated by these slices.
Their approved implementation work remains in
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
- **AND** purchase remains explicitly unavailable until its own implementation;
  browsing cannot debit points, create an order or reserve a price.

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
- **THEN** recharge and purchasing remain explicitly unavailable
- **AND** no payment success, order spending, invoice or fulfilment is fabricated.
