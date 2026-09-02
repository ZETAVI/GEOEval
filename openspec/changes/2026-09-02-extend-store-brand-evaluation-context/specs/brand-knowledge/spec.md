# Brand Knowledge Delta: Store Evaluation Context

## ADDED Requirements

### Requirement: One verified Store Location

Brand Knowledge SHALL own at most one current Store Location for a Brand and
SHALL allow only a server-verified, customer-confirmed location to participate
in evaluation readiness and projection.

#### Scenario: A customer searches for a concrete store

- **GIVEN** an authenticated customer has selected a valid Brand-owned official
  region path
- **WHEN** the customer submits a specific store name, landmark, or address
- **THEN** Brand queries the approved server-side Store Location adapter within
  that region and returns a bounded safe candidate list
- **AND** the browser receives no Web Service Key, raw provider response, or
  authoritative mutation fields
- **AND** search text and unselected candidates do not become Brand or
  evaluation business truth.

#### Scenario: A customer selects a candidate

- **WHEN** the customer selects one candidate
- **THEN** the server resolves current provider place detail and reverse-
  geocodes its coordinate
- **AND** checks required identity, structured address, coordinate, and official-
  region coherence
- **AND** returns a short-lived account/Brand-bound sealed verification receipt
  plus a customer-safe preview
- **AND** forged, altered, stale, cross-account, or unverifiable client data
  cannot become Store Location facts.

#### Scenario: A verified location is committed

- **WHEN** a valid verification receipt and permitted Query locality choice are
  submitted with a Brand mutation
- **THEN** Brand atomically stores the minimum approved structured Store
  Location, source provenance, and final locality with the profile update
- **AND** records GCJ-02 explicitly for provider coordinates
- **AND** no external call occurs inside the database transaction
- **AND** an unchanged committed location remains usable without a runtime
  provider call.

#### Scenario: Store verification is unavailable

- **WHEN** search, provider, authorization, quota, or verification fails
- **THEN** the customer receives one simple corrective or later-retry action
- **AND** may save unrelated Brand fields as a draft
- **AND** a missing new location does not replace an existing verified location
  or become evaluation-ready through manual, client, or Agent-supplied facts.

### Requirement: Honest Query locality

Brand Knowledge SHALL expose either one customer-selected verified business area
or one precise verified address locality and SHALL preserve the distinction.

#### Scenario: Provider evidence contains business areas

- **WHEN** verified place and reverse-geocode evidence contains one or more
  bounded business-area candidates
- **THEN** Brand de-duplicates them in deterministic order and asks the customer
  to select one
- **AND** only that selected candidate becomes the final Query locality
- **AND** provider ranking or Agent inference does not make the choice.

#### Scenario: Provider evidence contains no business area

- **WHEN** a verified Store Location has no business-area candidate
- **THEN** Brand offers a precise verified address/place locality with kind
  `ADDRESS_LOCALITY`
- **AND** customer and Query projections do not label or describe that value as
  a business area.

### Requirement: Required flagship product or service

Brand Knowledge SHALL own one customer field named `主打产品或服务` whose
evaluation meaning remains separate from industry classification.

#### Scenario: A Brand describes its flagship offer

- **WHEN** the customer supplies a normalized concrete product/service phrase of
  2-80 characters
- **THEN** Brand stores it as `flagshipProductOrService`
- **AND** it participates in readiness, fingerprint, and the v3 projection
- **AND** it does not replace the broader industry `recommendationSubject`, the
  conditional industry `otherProductOrService`, or a future optimization product
  catalog.

#### Scenario: The value is absent or generic

- **WHEN** the value is absent, outside the bound, or exactly a generic value
  such as `产品`, `服务`, `其他`, or `其它`
- **THEN** the Brand may remain a draft but is not evaluation-ready
- **AND** no Provider or Agent invents a substitute.

### Requirement: Ordered extensible characteristics

Brand Knowledge SHALL store one ordered characteristic collection, render two
inputs by default, and bound evaluation-ready profiles to two through six
distinct normalized values.

#### Scenario: A customer maintains characteristics

- **WHEN** the customer adds, edits, removes, or reorders characteristics
- **THEN** the Web preserves the visible customer order and supports keyboard-
  accessible add/remove/move behavior
- **AND** the server accepts at most six values, each 2-120 characters
- **AND** rejects exact normalized duplicates
- **AND** the complete order participates in the evaluation fingerprint.

#### Scenario: Query later consumes the list

- **WHEN** #26 constructs the two existing characteristic question roles
- **THEN** it consumes the frozen ordered list from the v3 projection
- **AND** may select or combine characteristics according to its own approved
  Prompt and Model Contract
- **AND** Brand does not create more questions, choose angles, or expose its
  persistence to Query.

### Requirement: Semantic evaluation fingerprint v3

Brand Knowledge SHALL compute new store-context revisions through
`brand-evaluation-input@3` while preserving migrated v2 identity until a real
evaluation-semantic edit occurs.

#### Scenario: Store-context meaning changes

- **WHEN** the selected Store Location or final Query locality, flagship product
  or service, any characteristic value, or characteristic order changes
