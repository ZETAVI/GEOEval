# Design: Store Brand Evaluation Context and Amap Selection

## Design Position

Store Location is a deeper Brand Knowledge value, not a generic map service and
not a Query-owned enrichment step. Brand already owns current customer facts,
controlled official region identity, evaluation readiness, semantic fingerprint,
and the evaluation-purpose projection. It therefore also owns whether one
customer-selected storefront is coherent enough to become an evaluation fact.

The external seam is deliberately narrow:

```text
Web
  -> generated Brand API
  -> Brand application
  -> Store Location port
  -> Amap Web Service adapter

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
  storefront, one required flagship product/service, and two to six ordered
  characteristics; it exposes one stable v3 projection for evaluation.
- **In:** store search/selection, server verification, structured display
  address, GCJ-02 coordinate, official-region coherence, locality candidates,
  customer-confirmed Query locality, flagship product/service, characteristics,
  readiness, fingerprint, migration classification, and snapshot projection.
- **Out:** maps as a platform, navigation, distance ranking, multi-store Brand,
  Query Prompt/Agent lifecycle, Parser, Synthesis, report, Provider evaluation,
  production activation, and raw provider-data warehousing.
- **Upstream prerequisites:** accepted industry and MCA reference sources,
  applicable Amap enterprise/commercial and data-storage authorization, and an
  approved server Key configuration.
- **Downstream consumers:** registration and Brand management use the public
  field group; GEO freezes the internal projection; #26 uses the final locality,
  flagship value, and ordered characteristics.

### Lifecycle and Data

Store selection is an interaction, not an independently durable workflow:

```text
no current location
  -> search candidates (external, read-only)
  -> verify one candidate (external, read-only)
  -> sealed verification receipt (short-lived, not business truth)
  -> atomic Brand commit (current StoreLocation becomes business truth)

current verified location
  -> ordinary Brand reads/evaluation projection (no Amap call)
  -> reselect and verify another candidate
  -> atomic replacement and new semantic fingerprint
