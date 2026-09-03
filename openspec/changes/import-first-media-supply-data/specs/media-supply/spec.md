# Media Supply delta

## ADDED Requirements

### Requirement: Controlled first-batch planning

Media Supply SHALL provide a read-only plan for the one reviewed first-batch
workbook and SHALL reject any different input identity or incompatible ledger
shape.

#### Scenario: An operator plans the reviewed workbook

- **GIVEN** the workbook SHA-256 and structure match the reviewed first batch
- **WHEN** the operator runs `plan` against an explicitly selected database and
  deployed asset root
- **THEN** the command reports deterministic platform, supplier, resource and
  Logo counts split into new, existing, conflict, skipped and warning results
- **AND** reports conflicts through bounded codes and source-row references
  without logging supplier names, contacts, costs, notes or raw workbook text
- **AND** neither database records nor asset files are changed.

#### Scenario: Input validation fails

- **WHEN** the workbook hash, required headers, hierarchy, count, enum mapping,
  integer-yuan cost, current-supplier relation, embedded Logo, or deployed asset
  hash is invalid
- **THEN** the plan is invalid
- **AND** apply is prohibited rather than silently skipping or coercing the
  invalid input.

### Requirement: Atomic and idempotent first-batch apply

Media Supply SHALL apply the valid first-batch plan as one PostgreSQL
transaction and SHALL never overwrite a conflicting current record.

#### Scenario: The first batch is applied to an empty review database

- **GIVEN** a valid plan, an existing administrator actor, and the exact deployed
  Logo assets
- **WHEN** apply recomputes the plan inside its transaction
- **THEN** it inserts 40 inactive platforms priced at 1000 points, 6 inactive
  globally reused suppliers, and 208 inactive hidden resources
- **AND** every resource references exactly one current supplier
- **AND** every new entity receives an `IMPORT_CREATE` administrator audit in
  that same transaction
- **AND** no customer-visible catalog record or fulfilment candidate is created.

#### Scenario: The same batch is applied again

- **WHEN** every import identity and accepted field already matches
- **THEN** the command reports the records as existing
- **AND** creates no platform, supplier, resource, category, or audit duplicate
- **AND** emits a new safe receipt that makes the idempotent outcome explicit.

#### Scenario: Apply encounters a conflict or write failure

- **WHEN** a matching identity differs, a normalized owner key is occupied by a
  different record, or any entity/category/audit write fails
- **THEN** the entire database transaction rolls back
- **AND** the command does not claim the batch completed.

### Requirement: Versioned first-batch Logo assets

The 40 reviewed first-batch Logos SHALL be versioned Web assets and SHALL be a
verified prerequisite rather than a runtime database-upload side effect.

#### Scenario: Logo assets are ready before apply

- **WHEN** the importer compares workbook-embedded Logos with the configured Web
  asset root
- **THEN** all 40 expected project paths exist with the exact content hashes
- **AND** each platform stores its corresponding project-relative Logo URL
- **AND** the administrator workspace can load all 40 assets.

#### Scenario: A Logo is missing or changed

- **WHEN** any expected file is absent, unreadable, corrupt, mismatched, or not
  mapped to exactly one platform row
- **THEN** plan reports an asset conflict and apply performs no database write
- **AND** the operator repairs or redeploys the asset set and retries the whole
  idempotent command.

### Requirement: First-batch receipts are bounded and recoverable

Every apply SHALL produce a versioned safe receipt containing the input hash,
importer version, asset-bundle hash, plan/apply counts, bounded warnings and
conflicts, and final status.

#### Scenario: Receipt persistence fails after database commit

- **WHEN** business records committed but the final receipt could not be moved
  into place
- **THEN** the command does not fabricate a saved receipt
- **AND** a repeated apply reconstructs the completed receipt from the exact
  existing records without creating duplicates
- **AND** no receipt contains supplier names, contacts, procurement amounts,
  internal notes, case URLs, or raw workbook cells.

## MODIFIED Requirements

### Requirement: Platform-owned customer catalog

The first-batch activation SHALL keep geography only in `regionScope`. Every
platform still requires one or more accepted non-geographic media categories;
the six overseas-platform category mapping remains a product-owner decision
before implementation.
