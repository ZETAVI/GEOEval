# Source Brief: Amap-assisted Store Selection and Verification

- Decision: whether GEOEval can combine Amap JavaScript API 2.0 map-assisted
  selection with server-side Web Service verification, then retain the minimum
  location facts needed by Brand Knowledge and an immutable evaluation snapshot.
- Affected Change: Issue #40, `extend-store-brand-evaluation-context`.
- Access date: 2026-09-03.
- Evidence level: official Amap API references, official account/security
  guidance, and a normalized 2026-09-03 controlled Web Service probe; the
  platform service agreement is retained as reviewed context.
- Disqualifier: the official interfaces or actual account cannot support the
  required map, verification, minimum-field, credential, or exact region-
  derivation
  boundary without trusting browser facts or inventing location meaning.

## Recommendation

Adopt a **hybrid boundary**: Amap JavaScript API 2.0 supplies the
customer's map, autocomplete/search, candidate markers, and accessible result
list; a separate server-side Web Service adapter independently resolves the
selected POI and reverse-geocodes its coordinate before Brand can persist it.
The map improves selection confidence but never becomes the authority for a
Brand write.

The 2026-09-03 product revision removes the separate customer-maintained three-
level region selection. AutoComplete/PlaceSearch operate without a product city
constraint; the customer searches with a concrete store name plus city/address/
landmark text. The server maps verified adcode/towncode evidence to exactly one
maintained MCA path. The Web does not load `AMap.Geolocation`, call browser
geolocation, infer location from IP, or request current-position permission.

The platform agreement context remains recorded below. On 2026-09-02, the human
commercial/legal risk owner stated that they had reviewed the use, found no
issue, and did not want #40 gated on a separate licensing inquiry. The Source
Brief therefore treats that risk as accepted and uses current official API
documentation plus later controlled account evidence as the engineering basis.

Application and Key creation were separately authorized and completed on
2026-09-02. On 2026-09-03, the product owner separately authorized controlled
real calls, and the bounded public-place probe described below completed. These
actions do not authorize runtime implementation, purchase, production
activation, or development-data reset. The minimum-field, no-raw-response, and
credential boundaries remain unchanged.

## Decision Constraints

- Use separate platform credentials: the Web(JS API) Key is loaded only by the
  map client and restricted to approved domains; its security key remains on
  the server through the documented `/_AMapService` proxy. The Web Service API
  Key remains server-only and uses an outbound-IP allowlist. Neither security
  key nor Web Service Key enters JavaScript, OpenAPI, generated clients, logs,
  traces, screenshots, or persisted Brand data.
- Browser-submitted place facts are untrusted. A server call must resolve the
  selected POI and reverse-geocode its coordinate before Brand can commit an
  evaluation-relevant store location.
- Province/city/terminal are not parallel customer inputs. The verified place is
  the only derivation source; an exact maintained MCA mapping is required before
  Brand can commit the Store Location.
- Amap fields are provider evidence, not stable product identity. The official
  docs call a POI ID unique for a current result but do not promise lifecycle
  stability across provider data updates.
- Domestic Amap coordinates are GCJ-02. The coordinate system must be stored
  explicitly; callers must not reinterpret the numbers as WGS84.
- Search, detail, and reverse-geocode output can be incomplete or inconsistent
  with reality. The customer confirms the selected storefront, while the
  server verifies structure and derives one exact maintained region path;
  neither the Agent nor the client may invent a place, region, or business area.
- Search and input-tip quotas are materially lower than geocoding quotas in the
  current official table. Autocomplete therefore starts only after a minimum
  input length, is debounced, and never loads unbounded pages; an explicit
  search remains available.
- No pressure/load test is permitted. Capacity evidence must come from account
  quota inspection and ordinary bounded validation only.

## Account and Credential Preparation Evidence

- The Amap console contains one application named `GEOEval` and two separately
  scoped credentials: `GEOEval Web JS` for `Web端(JS API)` and
  `GEOEval Server` for `Web服务`. No credential value is copied into the
  changed files or this Source Brief; later Issue/PR updates must also remain
  value-free.
