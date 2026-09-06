# Tasks

- [x] Reproduce merged request identity override and dirty-buffer loss; reopen #57.
- [x] Restore strict HTTP command boundaries and verify cross-account denial.
- [x] Preserve independent buffers/revisions across polling and mutation responses.
- [x] Complete same-Brand report handoff and shared in-page Brand editing.
- [x] Verify isolated HTTP, delayed states, browser paths and required checks.
- [x] Reconcile current spec, correction evidence, PR and intended workspace exit.

HTTP lifecycle/security: 11 tests passed, including red-to-green identity injection
and explicit generated OpenAPI body/path contracts.
Full backend: 45 files / 250 tests; Web: 12 files / 66 tests, including independent
buffer/base-revision and reordered-observation regressions. Build, typecheck,
format, generated contracts, framework and diff checks passed. Both required CI
checks passed on implementation commit `95ecc8c`.

Browser verification on that implementation passed: Brand save preserved a dirty
article, article save returned confirmed revision 2 to draft revision 3, explicit
confirmation and replacement worked, a 6.5-second deterministic Writer preserved
unsaved Brand detail through polling, and saving Brand during generation retained
the save and returned an editable/confirmable older-input article. The rendered
report link reached its Brand; a different current Brand required explicit switch
and restored the correct confirmed revision. At actual viewport width 520 CSS px,
document width was 520 and form controls did not overflow.

Only isolated synthetic data and local Mock Writer were used; no Provider,
purchase, deployment or production claim. Report fixture required valid Brand
snapshot/platform policy and four-by-five sample positions before full report
rendering; no product code was changed for fixture setup.

Current behavior is owned by the current GEO Optimization/Product Definition
specs and executable boundaries. PR #71 owns final review/CI/merge evidence and
post-integration exit; #65 owns subsequent Commerce work. No release is created.
