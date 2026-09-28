# Brand Knowledge Specification

## Purpose

Define the current Brand-owned rules for editable customer facts, controlled
industry selection, one verified Store Location, writing information, derived
readiness, consumer-specific fingerprints, and the immutable projections
consumed by GEO Intelligence and GEO Optimization.

## Requirements

### Requirement: Independent executable reference ownership

Brand Knowledge SHALL own one executable industry source and one independently
maintained administrative-region source. They SHALL NOT be presented as one
generic catalog engine or as two customer-editable location standards.

#### Scenario: The approved industry catalog is active

- **WHEN** the application serves, persists, or consumes
  `industry-catalog@1.0.0`
- **THEN** exact nodes and maintained metadata come from the validated
  Brand-owned executable source
- **AND** the complete human-readable catalog is generated from that source
- **AND** forms, Prompts, API documents, and runtime modules do not maintain a
  second list.

#### Scenario: A maintained region release is active

- **WHEN** the application maps verified Store Location evidence through a
  reviewed official administrative-region publication
- **THEN** the snapshot records its authority, effective date, access time,
  source hashes, official identities, levels, and parent relationships
- **AND** runtime reads the checked offline snapshot rather than a government
  endpoint
- **AND** customers and Agents cannot select or override a separate official
  province, city, or terminal path.

### Requirement: Controlled dependent industry selection

Brand Knowledge SHALL accept either no industry selection or one complete
primary-secondary path and SHALL enforce the selected primary's `Other` rule.

#### Scenario: A customer selects an industry

- **WHEN** a primary industry is chosen
- **THEN** Web offers only active secondary choices under that primary
- **AND** changing the primary clears the secondary and stale `Other` phrase
- **AND** the client submits both stable identities
- **AND** the server verifies their parent-child relationship before one atomic
  Brand write.

#### Scenario: A customer selects `Other`

- **WHEN** the selected secondary is its primary's maintained `Other` node
- **THEN** the dropdown displays the concise label `其他` while retaining the
  category's stable identity and full catalog meaning
- **AND** the secondary field becomes one fused select-and-input control
- **AND** a concrete product-or-service phrase of 2-60 normalized characters is
  required before evaluation readiness
- **AND** exact generic values `其他` and `其它` are rejected
- **AND** the normalized phrase participates in the fingerprint and v3 snapshot
- **BUT WHEN** the selected secondary is not `Other`
- **THEN** no stale phrase can affect readiness, fingerprint, or Query context.

#### Scenario: A client submits an invalid or partial industry path

- **WHEN** an identity is unknown, inconsistent, or only one tier is submitted
- **THEN** the mutation fails with a customer-actionable selection message
- **AND** no partial Brand selection is stored.

### Requirement: One verified Store Location

Brand Knowledge SHALL own at most one current Store Location for a Brand and
SHALL allow only a server-verified, customer-confirmed location to participate
in readiness, fingerprinting, or evaluation projection.

#### Scenario: A customer searches for a concrete store

- **GIVEN** an authenticated customer is creating or editing a Brand
- **WHEN** the customer submits a specific store name plus city, landmark, or
  address text
- **THEN** Web loads a Beijing-centered Amap map, keeps typing local until an
  explicit search action, then delegates the full-address result panel, POI
  Markers, viewport fitting, and result selection to Amap JS API `PlaceSearch`
- **AND** no separate province/city/terminal selector is present
- **AND** Web does not load Geolocation, request browser/device/IP position, or
  show a current-location action by default
- **AND** the browser receives only the domain-restricted Web(JS API) Key, never
  the JS security key, Web Service Key, raw provider response, or authoritative
  mutation fields
- **AND** the security proxy serves a matching JSONP callback with JavaScript
  MIME under the public `nosniff` policy, keeps ordinary JSON as JSON, and rejects
  invalid/duplicate callbacks or non-JSON/mismatched callback responses
- **AND** search text and unselected candidates do not become Brand truth.

#### Scenario: A customer selects a candidate

- **WHEN** the customer selects one Marker or its matching list item
- **THEN** the server resolves current provider place detail and reverse-
  geocodes its coordinate
