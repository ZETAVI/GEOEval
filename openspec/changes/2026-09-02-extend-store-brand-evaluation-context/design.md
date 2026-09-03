# Design: Store Brand Evaluation Context and Amap Selection

- Product/architecture direction: Confirmed with revisions on 2026-09-02
- Commercial/legal risk: reviewed and accepted by its human owner on 2026-09-02
- Remaining activation follow-up: JS map/security-proxy evidence, named failure
  and zero-locality fixtures, production allowlists/license, and release runtime
- Current authorization: documents, completed application/Key preparation, and
  completed controlled Web Service calls; no runtime code, purchase,
  production activation, or development-data reset

## Design Position

Store Location is a deeper Brand Knowledge value, not a generic map service and
not a Query-owned enrichment step. Brand already owns current customer facts,
controlled official region identity, evaluation readiness, semantic fingerprint,
and the evaluation-purpose projection. It therefore also owns whether one
customer-selected storefront is coherent enough to become an evaluation fact.

The external seam is deliberately narrow:

```text
Web
  -> Amap JavaScript API 2.0 map/search/Marker UI (selection only)
  -> generated Brand API with untrusted selected POI ID
  -> Brand application
  -> Store Location verification port
  -> Amap Web Service detail/reverse-geocode adapter

GEO Intelligence
  -> Brand evaluation-purpose query
  -> immutable brand-evaluation-snapshot@3
  -> #26 Query consumer
```

The Amap adapter supplies current provider evidence. It does not own the Brand,
customer choice, official-region identity, business meaning, readiness,
fingerprint, Definition, or Query wording. GEO consumes only the frozen Brand
projection and never imports the adapter, reads Amap responses, or reads Brand
tables.

## Module Architecture Card: Brand Store Context

### Outcome and Boundary

- **Owner and observable outcome:** Brand Knowledge accepts one verified
  storefront, one required flagship product/service, and two to six peer
  characteristics; it exposes one stable v3 projection for evaluation.
- **In:** store search/selection, server verification, structured display
  map and Marker interaction, address, GCJ-02 coordinate, official-region
  coherence, locality candidates, customer-confirmed Query locality, flagship
  product/service, characteristics, readiness, fingerprint, development reset,
  and snapshot projection.
- **Out:** a reusable map platform, navigation, distance ranking, multi-store Brand,
  Query Prompt/Agent lifecycle, Parser, Synthesis, report, Provider evaluation,
  production activation, and raw provider-data warehousing.
- **Upstream prerequisites:** accepted industry and MCA reference sources. The
  separate Web(JS API) and Web Service Key types plus enterprise certification
  exist, and the named Web Service contract probe succeeded. Release-domain/
  security-proxy configuration, fixed outbound-IP allowlisting, and technical-
  service activation remain prerequisites for production activation.
- **Downstream consumers:** registration and Brand management use the public
  field group; GEO freezes the internal projection; #26 uses the final locality,
  flagship value, and peer characteristics.

### Lifecycle and Data

Store selection is an interaction, not an independently durable workflow:

```text
no current location
  -> map/autocomplete/POI search and candidate Markers (external, untrusted)
  -> select one concrete POI
  -> server independently verifies that POI (external, read-only)
  -> sealed verification receipt (short-lived, not business truth)
  -> atomic Brand commit (current StoreLocation becomes business truth)

current verified location
  -> ordinary Brand reads/evaluation projection (no Amap call)
  -> reselect and verify another candidate
  -> atomic replacement and new semantic fingerprint
```

- A Brand draft may omit Store Location, flagship product/service, or enough
  characteristics. It remains saveable but not evaluation-ready.
- Search text, map clicks, and candidates remain transient until the customer
  selects a concrete POI and the server verifies it. There is no database of
  searches, and an arbitrary coordinate is never a Store Location.
- One Brand has at most one current Store Location. It is an owned value with no
  independent customer lifecycle, history, archive, or sharing across Brands.
