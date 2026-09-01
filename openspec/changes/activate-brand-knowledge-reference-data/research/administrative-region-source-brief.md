# Source Brief: Mainland-China Administrative-Region Selection

- Decision: choose the source, ingestion boundary, and first Web component for
  province-to-terminal-region selection
- Affected change: `activate-brand-knowledge-reference-data`
- Access date: 2026-09-01

## Recommendation

Use the Ministry of Civil Affairs (MCA) China National Geographical Names
Information Database annual administrative-division publication as the
authoritative upstream. Normalize one attributed, immutable offline snapshot
for application use; keep its source manifest and diff evidence; and use the
current official code standards to validate the data. Do not depend on the MCA
service at runtime.

Use three native HTML selects for the first responsive Web implementation. The
controls consume Brand-owned API projections, not the whole reference tree.
`@vant/area-data` may cross-check imports but is neither the canonical source
nor a Brand identity provider. The National Bureau of Statistics (NBS) and the
unmaintained `china-division` package are rejected as current upstreams.

Confidence is high for the ownership, offline-snapshot, variable-depth, and
native-control decisions. Commercial reuse is not yet cleared: the MCA site has
a general attribution and reproduction statement but no explicit open-data
license. That uncertainty remains a release gate.

## Decision constraints

- Stable official identities and historical non-reuse, not a vendor's UI codes.
- Province, prefecture, county, and township relationships where the product's
  terminal-region rule requires them.
- No runtime government-site dependency, secret scraper contract, or full
  dataset in the browser bundle.
- Current React 19 / Next.js 16 compatibility, responsive mobile behavior, and
  a usable keyboard and screen-reader baseline.
- Explicit provenance, source date, integrity hash, refresh trigger, and exit
  path.
- Commercial reuse must be approved before release.

## Evidence