```

- A Brand draft may omit Store Location, flagship product/service, or enough
  characteristics. It remains saveable but not evaluation-ready.
- Search text and candidates remain transient until the customer selects a
  candidate and the server verifies it. There is no database of searches.
- One Brand has at most one current Store Location. It is an owned value with no
  independent customer lifecycle, history, archive, or sharing across Brands.
- A verified Store Location remains usable when Amap is unavailable later.
  Runtime evaluation never re-fetches it.
- Reverification of the same provider place may refresh excluded display or
  provenance fields without changing its internal semantic fact identity.
  Selecting another place or final locality creates a new semantic fact identity.
- A Brand write, Store Location replacement, ordered characteristic collection,
  readiness consequences, fingerprint, and ordinary profile fields commit in
  one PostgreSQL transaction. No external call occurs inside that transaction.
- The immutable Definition stores the exact v3 projection supplied at prepare
  time. Later provider or Brand changes cannot alter it.

### Contracts and Dependencies

- **Public search query:** account-authenticated, region-scoped text search;
  returns no more than ten safe candidates with one opaque selection token,
  name, address feedback, region display, and coordinate only when the approved
  UI needs it.
- **Public verification command:** accepts one selection token; the server
  resolves current POI detail and reverse geocoding, checks region coherence,
  and returns a short-lived sealed receipt plus a safe structured preview and
  locality candidates.
- **Brand mutation:** accepts ordinary Brand fields plus the sealed receipt and
  one candidate identifier. It never accepts an authoritative provider ID,
  coordinate, address component, adcode, or free-form business area.
- **Brand response:** exposes only customer-useful stored location fields,
  explicit coordinate system when coordinate is shown, final locality, and
  readiness; it never exposes credentials or raw provider envelopes.
- **Internal evaluation query:** returns one complete v3 value object only after
  readiness succeeds. GEO maps it into its own versioned snapshot.
- **Dependency direction:** Web -> generated client -> Brand application ->
  Store Location port -> Amap adapter. GEO application -> Brand evaluation
  query. No reverse imports, shared tables, or generic external-data registry.
- **External call boundary:** the adapter owns request construction, Key
  injection, minimum-field selection, total deadline, retry classification,
  response parsing, credential redaction, and `infocode` normalization.
  Brand owns all business validation.

### Failure and Recovery

| Failure | Classification | Customer behavior | Retry or recovery owner | Durable effect |
| --- | --- | --- | --- | --- |
| Search keyword missing or too short | Input correction | Ask for a more specific store name/address | Web/Brand validation; no provider call | None |
| No candidate in the selected region | Valid empty result | Change keyword or region and search again | Customer | None |
| Candidate token altered, expired, or bound to another account/Brand | Authorization/integrity failure | Search and select again | Brand application | None |
| POI detail no longer exists | Provider-data drift | Explain that the candidate changed and re-search | Customer after adapter result | None |
| POI detail and reverse-geocode coordinate/address disagree materially | Data-integrity failure | Do not offer confirmation; re-search or support | Brand application/operator evidence | None |
| Provider adcode conflicts with Brand official terminal region | Business validation | Ask the customer to choose the correct region/store | Brand application | None |
| Special-city `towncode` cannot map exactly to the maintained terminal identity | Unverified contract | Do not guess or mark ready | Architecture/source-validation owner | None |
| Several business areas exist | Normal ambiguity | Customer chooses one ordered candidate | Customer through Brand UI | Selected locality committed only after verification |
| No business area exists | Normal absence | Show precise verified address locality and label it as address, not business area | Brand projection rule | `ADDRESS_LOCALITY` may be committed |
| Provider timeout, network failure, or documented busy response | Transient external failure | Simple “位置服务暂不可用” with later retry | Adapter uses one bounded retry only when configured evidence supports it | Existing location unchanged; incomplete Brand remains draft |
| Invalid/expired Key, service mismatch, signature/IP error | Deployment/configuration fault | Customer sees temporary unavailability, not credential detail | Operator fixes configuration | No Brand write |
| Daily/QPS quota exhausted or paid balance exhausted | Capacity/commercial fault | Customer can save other Brand fields and return later | Product/operator resolves entitlement | No new location; existing verified location retained |
| Amap unavailable while editing non-location fields | External dependency unavailable | Save unrelated fields without revalidating unchanged location | Brand application | Existing Store Location remains authoritative |
| Customer changes location during provider outage | Incomplete change | Do not replace current verified location or accept manual facts | Customer retries selection | No partial replacement |
| Database write fails after receipt verification | Local transactional failure | Retry Brand save while receipt remains valid; otherwise reverify | Brand repository/customer | Transaction rolls back completely |
| License or storage permission absent/unclear | External authorization blocker | Feature remains inactive | Commercial/legal risk owner | No call and no provider-derived persistence |

### Tool and Framework Decision

| Candidate | Adopt, defer, or reject | Reason | Exit or refresh trigger |
| --- | --- | --- | --- |
| Existing Nest module plus a Brand-owned `StoreLocationProvider` port | Adopt | External protocol variability and fixture substitution are real seams; Brand business rules remain local | Revisit only if another approved provider must be supported |
| Server-side Amap Web Service v5 search/detail plus v3 reverse geocode | Conditional adopt | Provides required evidence while keeping credentials and verification server-side | License/storage approval, controlled contract validation, endpoint or term change |
| Existing generated REST/OpenAPI client and shared Brand form | Adopt | Already owns Web transport and registration/edit reuse | None for this change |
| Server-sealed short-lived verification receipt | Adopt | Prevents forged client facts without a search-session database or an external call inside the Brand transaction | Replace only if receipt size/rotation evidence requires a short-lived server store |
| Amap JS API 2.0 map/autocomplete | Defer | Adds a second credential/security-key surface; a bounded result list meets first acceptance | Observed selection failure that a visual map materially fixes, plus separate Key/security approval |
| Provider search-session table or Redis cache | Reject initially | Creates transient provider-data persistence and operational cleanup without a required durable workflow | Revisit only if receipt constraints are proven inadequate and storage permission covers it |
| Generic location platform/provider registry/factory | Reject | One bounded external owner and no proven second provider; would widen the interface without removing complexity | A separately approved second provider with the same stable Brand semantics |
| Raw provider-response persistence | Reject | Violates minimization, binds business data to vendor schema, and conflicts with ordinary service terms | Never without a new explicit product/legal decision |

### Operational and Verification Boundary

- **Security:** `AMAP_WEB_SERVICE_KEY` is a server secret, not a request field.
  Production config uses an egress-IP allowlist. Query strings and Key-bearing
  URLs are never logged. Search text and exact address are customer data and are
  omitted or purposefully redacted from ordinary logs/traces.
- **Authorization:** every endpoint requires a terminal-customer session and
  binds receipt/account/Brand. Search may occur before a Brand exists during
  registration, so the receipt binds to account plus a server nonce and may be
  consumed only by that account's new Brand mutation.
- **Cost and capacity:** no per-keystroke provider calls, maximum ten candidates,
  no background refresh, no load test, and metrics by operation/outcome only.
  The actual account quota and QPS are checked before implementation validation.
- **Observability:** record operation name, normalized outcome/`infocode`,
  latency bucket, retry count, and a request correlation ID. Never record Key,
  full request URL, raw response, sealed receipt, complete input address, or
  provider content in general telemetry.
- **Verification:** fixtures first; then, only after separate authorization,
  one ordinary district, one municipality, one special no-county city, one no-
  business-area result, one multiple-area result, and named failure responses.
  No evaluation Provider call and no production data.
- **External-authorization residual:** the architecture is not implementation-
  ready until the license/storage gate is resolved.

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

### Ordered Characteristics

Two to six normalized customer priorities used as possible Query angles. The
list order is business meaning: earlier items express higher customer priority.
#26 may select or combine the list into the existing two characteristic question
roles; neither Brand nor #40 generates those questions.

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
characteristics[]              -> ordered JSON array, 0..6 in a draft
contactName
contactMobile
evaluationFingerprint
evaluationFingerprintScheme   -> brand-evaluation-input@2 | @3
```

