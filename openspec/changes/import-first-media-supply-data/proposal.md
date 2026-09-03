# Change: Import the first reviewed Media Supply dataset

- Status: Review / Decision
- Class: Architectural data activation
- Owning Issue: [#51](https://github.com/ZETAVI/GEOEval/issues/51)
- Decision owner: Product owner for the unresolved overseas-platform category
  mapping; Media Supply owner for bounded implementation

## Why

Issue #34 produced one reviewed workbook containing the first 40 media
platforms, 208 resources, 76 platform/current-supplier groups, 6 globally reused
suppliers, and 40 embedded Logos. Issue #37 established the accepted Media
Supply model and administrator/customer projection boundary, but the workbook
is still external research evidence rather than system data. Direct database
editing would provide no deterministic plan, idempotency, rollback, asset
preflight, or safe receipt.

## Outcome

Add one owner-local, offline import command for the fixed reviewed workbook. It
first produces a read-only plan, then can atomically insert the accepted records
into an explicitly selected database only when the input, assets, actor, current
database state, and all mappings pass validation. Repeating the same apply does
not create duplicates. The command produces a bounded receipt without copying
supplier names, contacts, costs, notes, or raw workbook text.

The implementation and isolated rehearsal do not authorize a formal database
write, platform activation, customer publication, deployment, order,
fulfilment, or external call.

## Scope

- Accept only the workbook whose SHA-256 is
  `2b071c88a94b962e1f8331df400e4ee9a7ca220510b849e7469ccc3f100dc8e9`
  and whose one-sheet structure matches the reviewed ledger.
- Parse the fixed platform, supplier-group, resource, and embedded-Logo rows;
  do not build an arbitrary Excel ingestion framework.
- Reuse `MediaPlatform`, `MediaSupplier`, `MediaResource`, category membership,
  current audit storage, and current administrator/customer projections.
- Force all 40 platforms to 1000 points and `INACTIVE`; force all 6 suppliers
  and 208 resources to `INACTIVE`; force every resource to `HIDDEN`.
- Preserve aliases, platform description, publication mode, quality tier,
  integer-yuan procurement cost, case link, resource account/channel, and
  internal publication notes where the current model owns them.
- Keep optional supplier contact fields null because the reviewed workbook does
  not supply them.
- Place the 40 reviewed PNG Logos in the Web-owned versioned public asset path
  and require exact asset hashes before any database apply.
- Report new, existing, conflict, skipped, and warning counts deterministically;
  recompute the plan inside the apply transaction before writing.
- Rehearse first apply, repeated apply, parse/asset/conflict/database failures,
  administrator projections, customer non-disclosure, and Logo rendering only
  in an independent review database and local Web runtime.

## Non-goals

- Committing the workbook, supplier evidence, raw quotations, contact evidence,
  source locators, or a derived sensitive data manifest to Git.
- Updating an existing record, resolving a business conflict automatically, or
  importing a different workbook version.
- A generic migration framework, editable mapping UI, supplier history, offers,
  multiple current suppliers, or a second media data model.
- Adding fields for workbook-only official-homepage or review-workflow columns
  that have no current Media Supply owner.
- Writing a formal or production database, enabling data, publishing customer
  resources, merging the PR, or deploying without separate authorization.

## Accepted decisions

1. The fixed workbook, not a checked-in data manifest, is the one-time input and
   is identified by its exact SHA-256.
2. Platform and supplier matching uses the existing NFKC/trim/lowercase
   normalized-name rule. Resources use deterministic IDs derived from the fixed
   input identity and source row; source-row references never enter business
   projections.
3. An exact existing record is reported as existing. Any differing current
   record at the same import identity or normalized platform/supplier key is a
   conflict; the importer never overwrites it.
4. The reviewed input intentionally contains 208 resource rows. One same-
   platform logical resource key occurs twice with different internal facts;
   both rows remain distinct deterministic resources and the plan emits one
   non-blocking source-duplicate warning.
5. Logo files are versioned Web deployment assets, not runtime uploads. Apply
   verifies them but never writes them, so PostgreSQL remains the only apply
   transaction. A missing or changed asset blocks apply before the transaction.
6. Apply validates an existing `ADMINISTRATOR` actor and writes one
   `IMPORT_CREATE` audit row for every newly inserted platform, supplier, and
   resource in the same transaction.
7. The apply receipt is a post-commit, safe projection. If final receipt writing
   fails after commit, a repeated idempotent apply reconstructs it from the
   existing records and does not duplicate business data.

## Open decision

The workbook's six overseas platforms are grouped by geography. Five of them
have no token that maps to the accepted five categories after `海外` is removed.
Implementation is blocked until the product owner approves either an explicit
mapping into the existing categories or a separately specified category change.
The proposed smallest mapping is recorded in [design.md](design.md).

## Impact

The change adds one backend CLI/import module, focused tests, one project-local
XLSX reader dependency, 40 reviewed public Logo assets, and a Media Supply
behavior delta. It does not require a database migration, public HTTP contract,
generated client change, or new ADR. Accepted import behavior will reconcile
into the current Media Supply specification before the Change is archived.