- The keys were created without production domain/IP restrictions for local
  preparation. On 2026-09-03, the console list still confirmed the intended
  `Web端` and `Web服务` types, but the accessible settings readback for the Web
  Service row exposed an inconsistent Android-form view. The current restriction
  state is therefore not accepted as evidence. Reverify or replace both keys
  when the approved release domain and fixed server egress are known.
- The actual console now identifies the account as an enterprise-certified
  developer and states that enterprise service permissions are active. Its
  certification page shows monthly quotas of 3,000,000 for the shared basic-LBS
  group, 30,000,000 JS map initializations, and 50,000 for the shared basic-search
  group. These account observations are distinct from the bounded endpoint
  evidence below and do not prove production security configuration.
- The current public billing table associates the same quota tier with 30 QPS
  for basic LBS, 100 QPS for JS map initialization, and 30 QPS for basic search.
  The account's key-specific quota and QPS pages currently show no usage rows,
  so #40 treats those figures as documented planning limits rather than observed
  runtime capacity and keeps controlled validation at concurrency one.
- The console home states that this enterprise account has not obtained a
  technical-service license. The Key dialog says the current Key/quota may be
  used for short-term, small-volume tests, while production/business operation
  remains a separate purchase/activation boundary. No traffic-package recharge
  is needed for the planned bounded fixtures.

## Controlled Web Service Contract Evidence

On 2026-09-03, the product owner authorized real calls. GEOEval used the
existing `Web服务` Key only in process memory, at concurrency one, against public
non-customer landmarks. No Key value, request URL, provider place ID, raw
response, phone, rating, hours, photo, or exact coordinate was retained. The
probe made nine base-contract calls plus one three-call `extensions=all`
comparison, with no retry and no load/capacity test.

All twelve calls returned HTTP 200, `status = "1"`, and
`infocode = "10000"`. The observed latencies below are single-sample contract
evidence, not an SLA or capacity claim.

| Fixture | Search/detail/reverse latency | Normalized evidence | Official-region implication |
| --- | --- | --- | --- |
| Guangzhou Tower, ordinary district | 220 / 100 / 78 ms | detail `business_area` was a present string; reverse `city`, `district`, `township`, and `towncode` were strings | detail and reverse adcode `440105` agreed and exactly matched the maintained MCA county terminal |
| Palace Museum, municipality | 153 / 86 / 62 ms | detail `business_area` was absent; reverse `city` was an empty array while `district`, `township`, and `towncode` were strings | detail and reverse adcode `110101` agreed and exactly matched the maintained MCA county terminal; an empty reverse city is not a mismatch when province and terminal agree |
| Dongguan Citizen Service Center, city without county-level divisions | 186 / 98 / 86 ms | detail `business_area` was a present string; reverse `district` was an empty array while `city`, `township`, and `towncode` were strings | detail/reverse adcode `441900` agreed; observed towncode `441900004000` maps exactly to maintained terminal `CN-MCA-TOWNSHIP-441900004` after the explicit Amap 12-digit-to-MCA 9-digit normalization, with the same `南城街道` label |
| Guangzhou Tower, `extensions=all` comparison | 215 / 86 / 76 ms | reverse `businessAreas` was an array containing three candidates | the accepted multi-candidate locality behavior requires `extensions=all`; the adapter must immediately discard every unrelated extended field |

The probe establishes successful current text-search, ID-detail, and
reverse-geocode behavior for the named shapes; string/empty-array variation;
detail/reverse adcode coherence; present, absent, and multiple business-area
shapes; and one exact direct-admin township mapping. It does not establish POI
ID lifecycle stability, an SLA, timeout/error behavior, JS map/security-proxy
behavior, a zero-candidate result after combining detail and extended reverse
evidence, production allowlists, or technical-service activation.

## Evidence

