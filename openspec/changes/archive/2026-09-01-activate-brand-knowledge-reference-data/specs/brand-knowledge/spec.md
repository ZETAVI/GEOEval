# Brand Knowledge Delta Specification

## ADDED Requirements

### Requirement: Independent executable reference ownership

Brand Knowledge SHALL own one executable industry source and one independently
maintained administrative-region source without presenting them as one generic
catalog capability.

#### Scenario: The approved industry catalog is activated

- **WHEN** the application first serves, persists, or consumes the exact
  `industry-catalog@1.0.0` nodes
- **THEN** the exact nodes move from the product document to one validated
  executable Brand-owned source
- **AND** a complete human-readable reference is generated from that source
- **AND** no form, Prompt, API document, or second runtime file hand-maintains a
  copy of the catalog.

#### Scenario: A maintained region release is activated

- **WHEN** a reviewed official administrative-region publication becomes an
  application source
- **THEN** Brand Knowledge records its authority, effective date, access time,
  normalized content hash, official node identities, levels, parent
  relationships, and retained historical status
- **AND** application runtime reads the reviewed offline release rather than a
  government endpoint
- **AND** region refresh does not inherit industry versioning,
  recommendation-subject, `Other`, or boundary semantics.

### Requirement: Controlled dependent industry selection

Brand Knowledge SHALL accept one active secondary industry identity under its
approved primary and SHALL enforce the `Other` product-or-service rule.

#### Scenario: A customer selects an industry

- **WHEN** the customer chooses a primary industry
- **THEN** the Web offers only active secondary choices owned by that primary
- **AND** changing the primary clears an incompatible secondary selection
- **AND** the client submits both stable identities and the server verifies that
  the secondary belongs to the submitted primary rather than trusting display
  labels or frontend filtering alone.

#### Scenario: A customer selects `Other`

- **WHEN** the selected secondary category is its primary's maintained `Other`
  node
- **THEN** the dropdown presents that option as the concise label `其他` while
  retaining its stable category identity
- **AND** the secondary field becomes one fused select-and-input control rather
  than adding a separate field below it
- **AND** a concrete product-or-service phrase of 2-60 normalized characters
  is required before the Brand is evaluation-ready
- **AND** exact generic values `其他` and `其它` are rejected
- **AND** the normalized phrase is saved as Brand data and participates in the
  evaluation fingerprint and future snapshot
- **BUT WHEN** the selected category is not `Other`
- **THEN** a stale `Other` phrase cannot affect readiness, fingerprint, or Query
  context.

#### Scenario: A client submits an invalid category

- **WHEN** a category is unknown, retired, presentation-only, or inconsistent
  with the current executable industry source
- **THEN** the mutation fails with a customer-actionable selection message
- **AND** no partial Brand selection is stored.

### Requirement: Controlled variable-depth region selection

Brand Knowledge SHALL let a customer select one official terminal mainland
administrative division while presenting a familiar province-city-terminal
interaction over the official variable-depth tree.

#### Scenario: A customer selects an ordinary region

- **WHEN** an official province contains an ordinary prefecture and county or
  district
- **THEN** the Web presents province, prefecture, and terminal county/district
  choices in dependency order
- **AND** Brand persists the complete province, city, and terminal selection
  identities and the server validates their parent-child path.

#### Scenario: The official tree skips a display tier

- **WHEN** a municipality or province-direct county has no official prefecture
  node
- **THEN** the Web repeats the municipality or shows the confirmed
  `province-direct county-level divisions` presentation group in the city
  control
- **AND** Brand persists that stable selection identity as part of the visible
  three-control path
- **BUT** a presentation-only group does not become an official administrative
  identity or participate in the semantic fingerprint.

#### Scenario: A prefecture-level city has no ordinary county child

- **WHEN** the customer selects Dongguan, Zhongshan, Danzhou, or Jiayuguan under
  the confirmed first-release rule
- **THEN** the terminal choices are the maintained official township, town, or
  street divisions attached to that city
- **AND** the persisted identity retains the official code and township level
- **AND** a third-party six-digit projection code is not substituted for the
  official identity.

#### Scenario: A parent region choice changes

- **WHEN** the customer changes the province or city/group choice
- **THEN** every incompatible downstream choice is cleared and disabled until
  the new options are available
- **AND** the server still rejects any stale or forged terminal selection.

### Requirement: Honest Brand readiness

Brand Knowledge SHALL derive evaluation readiness from complete, valid current
brand facts rather than from non-empty legacy labels.

#### Scenario: A Brand has complete controlled selections

- **WHEN** the company name, valid industry selection, conditional `Other`
  phrase, valid official terminal region, two characteristics, contact name, and
  contact mobile satisfy their current rules
- **THEN** the Brand is ready for evaluation
- **AND** registration, brand management, and diagnosis observe that same
  readiness result.