`characteristics` is a bounded JSON array rather than a child entity because a
characteristic has no independent identity, lifecycle, authorization, or
consumer. Array order is the contract. Server validation and database JSON
shape/length checks protect 0-6 strings; readiness applies the 2-6 rule.

The existing `characteristicOne` and `characteristicTwo` columns are migration
inputs only. They do not remain a second writable current source after the
contract step.

### Brand Store Location

Use one owner-local one-to-one table/value because location contains coherent
provenance, coordinate, structured address, locality choice, and replacement
rules that should not expand the Brand row or leak into unrelated callers.

```text
id                         internal row identity
brandId                    unique, owned by one Brand
semanticFactId             internal stable identity used by fingerprint
searchInput                normalized customer input retained only if licensed
provider                   AMAP
providerPlaceId            current source identity, never public mutation input
providerContractVersion    e.g. amap-place-v5+regeo-v3@1
verifiedAt
placeName
formattedAddress
provinceName
cityName?
districtName
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

The exact provider fields may be persisted only after the external authorization
gate. Raw responses, phone, rating, reviews, photos, opening hours, and unrelated
POIs are never stored.

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

- draft: zero to six ordered normalized strings;
- UI: render two empty rows by default, add up to six, remove while preserving
  remaining order, and provide keyboard-accessible move up/down controls;
- evaluation-ready: two to six values;
- each value: 2-120 normalized characters;
- exact normalized duplicates: rejected;
- fingerprint: full ordered list included, so add/remove/edit/reorder is a
  semantic change.

The proposed limits keep one profile usable for Query while preventing an
unbounded marketing brief. They remain product-owner decisions, not facts
copied into current specs before approval.

## Location Selection and Commit

### 1. Search

The customer first chooses the existing Brand official region, then enters a
specific store name, landmark, or address and explicitly searches. Web waits for
submit (and may debounce duplicate submits), calls a GEOEval endpoint, and shows
no more than ten candidates with place name and complete address feedback.

The server calls v5 text search with:

- one normalized keyword, at most the provider's documented 80 characters;
- region/adcode derived from the Brand-owned official region;
- `city_limit=true` where the provider contract supports the selected region;
- minimum required fields only;
- a bounded total deadline and no broad pagination.

For Brand creation during registration, the request carries the controlled
region path in the authenticated request. Brand validates that path before it
is used as a search scope.

### 2. Verify

Candidate response contains a short-lived selection token, not an authoritative
client-editable provider ID. The verify command resolves v5 ID detail and v3
reverse geocoding at the returned coordinate. Brand then checks:

1. status/`infocode` and required field types;
2. selected POI identity and coordinate presence;
3. coordinate longitude/latitude ranges and explicit GCJ-02 system;
4. detail versus reverse-geocode adcode/address coherence;
5. Amap administrative evidence versus the Brand-owned official region path;
6. exact special-city terminal mapping when required;
7. bounded, normalized, de-duplicated business-area candidates.

If any required fact is absent or conflicting, no verification receipt is
issued.

### 3. Choose Query Locality

Candidate order is deterministic within the verified result:

1. exact POI `business.business_area` when present;
2. reverse-geocode `businessAreas` in provider order;
3. de-duplicate by normalized label while retaining first provenance.

Provider order is presentation only; the customer chooses the final candidate.
When the list is empty, Brand constructs one `ADDRESS_LOCALITY` from verified
place/address components and displays that honest type. The Agent never chooses
or invents a locality.

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
POST /brand-location-candidate-searches
  { officialRegionPath, keyword }
  -> { candidates[{ selectionToken, placeName, addressDisplay, regionDisplay }] }

POST /brand-location-verifications
  { selectionToken }
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
fingerprint, fingerprint scheme, and migration diagnostics remain internal.

## Evaluation Fingerprint v3

`brand-evaluation-input@3` hashes one canonical ordered document:

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
  "characteristics": ["<ordered normalized values>"]
}
```