- **AND** treats the selected POI detail address as the exact Store Location
  address while using reverse geocoding for administrative, township, and
  locality coherence
- **AND** uses a reverse-geocoded formatted address only when current POI detail
  has no address, never to replace a more precise selected-POI address
- **AND** checks required identity, structured address, and coordinate
- **AND** maps provider adcode/towncode evidence to exactly one maintained MCA
  province/city/terminal path
- **AND** returns a short-lived account/Brand-bound sealed verification receipt
  plus a customer-safe preview
- **AND** forged, altered, stale, cross-account, replayed, or unverifiable client
  data cannot become Store Location facts.

#### Scenario: Provider evidence cannot derive one official region

- **WHEN** verified provider detail/reverse-geocode evidence is missing,
  contradictory, or cannot map exactly to one maintained MCA terminal
- **THEN** no verification receipt is issued
- **AND** the customer may search for another exact POI or contact support
- **AND** neither the customer nor an Agent can manually override the region.

#### Scenario: A verified location is committed

- **WHEN** a valid unconsumed verification receipt is submitted with a Brand
  mutation
- **THEN** Brand atomically stores the minimum approved structured Store
  Location, source provenance, receipt-consumption state, and final locality
  with the profile update
- **AND** records GCJ-02 explicitly for provider coordinates
- **AND** locks and checks the current Brand aggregate before replacement so a
  concurrent stale mutation cannot overwrite a newer location
- **AND** no external call occurs inside the database transaction
- **AND** an unchanged committed location remains usable without a runtime
  provider call.

#### Scenario: Store verification is unavailable

- **WHEN** search, provider, authorization, quota, or verification fails
- **THEN** the customer receives one simple corrective or later-retry action
- **AND** may save unrelated Brand fields as a draft
- **AND** failure does not remove an existing location or fabricate readiness.

### Requirement: Honest Query locality

Brand Knowledge SHALL automatically expose either one verified business area or
one precise verified address locality and SHALL preserve the distinction.

#### Scenario: Provider evidence contains business areas

- **WHEN** verified place and reverse-geocode evidence contains one or more
  bounded business-area labels
- **THEN** Brand de-duplicates them in deterministic evidence order
- **AND** automatically uses the selected POI detail business area first, then
  the first reverse-geocode business area
- **AND** the customer, browser, and Agent cannot substitute another locality.

#### Scenario: Provider evidence contains no business area

- **WHEN** a verified Store Location has no business-area candidate
- **THEN** Brand automatically uses a precise verified address/place locality
  with kind
  `ADDRESS_LOCALITY`
- **AND** customer and Query projections do not label it as a business area
- **AND** Query may phrase it naturally without changing or inventing it.

### Requirement: Required flagship product or service

Brand Knowledge SHALL own one customer field named `主打产品或服务` whose
evaluation meaning remains separate from industry classification.

#### Scenario: A Brand describes its flagship offer

- **WHEN** the customer supplies a normalized concrete product/service phrase of
  2-80 characters
- **THEN** Brand stores it as `flagshipProductOrService`
- **AND** it participates in readiness, fingerprint, and the v3 projection
- **AND** it does not replace `recommendationSubject`, conditional
  `otherProductOrService`, or a future optimization product catalog.

#### Scenario: The value is absent or generic

- **WHEN** the value is absent, outside the bound, or exactly `产品`, `服务`,
  `其他`, or `其它`
- **THEN** the Brand may remain a draft but is not evaluation-ready
- **AND** no Provider or Agent invents a substitute.

### Requirement: Peer extensible characteristics

Brand Knowledge SHALL store one peer characteristic collection whose stable
items contain an ID, title and optional writing detail, and SHALL bound an
evaluation-ready profile to two through six items.

#### Scenario: A customer maintains characteristics

- **WHEN** the customer creates, edits, removes or reorders characteristics
- **THEN** each stored item has one server-owned stable ID, one normalized title
  and an optional normalized detail
- **AND** title retains the current 2-120-character and exact-duplicate rules
- **AND** a present detail is writing-only and contains 2-1000 normalized
  characters