- A verified Store Location remains usable when Amap is unavailable later.
  Runtime evaluation never re-fetches it.
- Reverification of the same provider place may refresh excluded display or
  provenance fields without changing its internal semantic fact identity.
  Selecting another place or final locality creates a new semantic fact identity.
- A Brand write, Store Location replacement, peer characteristic collection,
  readiness consequences, fingerprint, and ordinary profile fields commit in
  one PostgreSQL transaction. No external call occurs inside that transaction.
- The immutable Definition stores the exact v3 projection supplied at prepare
  time. Later provider or Brand changes cannot alter it.

### Contracts and Dependencies

- **Map selection UI:** Amap JavaScript API 2.0 renders one responsive map,
  region-scoped autocomplete/search, no more than ten candidate results, and
  selectable POI Markers plus an accessible list. A map click may recenter or
  start a nearby search but does not produce an authoritative Brand mutation.
- **Public verification command:** accepts one untrusted provider POI ID; the
  server resolves current POI detail and reverse geocoding, checks region
  coherence, and returns a short-lived sealed receipt plus a safe structured
  preview and locality candidates.
- **Brand mutation:** accepts ordinary Brand fields plus the sealed receipt and
  one candidate identifier. It never accepts an authoritative provider ID,
  coordinate, address component, adcode, or free-form business area.
- **Brand response:** exposes only customer-useful stored location fields,
  explicit coordinate system when coordinate is shown, final locality, and
  readiness; it never exposes credentials or raw provider envelopes.
- **Internal evaluation query:** returns one complete v3 value object only after
  readiness succeeds. GEO maps it into its own versioned snapshot.
- **Dependency direction:** Web -> Amap JS UI for temporary display/selection;
  Web -> generated client -> Brand application -> Store Location verification
  port -> Amap Web Service adapter for authoritative facts. GEO application ->
  Brand evaluation query. No reverse imports, shared tables, or generic
  external-data registry.
- **External call boundary:** Web owns map lifecycle and accessible selection.
  The server adapter owns request construction, Web Service Key injection,
  minimum-field selection, total deadline, retry classification, response
  parsing, credential redaction, and `infocode` normalization. Brand owns all
  business validation.

### Failure and Recovery

| Failure | Classification | Customer behavior | Retry or recovery owner | Durable effect |
| --- | --- | --- | --- | --- |
| Search keyword missing or too short | Input correction | Ask for a more specific store name/address | Web/Brand validation; no provider call | None |
| Map script, tile, domain, or JS security-proxy load fails | Client/external configuration failure | Show a retryable map-unavailable state and allow unrelated draft fields to save | Web/operator | None |
| No candidate in the selected region | Valid empty result | Change keyword or region and search again | Customer | None |
| Customer clicks a coordinate with no selected concrete POI | Incomplete interaction | Recenter/search nearby and choose a Marker/list item | Web/customer | None |
| Client submits a forged or unknown provider POI ID | Untrusted-input failure | Search and select again | Brand application/server adapter | None |
| POI detail no longer exists | Provider-data drift | Explain that the candidate changed and re-search | Customer after adapter result | None |
| POI detail and reverse-geocode coordinate/address disagree materially | Data-integrity failure | Do not offer confirmation; re-search or support | Brand application/operator evidence | None |
| Provider adcode conflicts with Brand official terminal region | Business validation | Ask the customer to choose the correct region/store | Brand application | None |
| Special-city `towncode` does not match the maintained terminal through the explicit 12-digit Amap to 9-digit MCA normalization | Region-integrity failure | Do not guess or mark ready | Brand application/operator evidence | None |
| Several business areas exist | Normal ambiguity | Customer chooses one ordered candidate | Customer through Brand UI | Selected locality committed only after verification |
| No business area exists | Normal absence | Show precise verified address locality and label it as address, not business area | Brand projection rule | `ADDRESS_LOCALITY` may be committed |
| Provider timeout, network failure, or documented busy response | Transient external failure | Simple “位置服务暂不可用” with later retry | Adapter uses one bounded retry only when configured evidence supports it | Existing location unchanged; incomplete Brand remains draft |
| Invalid/expired Key, service mismatch, signature/IP error | Deployment/configuration fault | Customer sees temporary unavailability, not credential detail | Operator fixes configuration | No Brand write |
| Daily/QPS quota exhausted or paid balance exhausted | Capacity/commercial fault | Customer can save other Brand fields and return later | Product/operator resolves entitlement | No new location; existing verified location retained |
| Amap unavailable while editing non-location fields | External dependency unavailable | Save unrelated fields without revalidating unchanged location | Brand application | Existing Store Location remains authoritative |
| Customer changes location during provider outage | Incomplete change | Do not replace current verified location or accept manual facts | Customer retries selection | No partial replacement |
| Database write fails after receipt verification | Local transactional failure | Retry Brand save while receipt remains valid; otherwise reverify | Brand repository/customer | Transaction rolls back completely |

