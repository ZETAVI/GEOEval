# Tasks

## Design and implementation

- [x] Confirm the protected run's question family, mention, position, stored
      contract, and exact unreadable card value without copying the protected
      answer or other-brand evidence into Git.
- [x] Review Prompt, provider-facing model contract, canonical domain contract,
      persistence, and report projection ownership.
- [x] Strengthen the Prompt and schema description with positive, checkable
      customer-copy instructions and version their provider-facing identities.
- [x] Add the narrow model-to-domain fallback without changing the canonical
      stored contract or report projection.

## Verification and reconciliation

- [x] Add protected contract replay and lifecycle persistence/report tests.
- [x] Run focused Parser and lifecycle tests, affected backend tests, typecheck,
      build, OpenAPI generation, framework validation, formatting, and diff
      checks.
- [x] Reconcile the current spec and architecture owner, then complete a fixed-
      diff review.
- [x] Commit and push the stacked branch; update Draft PR #35 and Issue #32 with
      evidence and the unchanged integration order.
- [x] Replay only the four #32-owned commits onto `main@18b69d0`, preserving the
      accepted Brand/Query and governance owners while resolving the architecture
      overview conflict.
- [x] Re-align the Issue outcome around strict metric evidence, recoverable
      optional detail and customer-readable card copy; do not add a new Issue or
      remove known provider constants without defect evidence.
- [x] Make the model-facing 8/10/2 limits authoritative and remove the fallback
      that treated a literal brand name as open-position evidence.
- [ ] Re-run focused and full evidence on the corrected latest-main Diff, archive
      this Change, publish the rewritten PR branch and complete integration
      closeout.

## Verification evidence

- Protected database inspection confirmed only the discriminating facts for the
  named run: Doubao industry question, non-mention, null position, stored
  contract `1.0.0`, and card value `}}}`. No protected answer, other-brand name,
  or evidence text entered Git.
- Parser contract: 19/19 passed on the latest-main replay, including the
  protected non-mention fragment, readable-prose pass-through, strict missing
  open-position evidence, optional-detail cleanup and the 8/10/2 JSON Schema.
- Parser plus evaluation lifecycle: 2 files / 38 tests passed on the isolated
  `geoeval_issue32_f44a` PostgreSQL database and Redis DB 12.
- Focused lifecycle: 1/1 passed; the fragment was accepted on the first parser
  attempt, persisted as `该回答未提及当前品牌。`, returned by the report, and the
  run reached `REPORT_ACCEPTED`.
- Full backend: 33 files / 175 tests passed on the same isolated resources after
  all 20 current migrations were applied.
- Root typecheck, complete build including Prisma/OpenAPI/API-client generation,
  formatting, project framework and Markdown-link validation, and diff checks
  passed.
- No real Provider call, production write, deployment, resampling, historical
  interpretation rewrite, migration, or public API change was performed.
