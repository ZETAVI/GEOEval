# Design: Controlled first-batch Media Supply import

## Outcome and boundary

- **Owner and observable outcome:** Media Supply owns one offline importer that
  can prove and insert the reviewed first batch without redefining platform,
  supplier, resource, audit, customer projection, or Web asset ownership.
- **In:** exact workbook parser, public Logo asset verification, read-only plan,
  transactional apply, bounded receipt, isolated rehearsal.
- **Out:** generic Excel/data migration, updates, formal database write,
  activation/publication, uploads, HTTP endpoint, production deployment.
- **Prerequisites and consumers:** #34 reviewed input and #37 current model are
  prerequisites. An operator is the only caller. Existing administrator and
  customer queries consume normal Media Supply records after apply.

## Module and interface

The new code stays under the backend Media Supply owner:

```text
media-supply-import-main
  -> first-batch-import command { plan, apply }
      -> fixed OOXML parser (fflate + fast-xml-parser adapter)
      -> Logo asset verifier (filesystem read only)
      -> import planner (pure normalization/comparison)
      -> transactional import repository (Prisma/PostgreSQL)
      -> safe receipt writer (apply only)
```

Public CLI inputs are only `mode`, `input path`, explicit database URL,
explicit Web asset root, administrator actor ID for apply, and receipt path for
apply. The command prints one safe JSON projection. It never prints a parsed
row value or Prisma record. Parser/planner data remains internal.

The deletion test supports a module: without it, workbook parsing, image-anchor
mapping, deterministic identities, database comparison, atomic audits, and
receipt recovery would leak into a shell script or manual runbook. No generic
repository port or importer framework is added because there is one fixed
format and one caller.

## Lifecycle and data

- **States:** `INVALID`, `PLANNED`, `BLOCKED`, `APPLIED`, and
  `APPLIED_RECEIPT_PENDING` exist only in command results/receipts, not as a new
  database state machine.
- **Authoritative records:** after apply, current Media Supply tables and audit
  rows remain authoritative. The workbook and receipt are evidence, not runtime
  data sources.
- **Invariants:** exact hash and headers; 40/208/76/6/40 counts; one Logo per
  platform row; every resource has one current supplier; whole non-negative RMB
  yuan; platform price 1000; all imported owners inactive; all resources hidden;
  existing records must be exact matches.
- **Transaction:** plan opens no transaction and writes nothing. Apply performs
  asset/hash preflight, then starts one serializable Prisma transaction,
  recomputes database comparison, rejects conflicts, inserts entities,
  categories and audits, and commits once. No catalog revision changes because
  the entire batch is inactive/hidden.
- **History:** every new entity receives one `IMPORT_CREATE` audit associated
  with an existing administrator account. Equivalent replays create no audits.
- **Migration and rollback:** no schema migration. Before formal activation, a
  failed apply rolls back automatically. A successful review-database apply is
  cleaned by dropping that independent review database. A later formal rollback
  is a separately authorized, explicit inactive-record cleanup; this Change
  does not add an automatic destructive rollback command.

## Deterministic mapping

### Platform

- `displayName`: platform row name.
- `aliases`: NFKC-trimmed values split on the reviewed full-width separator.
- `description`: reviewed platform description.
- `logoUrl`: `/media-logos/first-batch/platform-<ordinal>-<hash8>.png`.
- `regionScope`: `国内 -> DOMESTIC`, `海外 -> OVERSEAS`.
- `status`: always `INACTIVE`; `pointPrice`: always `1000`; `revision`: `1`.
- `categories`: direct token mapping for `央媒`, `门户`, `地方`, `垂直`, and
  `内容平台`; geography and topical descriptors are not categories. The six
  overseas rows use the approved explicit mapping below.

### Supplier

- One global owner per NFKC/trim/lowercase normalized supplier name.
- `displayName`: reviewed current-supplier label; contact fields and notes are
  null; status is always `INACTIVE`; revision is `1`.
- The 76 group rows are structural input. They resolve to 6 supplier records and
  are never stored as parallel platform-supplier entities.

### Resource

- Each of the 208 reviewed resource rows is one input record with a deterministic
  UUID derived from importer namespace, exact input hash, and source row number.
- Platform/supplier references resolve through normalized owner keys.
- Reviewed display names, descriptions, aliases, resource identifiers, and
  internal notes are trimmed but otherwise preserved; NFKC/case normalization
  applies only to matching keys and logical-collision detection.
- Reviewed resource/account, publication mode, quality, valid HTTPS case link,
  integer-yuan cost, and internal note map to their current fields. Account URL
  remains null. Forty non-URL case-reference cells have no compatible owner and
  are skipped with one row-only warning rather than copied into notes or logs.
- Status is always `INACTIVE`; public visibility is always `HIDDEN`; public
  alias is null even when the old workbook review column said masked.
- The one repeated same-platform resource/account key is retained as two rows
  because the accepted batch count is 208 and current records differ. Plan emits
  one warning with row references and a key hash, never the resource facts.

### Workbook-only fields

Official-homepage, old Logo review state/source, source locator, administrator
review state, old catalog state/price, supplier-group state, resource state, and
old customer visibility are validation/context inputs or intentionally
overridden accepted defaults. They do not create parallel fields or copied raw
notes.

## Approved overseas-category decision

Direct token mapping covers 34 domestic platforms and one overseas platform's
`门户` token. The remaining five would have no accepted category. The proposed
smallest explicit mapping is:

| Platform | Proposed current category |
| --- | --- |
| Reuters | `PORTAL_MEDIA` |
| AP News | `PORTAL_MEDIA` |
| Yahoo Finance | `PORTAL_MEDIA`, `VERTICAL_MEDIA` |
| Business Insider | `VERTICAL_MEDIA` |
| USA Today | `PORTAL_MEDIA` |
| StreetInsider | `VERTICAL_MEDIA` |

This keeps `OVERSEAS` only in `regionScope`, reuses current categories, and
avoids a schema/spec migration. The product owner approved this exact mapping
on 2026-09-03; it is a fixed import mapping rather than a parser inference.

## Logo assets and deployment order

The fixed OOXML adapter reads the 40 embedded PNG buffers and their anchored
platform rows. The reviewed bytes are committed as versioned files under
`apps/web/public/media-logos/first-batch/`; filenames include the platform
ordinal and content-hash prefix. No workbook or supplier data accompanies them.

The deployment/apply sequence is explicit:

1. merge and deploy the code plus asset bundle after separate approval;
2. run `plan` against the intended database and deployed asset root;
3. approve the exact plan/receipt boundary;
4. run `apply` with an administrator actor;
5. keep every owner inactive and every resource hidden until a later activation
   gate.

Because apply never writes files, there is no cross-system partial commit. A
missing/mismatched asset blocks before PostgreSQL. If an asset deployment later
rolls back, inactive/hidden records cannot become customer inventory; restore
the exact bundle and rerun plan/apply.

## Receipt and logging

Plan returns only schema/importer versions, input/asset hashes, counts, result
codes, row numbers/key hashes, and final status. Apply writes the same safe
projection to a temporary file, commits PostgreSQL, then atomically renames the
final `APPLIED` receipt. Console output is the same allowlisted projection.

If final rename fails after commit, the temporary receipt remains explicitly
pending and the command exits non-zero. Repeating apply recomputes exact
existing records and writes the completed receipt without new data or audits.
Receipt conflicts never contain workbook cell values, supplier identities,
costs, contacts, URLs, or notes.

## Failure and recovery

| Failure | Classification | Recovery owner | Discriminating evidence |
| --- | --- | --- | --- |
| Input hash/header/count/mapping/cost invalid | Permanent input conflict | Product/data owner supplies the exact approved input or decision | Parser tests and exact-hash plan result; no DB/asset changes |
| Embedded or deployed Logo missing/corrupt/mismatched | Asset prerequisite conflict | Web deployment owner restores exact bundle | 40 anchor/hash comparison; apply transaction never starts |
| Existing platform/supplier/import ID differs | Business conflict | Administrator reviews current record and opens a new decision; importer never updates | Conflict code and row/key hash; DB counts unchanged |
| Actor missing or not administrator | Authorization conflict | Operator selects an approved administrator | Actor lookup inside transaction; no writes |
| Entity/category/audit insert fails | Transaction failure | Operator repairs the review environment and retries | Forced-failure test proves all counts/audits roll back |
| Receipt finalization fails after commit | Ambiguous external result, DB committed | Operator reruns same apply | Deterministic IDs/exact compare yield existing only; receipt recreated |
| Command is interrupted before commit | Transient | Operator reruns plan/apply | PostgreSQL atomic rollback and unchanged counts |

## Tool and framework decision

| Candidate | Decision | Evidence and limitation | Refresh trigger |
| --- | --- | --- | --- |
| Existing Media Supply Prisma owner and transactions | Adopt | Current model, FKs, audit and transaction boundary already own all records; no migration needed | A required fact has no current owner or the transaction exceeds measured limits |
| fflate 0.8.3 + fast-xml-parser 5.10.1 | Adopt with fixed-shape controls | Current MIT primitives read the exact namespace-prefixed workbook on Node 24; hash/header/count/relationship/PNG gates limit their surface | Exact smoke/audit fails, input becomes untrusted, Node/lockfile changes |
| ExcelJS 4.4.0 | Reject | Exact workbook fails before model construction and its resolved dependency path adds an avoidable vulnerable UUID version | Reconsider only if a current version proves the exact namespace-prefixed source without the dependency risk |
| Next public assets | Adopt | Current `logoUrl` accepts project paths and Web already renders them; versioned bundle is deployable before apply | Runtime uploads, tenant assets, or mutable media storage become a real requirement |
| Generic importer/migration framework | Reject | One fixed input and one caller do not earn a shared abstraction | A second independently approved import format proves stable shared semantics |
| New import-run table | Defer | Deterministic IDs, audits, and reconstructable safe receipt satisfy this one batch without migration | Multiple batches require durable query/reconciliation history inside the product |

## Operational and verification boundary

- **Sensitive data:** exact input remains outside Git; temp copy is mode `600`;
  parser/log/receipt errors are allowlisted; customer contracts remain unchanged.
- **Capacity:** 254 business records plus categories and 254 audits fit one
  bounded transaction; a review-database measurement must prove it before
  acceptance. No concurrency, queue, or external service is introduced.
- **Observability:** safe CLI result and receipt only; existing administrator
  audit remains the business write evidence. No telemetry content export.
- **Completion evidence:** exact plan counts and no-write snapshot; first/repeat
  apply counts; forced rollback; asset mismatch; all 40 admin images; customer
  empty/non-disclosure; focused/full checks and real browser inspection.
- **Residual risk owner:** formal import, merge, deploy, activation, and
  production cleanup remain separate human gates.