### Tool and Framework Decision

| Candidate | Adopt, defer, or reject | Reason | Exit or refresh trigger |
| --- | --- | --- | --- |
| Existing Nest module plus a Brand-owned `StoreLocationProvider` port | Adopt | External protocol variability and fixture substitution are real seams; Brand business rules remain local | Revisit only if another approved provider must be supported |
| Server-side Amap Web Service v5 detail plus v3 reverse geocode | Adopt | Independently verifies the browser-selected POI while keeping authoritative credentials and facts server-side; the named controlled probe confirmed the initial success shapes | Endpoint change or incompatible account/runtime evidence |
| Existing generated REST/OpenAPI client and shared Brand form | Adopt | Already owns Web transport and registration/edit reuse | None for this change |
| Server-sealed short-lived verification receipt | Adopt | Prevents forged client facts without a search-session database or an external call inside the Brand transaction | Replace only if receipt size/rotation evidence requires a short-lived server store |
| Amap JS API 2.0 map, AutoComplete/PlaceSearch, and candidate Markers | Adopt | Meets the confirmed map-selection preference; result list and Marker selection remain accessible while the server independently verifies the selected POI | Key configuration, controlled mobile/desktop selection evidence, or material quota change |
| Project-local `@amap/amap-jsapi-loader` | Adopt at implementation | Amap recommends the loader for React/online v2.0 loading, plugin completeness, and duplicate-load protection; the repository currently has no map dependency | Refresh on an incompatible loader release or a supported first-party loading change |
| Next Route Handler at `app/%5FAMapService/[...path]/route.ts` | Adopt | Amap requires the `/_AMapService` prefix while Next 16 treats literal underscore folders as private; the encoded route preserves the required public path and keeps the JS security code server-only | Replace with release reverse-proxy configuration only when equivalent secret injection and tests exist |
| Provider search-session table or Redis cache | Reject initially | Creates transient provider-data persistence and operational cleanup without a required durable workflow | Revisit only if receipt constraints are proven inadequate |
| Generic location platform/provider registry/factory | Reject | One bounded external owner and no proven second provider; would widen the interface without removing complexity | A separately approved second provider with the same stable Brand semantics |
| Raw provider-response persistence | Reject | Violates minimization and binds business data to a volatile vendor schema without adding Brand meaning | Revisit only through a new explicit product and architecture decision |

### Operational and Verification Boundary

- **Security:** use separate credential classes. The Web(JS API) Key is loaded
  by the approved domain only; its security key remains server-side behind the
  documented `/_AMapService` proxy. `AMAP_WEB_SERVICE_KEY` remains a server
  secret with an egress-IP allowlist. Key-bearing URLs are never logged. Search
  text and exact address are customer data and are omitted or purposefully
  redacted from ordinary logs/traces.
  The intentionally public value is `NEXT_PUBLIC_AMAP_JS_KEY`; the Next server
  alone reads `AMAP_JS_SECURITY_CODE`, while the Nest API alone reads
  `AMAP_WEB_SERVICE_KEY` and the receipt-signing secret. All stay in the
  repository-ignored `.env` or release secret store, never committed fixtures.
