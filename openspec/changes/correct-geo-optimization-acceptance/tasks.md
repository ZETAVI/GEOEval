# Tasks

- [x] Reproduce merged request identity override and dirty-buffer loss; reopen #57.
- [x] Restore strict HTTP command boundaries and verify cross-account denial.
- [x] Preserve independent buffers/revisions across polling and mutation responses.
- [x] Complete same-Brand report handoff and shared in-page Brand editing.
- [ ] Verify isolated HTTP, delayed states, browser paths and required checks.
- [ ] Reconcile current spec, correction evidence, PR and workspace exit.

HTTP lifecycle/security: 10 tests passed, including red-to-green identity injection.
Full backend: 45 files / 250 tests; Web: 12 files / 66 tests, including independent
buffer/base-revision and reordered-observation regressions. Build, typecheck,
format, generated contracts, framework and diff checks passed. Browser verification
is pending because the host Mac was locked; prior #70 UI evidence does not prove
the changed paths. Resume from the correction PR and its exact head.
