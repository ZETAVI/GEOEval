# Brand Knowledge Delta: Store Evaluation Context

## ADDED Requirements

### Requirement: One verified Store Location

Brand Knowledge SHALL own at most one current Store Location for a Brand and
SHALL allow only a server-verified, customer-confirmed location to participate
in evaluation readiness and projection.

#### Scenario: A customer searches for a concrete store

- **GIVEN** an authenticated customer is creating or editing a Brand
- **WHEN** the customer submits a specific store name plus city, landmark, or
  address text
- **THEN** Web presents an Amap JS API map, bounded autocomplete/search,
  selectable POI Markers, and an accessible full-address list without requiring
  a separate province/city/terminal selection
- **AND** Web does not load Geolocation, request browser/device/IP position, or
  show a current-location action by default
- **AND** the browser receives only the domain-restricted Web(JS API) Key, never
  the JS security key, Web Service Key, raw provider response, or authoritative
  mutation fields
- **AND** search text and unselected candidates do not become Brand or
  evaluation business truth.

#### Scenario: A customer clicks the map outside a POI

- **WHEN** the customer clicks an arbitrary map coordinate
- **THEN** Web may recenter or search nearby
- **AND** the coordinate cannot become a Store Location until the customer
  selects a concrete POI and the server independently verifies it.

#### Scenario: A customer selects a candidate

- **WHEN** the customer selects one Marker or its matching list item
- **THEN** the server resolves current provider place detail and reverse-
  geocodes its coordinate
- **AND** treats the selected POI detail address as the exact Store Location
  address while using reverse geocoding for administrative, township, and
  locality coherence
- **AND** uses a reverse-geocoded formatted address only when current POI detail
  has no address, never to replace a more precise selected-POI address
- **AND** checks required identity, structured address, and coordinate and maps
  provider adcode/towncode evidence to exactly one maintained MCA province/city/
  terminal path
- **AND** returns a short-lived account/Brand-bound sealed verification receipt
  plus a customer-safe preview
- **AND** forged, altered, stale, cross-account, or unverifiable client data
  cannot become Store Location facts.

#### Scenario: Provider evidence cannot derive one official region

- **WHEN** verified provider detail/reverse-geocode evidence is missing,
  contradictory, or cannot map exactly to one maintained MCA terminal
- **THEN** no verification receipt is issued
- **AND** the customer may search for another exact POI or contact support
- **AND** neither the customer nor an Agent can manually override the region.

#### Scenario: A verified location is committed

- **WHEN** a valid verification receipt and permitted Query locality choice are
  submitted with a Brand mutation
- **THEN** Brand atomically stores the minimum approved structured Store
  Location, source provenance, and final locality with the profile update
- **AND** rejects same/older receipt reuse and serializes the Brand aggregate so
  a concurrent stale mutation cannot overwrite a newer Store Location
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
- **AND** customer and Query projections do not label that value as a business
  area
- **AND** #26 may phrase the verified address locality naturally without
  changing it or inventing a business area.

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

### Requirement: Peer extensible characteristics

Brand Knowledge SHALL store one peer characteristic collection, render two
inputs by default, and bound evaluation-ready profiles to two through six
distinct normalized values without a priority contract.

#### Scenario: A customer maintains characteristics

- **WHEN** the customer adds, edits, or removes characteristics
- **THEN** the Web supports keyboard-accessible add/remove behavior without move
  controls or priority copy
- **AND** the server accepts at most six values, each 2-120 characters
- **AND** rejects exact normalized duplicates
- **AND** Brand canonicalizes the normalized set so presentation order does not
  participate in the evaluation fingerprint.

#### Scenario: Query later consumes the list

- **WHEN** #26 constructs the two existing characteristic question roles
- **THEN** it consumes the frozen peer set from the v3 projection
- **AND** may select or combine characteristics according to its own approved
  Prompt and Model Contract
- **AND** Brand does not create more questions, choose angles, or expose its
  persistence to Query.

### Requirement: Semantic evaluation fingerprint v3

Brand Knowledge SHALL compute store-context revisions through the single
`brand-evaluation-input@3` scheme.

#### Scenario: Store-context meaning changes

- **WHEN** the selected Store Location or final Query locality, flagship product
  or service, or any characteristic value changes
- **THEN** the v3 fingerprint changes
- **AND** the ordinary new evaluation-input revision rule applies.

#### Scenario: Characteristic presentation order changes

- **WHEN** the same normalized characteristic values appear in another
  presentation order
- **THEN** canonicalization produces the same fingerprint
- **AND** the order does not imply customer priority or create another question
  set or evaluation opportunity.

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
- **THEN** Brand returns its v3 fingerprint, existing frozen industry meaning,
  Store Location-derived official-region meaning, structured Store Location
  display and provenance, explicit
  coordinate system, final Query locality, flagship value, and peer
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

### Requirement: Development reset activates one v3 contract

Activation SHALL recreate only the explicitly authorized development database
from empty and SHALL not introduce runtime compatibility for development-only
v1/v2/legacy data.

#### Scenario: The development database is prepared for v3

- **GIVEN** the target database is proven to be the project-named development
  database and not production
- **WHEN** the separately authorized reset is executed
- **THEN** the database is recreated from empty and the repository migration
  chain is replayed
- **AND** every new Brand, Definition, Run, and report uses the v3 contract
- **AND** no old development Brand, question, opportunity, Run, or report is
  migrated or restored.

#### Scenario: The target cannot be proven safe

- **WHEN** the target is production, contains a production marker, or cannot be
  proven to be the authorized development database
- **THEN** reset fails before deletion
- **AND** #40 grants no authority to clear or migrate that data.

## MODIFIED Requirements

### Requirement: Honest Brand readiness

Brand Knowledge SHALL derive readiness from all accepted current facts.

#### Scenario: A Store Brand becomes evaluation-ready

- **WHEN** company name, valid industry/`Other`, one verified Store Location
  with an exactly derived official region, concrete flagship
  product/service, two through six valid peer characteristics, contact name,
  and contact mobile satisfy their rules
- **THEN** the Brand is ready for a new v3 evaluation
- **AND** registration, Brand management, and diagnosis observe the same result.

### Requirement: One responsive Brand reference form

Registration and Brand management SHALL reuse the generated Brand contract and
one accessible field group for industry, Store Location, flagship value, and
characteristics.

#### Scenario: A customer creates or edits a Brand

- **WHEN** the shared Brand field group is shown
- **THEN** it provides visible labels, address feedback before confirmation,
  an Amap map with matching accessible candidate list, honest loading/empty/
  failure states, two default characteristic rows, bounded add/remove actions,
  and a stacked narrow-screen layout
- **AND** it has no independent province/city/terminal controls and requests no
  browser location permission
- **AND** registration and later editing use the same industry, `Other`, Store
  Location, flagship, characteristic, and readiness rules
- **AND** the customer can save an incomplete draft
- **AND** all required fields and one verified Store Location are necessary
  before entering the new v3 evaluation path.

#### Scenario: A provider interaction fails

- **WHEN** the customer is on a narrow screen, uses only a keyboard, or receives
  no provider result
- **THEN** focus, status, error, retry, and candidate selection remain operable
- **AND** the UI does not fabricate a map success, address, derived region,
  locality, or evaluation-ready state.