| Claim | Primary source | Version/date | Design implication |
| --- | --- | --- | --- |
| Place Search 2.0 supports keyword, nearby, polygon, and ID search; text search can be region-scoped and strictly limited with `city_limit`; ID detail accepts up to ten IDs | [Amap Place Search 2.0](https://lbs.amap.com/api/webservice/guide/api-advanced/newpoisearch) | Updated 2026-07-15; accessed 2026-09-02 | Use JavaScript API 2.0 for interactive candidate discovery and server-side v5 ID detail for authoritative verification; reserve server-side v5 text search for a separately justified fallback and do not treat result ordering as product truth |
| Place results expose POI ID, name, address, coordinate, province/city/district names and codes; `business.business_area` is optional through `show_fields` | [Amap Place Search 2.0](https://lbs.amap.com/api/webservice/guide/api-advanced/newpoisearch) | Updated 2026-07-15 | Request only the minimum fields; model absence as normal and never require provider rating, phone, photos, or commercial metadata |
| Reverse geocoding returns structured address components and, with extended output, business-area, POI, AOI, road, and neighborhood information | [Amap geocoding and reverse geocoding](https://lbs.amap.com/api/webservice/guide/api/georegeo) | Updated 2026-02-02 | Reverify the selected coordinate server-side; derive bounded business-area candidates and a precise address fallback without copying the raw response |
| JS API 2.0 provides `AMap.AutoComplete` and `AMap.PlaceSearch`; `PlaceSearch` can draw results on an `AMap.Map`, populate a panel, constrain a city, and auto-fit markers | [Amap JS API input tips and POI search](https://lbs.amap.com/api/javascript-api-v2/guide/services/autocomplete), [Amap map POI search](https://lbs.amap.com/api/javascript-api-v2/tutorails/search-poi) | Updated 2026-07-15 and 2024-07-12 | Adopt a responsive map plus accessible candidate list; cap results at ten and treat every browser result as untrusted until server verification |
| `AutoComplete.city` and `PlaceSearch.city` default to nationwide search, while `PlaceSearch.citylimit` defaults to `false` | [Amap JS API input tips and POI search](https://lbs.amap.com/api/javascript-api-v2/guide/services/autocomplete), [Amap PlaceSearch reference](https://lbs.amap.com/api/maps-javascript-api/reference/search/placesearch), [Amap map POI search](https://lbs.amap.com/api/javascript-api-v2/tutorails/search-poi) | Updated 2026-07-15, 2026-07-02, and 2024-07-12; accessed 2026-09-03 | Do not require a separate region selector; guide the customer to include city/address/landmark text and show full addresses for disambiguation |
| `AMap.Map`, AutoComplete/PlaceSearch, and `AMap.Geolocation` are separate capabilities/plugins; map center is optional configuration | [Amap JS API 2.0 reference](https://lbs.amap.com/api/javascript-api-v2/documentation), [Amap geolocation plugin](https://lbs.amap.com/api/javascript-api-v2/guide/services/geolocation) | Updated 2025-09-12; accessed 2026-09-03 | Do not load Geolocation or request browser/device/IP position; initialize a neutral map and fit the view after search results |
| `AMap.Marker` supports displayed coordinates and click events, while map click events expose a selected longitude/latitude | [Amap Marker](https://lbs.amap.com/api/javascript-api-v2/guide/amap-marker/default-marker), [Amap map lifecycle](https://lbs.amap.com/api/javascript-api-v2/guide/map/lifecycle) | Updated 2024-07-12 and 2023-12-12 | Candidate Marker clicks select POIs; a free map click may reposition or search nearby but cannot directly commit a Store Location |
| JS API geocoding supports converting a map-selected coordinate to an address | [Amap JS API geocoding](https://lbs.amap.com/api/javascript-api-v2/guide/services/geocoder) | Updated 2024-07-19 | Use it for immediate preview only; server Web Service detail/reverse-geocode remains authoritative |
| Amap requires a separate Web(JS API) Key and security key and recommends keeping the security key on the server through a proxy; plaintext browser configuration is not recommended for production | [Amap JS API security-key guidance](https://lbs.amap.com/api/javascript-api-v2/guide/abc/jscode) | Updated 2025-06-18 | Use an approved-domain JS Key plus server `/_AMapService` proxy; never reuse or expose the Web Service Key |
| Amap coordinates in mainland use GCJ-02; non-Amap coordinates must be converted before use with Amap | [Amap coordinate conversion](https://lbs.amap.com/api/javascript-api-v2/guide/transform/convertfrom) | Updated 2024-07-29 | Persist `GCJ-02` explicitly and keep longitude/latitude to the documented six-decimal request precision |
| Responses use `status`, `info`, and `infocode`; documented failures include invalid/expired Key, unavailable service, quota exhaustion, frequency limit, IP/domain/signature mismatch, busy service, and exhausted paid balance | [Amap error-code reference](https://lbs.amap.com/api/webservice/guide/tools/info) | Updated 2022-10-12 | Normalize provider outcomes at the adapter; retry only bounded transient/busy failures and never retry auth, permission, quota, or invalid-input outcomes blindly |
| Production Web Service Keys should use the server outbound-IP allowlist | [Amap Web Service IP allowlist FAQ](https://lbs.amap.com/faq/webservice/webservice-api/basic-configuration/43238) | Accessed 2026-09-02 | Key remains in server configuration and calls originate from known release egress; `10005` is a configuration fault, not a customer retry |
| The actual GEOEval account is enterprise-certified and its certification page shows 3,000,000 monthly basic-LBS calls, 30,000,000 JS map initializations, and 50,000 basic-search calls | [Amap account certification console](https://console.amap.com/dev/user/permission) | Observed 2026-09-03 | Certification and a test-scale monthly allowance are established; the later controlled probe establishes only bounded current endpoint behavior, not production readiness |
| The current public billing table associates the 3,000,000 / 30,000,000 / 50,000 quota tier with 30 / 100 / 30 QPS respectively | [Amap base-service billing](https://lbs.amap.com/pages/base_service_price) | Accessed 2026-09-03 | Use the values only as documented ceilings; ordinary validation remains serial and never attempts a capacity test |
| Requests consume monthly quota first; only quota above the granted amount requires a paid traffic package, and the published base price is 30 CNY per 10,000 basic-LBS/search calls and 3 CNY per 10,000 map-initialization calls | [Amap service upgrade and pricing](https://lbs.amap.com/upgrade#price) | Accessed 2026-09-02 | Do not recharge speculatively. Reassess capacity only after certification and a normal development usage estimate |
| Official setup uses a `Web端(JS API)` Key plus security key for JS API 2.0 and a separate `Web服务` Key for Web Service APIs | [Amap JS API prerequisites](https://lbs.amap.com/api/javascript-api-v2/prerequisites), [Amap Web Service Key setup](https://lbs.amap.com/api/webservice/create-project-and-key) | Updated 2024-04-09 and 2026-03-30; accessed 2026-09-02 | The two observed GEOEval Key types match the documented split; their values remain outside version control and product contracts |
| Amap recommends JS API Loader, supports its NPM package, requires online JS API loading, and requires the security configuration before the load call | [Amap JS API loading](https://lbs.amap.com/api/javascript-api-v2/guide/abc/load), [Amap React guide](https://lbs.amap.com/api/javascript-api-v2/guide/abc/amap-react) | Updated 2023-12-18; accessed 2026-09-03 | Add the project-local loader dependency during implementation; load only v2.0 and the required plugins, then destroy the map on unmount |
| The current account home states that no technical-service license is active; the Key dialog limits unlicensed enterprise use to short-term, small-volume tests | [Amap console](https://console.amap.com/dev/index), [Amap service upgrade](https://lbs.amap.com/upgrade#business) | Observed/accessed 2026-09-03 | Controlled fictional/non-customer fixtures are eligible; production activation and sustained use remain a later owner decision |
| The agreement describes technical-service licensing and restrictions around provider content and direct storage/cache | [Amap platform service agreement](https://lbs.amap.com/pages/terms/) | Updated 2025-12-03 | Record as reviewed context; the human commercial/legal risk owner accepts the proposed use and does not require a separate engineering Gate in #40 |
| Amap says Web Service APIs must not be pressure tested | [Amap Web Service application FAQ](https://lbs.amap.com/faq/webservice/webservice-api/basic-configuration/43234) | Accessed 2026-09-02 | Verification uses a few named fixtures and console quota inspection, not a load test |

## Exact Initial API Contract

### Browser interaction

- Load JavaScript API 2.0 with the `Web端(JS API)` Key. For keys created after
  2021-12-02, configure `securityJsCode` through the documented server proxy and
  set `window._AMapSecurityConfig.serviceHost = '/_AMapService'` before loading
  the JS API script.
- Use `AMap.Map`, `AMap.AutoComplete`, `AMap.PlaceSearch`, and `AMap.Marker`.
  Do not set a city/city-limit from a product field. Set `pageSize: 10`,
  `pageIndex: 1`, the current `map`, an accessible result `panel`, and
  `autoFitView: true`; require keyword guidance and full-address result display
  to disambiguate same-name stores.
- Do not load `AMap.Geolocation`, call `navigator.geolocation`, infer position
  from IP, or render a current-location control. Search and map interaction must
  work without a permission prompt.
- A selected candidate contributes only its POI ID to the GEOEval verify
  command. Name, address, coordinate, business area, and result order from the
  browser remain preview data and cannot be committed as facts.

### Server POI verification

- Call `GET https://restapi.amap.com/v5/place/detail` with the server-only
  `Web服务` Key and exactly one selected `id`. Although the API accepts up to ten
  IDs separated by `|`, the #40 verification command deliberately accepts one.
- Request `show_fields=business` only to obtain the optional
  `business.business_area`. The grouped response may include phone, hours,
  rating, and other fields; the adapter discards them immediately and returns
  only the selected minimum facts.
- Normalize the documented base fields needed by #40: `id`, `name`, `location`,
  `address`, `pname`, `cityname`, `adname`, `pcode`, `citycode`, and `adcode`.
  Treat absent fields and string/array response variation defensively.

### Server reverse geocoding

- Call `GET https://restapi.amap.com/v3/geocode/regeo` with the server-only Key,
  `location=<longitude>,<latitude>` in longitude-first order at no more than six
  decimal places, `extensions=all`, and JSON output. Controlled evidence showed
  that `base` cannot implement the accepted multi-business-area candidate
  branch, while `all` returned a bounded candidate array. Parse only the
  required components and `businessAreas`; discard all unrelated extended
  content immediately.
- Use reverse geocoding to verify formatted address and administrative
  components (`province`, `city`, `district`, `adcode`, `township`, and
  `towncode`) plus the bounded `businessAreas` labels needed by the accepted
  locality choice. Do not persist or expose nearby POIs, roads, intersections,
  AOIs, or other extended output.
- Normalize provider empty arrays before Brand performs MCA region-coherence
  checks. The controlled municipality returned `city = []`; the controlled
  city without county-level divisions returned `district = []`.
- For an MCA county terminal, require the six-digit detail and reverse adcode to
  agree with the terminal code; a municipality's empty reverse city is not a
  mismatch when province and terminal agree. For the controlled direct-admin
  township shape, require the detail/reverse city adcode to agree with the
  maintained prefecture and require the 12-digit Amap towncode to equal the
  maintained nine-digit MCA township code plus `000`. Unsupported shapes fail
  closed rather than guessing.

### Result and error classification

- Accept a provider response only when `status = "1"` and
  `infocode = "10000"`; `info` is retained only as a redacted diagnostic class.
- Authentication, Key type, permission, signature, domain/IP restriction,
  quota, QPS, paid balance, and invalid-input errors are non-retryable operator
  or user outcomes. Only documented busy/engine/transient failures may receive
  one bounded retry within the total deadline.

## Proposed Provider Boundary

The source evidence supports the following minimum browser/server boundary:

```text
browserMapSearch(normalizedKeyword, limit <= 10)
  -> browser candidate markers and accessible list
  -> untrusted selected providerPlaceId

serverVerifyStoreSelection(providerPlaceId)
  -> verified place detail
  -> reverse-geocoded structured address at the returned coordinate
  -> exactly one derived maintained MCA official-region path
  -> normalized business-area candidates
  -> provider outcome and verification timestamp
```

The JavaScript boundary owns only transient interaction. The server adapter
returns typed normalized values and provider error categories and does not
expose the Web Service Key, raw response, request URL, provider rating, phone,
photos, reviews, or unrelated POI metadata. Brand application logic—not either
provider client—checks the account, exact provider-to-MCA derivation, customer-
confirmed locality, readiness, and fingerprint consequences.

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| Hybrid JS map selection plus server Web Service verification | Adopt | Gives the user map confidence while keeping every persisted fact behind account-bound server verification; requires separate JS and Web Service credential boundaries |
| Separate three-level region selector plus map search | Reject after 2026-09-03 revision | Creates two customer-visible location standards that can disagree; the verified place already supplies the evidence needed to derive the maintained region identity |
| Server-only candidate list without a map | Defer as fallback | Smaller credential surface but does not meet the confirmed map-selection preference; retain only as graceful fallback if the map cannot load after entitlement is established |
| Browser calls Web Service API directly | Reject | Exposes the server credential, defeats IP allowlisting, and lets client-controlled provider data approach Brand persistence |
| Arbitrary map click commits a location | Reject | A coordinate is not proof of a concrete storefront; map clicks may move the search center but the customer must still select a POI that the server can resolve |
| Persist raw Amap responses for future reuse | Reject | Violates data minimization, duplicates external schemas, increases drift, and is unnecessary for Brand meaning |
| Manual address as an evaluation-ready fallback | Reject | Cannot prove a concrete store or business area and would allow forged client data to become evaluation truth; manual input may remain a transient search draft only |
| No external provider; retain province-city-terminal only | Reject for #40 outcome | Preserves current behavior but cannot distinguish a specific storefront or stable local recommendation context |

## Completed Validation and Remaining Unknowns

Enterprise certification, documented test-scale quota, current success behavior
for the named Web Service endpoints, response-type variation, plural
business-area evidence, and one direct-admin township mapping are now
established. They are sufficient to fix the initial adapter parsing and
provider-to-MCA derivation contract.

Implementation must still use fixtures to prove timeout and documented
`infocode` classification, and must add a controlled zero-combined-business-area
case for the address-locality fallback. After package 4 creates the security
proxy, add the JS Key/security code only to the ignored environment and validate
map/Marker/accessible-list selection on desktop and mobile. Production remains
blocked on approved domain and fixed-egress restrictions, technical-service
activation, and runtime evidence in the release environment. POI-ID lifecycle
stability and an SLA remain unknown rather than assumed.

The nationwide JS search path and proof that no location permission is requested
remain browser-implementation evidence; the existing Web Service success probe
is not presented as proof of that UI path.

## Reuse and Refresh Boundary

- Reusable while: Amap JavaScript API 2.0 map/search/Marker behavior, domestic
  Web Service v5 place detail, v3 reverse geocoding, GCJ-02 behavior, both Key
  configurations, and the #40 one-store decision remain the same.
- Refresh when: Amap changes endpoints, response fields, terms, pricing,
  entitlements, quota, coordinate behavior, or Key security; GEOEval adds
  multiple stores, arbitrary coordinate storage,
  background refresh,
  overseas/Hong Kong/Macao/Taiwan support, navigation, or bulk search; or a
  provider identity/address drift causes a real selection failure.
