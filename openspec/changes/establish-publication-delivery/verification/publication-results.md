# Publication results checkpoint

Scope: normal per-publication work and results after responsibility baseline
`2658295`, not complete #73 fulfilment, merge or production activation.

## Evidence

| Claim                                                   | Evidence                                                                                                                                                                                                                          | Result                               |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Sparse work covers frozen random/precise commitments    | HTTP creates no row for untouched slots; exact targets cannot be exchanged; maximum quantity 2,147,483,647 reads at most 50 and stores only the actually operated final slot                                                      | Passed                               |
| Results are real recorded facts, not generated progress | Direct result without preparation; Mock content leaves count unchanged; one active canonical URL per order; correction retains history without another count                                                                      | Passed                               |
| New work preserves prior responsibility invariants      | Any actual work establishes order start; started work cannot return; Completed correction/reassignment remains Completed                                                                                                          | Passed                               |
| Delayed preparation cannot regain obsolete authority    | Controlled waiting Mock followed by inactive actor, changed role, reassignment, item edit or full completion; save denied without new item/audit/count effects                                                                    | Passed                               |
| Result, count and history cannot split                  | Concurrent final results conflict by revision, then explicit retry completes; injected work-audit failure rolls back the whole command                                                                                            | Passed                               |
| Customer ownership and privacy                          | Foreign customer/role denial; result page exposes only platform/title/link/time, not internal channel, note, preparation or history; precise pending targets stay visible                                                         | Passed                               |
| Existing regression and content compatibility           | Full backend 51 files / 351 tests, followed by one focused test preserving the full accepted 100,000-character core article boundary; Web 17 files / 92 tests                                                                     | Passed                               |
| Build and contracts                                     | Isolated Web production build; workspace typecheck; regenerated Prisma/OpenAPI/client; framework validation                                                                                                                       | Passed, subject to current PR Checks |
| Real-page reachability                                  | Normal synthetic operator login → My orders → original order → item selection → complete preparation/result form                                                                                                                  | Passed                               |
| Full browser result submission and responsive visuals   | Browser control failed after the native Mock confirmation; subsequent focus-emulation commands timed out, including on the recovery path. No completed form-to-customer result journey or new narrow-screen screenshot is claimed | Blocked                              |
| Negotiated exceptions/point returns                     | Remain in the next approved slice; not implemented or tested as live behavior                                                                                                                                                     | Not run                              |

## Isolation and limits

The backend suite used `geoeval_issue73_delivery_suite` at PostgreSQL 55432 and
Redis 56573/1. Browser testing reused `geoeval_issue73_delivery_test`, Redis
56573/0, API 3309 and Web 3209; both databases applied the additive results
migration. Synthetic original order GEO-00000033 and the existing 7333 operations
identity were used. No real publishing, provider, SMS, payment or customer data
was involved. The existing #65 human-review services and data were not modified.

The temporary API/Web were stopped after browser control failed. Both #73
databases/Redis remain for continuation; no recovery data was removed. Web used
the existing isolated `GEOEVAL_WEB_DIST_DIR` support; build output stayed under
`.next/issue73-build` and generated environment paths are restored before commit.

The preparer runs outside transactions, but it is not a durable real-provider
execution system. Concurrent in-flight Mock requests can execute the harmless
deterministic function before one save wins; persisted replay is idempotent.
Real-provider cost/retry/orchestration belongs to its later activation boundary.
Public link accessibility is an operator-confirmed fact, not an automated
network verification claim. Current-spec activation states implemented behavior;
it is not a production deployment claim or full UI acceptance.

## Continuation gate

Complete fixed-diff review, restore browser interaction and verify actual result
submission → immediate customer visibility → full completion/correction plus
narrow-screen layout. Finish deadline-priority workbench presentation and the
operational recovery rehearsal before requesting slice integration. Continue
the same branch/PR; exceptions and one-time negotiated returns remain #73 work.
Coordinate the separately approved #77 points-module extraction only after a
stable results checkpoint, without bringing recharge behavior into this diff.