- **Authorization:** every endpoint requires a terminal-customer session and
  binds receipt/account/Brand. Search may occur before a Brand exists during
  registration, so the receipt binds to account plus a server nonce and may be
  consumed only by that account's new Brand mutation.
- **Cost and capacity:** autocomplete starts only after a minimum input length
  and is debounced; search returns at most ten candidates. There is no
  background refresh or load test, and metrics are by operation/outcome only.
  The enterprise-certified console shows 3,000,000 monthly basic-LBS calls,
  30,000,000 JS map initializations, and 50,000 basic-search calls. The public
  table maps that tier to 30/100/30 QPS, but the account QPS page has no observed
  usage rows. Controlled validation is serial; purchase is considered only from
  measured product demand, never from a capacity test.
- **Observability:** record operation name, normalized outcome/`infocode`,
  latency bucket, retry count, and a request correlation ID. Never record Key,
  full request URL, raw response, sealed receipt, complete input address, or
  provider content in general telemetry.
- **Verification:** the separately authorized ordinary-district, municipality,
  special no-county city, and multi-business-area Web Service probes are
  complete. Implementation still proves desktop/mobile map load, keyboard list
  selection, Marker selection, arbitrary-click rejection, one zero-combined-
  business-area fallback, and named failure responses. No evaluation Provider
  call and no production data.
- **Account-contract residual:** enterprise certification, correct Key types,
  test-scale quotas, bounded endpoint success, response variability, plural
  business areas, and one special-city mapping are observed. Settings readback,
  JS map/security-proxy behavior, named failure/timeout paths, production
  restrictions, and technical-service activation remain unverified. They do not
  block fixture-first implementation, but they block production activation.

## Implementation Package Sequence

1. **Controlled Web Service contract probe — completed 2026-09-03, no product
   data.** The serial ordinary-district, municipality, special no-county city,
   and `extensions=all` comparison chains established normalized success shapes,
   locality multiplicity, region coherence, and the direct-admin towncode rule.
   Add the JS Key/security code only in package 4 when the browser proxy exists
   to validate them.
2. **Brand domain and persistence — fixture first.** Replace the two legacy
   characteristic columns with the peer collection, add one owned Store
   Location value plus flagship field, implement v3 readiness/fingerprint and
   canonical vectors, and add the empty-development-database migration/reset
   preflight without executing the destructive reset.
3. **Verification API and adapter.** Add the small Brand-owned
   `StoreLocationProvider` port, fixture adapter, conditional Amap adapter,
   typed failures/deadlines/redaction, receipt signing/expiry/account binding,
   and one authenticated verification endpoint that also supports registration
   before a Brand ID exists. External calls finish before the Brand transaction.
4. **Shared Web interaction.** Add the official loader dependency, encoded
   `/_AMapService` Route Handler, map/list/Marker picker, locality confirmation,
   reusable profile field group, cleanup, keyboard/narrow-screen behavior, and
   graceful draft saving when the map is unavailable.
5. **Snapshot v3 and downstream handoff.** Make v3 the single central parser and
   Definition snapshot, expose a narrow Query projection, regenerate OpenAPI/
   client, and keep #40 out of Query Prompt/Model Contract/report behavior.
   Then rebase PR #28 and adapt #26 to the stable projection.
6. **Activation and reconciliation.** With separate destructive authorization,
   prove the exact development target and rebuild it empty; run focused tests,
   full CI/build, browser/accessibility checks, secret scans, architecture/code
   reviews, current-spec reconciliation, and only then convert Draft PR #46 from
   Partial to the final #40 closing PR.

## Domain Vocabulary and Ownership

### Store Location

One customer-confirmed, server-verified physical storefront for the current
Brand. It is not the broad `Region`, not a list of branches, not a provider POI
record, and not a historical address version.

