# Design: Brand Knowledge Reference-Data Activation

## Design position

Brand Knowledge is an existing capability inside the Brand module, not a new
platform service. It owns the editable current brand facts and the rules that
decide whether those facts form an evaluation input. This change deepens that
owner with two independent reference-data sources:

- a GEOEval-owned two-level industry catalog with recommendation semantics;
- an MCA-sourced administrative-region snapshot with legal administrative
  identity and a region-specific selection projection.

They share Brand mutation, readiness, fingerprint, and evaluation projection.
They do not share a generic catalog lifecycle, node contract, version policy,
or maintenance engine.

GEO Intelligence continues to own Definition, Query, Run, and report behavior.
Its only dependency is a Brand Knowledge evaluation-purpose query. Web does not
import executable reference files, and GEO does not read reference data or Brand
tables directly.

## Module Architecture Card: Brand reference-data activation

### Outcome and Boundary

- **Owner and observable outcome:** Brand Knowledge accepts only coherent
  industry and mainland-region selections, presents honest readiness, preserves
  semantic evaluation revision identity, and returns one frozen projection for
  a Definition.
- **In:** executable industry data, normalized region snapshot, reference-data
  queries, Brand mutation validation, legacy migration classification,
  readiness, semantic fingerprint, and evaluation-purpose projection.
- **Out:** Query Prompt, question-generation lifecycle, evaluation opportunity
  execution, report semantics, geocoding, addresses, maps, business districts,
  regulatory qualification, and production source licensing approval.
- **Upstream prerequisites and downstream consumers:** approved
  `industry-catalog@1.0.0` and a cleared MCA snapshot are upstream. Registration
  and brand editing consume public selection queries. GEO Intelligence consumes
  the internal frozen projection after #27 merges.

### Lifecycle and Data

- **States and allowed transitions:** reference releases move
  `candidate -> validated -> active -> retained historical`; a release never
  becomes active from an application build. Brand reference selection is either
  `complete` or `needs review`, derived from resolvable current stable IDs and
  conditional fields rather than stored as a second workflow state.
- **Authoritative records and invariants:** the industry JSON is the only exact
  executable industry source; the normalized region release plus its manifest
  is the only executable region source; Brand stores stable leaf selection
  identities and customer semantic text; Evaluation Definition stores an
  immutable versioned projection.
- **Transaction, concurrency, and history boundary:** one Brand update validates
  both selections, derives readiness and the semantic fingerprint, and persists
  the selection atomically. Reference files are immutable application inputs,
  not mutable request-time state. Existing Definition/Run history is never
  rewritten from a later reference release.
- **Migration and rollback:** additive nullable stable-ID fields and legacy
  preservation precede exact mapping. A preflight classifies every record and
  aborts on collisions. Exact Brand/Definition/Run fingerprint keys move
  together to the stable scheme without changing snapshots or opportunity
  counts. Rollback keeps legacy values and the old snapshot reader until the
  new path is accepted; it does not delete business records.

### Contracts and Dependencies

- **Public commands, queries, and facts:** separate industry and region queries;
  structured Brand mutation using stable selection IDs; Brand response with
  resolved labels and review state; no public fingerprint or raw source tree.
- **Dependency direction:** Web -> generated API client -> Brand application;
  GEO application -> Brand evaluation-purpose query; Brand application -> two
  owner-local reference readers -> checked immutable files. No reverse import
  or cross-module table read.
- **External ports and failure boundary:** the MCA API belongs only to an
  explicit offline update tool. Runtime has no external region provider. Source
  unavailability therefore blocks a future data update, not registration or an
  evaluation.
- **Earned patterns or extension seams:** two small validated reference readers,
  one region-specific UI projection, one versioned snapshot decoder, and one
  migration classifier. No repository abstraction, registry, factory, shared
  node base class, seed framework, or generic catalog engine is earned.

### Failure and Recovery

