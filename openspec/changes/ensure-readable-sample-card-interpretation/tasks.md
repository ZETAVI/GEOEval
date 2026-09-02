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
- [ ] After #26 reaches `main` and integration is authorized, reconcile this
      stacked branch against current `main`, rerun Required Checks, and complete
      the normal review, merge, archive, and workspace-exit gates.

## Verification evidence

- Protected database inspection confirmed only the discriminating facts for the
  named run: Doubao industry question, non-mention, null position, stored
  contract `1.0.0`, and card value `}}}`. No protected answer, other-brand name,
  or evidence text entered Git.
- Parser contract: 18/18 passed, including protected non-mention replay,
  mentioned-position fallback, readable-prose pass-through, and the existing
  literal mention/position cases.
- Focused lifecycle: 1/1 passed; the fragment was accepted on the first parser
  attempt, persisted as `该回答未提及当前品牌。`, returned by the report, and the
  run reached `REPORT_ACCEPTED`.
- Full backend: 22 files / 129 tests passed.
- Root typecheck, complete build, OpenAPI generation, formatting, project
  framework and Markdown-link validation, and diff checks passed.
- No real Provider call, production write, deployment, resampling, historical
  interpretation rewrite, migration, or public API change was performed.
