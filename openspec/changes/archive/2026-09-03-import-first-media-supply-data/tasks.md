# Tasks

## Stage 1 — Explore, Propose, and Decide

- [x] Refresh `main`, Issue #51, Project Status/Priority/Assignee, PR #38, current
      Media Supply owners, schema, constraints, services, projections, and asset
      conventions.
- [x] Copy the #34 workbook into a private temporary path, verify source and
      copy SHA-256, and leave the #34 worktree/material untouched.
- [x] Inspect the workbook without committing or logging sensitive row data;
      confirm 40 platforms, 208 resources, 76 supplier groups, 6 normalized
      suppliers, 40 embedded PNGs, and integer-yuan costs.
- [x] Research the narrow XLSX/image-reader boundary from current primary
      sources and record maintenance/security constraints.
- [x] Define the owner-local plan/apply module, deterministic identities,
      transaction, Logo prerequisite, receipt recovery, cleanup, and tests.
- [x] Complete the pre-implementation architecture review.
- [x] Product owner approves the six overseas-platform mappings into the current
      non-geographic Media Supply categories.

## Stage 2 — Implement

- [x] Add and lock the project-local OOXML reader; validate the exact workbook and
      image APIs on Node 24 and review the resolved dependency audit.
- [x] Extract the 40 approved PNGs into the Web-owned versioned asset path and
      verify exact one-to-one platform/image mapping and hashes.
- [x] Implement the fixed-workbook parser and safe normalized batch model without
      exposing sensitive cell values in errors or logs.
- [x] Implement read-only plan and transactional idempotent apply using current
      Media Supply entities, normalized-name rule, deterministic resource IDs,
      administrator validation, and atomic audits.
- [x] Implement atomic bounded apply receipts and the post-commit recovery path.
- [x] Add focused parser, mapping, idempotency, conflict, rollback, asset, audit,
      and receipt tests.

## Stage 3 — Verify, Reconcile, and Review

- [x] Prepare an independent review PostgreSQL database; record its explicit URL
      without touching formal or production data.
- [x] Prove plan does not change database or assets; rehearse first and repeated
      apply with exact counts and states.
- [x] Prove parse, source-conflict, database/audit failure, missing/corrupt Logo,
      and receipt-recovery paths.
- [x] Verify administrator API/UI counts, associations, 1000-point price,
      internal fields, and all 40 Logos in a real browser.
- [x] Verify the customer API/page sees no imported inactive resources and does
      not expose supplier, contact, procurement, case, note, audit, or source
      data.
- [x] Run focused tests, typecheck, full backend/Web tests, build, format check,
      framework validation, migration status, and fixed-diff review.
- [x] Reconcile accepted behavior into the current Media Supply owner and
      architecture overview; the product-definition Evolution marker remains
      valid and unchanged, and no new ADR is warranted.
- [x] Open final acceptance PR #52 with `Closes #51`, isolated rehearsal
      evidence, formal-import/deployment gates, and an explicit retained-worktree
      exit state; stop at Review / Decision without merging.