### Official Region

The existing Brand-owned MCA province-city-terminal identity. It constrains
search and is the durable official administrative meaning in the fingerprint.
Amap `adcode`/`towncode` is evidence used to check coherence, not a replacement
identity source.

### Query Locality

The exact local phrase Brand authorizes #26 to use. It is either:

- `BUSINESS_AREA`: one customer-selected candidate returned by verified Amap
  evidence; or
- `ADDRESS_LOCALITY`: a precise verified address/place fallback when the
  provider returns no business area.

The second kind must never be called `商圈` in customer or Prompt copy.

### Flagship Product or Service

One concrete product/service phrase the customer most wants this Store Location
to be discovered or recommended for. Internal name:
`flagshipProductOrService`; customer name: `主打产品或服务`.

It is distinct from:

- `recommendationSubject`: the broader industry-owned natural recommendation
  category;
- `otherProductOrService`: the conditional concrete phrase that makes an
  industry `Other` selection meaningful; and
- a future optimization product catalog with price, audience, or materials.

The values may legitimately be textually equal, but their owners and change
reasons remain distinct.

### Peer Characteristics

Two to six distinct normalized Brand traits used as possible Query angles. They
are peers, not a customer priority or ranking. #26 may select or combine the set
into the existing two characteristic question roles; neither Brand nor #40
generates those questions.

## Persistence Model

### Brand Profile

Proposed current fields:

```text
companyName
primaryIndustryId
secondaryIndustryId
otherProductOrService?
provinceRegionId
cityRegionId
terminalRegionId
storeLocation?                 -> one BrandStoreLocation
flagshipProductOrService?
characteristics[]              -> bounded JSON array, 0..6 in a draft
contactName
contactMobile
evaluationFingerprint          -> brand-evaluation-input@3 hash
```

`characteristics` is a bounded JSON array rather than a child entity because a
characteristic has no independent identity, lifecycle, authorization, or
consumer. Server validation and database JSON shape/length checks protect 0-6
strings; readiness applies the 2-6 rule. Evaluation canonicalization sorts the
normalized set, so presentation order cannot change the fingerprint or imply
priority.

The existing `characteristicOne` and `characteristicTwo` columns are removed
after the authorized development database is recreated; they are not migration
inputs or a second writable current source.

### Brand Store Location

Use one owner-local one-to-one table/value because location contains coherent
provenance, coordinate, structured address, locality choice, and replacement
rules that should not expand the Brand row or leak into unrelated callers.

```text
id                         internal row identity
brandId                    unique, owned by one Brand
semanticFactId             internal stable identity used by fingerprint
searchInput                normalized customer input that led to selection
provider                   AMAP
providerPlaceId            current source identity, never public mutation input
providerContractVersion    e.g. amap-js-v2+place-v5+regeo-v3@1
verifiedAt
placeName
formattedAddress
provinceName
cityName?
districtName?
townshipName?
providerAdcode
providerTowncode?
longitude                  decimal, six places
latitude                   decimal, six places
coordinateSystem           GCJ_02
businessAreaCandidates     bounded ordered normalized values
queryLocalityKind          BUSINESS_AREA | ADDRESS_LOCALITY
queryLocalityLabel
createdAt
updatedAt
```

The listed provider fields are the accepted minimum persistence set. Raw
responses, phone, rating, reviews, photos, opening hours, and unrelated POIs are
never stored.

`semanticFactId` is preserved only when server verification proves the same
provider place remains selected and the final Query locality is unchanged.
Provider label, formatted-address, coordinate, or verification-time refresh for
that same selection is representation maintenance and does not by itself grant a
new evaluation. Selecting another provider place or final locality creates a new
semantic fact identity.

## Brand Input Rules

### Flagship Product or Service

- draft: absent or normalized 2-80 characters;
- evaluation-ready: required;
- exact generic `产品`, `服务`, `其他`, and `其它` are rejected as non-concrete;
- no generated or provider-supplied fallback;
- fingerprint: normalized value included.