| Failure | Classification | Retry or recovery owner | Idempotency or reconciliation evidence |
| --- | --- | --- | --- |
| Unknown or mismatched industry selection | Business validation | Brand application asks the customer to reselect | Server lookup and parent invariant; no partial Brand selection write |
| `Other` has no concrete phrase | Business validation | Customer completes the conditional field | Catalog `isOther` rule plus normalized non-empty phrase test |
| Unknown, presentation-only, or non-terminal region ID | Business validation | Customer reselects a terminal official division | Region projection never persists navigation-group IDs |
| Parent selection changes in Web | Expected interaction | Web clears and disables every downstream choice | Component state test plus server validation against stale submissions |
| Reference file is missing or invalid | Permanent deployment fault | Brand module/readiness fails at startup; release is not activated | Startup structural validation and source-manifest hash |
| Official source cannot be reached | External update failure | Maintainer keeps the prior active release | Update tool is manual; runtime reads the prior immutable snapshot |
| New source release changes a code/name/parent | Controlled maintenance difference | Maintainer reviews generated diff before activation | Added/renamed/moved/abolished classification and retained history |
| Legacy text has zero or several exact matches | Migration exception | Preserve legacy text, mark current Brand incomplete, require customer selection | Preflight counts and no guessed mapping |
| Two legacy Definitions collapse to one stable fingerprint | Migration collision | Abort migration and inspect data; never delete or merge Runs automatically | Pre-constraint collision query and zero-write failure |
| Exact mapping changes a stored fingerprint key | Representation migration | Migration updates Brand, Definition, and Run keys in one transaction | Before/after row counts, relationship checks, and unchanged Run count |
| Old Definition snapshot lacks stable IDs | Historical compatibility | Versioned snapshot decoder reads legacy shape | Fixed legacy fixtures across repository/process/synthesis/report paths |
| Commercial reuse is not cleared | Release risk | Product/legal owner blocks commercial release or selects an authorized source | Source brief, attribution manifest, and explicit release gate |

### Tool and Framework Decision

| Candidate | Adopt, defer, or reject | Evidence and limitation | Exit or refresh trigger |
| --- | --- | --- | --- |
| Checked industry JSON plus validator/generator | Adopt | Exact data is small, GEOEval-owned, and already approved; generated Markdown prevents a hand-maintained second list | Revisit only if multiple independent runtimes need a separately published package |
| Checked normalized region JSON plus source manifest | Adopt subject to reuse clearance | Offline, diffable, no runtime provider, and preserves official code/level/source | Refresh for a new MCA annual version or source-contract change |
| Native HTML selects | Adopt | Fits current dependency-free React UI, mobile picker, keyboard, and screen-reader baseline | Revisit after observed need for search, virtualization, or richer interaction |
| `@vant/area-data` | Cross-check only | Current and small, but vendor projection codes are not official identity and provenance is too coarse | Remove when importer diff coverage is independently sufficient |
| Database reference tables and foreign keys | Reject for first release | Strong relational membership but adds seed/deploy ordering, mutable database ownership, and no benefit for per-request writes over a validated immutable release | Revisit only if administrators must edit data at runtime or SQL consumers require joins |
| Client-imported full datasets | Reject | Duplicates ownership, grows the browser bundle, and lets a package version affect Brand semantics | None while Brand API owns validation |
| Generic Catalog Engine | Reject | Industry and region differ in meaning, source, hierarchy, update cadence, history, and projection | Revisit only after a third capability proves a shared stable semantic contract |

### Operational and Verification Boundary

- **Security and sensitive data:** reference data is public administrative or
  product classification. Brand mutations remain account-scoped. Internal
  fingerprints and migration diagnostics are not exposed in customer APIs.
- **Backpressure, capacity, and cost:** industry data can be returned as one
  small document; region children are returned by parent from the in-process
  snapshot. No network cost or queue is introduced. A measured latency or
  memory problem is required before adding a cache service or database.
- **Metrics, logs, traces, and operator recovery:** startup logs active source
  IDs and content hashes. An offline update records counts and diff categories.
  Migration records exact/unmatched/ambiguous/collision counts without customer
  content in general logs.
- **Completion claims and discriminating evidence:** catalog and region
  structural checks; fixed fingerprint vectors; migration replay with legacy,
  exact, unmatched, ambiguous, and historical-Run fixtures; OpenAPI generation;
  full tests/build; desktop and narrow-screen form behavior; no Provider call.
- **Residual risk accepted by:** product owner accepts geography and terminal
  granularity; architecture owner accepts data and migration boundaries;
  product/legal owner separately clears commercial reuse.

## Owned data sources

### Industry

The first implementation creates one owner-local executable asset, proposed as
`apps/backend/src/brand/reference-data/industry-catalog.json`, and a reader that
validates it at startup and in tests. The exact path is reversible; the owner and
dependency direction are not.

