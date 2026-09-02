# Source Brief: Amap-assisted Store Selection and Verification

- Decision: whether GEOEval can combine Amap JavaScript API 2.0 map-assisted
  selection with server-side Web Service verification, then retain the minimum
  location facts needed by Brand Knowledge and an immutable evaluation snapshot.
- Affected Change: Issue #40, `extend-store-brand-evaluation-context`.
- Access date: 2026-09-02.
- Evidence level: official Amap API references and official account/security
  guidance; the platform service agreement is retained as reviewed context.
- Disqualifier: the official interfaces or actual account cannot support the
  required map, verification, minimum-field, credential, or region-coherence
  boundary without trusting browser facts or inventing location meaning.

## Recommendation

Adopt a **hybrid boundary**: Amap JavaScript API 2.0 supplies the
customer's map, autocomplete/search, candidate markers, and accessible result
list; a separate server-side Web Service adapter independently resolves the
selected POI and reverse-geocodes its coordinate before Brand can persist it.
The map improves selection confidence but never becomes the authority for a
Brand write.

The platform agreement context remains recorded below. On 2026-09-02, the human
commercial/legal risk owner stated that they had reviewed the use, found no
issue, and did not want #40 gated on a separate licensing inquiry. The Source
Brief therefore treats that risk as accepted and uses current official API
documentation plus later controlled account evidence as the engineering basis.

This decision does not authorize implementation, Key creation, purchase, or
live calls. It does allow the design to proceed without a work order while
retaining minimum-field persistence, no raw-response storage, and the existing
security boundaries.

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
- Amap fields are provider evidence, not stable product identity. The official
  docs call a POI ID unique for a current result but do not promise lifecycle
  stability across provider data updates.
- Domestic Amap coordinates are GCJ-02. The coordinate system must be stored
  explicitly; callers must not reinterpret the numbers as WGS84.
- Search, detail, and reverse-geocode output can be incomplete or inconsistent
  with reality. The customer confirms the selected storefront, while the
  server verifies structure and region coherence; neither the Agent nor the
  client may invent a place or business area.
- Search and input-tip quotas are materially lower than geocoding quotas in the
  current official table. Autocomplete therefore starts only after a minimum
  input length, is debounced, and never loads unbounded pages; an explicit
  search remains available.
- No pressure/load test is permitted. Capacity evidence must come from account
  quota inspection and ordinary bounded validation only.

## Evidence