### Characteristics

- draft: zero to six normalized strings;
- UI: render two empty rows by default, add up to six, and remove values; do not
  expose move controls or priority copy;
- evaluation-ready: two to six values;
- each value: 2-120 normalized characters;
- exact normalized duplicates: rejected;
- fingerprint: the sorted normalized set is included, so add/remove/edit is a
  semantic change but presentation reordering is not.

The confirmed limits keep one profile usable for Query while preventing an
unbounded marketing brief. They remain in this active Change until
implementation reconciliation updates current truth.

## Location Selection and Commit

### 1. Map Search and Selection

The customer first chooses the existing Brand official region. Web initializes
one Amap JavaScript API 2.0 map centered on that region, then provides
AutoComplete/PlaceSearch over a specific store name, landmark, or address.

- autocomplete starts after a minimum input length and is debounced;
- an explicit search action remains available;
- `citylimit=true` scopes the result where the provider supports the selected
  region;
- no more than ten results appear as both clickable Markers and an accessible
  address list;
- selecting either representation selects the same provider POI ID;
- clicking empty map space only recenters or starts a nearby search and cannot
  confirm a Store Location.

The Web(JS API) Key is bound to the approved domain. The security key is added
through the server `/_AMapService` proxy before the JS API loads. Search results
and map coordinates are untrusted presentation evidence.

### 2. Verify

Web submits the untrusted selected provider POI ID. The server verify command
resolves v5 ID detail and v3 reverse geocoding using the separate Web Service
Key. Brand then checks:

1. status/`infocode` and required field types;
2. selected POI identity and coordinate presence;
3. coordinate longitude/latitude ranges and explicit GCJ-02 system;
4. detail versus reverse-geocode adcode/address coherence;
5. Amap administrative evidence versus the Brand-owned official region path;
6. exact special-city terminal mapping when required;
7. bounded, normalized, de-duplicated business-area candidates.

The adapter normalizes `city` and `district` as optional scalar values rather
than exposing provider `string | []` unions. For an MCA county terminal, detail
and reverse adcode must agree with its six-digit code; a municipality's empty
reverse city is allowed only when province and terminal still agree. For the
controlled direct-admin township shape, the city adcode must agree with the MCA
prefecture and the Amap 12-digit `towncode` must equal the maintained nine-digit
township code plus `000`. Other shapes fail closed until fixture evidence adds
an explicit rule.

If any required fact is absent or conflicting, no verification receipt is
issued.

### 3. Choose Query Locality

Candidate order is deterministic within the verified result:

1. exact POI `business.business_area` when present;
2. reverse-geocode `businessAreas` from `extensions=all` in provider order;
3. de-duplicate by normalized label while retaining first provenance.

Provider order is presentation only; the customer chooses the final candidate.
When the list is empty, Brand constructs one `ADDRESS_LOCALITY` from verified
place/address components and displays that honest type. #26 may later phrase
that verified locality naturally in a question, but it cannot rename it as or
invent a business area.

### 4. Commit

The server seals the normalized verified facts, permitted locality identifiers,
account/Brand or account/new-Brand binding, issue time, expiry, provider contract
version, and response digest. Brand mutation submits this receipt and one
permitted locality identifier. Brand verifies the seal and expiry, normalizes
the customer fields, computes readiness/fingerprint, and atomically writes the
Brand plus Store Location.

The receipt is not a business record and cannot be replayed across accounts or
Brands. A consumed receipt can be made idempotent by comparing its digest with
the already committed current location; it must never create another Brand or a
new semantic fact merely from duplicate HTTP delivery.

## Public API Shape

Exact URI naming is reversible; the semantic surface is:

```text
POST /brand-location-verifications
  { officialRegionPath, providerPlaceId }
  -> {
       verificationReceipt,
       expiresAt,
       locationPreview,
       localityCandidates[{ id, kind, label }]
     }

POST/PATCH /brands
  {
    ...existing fields,
    flagshipProductOrService,
    characteristics[],
    locationSelection?: { verificationReceipt, localityCandidateId }
  }
```