The asset retains the accepted `industry-catalog@1.0.0` node fields needed by
runtime behavior:

- primary and secondary stable IDs and parent relation;
- Chinese display label, active/deprecated status, and `isOther`;
- recommendation subject;
- aliases and ordering only when the current catalog supplies them.

The implementation mechanically extracts the current 13/199 nodes once and
compares the normalized result to the approved document before the ownership
move. After activation, only the executable asset is edited. A generator
produces the complete human-readable reference; the product document retains
selection, versioning, compliance, and maintenance rules plus a link.

Catalog validation proves:

- 13 primary and 199 secondary nodes for `1.0.0`;
- unique IDs and reachable parents;
- exactly one `-99` `Other` child for every primary;
- non-empty recommendation subject for every selectable secondary;
- no ID reuse or silent parent change in a future release.

### Administrative regions

The proposed executable release is
`mca-administrative-divisions@2025-12-31`, subject to source reuse clearance.
Its importer and asset remain separate from industry code and data.

Each official node retains:

```text
id                  canonical project identity over country, official level, code
officialCode        six digits for province/prefecture/county; nine for township
officialLevel       PROVINCE | PREFECTURE | COUNTY | TOWNSHIP
divisionType        source administrative type
nameZhCn            official current label in this release
parentId            official parent when present
status              ACTIVE | ABOLISHED
sourceReleaseId     mca-administrative-divisions@YYYY-MM-DD
```

The release manifest owns source authority, publication URL, effective date,
access time, raw evidence hash, normalized asset hash, counts by level, and the
reuse-clearance state. Historical abolished nodes remain resolvable for old
Brand or evaluation display, but are never offered for a new selection.

Presentation nodes such as a repeated municipality or
`province-direct county divisions` live only in the region selection projector.
They have namespaced view keys so they cannot pass as official terminal IDs.

## Brand persistence and vocabulary

The smallest durable Brand write stores leaf semantic identities rather than a
redundant copy of every ancestor and label:

```text
industryCategoryId       selected secondary GEOEval industry ID
otherProductOrService    normalized customer phrase only for an Other category
terminalRegionId         selected official MCA division identity
evaluationFingerprint    opaque stable semantic hash
legacyIndustryInput      preserved old text until exact resolution or review
legacyRegionInput        preserved old text until exact resolution or review
```

The industry reader derives the primary node from the selected secondary. The
region reader derives the official ancestor path from the terminal node. This
deletion test avoids stored parent/child drift: removing either reader would
leak the same validation and projection complexity into the API, Web, and GEO.

`Other industry description` becomes the clearer owner-local name
`otherProductOrService`; product copy may continue to explain it as the concrete
product or service. It is Brand data, not a generated catalog node.

`district` is replaced in new contracts by `terminal region`. The terminal can
be a county/district or, for the four confirmed special cities, a township,
town, or street. Historical snapshots retain their original `district` field
name and label because they are evidence, not current vocabulary.

## Readiness

Evaluation readiness remains derived, not stored. It requires:

- non-empty company or store name;
- an active resolvable industry category;
- a concrete normalized `otherProductOrService` only when that category is
  `Other`, and no stale phrase when it is not;
- an active official terminal region allowed by the product's selection rule;
- two non-empty characteristics;
- non-empty contact name and mobile under the current product rule.

Legacy text without exact stable identity is preserved but does not satisfy
readiness. Missing-field output uses customer language such as `行业分类需要重新选择`
or `所在地区需要重新选择` rather than exposing migration states or source codes.

## Fingerprint contract

The evaluation fingerprint is an opaque revision identity, not a hash of every
stored or displayed field. The new scheme hashes one canonical document with a
scheme prefix and fixed key order:

```json
{
  "scheme": "brand-evaluation-input@2",
  "companyName": "<normalized>",
  "industryCategoryId": "<stable secondary ID>",
  "otherProductOrService": "<normalized only for Other, otherwise empty>",
  "characteristicOne": "<normalized>",
  "characteristicTwo": "<normalized>",
  "regionPath": ["<official ancestor IDs through selected terminal>"]
}
```

Node labels, ordering, catalog/source release IDs, aliases, presentation-group
keys, recommendation subjects, contact data, and timestamps are excluded. A
fixed-vector test proves TypeScript and migration SQL produce the same SHA-256.

Consequences:

