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
- [ ] Product owner approves the six overseas-platform mappings into the current
      non-geographic Media Supply categories.

## Stage 2 — Implement

- [ ] Add and lock the project-local XLSX reader; validate the exact workbook and
      image APIs on Node 24 and review the resolved dependency audit.
- [ ] Extract the 40 approved PNGs into the Web-owned versioned asset path and
      verify exact one-to-one platform/image mapping and hashes.
- [ ] Implement the fixed-workbook parser and safe normalized batch model without
      exposing sensitive cell values in errors or logs.
- [ ] Implement read-only plan and transactional idempotent apply using current
      Media Supply entities, normalized-name rule, deterministic resource IDs,
      administrator validation, and atomic audits.
- [ ] Implement atomic bounded apply receipts and the post-commit recovery path.
- [ ] Add focused parser, mapping, idempotency, conflict, rollback, asset, audit,
      and receipt tests.

## Stage 3 — Verify, Reconcile, and Review

- [ ] Prepare an independent review PostgreSQL database; record its explicit URL
      without touching formal or production data.
- [ ] Prove plan does not change database or assets; rehearse first and repeated
      apply with exact counts and states.
- [ ] Prove parse, source-conflict, database/audit failure, missing/corrupt Logo,
      and receipt-recovery paths.
- [ ] Verify administrator API/UI counts, associations, 1000-point price,
      internal fields, and all 40 Logos in a real browser.
- [ ] Verify the customer API/page sees no imported inactive resources and does
      not expose supplier, contact, procurement, case, note, audit, or source
      data.
- [ ] Run focused tests, typecheck, full backend/Web tests, build, format check,
      framework validation, migration status, and fixed-diff review.
- [ ] Reconcile accepted behavior into the current Media Supply owner and retain
      its Evolution marker; no ADR unless implementation proves a cross-change
      decision.
- [ ] Open the final acceptance PR with `Closes #51`, isolated rehearsal
      evidence, formal-import/deployment gates, and an explicit retained-worktree
      exit state; stop at Review / Decision without merging.