| Claim | Primary source | Version/date | Design implication |
| --- | --- | --- | --- |
| Place Search 2.0 supports keyword, nearby, polygon, and ID search; text search can be region-scoped and strictly limited with `city_limit`; ID detail accepts up to ten IDs | [Amap Place Search 2.0](https://lbs.amap.com/api/webservice/guide/api-advanced/newpoisearch) | Updated 2026-07-15; accessed 2026-09-02 | Use JavaScript API 2.0 for interactive candidate discovery and server-side v5 ID detail for authoritative verification; reserve server-side v5 text search for a separately justified fallback and do not treat result ordering as product truth |
| Place results expose POI ID, name, address, coordinate, province/city/district names and codes; `business.business_area` is optional through `show_fields` | [Amap Place Search 2.0](https://lbs.amap.com/api/webservice/guide/api-advanced/newpoisearch) | Updated 2026-07-15 | Request only the minimum fields; model absence as normal and never require provider rating, phone, photos, or commercial metadata |
| Reverse geocoding returns structured address components and, with extended output, business-area, POI, AOI, road, and neighborhood information | [Amap geocoding and reverse geocoding](https://lbs.amap.com/api/webservice/guide/api/georegeo) | Updated 2026-02-02 | Reverify the selected coordinate server-side; derive bounded business-area candidates and a precise address fallback without copying the raw response |
| JS API 2.0 provides `AMap.AutoComplete` and `AMap.PlaceSearch`; `PlaceSearch` can draw results on an `AMap.Map`, populate a panel, constrain a city, and auto-fit markers | [Amap JS API input tips and POI search](https://lbs.amap.com/api/javascript-api-v2/guide/services/autocomplete), [Amap map POI search](https://lbs.amap.com/api/javascript-api-v2/tutorails/search-poi) | Updated 2026-07-15 and 2024-07-12 | Adopt a responsive map plus accessible candidate list; cap results at ten and treat every browser result as untrusted until server verification |
| `AMap.Marker` supports displayed coordinates and click events, while map click events expose a selected longitude/latitude | [Amap Marker](https://lbs.amap.com/api/javascript-api-v2/guide/amap-marker/default-marker), [Amap map lifecycle](https://lbs.amap.com/api/javascript-api-v2/guide/map/lifecycle) | Updated 2024-07-12 and 2023-12-12 | Candidate Marker clicks select POIs; a free map click may reposition or search nearby but cannot directly commit a Store Location |
| JS API geocoding supports converting a map-selected coordinate to an address | [Amap JS API geocoding](https://lbs.amap.com/api/javascript-api-v2/guide/services/geocoder) | Updated 2024-07-19 | Use it for immediate preview only; server Web Service detail/reverse-geocode remains authoritative |
| Amap requires a separate Web(JS API) Key and security key and recommends keeping the security key on the server through a proxy; plaintext browser configuration is not recommended for production | [Amap JS API security-key guidance](https://lbs.amap.com/api/javascript-api-v2/guide/abc/jscode) | Updated 2025-06-18 | Use an approved-domain JS Key plus server `/_AMapService` proxy; never reuse or expose the Web Service Key |
| Amap coordinates in mainland use GCJ-02; non-Amap coordinates must be converted before use with Amap | [Amap coordinate conversion](https://lbs.amap.com/api/javascript-api-v2/guide/transform/convertfrom) | Updated 2024-07-29 | Persist `GCJ-02` explicitly and keep longitude/latitude to the documented six-decimal request precision |
| Responses use `status`, `info`, and `infocode`; documented failures include invalid/expired Key, unavailable service, quota exhaustion, frequency limit, IP/domain/signature mismatch, busy service, and exhausted paid balance | [Amap error-code reference](https://lbs.amap.com/api/webservice/guide/tools/info) | Updated 2022-10-12 | Normalize provider outcomes at the adapter; retry only bounded transient/busy failures and never retry auth, permission, quota, or invalid-input outcomes blindly |
| Production Web Service Keys should use the server outbound-IP allowlist | [Amap Web Service IP allowlist FAQ](https://lbs.amap.com/faq/webservice/webservice-api/basic-configuration/43238) | Accessed 2026-09-02 | Key remains in server configuration and calls originate from known release egress; `10005` is a configuration fault, not a customer retry |
| Current published daily quotas distinguish personal and enterprise accounts; the table lists 1,000 enterprise calls/day for input tips and place searches and 3,000,000/day for geocoding/reverse geocoding | [Amap developer certification and quotas](https://lbs.amap.com/faq/account/certification/39670) | Accessed 2026-09-02 | Treat search as the limiting operation; verify the actual account console and QPS before sizing, because the public table is not account entitlement evidence |
| The agreement describes technical-service licensing and restrictions around provider content and direct storage/cache | [Amap platform service agreement](https://lbs.amap.com/pages/terms/) | Updated 2025-12-03 | Record as reviewed context; the human commercial/legal risk owner accepts the proposed use and does not require a separate engineering Gate in #40 |
| Amap says Web Service APIs must not be pressure tested | [Amap Web Service application FAQ](https://lbs.amap.com/faq/webservice/webservice-api/basic-configuration/43234) | Accessed 2026-09-02 | Verification uses a few named fixtures and console quota inspection, not a load test |

## Proposed Provider Boundary

The source evidence supports the following minimum browser/server boundary:

```text
browserMapSearch(region, normalizedKeyword, limit <= 10)
  -> browser candidate markers and accessible list
  -> untrusted selected providerPlaceId

serverVerifyStoreSelection(providerPlaceId)
  -> verified place detail
  -> reverse-geocoded structured address at the returned coordinate
  -> normalized business-area candidates
  -> provider outcome and verification timestamp
```

The JavaScript boundary owns only transient interaction. The server adapter
returns typed normalized values and provider error categories and does not
expose the Web Service Key, raw response, request URL, provider rating, phone,
photos, reviews, or unrelated POI metadata. Brand application logic—not either
provider client—checks the account, selected official region, customer-confirmed
locality, readiness, and fingerprint consequences.

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| Hybrid JS map selection plus server Web Service verification | Adopt | Gives the user map confidence while keeping every persisted fact behind account-bound server verification; requires separate JS and Web Service credential boundaries |
| Server-only candidate list without a map | Defer as fallback | Smaller credential surface but does not meet the confirmed map-selection preference; retain only as graceful fallback if the map cannot load after entitlement is established |
| Browser calls Web Service API directly | Reject | Exposes the server credential, defeats IP allowlisting, and lets client-controlled provider data approach Brand persistence |
| Arbitrary map click commits a location | Reject | A coordinate is not proof of a concrete storefront; map clicks may move the search center but the customer must still select a POI that the server can resolve |
| Persist raw Amap responses for future reuse | Reject | Violates data minimization, duplicates external schemas, increases drift, and is unnecessary for Brand meaning |
| Manual address as an evaluation-ready fallback | Reject | Cannot prove a concrete store or business area and would allow forged client data to become evaluation truth; manual input may remain a transient search draft only |
| No external provider; retain province-city-terminal only | Reject for #40 outcome | Preserves current behavior but cannot distinguish a specific storefront or stable local recommendation context |

## Unknowns and Validation

No controlled call is authorized by this proposal. After the product owner
separately authorizes account/Key work and a controlled call, the smallest
validation is:

1. inspect the actual Web(JS API) and Web Service Key types, domain restrictions,
   JS security-proxy behavior, service grants, daily quota, QPS, outbound-IP
   allowlist, and applicable pricing without displaying either secret;
2. use one approved non-customer storefront and fixtures for an ordinary
   district, municipality, and one special no-county city to test v5 text
   search, v5 ID detail, and v3 reverse geocoding;
3. confirm POI detail and reverse-geocode address/adcode agreement, absence and
   multiplicity of business areas, `towncode` compatibility with the checked
   MCA terminal identity, map/Marker selection on desktop and mobile, response
   types that sometimes vary between string and array, timeout behavior, and
   documented `infocode` normalization;
4. stop live adapter activation if the account does not expose the required
   services/security controls or if special-city identity cannot be checked
   without guessing.

The official docs do not establish POI-ID lifecycle stability, the actual
GEOEval account entitlement, latency/SLA, or exact MCA-to-Amap township-code
compatibility. Those technical facts remain unknown rather than assumed.

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