| Claim | Primary source | Version/date | Design implication |
| --- | --- | --- | --- |
| Province, prefecture, and county divisions use six-digit codes; township divisions use nine-digit codes. Codes uniquely identify an administrative establishment; abolished codes are not reused and are retained permanently. | [Administrative Division Code Management Measures](https://www.moj.gov.cn/pub/sfbgw/flfggz/flfggzbmgz/202512/t20251204_528920.html) | Effective 2025-09-01; accessed 2026-09-01 | Official code plus level can anchor external identity; historical selections cannot be renumbered in place. |
| Establishment, abolition, or affiliation changes can create or abolish a code; ordinary renaming, boundary adjustment, or government-seat relocation retains it. | [Administrative Division Code Management Measures](https://www.moj.gov.cn/pub/sfbgw/flfggz/flfggzbmgz/202512/t20251204_528920.html) | Effective 2025-09-01 | A label-only rename does not change the fingerprint. A new code is a new current identity and requires an explicit compatibility decision. |
| MCA publishes the preceding year-end nationwide four-level data each January; provincial civil-affairs authorities publish township data each January and July. | [Administrative Division Code Management Measures](https://www.moj.gov.cn/pub/sfbgw/flfggz/flfggzbmgz/202512/t20251204_528920.html) | Effective 2025-09-01 | The nationwide annual version is the stable baseline. A six-month township patch is optional only if product freshness later requires it. |
| The current MCA publication covers province, prefecture, county, and township levels and is dated 2025-12-31. | [MCA administrative-division publication](https://dmfw.mca.gov.cn/XzqhVersionPublish.html) | `2025-12-31`; accessed 2026-09-01 | Proposed first executable source ID: `mca-administrative-divisions@2025-12-31`. |
| MCA documents a JSON API and an administrative-division search with `year`, `code`, and `maxLevel`; documented result depth is bounded, so a complete import must page or recurse through the public contract. | [API overview](https://dmfw.mca.gov.cn/baseHtmls/docfile/_1.htm), [administrative-division search](https://dmfw.mca.gov.cn/baseHtmls/docfile/_2.htm) | Accessed 2026-09-01 | A manual update tool can fetch an offline snapshot. Page-internal endpoints or undocumented parameters are not stable dependencies. |
| GB/T 2260-2007 and GB/T 10114-2003 remain current after a 2023-12-28 review. | [GB/T 2260](https://std.samr.gov.cn/gb/search/gbDetailed?id=Nbs%2BhjQTM1M%3D&mode=p), [GB/T 10114](https://std.samr.gov.cn/gb/search/gbDetailed?id=71F772D79FF6D3A7E05397BE0A0AB82A) | Current at access date | Use the standards for level and code validation; they do not replace a dated data publication. |
| NBS stopped publicly providing specific statistical division codes from 2024-10; the statistical codes also include survey-oriented units that are not identical to civil-affairs establishments. | [NBS public response](https://www.stats.gov.cn/hd/lyzx/zxgk/202509/t20250903_1960996.html), [statistical-code rules](https://www.stats.gov.cn/sj/tjbz/gjtjbz/202302/t20230213_1902741.html) | Accessed 2026-09-01 | NBS is not a maintainable current public upstream and its virtual/statistical units must not become Brand administrative identities. |
| The MCA site asks users to identify the source, restricts commercial original-form reproduction, and provides no explicit open-data license. | [MCA copyright statement](https://dmfw.mca.gov.cn/version.html), [contact](https://dmfw.mca.gov.cn/contact.html) | Accessed 2026-09-01 | Normalized private-development use can be designed, but commercial embedding requires written clarification or legal approval. |
| The current Web has no direct component-library dependency and uses React 19.2.8 / Next 16.3.2. | [`apps/web/package.json`](../../../../apps/web/package.json) | Repository at `a1d3d57` | A native control is the smallest compatible first interface; a new component system needs a demonstrated interaction requirement. |
| Native labels and controls provide a standard accessibility baseline; the selected label must be explicitly associated with its control. | [W3C WAI form-label guidance](https://www.w3.org/WAI/tutorials/forms/labels/), [Next.js client-component guidance](https://nextjs.org/docs/app/getting-started/server-and-client-components) | Accessed 2026-09-01 | Use visible labels, disabled downstream controls, and deterministic parent-change reset; test mobile and keyboard behavior. |

## Controlled observations

These observations were made against the MCA site on 2026-09-01 and are scoped
to that environment. They do not convert undocumented endpoints into a public
contract.

- The official tree is variable depth rather than a fixed
  `province -> prefecture -> county` tree.
- Beijing and the other municipalities connect the province-level municipality
  directly to county-level districts without an official prefecture node.
- Hainan has province-direct county-level divisions without an official
  prefecture node.
- Dongguan, Zhongshan, Danzhou, and Jiayuguan currently have no ordinary
  county-level child. Their official township nodes attach directly to the
  prefecture-level city; the observed counts were 32, 23, 17, and 6.
- Hong Kong and Macao have no children in this publication and Taiwan is marked
  as unavailable. The source cannot support a guessed three-level selection for
  those regions.

Observed page endpoints such as `getCodeList`, `trimCode`, and direct requests
beyond the documented relative depth remain implementation evidence only. The
importer must use the documented interface or stop for a source-contract
decision.

## Normalized snapshot boundary

The offline source is region-specific data, not a generic Catalog Engine. Each
official node should retain at least:

- canonical internal identity, official code, and official level;
- official name and division type;
- official parent identity, active or abolished state, and documented
  predecessor/successor when available;
- source publication, effective date, import time, source URLs, and normalized
  snapshot hash.

The import records the raw response hash in restricted evidence but commits
only the normalized executable snapshot and a source manifest if reuse is
cleared. Validation checks code and identity uniqueness, reachable parents,
valid level transitions, non-reuse of retained abolished codes, and an explicit
diff for addition, rename, affiliation change, and abolition.

The application consumes only a reviewed published snapshot. A new import never
silently changes the active source during build or deployment.

## Selection projection

The executable tree stays variable depth. A separate region-specific Web
projection supplies three user-facing controls:

- ordinary province: province -> prefecture -> county/district;
- municipality: province-level municipality -> repeated display of that
  municipality -> county/district;
- province-direct county: province -> presentation group such as
  `province-direct county divisions` -> county/county-level city;
- four cities without county children, if confirmed: province -> prefecture ->
  township/town/street.

Repeated municipalities and presentation groups are navigation aids only. They
are never persisted as official region identities and never enter the
fingerprint. The selected official terminal identity resolves its official
ancestor path. Its code, level, and official ancestor identities form the
semantic region context.

## Tool and data alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| Project snapshot plus native selects | Adopt | No UI dependency, no full-tree browser bundle, mobile picker and accessibility baseline, and complete separation between UI control and Brand identity. |
| Project snapshot plus React Aria Components | Defer | Current `1.20.0` supports React 19 and Apache-2.0, but the package and seven direct dependencies are unnecessary until search or autocomplete becomes a confirmed requirement. [Official repository](https://github.com/adobe/react-spectrum), [registry metadata](https://registry.npmjs.org/react-aria-components/latest) |
| Project snapshot plus Radix Select | Defer | Current `2.3.7` supports React 19, SSR, keyboard use, and MIT, but three simple selects do not yet justify a new 22-dependency UI seam. [Official Select docs](https://www.radix-ui.com/primitives/docs/components/select), [registry metadata](https://registry.npmjs.org/@radix-ui%2freact-select/latest) |
| `@vant/area-data` as import cross-check | Pilot only | Current `2.2.0` is active, MIT, data-only, and updated for 2025, but it uses vendor projection codes for special cities and lacks per-node source history. Its IDs cannot become the fingerprint. [README](https://github.com/youzan/vant/blob/main/packages/vant-area-data/README.md), [2025 update](https://github.com/youzan/vant/pull/13881), [registry metadata](https://registry.npmjs.org/@vant%2farea-data/latest) |
| `china-division` | Reject | It is frozen at 2023 NBS data, the repository says maintenance ended, its unpacked package is about 190 MB, and registry/repository license metadata conflict. [Repository](https://github.com/modood/Administrative-divisions-of-China), [registry metadata](https://registry.npmjs.org/china-division/latest) |
| Runtime MCA API | Reject | Availability, latency, rate limits, and product runtime behavior are not contracted; a remote edit could change a customer form without a GEOEval release. |
| NBS annual tree | Reject | Specific current data is no longer public and the statistical boundary is not the product's administrative identity. |

Registry unpacked size is package archive evidence, not measured production
JavaScript. Any future component adoption requires an actual Next production
build and desktop/mobile accessibility check.

## Unknowns and validation

- **Commercial reuse:** obtain written MCA clarification or legal approval
  before commercial release. Until then, the normalized full snapshot is a
  private-development candidate, not cleared product content.
- **Documented batch path:** make one controlled importer prototype against the
  documented API and prove full-tree completeness without relying on a hidden
  page endpoint. If the documented contract cannot produce the required tree,
  stop and choose an authorized provider rather than shipping a scraper.
- **First-release scope and terminal rule:** product owner confirms mainland
  China and township depth for the four special cities before implementation.
- **No initial search:** native dependent selects are proposed because current
  option counts are bounded. Revisit only after observed usability failure.

## Reuse and refresh boundary

- Reusable while: the product uses mainland administrative-establishment
  identity; the source remains the MCA 2025-12-31 annual publication and the
  cited API, standards, and reuse statement remain unchanged.
- Refresh when: MCA publishes a later annual version; six-month township
  freshness becomes necessary; the API or legal terms change; or the product
  adds Hong Kong, Macao, Taiwan, village, statistical, map, or address-search
  semantics.
