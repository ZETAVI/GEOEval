# Publishing Commerce Specification

## Activation boundary

This owner currently implements maintained random-package configuration,
administrator audit and terminal-customer offer visibility. Saved selections,
point accounts, purchase, payment and fulfilment are not activated by this slice.
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