- **AND** presentation order implies no Evaluation priority
- **AND** the customer can maintain two through six items without also entering
  a second core-strength or product-feature collection.

#### Scenario: Evaluation consumes structured characteristics

- **WHEN** Brand prepares the existing v3 Evaluation projection
- **THEN** it projects only canonical normalized titles
- **AND** IDs, details and presentation order do not enter the Evaluation
  snapshot or fingerprint
- **AND** changing a detail alone creates no Evaluation opportunity
- **AND** the one-time representation migration preserves the existing v3
  fingerprint whenever normalized titles did not change.

### Requirement: One revision controls the current Brand aggregate

Every update to current Brand facts SHALL use one optimistic-concurrency
revision rather than field-local or Article Information revisions.

#### Scenario: A customer explicitly saves Brand information

- **WHEN** the customer submits a Brand save with the current expected revision
- **THEN** Brand validates and writes the complete mutation atomically
- **AND** increments the Brand revision once
- **AND** returns the new revision and both purpose fingerprints
- **AND** no external or Writer call runs inside the transaction.

#### Scenario: A customer saves from stale information

- **WHEN** expected revision does not match the current Brand revision
- **THEN** no field is overwritten
- **AND** the customer receives a recoverable refresh-and-review conflict
- **AND** location verification checks remain part of the same Brand write rather
  than becoming a second general concurrency mechanism.

### Requirement: Brand owns progressive Article Information

Brand Knowledge SHALL own writing-only customer information as one strict value
object inside the same current Brand.

#### Scenario: A customer saves incomplete optimization information

- **WHEN** the customer explicitly saves Article Information before it is ready
  for generation
- **THEN** Brand stores the partial value object without changing Evaluation
  readiness
- **AND** the value object may omit price, contain zero suitable customer/context
  items, and contain optional positioning and supplemental background
- **AND** no automatic save, second Brand record, Article task copy or separate
  Article Information revision is created.

#### Scenario: Article Information becomes generation-ready

- **WHEN** the current Brand is Evaluation-ready, has one through five distinct
  normalized suitable customer/context phrases of 2-80 characters, and contains
  either a complete positive-integer RMB price range or a negotiated-price choice
- **THEN** Brand derives Article Information readiness as ready
- **AND** a range contains both minimum and maximum, maximum is not lower than
  minimum, and equal values mean a fixed price
- **AND** decimals, one-sided price, currency selection and pricing-unit text are
  rejected
- **AND** supplemental background remains optional and is limited to 2000
  normalized characters
- **AND** desired positioning remains optional, contains at most five distinct
  customer-confirmed items and bounds each item to 2-80 normalized characters.

### Requirement: Purpose fingerprints remain consumer-specific

Brand Knowledge SHALL derive Evaluation and Writer fingerprints from separate
normalized projections over the one current aggregate.

#### Scenario: Writing-only meaning changes

- **WHEN** a characteristic detail, price, suitable customer/context,
  supplemental background or desired positioning changes
- **THEN** `writingContextFingerprint` changes
- **AND** `evaluationFingerprint` remains unchanged
- **AND** no new Evaluation opportunity is created.

#### Scenario: A non-writing field changes

- **WHEN** only contact name or contact mobile changes
- **THEN** Brand revision changes after a successful save
- **AND** both purpose fingerprints retain their prior semantic values.

### Requirement: Brand exposes a frozen Writer-purpose projection

Brand Knowledge SHALL expose a narrow value projection for GEO Optimization
without exposing persistence or unrelated customer data.

#### Scenario: GEO Optimization prepares generation input

- **WHEN** an account-owned current Brand is generation-ready
- **THEN** Brand returns company/store name, controlled industry meaning,
  verified location, Featured Offering, characteristic titles/details, Article
  Information, Brand revision and writing fingerprint
- **AND** excludes contact name, mobile number, mutation internals and Brand
  repository access
- **AND** GEO Optimization may freeze that returned value but cannot query Brand
  tables or compute a competing readiness policy.

### Requirement: Honest Brand readiness

Brand Knowledge SHALL derive readiness from all accepted current facts.

