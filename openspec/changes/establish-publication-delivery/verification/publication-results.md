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
| Full browser result submission and responsive visuals | Actual first result → customer Publishing 1/3 → manual second preparation/result → first-use Mock third preparation/result → Completed 3/3 → reasoned correction → original customer page refreshes coherently to corrected Completed 3/3; result link opens the local publication fixture | Passed |
| Deadline workbench and pagination | Purchase time explicitly preserved on admission; active earliest-first, separate Completed history; timestamp/sequence tie and cursor-order completion tested across pages; live 375px page shows delayed → nearing → normal and retained Completed 3/3 | Passed |
| Recovery after migration or actual work | Fresh DB applies all 32 migrations and repeated deploy has no pending migration; historical admission timeout rolls back and original SQL bodies then succeed; time projection corrected without changing purchase/ledger/results/history; compatible read-only ingress followed by forward correction/exact replay retains 1/2 | Passed, controlled drill only |
| Negotiated exceptions/point returns                     | Remain in the next approved slice; not implemented or tested as live behavior                                                                                                                                                     | Not run                              |

## Isolation and limits

Independent fixed-diff review of `2658295..08ee06f` found three reachable races:
internal work/history read authorization separated from its snapshot, late
history shown under another selected item, and stale customer-header status
conflicting with refreshed progress. Corrections move internal Identity/current
assignee checks into the same RepeatableRead snapshot, bind history responses
to order/slot/read epoch, and keep one customer status projection. Two controlled
HTTP read interleavings now deny the former owner; the affected backend checks
pass 2 files / 25 tests. Web tests now pass 17 files / 94 tests, including late
history rejection and refreshed Completed replacing the stale status. The
original full-suite evidence remains distinct from this targeted rerun; exact
head CI and bounded review closure belong in the PR.

The browser follow-through and workbench changes now pass the full backend
regression: 53 files / 362 tests, with the two guarded recovery tests intentionally
skipped outside their dedicated target. The latter passed separately: 1 file /
2 tests on the recovery database below. Web now passes 17 files / 100 tests;
workspace typecheck and framework validation pass. The focused deadline/result
suite passes 3 files / 33 tests. Prior browser blockage is superseded by this
actual page journey, not reclassified as an HTTP or network fix. First-use Mock
no longer asks to overwrite nonexistent preparation; saved preparation or
unsaved title/body changes still require confirmation.

The backend suite used `geoeval_issue73_delivery_suite` at PostgreSQL 55432 and
Redis 56573/1. Browser testing reused `geoeval_issue73_delivery_test`, Redis
56573/0, API 3309 and Web 3209; both databases applied the additive results
migration. Synthetic original order GEO-00000033 and the existing 7333 operations
identity were used. No real publishing, provider, SMS, payment or customer data
was involved. The existing #65 human-review services and data were not modified.

The original completed browser order remains intact after the additive ordering
migration. Three additional synthetic purchases (GEO-00000034–36) used the normal
HTTP flow; only their fixture clock placement used SQL to represent normal,
nearing and delayed ages without waiting seven days. Actual role navigation and
list ordering were then checked in the browser. This is controlled clock setup,
not direct database implementation of a feature action. Both the 375px CSS
viewport and actual rendered screenshots were inspected; native capture scaling
was not mistaken for a product layout defect. Local publication pages explicitly
identify themselves as fixtures, not media delivery.

Recovery uses `geoeval_issue73_recovery_verified` at PostgreSQL 55432 and Redis
56573/2. Run `pnpm --filter @geoeval/backend db:migrate`, then
`pnpm --filter @geoeval/backend exec vitest run test/delivery-recovery.integration.spec.ts`
with both targets explicitly set. The test skips other resource targets, never
calls general cleanup, and retains its synthetic records. Earlier
`geoeval_issue73_recovery_suite` remains business-empty with its actual earlier
migration checksum; it was not silently repaired. An attempted reset of the
ordinary synthetic suite was refused before deletion, so old databases were
retained and fresh migration evidence used a new empty database instead. The
ordinary regression suite's schema is structurally equivalent, but its earlier
uncommitted migration checksum is not presented as fresh-migration evidence.

The compatible read-only barrier was a test-only HTTP ingress middleware; the
deployment boundary that disables mutations must be selected before a production
recovery window. No physical restore, destructive down-migration or process-crash
recovery is claimed. Restoring a database that would erase later orders, results
or credits requires separate authorization. Temporary services are stopped at
the checkpoint; databases/Redis are retained. Web uses isolated output and its
generated environment paths are restored before commit.

The preparer runs outside transactions, but it is not a durable real-provider
execution system. Concurrent in-flight Mock requests can execute the harmless
deterministic function before one save wins; persisted replay is idempotent.
Real-provider cost/retry/orchestration belongs to its later activation boundary.
Public link accessibility is an operator-confirmed fact, not an automated
network verification claim. Current-spec activation states implemented behavior;
it is not a production deployment claim or full UI acceptance.

## Continuation gate

Complete the exact-head review/check gate before requesting slice integration.
Browser result acceptance, deadline-priority presentation and the bounded local
recovery rehearsal are complete; this does not close the full parent outcome.
Continue the same branch/PR; exceptions and one-time negotiated returns remain #73 work.
Coordinate the separately approved #77 points-module extraction only after a
stable results checkpoint, without bringing recharge behavior into this diff.
