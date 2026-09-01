# Brand Knowledge Specification

## Purpose

Define the current Brand-owned rules for editable customer facts, controlled
industry and mainland-region selections, evaluation readiness, semantic
fingerprints, and the immutable projection consumed by GEO Intelligence.

## Requirements

### Requirement: Independent executable reference ownership

Brand Knowledge SHALL own one executable industry source and one independently
maintained administrative-region source. They SHALL NOT be presented as one
generic catalog engine.

#### Scenario: The approved industry catalog is active

- **WHEN** the application serves, persists, or consumes
  `industry-catalog@1.0.0`
- **THEN** exact nodes and maintained metadata come from the validated
  Brand-owned executable source
- **AND** the complete human-readable catalog is generated from that source
- **AND** forms, Prompts, API documents, and runtime modules do not maintain a
  second list.

#### Scenario: A maintained region release is active

- **WHEN** the application uses a reviewed official administrative-region
  publication
- **THEN** the snapshot records its authority, effective date, access time,
  source hashes, official identities, levels, and parent relationships
- **AND** runtime reads the checked offline snapshot rather than a government
  endpoint
- **AND** region maintenance does not inherit industry versioning,
  recommendation-subject, or `Other` semantics.

### Requirement: Controlled dependent industry selection

Brand Knowledge SHALL accept either no industry selection or one complete
primary-secondary path and SHALL enforce the selected primary's `Other` rule.

#### Scenario: A customer selects an industry

- **WHEN** a primary industry is chosen
- **THEN** the Web offers only active secondary choices under that primary
- **AND** changing the primary clears the secondary and stale `Other` phrase
- **AND** the client submits both stable identities
- **AND** the server verifies their parent-child relationship before one atomic
  Brand write.

#### Scenario: A customer selects `Other`

- **WHEN** the selected secondary is its primary's maintained `Other` node
- **THEN** the dropdown displays the concise label `其他` while retaining the
  category's stable identity and full catalog meaning
- **AND** the secondary field becomes one fused select-and-input control rather
  than adding another field below it
- **AND** a concrete product-or-service phrase of 2-60 normalized characters
  is required before evaluation readiness
- **AND** exact generic values `其他` and `其它` are rejected
- **AND** the normalized phrase is Brand data used by the fingerprint and new
  evaluation snapshots
- **BUT WHEN** the selected secondary is not `Other`
- **THEN** no stale phrase can affect readiness, fingerprint, or Query context.

#### Scenario: A client submits an invalid or partial industry path

- **WHEN** an identity is unknown, inconsistent, or only one tier is submitted
- **THEN** the mutation fails with a customer-actionable selection message
- **AND** no partial Brand selection is stored.

### Requirement: Controlled three-level mainland region selection

Brand Knowledge SHALL let a customer select one official terminal mainland
administrative division through a province-city-terminal interaction over the
official variable-depth tree.

#### Scenario: A customer selects an ordinary region

- **WHEN** a province contains an ordinary prefecture and county or district
- **THEN** the Web presents province, prefecture, and terminal choices in
  dependency order
- **AND** Brand persists all three selected identities
- **AND** the server validates the complete parent-child path.

#### Scenario: The official tree skips the city tier

- **WHEN** a municipality or province-direct county has no official prefecture
  node
- **THEN** the city control repeats the municipality or shows the confirmed
  `省直辖县级行政区划` presentation group
- **AND** Brand persists that stable display-path identity
- **BUT** a presentation-only identity does not enter the semantic fingerprint
  or masquerade as an official administrative division.

#### Scenario: A prefecture-level city has no ordinary county child

- **WHEN** the selected city is Dongguan, Zhongshan, Danzhou, or Jiayuguan
- **THEN** its third control contains the maintained official township, town,
  or street divisions
- **AND** the terminal identity retains its official nine-digit code and
  township level
- **AND** no third-party six-digit projection replaces it.

#### Scenario: A parent region choice changes

- **WHEN** the province or city/group changes
- **THEN** incompatible downstream choices are cleared and disabled until the
  new options load
- **AND** the server rejects stale, partial, or forged paths before writing.

### Requirement: Honest Brand readiness

Brand Knowledge SHALL derive evaluation readiness from complete and valid
current Brand facts.

#### Scenario: A Brand becomes evaluation-ready