Updating unrelated fields omits `locationSelection` and preserves the current
verified location. Explicit removal is allowed only as one named action that
makes the Brand incomplete; setting arbitrary location fields to null or partial
values is rejected.

Provider credentials, provider request URLs, raw responses, response digests,
fingerprint, fingerprint scheme, and reset diagnostics remain internal.

## Evaluation Fingerprint v3

`brand-evaluation-input@3` hashes one canonical document:

```json
{
  "scheme": "brand-evaluation-input@3",
  "companyName": "<normalized>",
  "primaryIndustryId": "<stable ID>",
  "secondaryIndustryId": "<stable ID>",
  "otherProductOrService": "<normalized only for Other, otherwise empty>",
  "officialRegionPath": ["<official IDs only>"],
  "storeLocationSemanticFactId": "<Brand-owned stable identity>",
  "flagshipProductOrService": "<normalized>",
  "characteristics": ["<sorted normalized peer values>"]
}
```

Included meaning:

- company/store name;
- stable industry and official-region identity;
- applicable industry `Other` phrase;
- the selected physical Store Location and final Query locality through its
  Brand-owned semantic fact identity;
- flagship product/service;
- every characteristic as a peer set.

Excluded representation:

- characteristic presentation order, Amap Key, provider response hash,
  provider contract version, verification
  time, POI ID, address labels, coordinate digits, candidate ordering, provider
  source release, official-region labels, catalog/source versions, contact
  fields, timestamps, and Web presentation.

The excluded provider facts still remain frozen in v3 for historical display
and audit; they simply do not define a new opportunity unless the customer
selects a different semantic Store Location/locality.

## Evaluation-purpose Projection and Snapshot v3

Brand returns one complete internal projection:

```text
accountId, brandId, inputFingerprint
companyName
industry:
  catalogId, catalogVersion
  primary { id, label }
  secondary { id, label }
  otherProductOrService?
  recommendationSubject
region:
  sourceReleaseId
  province, city, terminal, officialPath        # existing official semantics
storeLocation:
  semanticFactId
  placeName
  formattedAddress
  coordinate { longitude, latitude, system: GCJ_02 }
  officialRegionDisplay
  queryLocality { kind, label }
  source { provider: AMAP, placeId, contractVersion, verifiedAt }
flagshipProductOrService
characteristics[]             # deterministic sorted peer set
```

GEO maps it without re-resolution to:

```text
schemaVersion: brand-evaluation-snapshot@3
companyName
industry                     # existing frozen industry semantics
region                       # existing frozen official-region semantics
storeLocation                # frozen display, coordinate, locality, provenance
flagshipProductOrService
characteristics[]
```

Only `queryLocality.label`, `flagshipProductOrService`, and the peer
`characteristics` are required by #26 Query wording. Coordinates, address, and
provenance are frozen Brand evidence, not Prompt instructions. #26 must import
the GEO snapshot/query projection, not Brand domain types or Amap contracts.

## Development Reset and Single v3 Activation

The product owner confirmed that all current records are development data and
that #40 should not carry a v1/v2 opportunity-migration contract. Activation
therefore starts from one explicitly named empty development database and one
snapshot/fingerprint scheme:

```text
brand-evaluation-input@3
brand-evaluation-snapshot@3
```

### Reset Preflight

Before the later destructive action:

1. identify the exact project-named database and environment;
2. fail if the target is production, contains a production marker, or cannot be
   proven to be the authorized development database;
3. record row counts only as deletion evidence, not as migration inputs;
4. stop services that can write to the target;
5. obtain the implementation-stage reset authorization recorded by #40.

The reset recreates that development database from empty and then replays the
repository migration chain. It does not add a runtime migration workflow,
v1/v2/legacy decoder, dual fingerprint scheme, or historical repair path.

### Activation Contract

