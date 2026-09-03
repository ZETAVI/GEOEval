# Architecture Review: Controlled first-batch Media Supply import

- Result: `ready` for bounded implementation and isolated rehearsal
- Reviewed revision: `origin/main@f1b5ef47097bc50947f85808e326d88372f925ae`
- Reviewed artifacts: Issue #51, current Media Supply spec/schema/service/
  repository/administrator and customer projections, ADR-0002/0003, reviewed
  workbook shape/hash/images, proposal, delta spec, tasks, source brief, design
- Review scope: ownership, dependency direction, data integrity, transaction,
  idempotency, asset recovery, sensitive receipt, tooling, verification, and
  reconciliation

## Review contract

The Change must import exactly the reviewed batch without treating #34 as a
runtime source, adding a second media model, broadening Excel support, changing
customer meaning, writing formal data, or hiding partial failure. It must reuse
current Media Supply invariants and stop before a product classification,
external-cost, destructive, merge, deployment, or activation boundary.

## Affected slice

- Backend Media Supply gains one offline CLI/import module. No HTTP controller,
  generated client, role model, order, fulfilment, or background worker changes.
- The parser depends on a narrow fflate/fast-xml-parser OOXML adapter; planner
  depends on shared Media Supply normalization; apply depends on
  Prisma/PostgreSQL only.
- Web owns a versioned public PNG bundle. Database records store project paths;
  apply reads/verifies assets and writes no files.
- Existing administrator projections read the inserted internal facts. Existing
  customer projection and effective-availability policies remain authoritative.

## Findings resolved before implementation

### Must-fix — approve the six overseas-platform categories — resolved

- **Artifact:** `design.md`, Overseas-category decision.
- **Violated boundary:** product classification semantics are human-owned and
  current Media Supply requires non-geographic categories.
- **Consequence:** discarding `海外` leaves five platforms with no accepted
  category. Defaulting them silently to portal or allowing zero categories would
  make materially different catalog behavior.
- **Remediation:** the product owner approved the explicit six-platform mapping
  on 2026-09-03 before parser/import implementation.
- **Origin:** exposed by this input; not pre-existing code debt.

No other `must-fix` or `should-fix` finding is open.

## Confirmed architectural qualities

- **Ownership/cohesion:** the importer remains Media Supply owner-local and is
  removable without affecting runtime contracts. No generic service layer or
  parallel persistence is added.
- **Data integrity:** platform/supplier normalized keys reuse current rules;
  deterministic resource IDs, exact comparisons, serializable replanning, FKs,
  constraints and atomic audits cover replay/conflict/failure. No migration is
  required.
- **Failure/recovery:** asset deployment precedes apply; apply is DB-only. Missing
  assets block before transaction, DB failures roll back, and post-commit receipt
  failure is recovered by idempotent replay.
- **Security:** exact input hash, offline CLI, mode-600 temp input, explicit
  database/asset paths, administrator actor check, and allowlisted receipts keep
  sensitive raw cells out of Git, logs, customer projections, and receipts.
- **Reuse/proportionality:** current entities, audit, Prisma and Next assets are
  reused. A migration framework, import-run table, upload store, queue and API
  are not earned.
- **Design knowledge:** change-local design owns only the proposed import. Stable
  accepted behavior must reconcile into the current Media Supply spec; no ADR is
  warranted unless implementation proves a cross-change decision.

## Residual validation, not a human gate

- ExcelJS failed the mandatory exact-source smoke and was removed. The selected
  fflate/fast-xml-parser adapter passes the Node 24 namespace/image smoke; its
  resolved audit and fixed-shape failure tests remain mandatory before acceptance.
- The 254-entity plus category/audit transaction is small by inspection but must
  be measured in the independent review database.
- One duplicate logical resource key exists in the fixed input with differing
  internal facts. Retaining both rows follows the accepted 208 count and current
  schema; the receipt must keep only a warning code, row references and key hash.

## Close

The module, transaction, asset, receipt, cleanup, and verification boundaries
are the smallest coherent design and need no schema or long-term asset-owner
decision. The approved six-platform mapping closes the only finding. The design
is `ready` for bounded implementation and isolated rehearsal provided no scope
or input revision changes.