- label or version maintenance cannot create a Brand revision;
- a same-code official rename keeps the fingerprint;
- changing the selected industry, terminal official identity, `Other` phrase,
  characteristic, or company name changes the fingerprint;
- changing a reference ID's semantic boundary in place is forbidden. Industry
  uses a new ID/major compatibility decision; MCA uses its official code
  lifecycle.

## Evaluation-purpose projection

Brand Knowledge returns one internal value object only after readiness succeeds:

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
  officialPath [{ id, officialCode, level, label }]
  province { id, label }
  cityContext { id, identityKind, label, officialDivisionId? }
  terminal { id, officialCode, level, label }
characteristicOne, characteristicTwo
```

`cityContext` always has a stable namespaced projection ID for #26, but its
`identityKind` distinguishes an official prefecture from a municipality repeat
or non-semantic direct-county group. Only official path IDs enter the
fingerprint; the stable presentation ID is frozen for display and Prompt
wording. Every official path ID and all labels used by the Definition are
frozen in the snapshot. For a normal category, `recommendationSubject` is the
maintained catalog value. For `Other`, the actual recommendation subject is the
normalized customer `otherProductOrService`, while the catalog's maintained
value remains validation/help metadata. The actual subject and source versions
are frozen even though ordinary non-semantic maintenance does not change Brand
revision identity.

#26 imports this application contract, not the JSON readers. GEO may map it to
its own versioned Definition snapshot but may not re-resolve current labels or
recommendation meaning later.

## Immutable snapshot compatibility

Current Definitions store an unversioned JSON shape with eight strings. Treat
that exact shape as `legacy-v1` when no schema discriminator is present. New
Definitions store `brand-evaluation-snapshot@2` with the structured industry
and region projection above.

One GEO-owned snapshot decoder accepts the union and produces the narrow
execution/report context needed by repositories, workers, parsing, synthesis,
and customer projection. The current four copied Zod shapes must be replaced by
imports from this decoder during implementation; adding optional fields to four
separate schemas would preserve architectural drift.

The migration never rewrites `brandSnapshot` JSON. Existing Definitions and
Runs retain the exact labels and fields they originally used. New code proves
that legacy Runs can still resume, retry, synthesize, and render reports.

## Migration and evaluation-opportunity continuity

The database is development-only, but the migration uses the same non-guessing
and history-preserving contract required for later real data.

### Preflight

Before any constraint or fingerprint update, produce counts and record IDs for:

- exact unique industry and region matches;
- unmatched values;
- values with multiple possible matches;
- selected legacy `Other` values that have no concrete phrase;
- active Brands, unstarted Definitions, Definitions with Runs, and report rows;
- candidate stable-fingerprint collisions per Brand.

The implementation compiles the exact industry and region match tables from
the reviewed executable assets into a checked migration mapping artifact. The
SQL migration consumes that fixed artifact; it never queries a runtime HTTP
source or implements a second hand-written classification. Tests compare the
compiled mapping back to the executable sources and use fixed hash vectors to
prove the application and database canonicalization agree.

The migration aborts before writes when exact mapping would create duplicate
`(brandId, inputFingerprint)` Definitions or break a Definition/Run ownership
relationship. No record is deleted, merged, or assigned a nearest value.

### Exact mapping

For a unique exact mapping:

1. add the stable Brand selection IDs while retaining the old text as migration
   evidence;
2. compute the version-2 semantic fingerprint for the current Brand and every
   legacy Definition snapshot that independently maps exactly;
3. update Brand, Definition, and Run fingerprint columns together inside the
   migration transaction;
4. keep every Definition snapshot JSON, question, Run, sample, and report
   unchanged;
5. assert unchanged row counts, Run ownership, and completion counts.

This key rewrite does not create a new Definition, does not make an existing
Definition stale, and does not release an evaluation opportunity. A later
contact-only edit recomputes the same version-2 value, so continuity is not a
one-time SQL exception.

### Unmatched or ambiguous mapping

Keep the old text in legacy fields, leave stable selection null, and make the
current Brand not ready. Its current fingerprint moves to a separate
`brand-evaluation-input-unresolved@2` domain that can never be used to prepare
or start an evaluation. Existing Definitions and Runs keep their legacy
fingerprints and snapshot reader. The different current fingerprint makes an
unstarted legacy Definition stale, while a Run already started continues only
from its frozen Definition. Report pages prefer the stronger `current brand
needs reference-data review` notice over claiming that an unresolved migration
is an ordinary customer edit.

When the customer later chooses controlled values, that choice is a semantic
confirmation because equivalence was not provable. It creates the ordinary
version-2 fingerprint. Whether that new revision has an official evaluation
opportunity follows the existing product rule; the migration itself has not
granted or guessed one.

### Rollback

The first rollback disables structured mutations and restores the prior Web
form only in a development recovery build while leaving added columns and
legacy values intact. It does not reverse successful evaluations, rewrite
snapshots, or delete reference releases. A destructive schema cleanup is a
separate later migration after #27 acceptance and is not part of normal rollback.

## Public API

The exact URI naming remains reversible implementation detail. The semantic
surface is:

- one read of the whole active industry tree with version and content hash;
- region province choices;
- region child choices by a region-specific navigation key;
- Brand create/update using `industryCategoryId`, conditional
  `otherProductOrService`, and official `terminalRegionId`;
- Brand response with resolved industry and region display objects, readiness,
  missing-field messages, and retained legacy-review hints when needed.

The Web submits leaf identities. Brand derives and validates parents. This is
smaller and safer than making every client echo a redundant full path. Invalid,
retired, presentation-only, cross-parent, or non-terminal IDs return one
customer-actionable validation result and do not partially update the Brand.

Reference responses can use ETag/content hash and immutable release caching.
The generated OpenAPI client owns request and response types; the current
handwritten `BrandMutation` duplicate is removed rather than maintained beside
the generated schema.

Internal fingerprints, legacy migration classification, source raw evidence,
and recommendation subjects that are not customer-facing remain outside the
public Brand response.

## Web interaction

Registration and Brand editing reuse one `BrandReferenceFields` client
component. Registration can still skip the first Brand, but choosing to create
it exposes the complete basic profile instead of a different partial industry
form.

Interaction rules:

- choosing a primary industry clears the secondary and `Other` value;
- choosing a secondary outside the selected primary is impossible in the UI
  and rejected by the server;
- choosing `Other` reveals one labeled concrete product/service input; leaving
  `Other` clears it after confirmation only if user-entered text would be lost;
- choosing a province clears city/group and terminal choices;
- choosing a city/group clears the terminal choice;
- downstream selects are disabled until the parent is selected and while
  options load;
- a saved legacy unresolved value appears as a concise review notice, not as a
  fabricated selected option;
- wide screens use aligned fields and narrow screens stack them; native controls
  retain platform pickers and visible labels.

The full region tree never enters the initial JavaScript bundle. The Web loads
bounded child choices and keeps no second data source. Search, autocomplete,
virtualization, and a component library remain deferred until observed option
counts or usability evidence changes the action.

## Interface alternatives

### Leaf-only Brand mutation versus a full echoed path

**Adopt leaf-only semantic IDs.** A secondary industry uniquely owns its
primary, and an official terminal region uniquely resolves its ancestor path in
the active retained snapshot. Brand validation is therefore local and one
source computes the fingerprint. A full path would duplicate derivable state in
every client and create more invalid combinations without improving history.

The response still contains the full resolved path because humans and Query
generation need labels and context.

### Immutable files versus reference tables

**Adopt immutable checked files for the first release.** Reference releases are
read-mostly, reviewed with code, and not administratively edited at runtime.
Database tables would add seed ordering, environment drift, and an operational
write owner. Application membership validation plus migration assertions cover
the current write path.

Reference tables become justified only if another bounded requirement needs
runtime administration, SQL joins, localized overrides, or independently
deployed data releases.

## Documentation reconciliation

After implementation and acceptance:

- move exact industry nodes to the executable asset and generate their complete
  reference;
- reduce `docs/product/industry-catalog.md` to product selection, versioning,
  compliance, source ownership, and generated-reference links; remove its
  `move-on-activation` marker;
- move the affected controlled-selection, readiness, fingerprint, and snapshot
  scenarios from the broad product-definition spec to the new current
  `brand-knowledge` spec, leaving an index link and updating the remaining
  `split-on-activation` marker;
- update the evaluation-definition spec to name the versioned Brand projection
  seam without copying its fields;
- update architecture overview with Brand -> GEO dependency direction;
- archive this Change only after the executable owners, generated reference,
  tests, PR evidence, and workspace exit agree.