- `characteristicOne` and `characteristicTwo` disappear from current storage;
- `characteristics` becomes the only peer collection;
- all new Brands and Definitions use v3 from their first write;
- #26 rebases to and accepts only the v3 Query projection;
- Parser/Synthesis/report code keeps only the v3 text projection needed by
  current behavior; no old data exists to decode;
- CI and isolated test databases always prove the empty-database path.

### Rollback

Before production use, rollback reverts code and recreates the named
development database again from empty. No old development report is recovered.

Once any production/customer data exists, this reset path is permanently
inapplicable. Future schema changes require a separately designed
non-destructive migration and forward-compatible rollback; #40 grants no
authority to clear that data.

## #26 Integration and Release Boundary

#40 owns and later implements only the v3 producer and snapshot contract.
#26 remains the single writer for Query Prompt, Model Contract, candidate
selection, preparation lifecycle, examples, and real Query review.

Integration order:

1. use the confirmed #40 product, architecture, and risk-acceptance direction;
2. implement/verify #40 with fixture adapters and no Provider evaluation call;
3. merge or stack #40's stable projection so #26 can rebase without copying
   Brand/Amap logic;
4. #26 consumes the v3 Query projection and updates only Query-owned artifacts;
5. perform separately authorized Query-only review and representative 4x5;
6. #39 reconciles and decides release/deployment.

Merging #40 does not by itself claim the refined Query outcome. Production
activation of v3 official evaluation is gated on #26's v3 consumer and #39's
integration acceptance; the temporary main-branch interval is not a production
release authorization.

## Interface Alternatives

### Hybrid Map Selection versus Server-only Candidate List

**Adopt the hybrid boundary.** Amap JS API owns the temporary map, search, result
list, and Marker interaction; Brand BFF independently verifies the selected POI
before persistence. A server-only list would reduce one credential surface but
does not meet the confirmed map-selection preference. A browser-only provider
flow cannot enforce account, region, receipt, and atomic-write invariants.

### Free-form Address Mutation versus Verified Receipt

**Adopt the sealed receipt.** Sending full provider fields in Brand mutation is
easy to implement but requires the server either to trust them or repeat every
call inside the write. A short-lived server-sealed result proves which fields
were verified, keeps the database transaction external-call-free, and avoids a
search-session store.

### Columns on Brand versus Owned Store Location Value

**Adopt one owned Store Location value/table.** The one-to-one record has no
independent service, but it concentrates provenance, coordinate, locality,
replacement, and provider authorization fields. Putting them all on Brand would
expand every repository projection and make unrelated Brand callers know the
external boundary. The public Brand interface remains one coherent aggregate.

### Characteristic Rows versus Peer JSON Collection

**Adopt bounded JSON.** Characteristics have no independent identity, lookup,
authorization, lifecycle, priority, or consumer. A table would add joins without
hiding meaningful complexity. The application treats the array as a peer set,
rejects exact duplicates, and sorts normalized values for fingerprint/snapshot
projection so presentation order cannot create meaning.

## Documentation Reconciliation

Only after implementation and acceptance:

- update `openspec/specs/brand-knowledge/spec.md` with Store Location, flagship,
  peer characteristics, v3 fingerprint/projection, development reset, and form
  rules;
- update evaluation-definition only with the v3 frozen seam, without copying
  Brand fields;
- move activated customer meaning from the broad product-definition/vision
  summaries to the Brand owner and retain index links/evolution-marker state;
- add agreed glossary terms only after product approval;
- update architecture overview with the Store Location adapter and #40 -> #26
  dependency;
- regenerate OpenAPI/client and reconcile executable schemas/tests;
- archive this Change only after all accepted design has a current or executable
  owner and obsolete active explanations are removed.

No ADR is proposed. The Brand-to-GEO owner direction already has a current
owner-local contract; the confirmed map/provider choice and field limits remain
change-local until implementation reconciliation. Create or supersede an ADR
only if a later cross-change provider or geospatial policy requires it.