#### Scenario: A Store Brand becomes evaluation-ready

- **WHEN** company name, valid industry/`Other`, one verified Store Location
  with an exactly derived official region, concrete flagship product/service,
  two through six valid peer characteristics, contact name, and contact mobile
  satisfy their rules
- **THEN** the Brand is ready for a v3 evaluation
- **AND** registration, Brand management, and diagnosis observe the same result.

### Requirement: Semantic evaluation fingerprint v3

Brand Knowledge SHALL compute evaluation revisions through the single
`brand-evaluation-input@3` scheme.

#### Scenario: Evaluation meaning changes

- **WHEN** company name, industry identity, applicable `Other` phrase, selected
  Store Location or Query locality, flagship value, or any characteristic value
  changes
- **THEN** the v3 fingerprint changes
- **AND** the ordinary new evaluation-input revision rule applies.

#### Scenario: Representation or contact changes

- **WHEN** only characteristic presentation order, contact, verification time,
  provider contract/address/coordinate representation, labels, source versions,
  or another excluded display fact changes for the same semantic Store Location
  and Query locality
- **THEN** the fingerprint remains unchanged
- **AND** the change creates no Definition, question set, changed-data notice,
  or official-evaluation opportunity.

### Requirement: Stable evaluation-purpose snapshot v3

Brand Knowledge SHALL expose one complete v3 projection and GEO Intelligence
SHALL freeze it without reading Brand persistence or the Amap adapter.

#### Scenario: GEO prepares a v3 Definition

- **WHEN** an active account-owned Brand satisfies current readiness
- **THEN** Brand returns its v3 fingerprint, frozen industry meaning, Store
  Location-derived official region, structured Store Location display and
  provenance, GCJ-02 coordinate, final Query locality, flagship value, and
  canonical peer characteristics
- **AND** GEO stores `brand-evaluation-snapshot@3`
- **AND** Query consumes only a GEO-owned projection over that snapshot
- **AND** neither GEO nor Query calls Amap, reads Brand tables, trusts browser
  facts, or re-resolves later display data.

#### Scenario: Current Brand facts change later

- **WHEN** Brand, provider representation, or reference data changes after a v3
  Definition exists
- **THEN** that Definition, its questions, Run, retry, report, and history retain
  the exact frozen v3 projection actually used.

### Requirement: Development reset activates one v3 contract

Activation SHALL recreate only an explicitly authorized, proven development
database from empty and SHALL keep no v1/v2/legacy runtime compatibility.

#### Scenario: The development database is prepared for v3

- **GIVEN** the exact target is proven to be the authorized development database
  and not production
- **WHEN** the destructive reset is separately executed
- **THEN** the database is recreated from empty and the migration chain is
  replayed
- **AND** every new Brand, Definition, Run, and report uses v3
- **AND** no old development Brand, question, opportunity, Run, or report is
  migrated or restored.

#### Scenario: The target cannot be proven safe

- **WHEN** the target is production, contains a production marker, or cannot be
  proven to be the authorized development database
- **THEN** reset fails before deletion
- **AND** this specification grants no authority to clear or migrate that data.

### Requirement: One responsive Brand form

Registration and Brand management SHALL reuse the generated Brand contract and
one accessible field group for industry, Store Location, flagship value,
characteristics, and contact facts.

#### Scenario: A customer creates or edits a Brand

- **WHEN** the shared field group is shown
- **THEN** it provides visible labels, address feedback, map/list candidate
  equivalence, honest loading/empty/failure states, two default characteristic
  rows, bounded add/remove actions, and a stacked narrow-screen layout
- **AND** it has no independent province/city/terminal controls and requests no
  browser location permission
- **AND** registration and editing use the same rules
- **AND** the customer can save an incomplete draft
- **AND** all required facts are necessary before diagnosis.

#### Scenario: A provider interaction fails

- **WHEN** the customer uses a narrow screen or keyboard, or receives no map or
  provider result
- **THEN** focus, status, error, retry, and candidate selection remain operable
- **AND** the UI does not fabricate map success, address, region, locality, or
  readiness.