### Requirement: Semantic evaluation fingerprint

Brand Knowledge SHALL compute the evaluation fingerprint from normalized brand
semantics and stable reference identities while excluding representation-only
maintenance.

#### Scenario: An evaluation-relevant semantic fact changes

- **WHEN** the normalized company name, either selected industry identity,
  applicable `Other` phrase, either characteristic, or an official identity in
  the three-level region path
  changes
- **THEN** Brand Knowledge produces a different evaluation fingerprint
- **AND** the existing product rule for a new evaluation-input revision applies.

#### Scenario: Only representation or contact data changes

- **WHEN** a label, ordering, source/catalog version, alias, presentation group,
  non-semantic recommendation subject, contact name, or contact mobile changes
- **THEN** the evaluation fingerprint remains unchanged
- **AND** the change alone cannot create a new Definition, question set, report-
  changed notice, or free evaluation opportunity.

#### Scenario: An official region is renamed without a code change

- **WHEN** an accepted later official release changes only a node's label while
  retaining its official code and identity under the maintained rule
- **THEN** the current Brand may display the new label
- **AND** its fingerprint remains unchanged
- **AND** an earlier Definition and report retain the label frozen in their
  original snapshot.

### Requirement: Stable evaluation-purpose projection

Brand Knowledge SHALL expose one evaluation-purpose projection that freezes the
resolved identity and display meaning consumed by GEO Intelligence.

#### Scenario: GEO prepares a Definition

- **WHEN** GEO requests the evaluation-purpose view of an active, account-owned,
  evaluation-ready Brand
- **THEN** Brand Knowledge returns the Brand fingerprint, normalized company
  name and characteristics, industry primary/secondary stable identities and
  labels, catalog version, applicable `Other` phrase, actual recommendation
  subject, all three selected region identities and labels, terminal official
  level, and source release identity
- **AND** an `Other` selection uses the normalized customer product-or-service
  phrase as the actual recommendation subject rather than the generic `Other`
  label
- **AND** GEO freezes that projection in the new snapshot schema
- **AND** GEO never imports either reference source, re-resolves later labels,
  or reads Brand persistence directly.

#### Scenario: Reference data changes after a Definition exists

- **WHEN** a later industry or region release changes a display label, version,
  ordering, or other excluded representation data
- **THEN** the existing Definition returns its original immutable projection
- **AND** repeated preparation of the unchanged Brand fingerprint returns the
  same Definition rather than regenerating from current reference display data.

### Requirement: Migration preserves history and opportunity meaning

The activation migration SHALL classify legacy data before writing, preserve
immutable snapshots, and prevent a representation-only conversion from
creating or invalidating an evaluation opportunity.

#### Scenario: Legacy Brand and Definition data map exactly

- **WHEN** the old industry and region text resolve to one exact stable semantic
  selection with no fingerprint collision
- **THEN** the migration assigns stable identities and updates the Brand,
  Definition, and Run fingerprint keys consistently
- **AND** no Definition, question, Run, sample, report, or completed-evaluation
  count is added, removed, merged, or reset
- **AND** an unstarted Definition remains eligible exactly when it was eligible
  before the representation change.

#### Scenario: Development data cannot be converted exactly

- **WHEN** a legacy value has no exact match, several matches, a missing
  `Other` phrase, or would collapse two Definitions of one Brand onto one stable
  fingerprint
- **THEN** the development migration aborts before any affected write or new
  constraint is committed
- **AND** it reports the unexpected development record for explicit resolution
  and replay
- **AND** the product does not add customer legacy-review UI, unresolved
  fingerprints, or a mixed old/new write path.

#### Scenario: Old immutable snapshots are read after activation

- **WHEN** a Definition or Run contains the original unversioned snapshot shape
- **THEN** one versioned compatibility decoder treats it as the legacy schema
- **AND** processing, retry, synthesis, report rendering, and history can use its
  frozen original labels without requiring stable IDs that did not exist
- **AND** the migration does not rewrite the snapshot JSON.

### Requirement: One responsive Brand reference form

Registration and Brand management SHALL reuse one responsive controlled field
group and one generated API contract.

#### Scenario: A customer creates the first Brand during registration

- **WHEN** the customer chooses not to skip Brand creation
- **THEN** registration uses the same complete industry, region, `Other`, and
  readiness rules as later Brand creation and editing
- **AND** it does not submit a partial free-text industry contract maintained
  separately from My Brands.

#### Scenario: A customer uses a narrow screen or keyboard

- **WHEN** the Brand form is shown on a narrow screen or operated without a
  pointer
- **THEN** the dependent controls retain visible associated labels, native
  keyboard/mobile selection behavior, honest disabled/loading states, and a
  stacked responsive layout
- **AND** selected industry values, placeholders, and the complete `Other` hint
  are not clipped by the control layout
- **AND** the full region tree is not bundled into the initial client route.