Included meaning:

- company/store name;
- stable industry and official-region identity;
- applicable industry `Other` phrase;
- the selected physical Store Location and final Query locality through its
  Brand-owned semantic fact identity;
- flagship product/service;
- every characteristic and its order.

Excluded representation:

- Amap Key, provider response hash, provider contract version, verification
  time, POI ID, address labels, coordinate digits, candidate ordering, provider
  source release, official-region labels, catalog/source versions, contact
  fields, timestamps, and Web presentation.

The excluded provider facts still remain frozen in v3 for historical display
and audit when licensed; they simply do not define a new opportunity unless the
customer selects a different semantic Store Location/locality.

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
  province, city, terminal, officialPath        # current v2 structure
storeLocation:
  semanticFactId
  placeName
  formattedAddress
  coordinate { longitude, latitude, system: GCJ_02 }
  officialRegionDisplay
  queryLocality { kind, label }
  source { provider: AMAP, placeId, contractVersion, verifiedAt }
flagshipProductOrService
characteristics[]
```

GEO maps it without re-resolution to:

```text
schemaVersion: brand-evaluation-snapshot@3
companyName
industry                     # same semantic structure as v2
region                       # same official structure as v2
storeLocation                # frozen display, coordinate, locality, provenance
flagshipProductOrService
characteristics[]
```

Only `queryLocality.label`, `flagshipProductOrService`, and the ordered
`characteristics` are required by #26 Query wording. Coordinates, address, and
provenance are frozen Brand evidence, not Prompt instructions. #26 must import
the GEO snapshot/query projection, not Brand domain types or Amap contracts.

## Snapshot Compatibility

The GEO-owned decoder becomes a strict union:

```text
legacy-v1: no discriminator; original eight text fields
v2: brand-evaluation-snapshot@2; structured industry/region, two characteristics
v3: brand-evaluation-snapshot@3; Store Location, flagship value, characteristic list
```

Parsing order is v3 -> v2 -> exact legacy-v1. No version is inferred from
optional new fields. Migration never rewrites snapshot JSON.

Separate narrow projections prevent #40 from silently changing other owners:

- historical/report text projection accepts v1/v2/v3 and retains existing
  Parser/Synthesis/report meaning;
- the #26 Query input projection requires v3 for the revised store-centered
  Prompt;
- public historical responses retain their original frozen shape/meaning; any
  new v3 response fields are explicit additions rather than synthetic backfill
  for v1/v2.

## Migration and Opportunity Continuity

### Preflight

Before any write, classify:

- Brand count and status;
- current `characteristicOne`/`characteristicTwo` null, length, normalization,
  and duplicate cases;
- Brands with no Definition, an unstarted Definition, active Run, retryable Run,
  completed report, and current report;
- exact current Brand/Definition/Run fingerprint relationships;
- snapshot counts by legacy-v1 and v2;
- unexpected existing columns/data from other worktrees or deployments.

The proposal assumes no production migration. Any later real-customer migration
requires a separately approved representative-data plan.

### Representation Migration

For every current Brand:

1. add nullable Store Location and flagship fields;
2. backfill `characteristics` exactly from the two normalized existing fields,
   preserving order and content;
3. set `evaluationFingerprintScheme` to `brand-evaluation-input@2` and retain
   the exact current fingerprint value;
4. do not create Store Location, invent flagship data, call Amap, change
   readiness history, rewrite Definition/Run keys, or rewrite snapshot JSON;
5. keep all Definitions, questions, Runs, attempts, samples, synthesis, reports,
   notifications, and completed-opportunity counts unchanged.

The application cuts over to the array as the only current characteristic
writer. Old columns are removed only after backfill and compatibility checks in
the same isolated migration package; no long-lived dual write is accepted.

### Existing Definition Continuity

After migration an existing Brand lacks new v3 facts and is incomplete for a
new v3 Definition. That incompleteness must not hide an unchanged existing
Definition. GEO therefore observes the Brand's current fingerprint identity and
looks up an existing Definition before requesting a new ready v3 projection.

- unchanged v1/v2 Definition with the same retained v2 fingerprint: remains
  viewable and startable;
- existing active/retryable/completed Run: resumes and reports only from its
  frozen old snapshot;
- contact-only edit: retains v2 fingerprint and existing Definition eligibility;
- first evaluation-semantic edit after migration—including location,
  flagship, characteristic add/remove/edit/reorder, company, industry, or
  official region—moves the current Brand to a v3 fingerprint, so the old
  unstarted Definition becomes stale through the ordinary rule;
- completing all v3 fields creates a genuinely new eligible semantic revision;
  that new opportunity comes from customer meaning, not migration.

New Brands created after activation use v3 fingerprint semantics from their
first save, even while incomplete.

### Rollback

Before production authorization:

- revert code and rebuild/restore the isolated development database from the
  pre-migration backup;
- retain every old snapshot and business record;
- do not delete provider-derived data through an ad hoc cleanup.

After any real customer data exists, ordinary rollback is forward-compatible:

- disable new search/verification and keep current verified Store Locations
  readable;
- preserve v3 snapshots and the v1/v2/v3 decoder;
- continue existing Definitions/Runs/reports;
- repair the adapter or release a forward migration;
- never downgrade v3 fingerprints to v2, rewrite history, or remove location
  records without separate destructive-data authorization.

## #26 Integration and Release Boundary

#40 owns and later implements only the v3 producer and compatibility decoder.
#26 remains the single writer for Query Prompt, Model Contract, candidate
selection, preparation lifecycle, examples, and real Query review.

Integration order:

1. approve #40 product semantics, architecture, and external authorization;
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

### Direct Browser Provider versus Brand BFF

**Adopt Brand BFF.** Direct JS API is visually rich but creates another Key and
security-proxy boundary and still cannot make client results authoritative.
The BFF keeps provider protocol, credentials, verification, errors, and fixtures
behind one Brand-owned port. Web receives a smaller interface and the server can
enforce account, region, receipt, and atomic-write invariants.

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

### Characteristic Rows versus Ordered JSON

**Adopt ordered JSON.** Characteristics have no independent identity, lookup,
authorization, lifecycle, or consumer. A table would add joins and reorder
transactions without hiding meaningful complexity. A bounded validated array
is the smallest truthful contract and snapshots naturally preserve it.

## Documentation Reconciliation

Only after implementation and acceptance:

- update `openspec/specs/brand-knowledge/spec.md` with Store Location, flagship,
  ordered characteristics, v3 fingerprint/projection, migration, and form rules;
- update evaluation-definition only with the v3 frozen-seam and compatibility
  behavior, without copying Brand fields;
- move activated customer meaning from the broad product-definition/vision
  summaries to the Brand owner and retain index links/evolution-marker state;
- add agreed glossary terms only after product approval;
- update architecture overview with the Store Location adapter and #40 -> #26
  dependency;
- regenerate OpenAPI/client and reconcile executable schemas/tests;
- archive this Change only after all accepted design has a current or executable
  owner and obsolete active explanations are removed.

No ADR is proposed before approval. The Brand-to-GEO owner direction already
has a current owner-local contract; the provider choice and field limits remain
change-local until the license and product decisions are accepted. Create or
supersede an ADR only if approval establishes a surprising cross-change provider
or geospatial policy that future capabilities must preserve.