- **THEN** the v3 fingerprint changes
- **AND** the ordinary new evaluation-input revision rule applies.

#### Scenario: Provider representation changes

- **WHEN** verification time, provider response hash/contract version, address
  label, candidate order, or coordinate representation is refreshed for the
  same selected Store Location and Query locality
- **THEN** the Store Location semantic fact identity and Brand fingerprint remain
  unchanged
- **AND** the refresh alone creates no Definition, question set, changed-data
  notice, or official-evaluation opportunity.

#### Scenario: Contact or presentation changes

- **WHEN** only contact, display, source-version, label, or other already excluded
  representation data changes
- **THEN** the active fingerprint remains unchanged under its current scheme.

### Requirement: Stable evaluation-purpose snapshot v3

Brand Knowledge SHALL expose one complete v3 projection and GEO Intelligence
SHALL freeze it without reading Brand persistence or the Store Location adapter.

#### Scenario: GEO prepares a v3 Definition

- **WHEN** an active account-owned Brand has a verified Store Location, concrete
  flagship product/service, two through six valid characteristics, and all
  existing readiness facts
- **THEN** Brand returns its v3 fingerprint, existing frozen industry/official-
  region meaning, structured Store Location display and provenance, explicit
  coordinate system, final Query locality, flagship value, and ordered
  characteristics
- **AND** GEO stores `brand-evaluation-snapshot@3`
- **AND** #26 consumes only a GEO-owned Query projection over that snapshot
- **AND** neither GEO nor Query calls Amap, reads Brand tables, trusts browser
  facts, or re-resolves later display data.

#### Scenario: Current Brand facts change later

- **WHEN** Brand, provider representation, or reference data changes after a v3
  Definition exists
- **THEN** that Definition, its questions, Run, retry, report, and history retain
  the exact frozen v3 projection actually used.

### Requirement: v1/v2 history and opportunity continuity

Activation SHALL preserve every existing snapshot and business record and SHALL
not manufacture or hide an evaluation opportunity through representation
migration.

#### Scenario: Existing Brands are migrated

- **WHEN** the two current characteristic columns map exactly to an ordered
  collection
- **THEN** migration preserves their order and text
- **AND** retains the exact Brand v2 fingerprint and records its scheme
- **AND** creates no Store Location or flagship value
- **AND** rewrites no Definition/Run fingerprint, snapshot JSON, question, Run,
  sample, attempt, synthesis, report, notification, or completed count.

#### Scenario: An unchanged existing Definition is observed

- **GIVEN** migration made the current Brand incomplete for a new v3 Definition
- **WHEN** the Brand still has an existing v1/v2 Definition at its retained
  current v2 fingerprint
- **THEN** GEO finds and returns that Definition before requiring a new v3-ready
  projection
- **AND** an unstarted Definition remains eligible, while active/retryable/
  completed Runs continue from their frozen snapshots.

#### Scenario: The customer makes the first semantic edit

- **WHEN** the customer changes any evaluation-semantic field after migration
- **THEN** the current Brand moves to v3 fingerprint semantics
- **AND** an earlier unstarted v1/v2 Definition becomes stale through the
  ordinary rule
- **AND** a later completed v3 profile receives a new opportunity because its
  meaning changed, not because migration ran.

#### Scenario: Historical snapshots are decoded

- **WHEN** processing or presentation reads an unversioned legacy-v1,
  structured-v2, or structured-v3 snapshot
- **THEN** one GEO-owned strict union decoder returns its frozen meaning
- **AND** no optional-field inference rewrites one version as another
- **AND** Parser, Synthesis, report, retry, and history behavior for v1/v2 remain
  unchanged by #40.

### Requirement: One responsive Store Brand form

Registration and Brand management SHALL reuse the generated Brand contract and
one accessible field group for location, flagship value, and characteristics.

#### Scenario: A customer creates or edits a Brand

- **WHEN** the Store Brand field group is shown
- **THEN** it provides visible labels, address feedback before confirmation,
  honest loading/empty/failure states, two default characteristic rows, bounded
  add/remove/reorder actions, and a stacked narrow-screen layout
- **AND** the customer can save an incomplete draft
- **AND** all required fields and one verified Store Location are necessary
  before entering the new v3 evaluation path.

#### Scenario: A provider interaction fails

- **WHEN** the customer is on a narrow screen, uses only a keyboard, or receives
  no provider result
- **THEN** focus, status, error, retry, and candidate selection remain operable
- **AND** the UI does not fabricate a map success, address, locality, or
  evaluation-ready state.

## MODIFIED Requirements

### Requirement: Honest Brand readiness

Brand Knowledge SHALL derive readiness from all accepted current facts.

#### Scenario: A Store Brand becomes evaluation-ready

- **WHEN** company name, valid industry/`Other`, valid official region, one
  verified Store Location coherent with that region, concrete flagship
  product/service, two through six valid ordered characteristics, contact name,
  and contact mobile satisfy their rules
- **THEN** the Brand is ready for a new v3 evaluation
- **AND** registration, Brand management, and diagnosis observe the same result
- **BUT** an unchanged existing v1/v2 Definition retains its separate historical
  eligibility under the continuity requirement.
