# Media Supply Administrator Workspace Delta Specification

## ADDED Requirements

### Requirement: Administrator-only Media Supply workspace

The Web SHALL provide a role-specific Media Supply maintenance workspace only
to an authenticated system administrator while preserving backend authorization
as the authoritative enforcement boundary.

#### Scenario: An administrator signs in

- **WHEN** an account with role `ADMINISTRATOR` completes the existing login
  challenge
- **THEN** the Web opens the Media Supply administrator workspace
- **AND** it does not call the terminal-customer Brand API as part of that route
- **AND** the administrator can sign out through the shared authenticated shell.

#### Scenario: Another role opens the administrator route

- **WHEN** a terminal customer, operations user, or agent opens `/admin/media`
- **THEN** the Web presents an access-denied state without requesting or
  rendering administrator Media Supply projections
- **AND** the existing backend role guard still rejects any direct administrator
  API call.

### Requirement: Coherent maintenance with visible ownership boundaries

The administrator workspace SHALL connect the normal maintenance sequence while
keeping platform identity, sales Listing, concrete resources, and internal
sources visibly and behaviorally distinct.

#### Scenario: An administrator finds or creates a platform

- **WHEN** an administrator opens a populated workspace
- **THEN** the platform list can be narrowed by text, category, and platform or
  Listing status
- **AND** selecting a result opens its identity, sales, resource, and audit
  regions without merging their fields into one undifferentiated form
- **BUT WHEN** no platform exists or no platform matches the filters
- **THEN** the workspace presents the corresponding empty state and an
  appropriate create or clear-filter action.

#### Scenario: An administrator maintains platform identity

- **WHEN** the administrator creates or edits a platform
- **THEN** the form supports display name, aliases, concise description, Logo
  reference, domestic/overseas scope, active/archive status, and one or more
  fixed categories
- **AND** a create defaults to domestic and active
- **AND** a mutation reason is required before submission
- **AND** accepted changes refresh the selected platform and audit view.

#### Scenario: An administrator maintains a resource and current source

- **WHEN** the administrator creates or edits a concrete resource
- **THEN** resource identity, first-publish/repost mode, hidden/full/masked
  customer presentation, quality tier, status, account information, optional
  case, RMB-fen procurement cost, and publication notes follow the existing API
  contract
- **AND** the create defaults to first publish, active, hidden, and medium
  quality
- **AND** a masked resource requires an explicit public alias
- **AND** the resource selects one current internal source
- **AND** source contact and notes remain in a separately labeled internal
  source region
- **AND** a missing procurement cost does not prevent saving or Listing changes.

### Requirement: Revision-safe Listing maintenance

The administrator workspace SHALL make the platform-level Listing price and
state explicit and SHALL prevent a stale page from silently overwriting a newer
commercial revision.

#### Scenario: An administrator changes a Listing

- **WHEN** an existing Listing price or state is submitted
- **THEN** the request includes the revision currently displayed by the page as
  `expectedRevision`
- **AND** the point price is represented as a positive whole number of points or
  left empty only when the backend state permits it
- **AND** the workspace explains `DRAFT`, `ON_SHELF`, `PAUSED`, and `OFF_SHELF`
  as platform sales states rather than resource availability.

#### Scenario: A stale Listing revision is rejected

- **GIVEN** another accepted mutation has advanced the Listing revision
- **WHEN** the administrator submits the older revision
- **THEN** the workspace does not claim success or replace the local revision
- **AND** it explains that commercial data changed elsewhere
- **AND** it provides a refresh action and requires the administrator to review
  and submit the new state again.

### Requirement: Complete role-appropriate interaction states

The administrator workspace SHALL present actionable loading, success,
validation, authorization, conflict, backend-failure, and audit states without
exposing technical diagnostics as user-facing copy.

#### Scenario: A request has not completed

- **WHEN** initial data or a selected platform region is loading
- **THEN** the layout retains stable orientation and identifies what is loading
- **AND** duplicate mutation controls are disabled while a save is pending.

#### Scenario: Input needs correction

- **WHEN** a required reason, category, name, source, masked alias, integer
  price, integer procurement cost, or URL-shaped input is invalid
- **THEN** the workspace identifies the relevant field or region before
  submission where practical
- **AND** a controlled backend validation response is shown as a correction the
  administrator can make
- **AND** entered values are retained.

#### Scenario: The backend request fails temporarily

- **WHEN** loading or mutation fails without a role or revision conflict
- **THEN** the workspace states which operation was not completed
- **AND** it retains safe local input where applicable
- **AND** it offers retry or refresh without claiming a partial save.

#### Scenario: An administrator inspects history

- **WHEN** the administrator opens the audit region for a selected entity or the
  catalog
- **THEN** entries remain read-only
- **AND** show actor, occurrence time, action, reason, entity, and before/after
  values in a bounded readable presentation
- **AND** audit information never appears on a non-administrator page.

### Requirement: Responsive administrator presentation

The Media Supply workspace SHALL be desktop-first for dense maintenance while
remaining usable for status inspection and ordinary lightweight actions on a
mobile viewport.

#### Scenario: The viewport narrows

- **WHEN** the workspace is used on a tablet or mobile-sized viewport
- **THEN** navigation, platform selection, status inspection, forms, feedback,
  and ordinary save actions remain reachable without horizontal page overflow
- **AND** dense panels stack in a stable reading order
- **AND** the responsive composition does not turn administrator data into the
  terminal-customer media presentation.
