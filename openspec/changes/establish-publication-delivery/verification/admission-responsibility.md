# Admission and responsibility checkpoint

Scope: first part of the #73 vertical slice, not complete result delivery or a
merge/production gate. Runtime source now admits paid orders and supports
exclusive responsibility; result recording, per-item preparation and point
return remain visibly unavailable. Current behavior is reconciled into
[Publication Delivery](../../../specs/publication-delivery/spec.md), Commerce,
the product-definition activation pointer and ADR 0006.

## Evidence

| Claim                                                  | Evidence                                                                                                                                                                           | Result  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Admission joins the purchase transaction               | Controlled failure after aggregate insertion through real HTTP; no order, debit, ledger, aggregate or consumed selection persists                                                  | Passed  |
| Historical admission does not promote corrupt spending | Migration rehearsal on valid history, missing original consumption and wrong agreed amount; original schema restored by test rollback                                              | Passed  |
| One operator owns the order                            | Concurrent HTTP claims produce one success; start/return/reassignment and former-owner write denial                                                                                | Passed  |
| Replay does not reclaim old authority                  | Same request returns original operation revision after reassignment; changed request conflicts and audit count stays unchanged                                                     | Passed  |
| State and audit cannot split                           | Injected audit insertion failure rolls back assignment                                                                                                                             | Passed  |
| Protected customer projection                          | Customer reads current Publishing and original article/terms but no Delivery actor/history; foreign customer denied                                                                | Passed  |
| Backend regression                                     | 51 files / 340 tests on isolated targets after adding the new controller to the explicit ACL inventory                                                                             | Passed  |
| Web behavior/type contracts                            | 17 files / 86 tests; workspace-wide typecheck; OpenAPI/client regenerated                                                                                                          | Passed  |
| Real browser journey                                   | Normal development-code login, operator claim/start, customer Publishing list/detail, administrator selects another operator and records reason; current assignee/history verified | Passed  |
| Layout                                                 | Desktop operator page and 375×812 admin form/bottom screenshot inspection; fixed vertical sidebar text; restored viewport                                                          | Passed  |
| Full results/return workflow                           | Not yet implemented; no fabricated publication count or financial completion                                                                                                       | Not run |

The initial backend run exposed only a missing `DeliveryAssignmentController`
entry in the expected access-policy inventory (339 passed / 1 failed). The
explicit per-handler role policy was added and the complete 340-test rerun
passed. Existing controlled telemetry warnings and pg query deprecation were
not new functional failures and were not broadened into this Issue.

## Reproduction and isolation

- Backend suite: `geoeval_issue73_delivery_suite`, PostgreSQL at 127.0.0.1:55432;
  Redis at 127.0.0.1:56573/1. Both explicit URLs are required by test composition.
  Run `pnpm test` only with these dedicated targets, never shared defaults.
- Browser fixtures: `geoeval_issue73_delivery_test`, Redis 56573/0; synthetic
  admin/customer/operations identities only. The browser used localhost:3209 and
  API localhost:3309, isolating its cookies from the original 127.0.0.1 review.
- Browser order GEO-00000033 followed 7332 claim/start → 7331 customer view →
  7330 administrator reassign to 7333. These are disposable fixture accounts,
  not production identities; no real SMS, provider or payment was invoked.
- The browser database was initially created before the precheck-only migration
  edit; its final schema is unchanged. Fresh full-suite migration plus rollback
  rehearsals verify the final SQL. Do not treat this fixture database's migration
  bookkeeping as a release/recovery baseline.
- Temporary Web/API processes and the task-created browser tab were stopped
  after inspection. Dedicated databases and `geoeval-issue73-test-redis` are
  retained for #73 continuation, not deleted. Original #65 services, databases
  and recovery data were not stopped or migrated.

## Build isolation source

The existing Web review build must not be overwritten. An optional
`GEOEVAL_WEB_DIST_DIR` feeds the documented
[Next.js distDir](https://nextjs.org/docs/app/api-reference/config/next-config-js/distDir)
setting (official reference accessed 2026-09-08; local Next 16.3.2 observed).
This run used `.next/issue73` and restored generated `next-env.d.ts` to its
normal paths after stopping the temporary server. No global package or new
runtime dependency was installed. Production build/deployment is not claimed.

## Remaining slice

Implement bounded operated items and actual publication results/Mock preparation,
then completion/progress/correction tests and the full customer result journey.
Continue the same Draft PR and branch; do not treat this partial checkpoint as
the parent acceptance or merge authorization.