- **WHEN** company name, valid industry path, applicable `Other` phrase, valid
  terminal region, two characteristics, contact name, and contact mobile satisfy
  their current rules
- **THEN** the Brand is ready for evaluation
- **AND** registration, Brand management, and diagnosis observe the same result.

### Requirement: Semantic evaluation fingerprint

Brand Knowledge SHALL compute the evaluation fingerprint from normalized
business meaning and stable official identities while excluding representation
and contact maintenance.

#### Scenario: Evaluation-relevant meaning changes

- **WHEN** company name, either industry identity, applicable `Other` phrase,
  either characteristic, or an official region identity changes
- **THEN** the fingerprint changes
- **AND** the ordinary new evaluation-input revision rule applies.

#### Scenario: Only representation or contact changes

- **WHEN** a label, order, source/catalog version, alias, presentation group,
  non-semantic recommendation subject, contact name, or contact mobile changes
- **THEN** the fingerprint remains unchanged
- **AND** the change alone cannot create a new Definition, question set, report-
  changed notice, or free-evaluation opportunity.

#### Scenario: An official region is renamed without an identity change

- **WHEN** a later accepted snapshot changes only a node label
- **THEN** the current Brand may display the new label without a fingerprint
  change
- **AND** earlier Definitions and reports retain their frozen labels.

### Requirement: Stable evaluation-purpose projection

Brand Knowledge SHALL expose one projection that freezes the resolved identity
and display meaning consumed by GEO Intelligence.

#### Scenario: GEO prepares a Definition

- **WHEN** GEO requests an active, account-owned, evaluation-ready Brand
- **THEN** Brand Knowledge returns the fingerprint, normalized company and
  characteristics, industry IDs and labels, catalog version, applicable `Other`
  phrase, actual recommendation subject, all three region selections and
  labels, official terminal identity and level, official semantic path, and
  region source release
- **AND** `Other` uses the normalized customer phrase as the actual
  recommendation subject
- **AND** GEO freezes this projection in the versioned snapshot
- **AND** GEO does not import reference sources, re-resolve future labels, or
  read Brand persistence directly.

#### Scenario: Reference data changes after a Definition exists

- **WHEN** a later release changes excluded representation data
- **THEN** the existing Definition returns its frozen projection
- **AND** unchanged Brand fingerprint preparation returns that same Definition.

### Requirement: Migration preserves history and opportunity meaning

Activation SHALL classify legacy data before writing, preserve immutable
snapshot JSON, and prevent representation-only conversion from changing an
evaluation opportunity.

#### Scenario: Legacy data maps exactly

- **WHEN** old industry and region text resolve to one stable selection without
  a fingerprint collision
- **THEN** migration assigns stable identities and synchronizes Brand,
  Definition, and Run fingerprint keys atomically
- **AND** it adds, removes, merges, or resets no Definition, question, Run,
  sample, report, or completed-evaluation count
- **AND** Definition eligibility remains unchanged.

#### Scenario: Development data cannot map exactly

- **WHEN** a value is unknown, ambiguous, partial, missing a required legacy
  `Other` phrase, or would collapse two Definitions
- **THEN** migration aborts before any new columns or constraints commit
- **AND** the unexpected development data is resolved explicitly before replay
- **AND** the product adds no legacy-review UI or mixed old/new write path.

#### Scenario: A legacy immutable snapshot is read

- **WHEN** a Definition or Run contains the original unversioned snapshot
- **THEN** the central compatibility decoder treats it as the legacy schema
- **AND** processing, retry, synthesis, reporting, and history use its frozen
  labels without requiring later stable IDs
- **AND** migration does not rewrite the snapshot JSON.

### Requirement: One responsive Brand reference form

Registration and Brand management SHALL reuse one responsive controlled field
group and the generated API contract.

#### Scenario: A customer creates the first Brand during registration

- **WHEN** the customer chooses not to skip Brand creation
- **THEN** registration uses the same complete industry, region, `Other`, and
  readiness rules as later Brand creation and editing.

#### Scenario: A customer uses a narrow screen or keyboard

- **WHEN** the shared field group is narrow or operated without a pointer
- **THEN** controls retain visible labels, native selection behavior, truthful
  loading/disabled states, and a stacked responsive layout
- **AND** selected values, placeholders, and the complete `Other` hint remain
  readable without horizontal overflow
- **AND** the full region tree is not bundled into the initial client route.
