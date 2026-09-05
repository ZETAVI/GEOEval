# Challenge lifecycle fixed-diff review

- Reviewed commit: `773b82e`
- Date: 2026-09-04
- Verdict after remediation: Ready as a bounded Issue #50 lifecycle checkpoint

## Intent

The slice implements only the already approved Challenge delivery seam, abuse
policy, supersession, and Session/Challenge cleanup. It does not add real SMS,
IP/device tracking, Redis authority, an automatic scheduler, Bootstrap, role
shells, or administrator UI.

## Engineering findings

1. **Resolved — Worker configuration was coupled to Identity cleanup.** Cleanup
   fields initially extended the process-common schema, so an irrelevant bad
   retention value could reject Worker startup. API and maintenance now compose
   the Identity-only schema while Worker ignores those fields; a regression
   test proves that separation.
2. **Resolved — the API module exported an unused maintenance Provider.** The
   explicit CLI is the only current caller, so the maintenance application
   service is now constructed only there and is not registered as speculative
   global API surface.
3. **Resolved — design text overstated the rate algorithm.** The implementation
   uses one fixed 15-minute window anchored by its first issuance, not a sliding
   rolling window. The active design now says exactly that.
4. **Resolved — public HTTP rate behavior lacked boundary evidence.** An HTTP
   integration test now proves a repeated correctly shaped Challenge request
   returns `429`, includes the bounded retry projection, and creates no second
   Challenge.

## Evidence and continuity

Focused lifecycle/config/HTTP tests and the complete 33-file / 175-test backend
suite pass. Empty-database migration, actual cleanup CLI, typecheck, build,
formatting, Diff, and framework checks pass. The whole Issue remains
`In Progress`; Bootstrap, frontend, final verification, reconciliation, PR,
and integration are not covered by this verdict.
