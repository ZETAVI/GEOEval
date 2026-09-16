# Verification and reconciliation

Implementation review anchor: `0bdb79a`; base `3237111`. Final PR owns CI, merge revision and post-integration closeout. This archive is design history; current behavior is owned by `openspec/specs/agency-commission/spec.md` and executable module owners.

| Claim | Evidence | Result |
| --- | --- | --- |
| Exact funded-only half-up fen, shared refund allocation | agency-commission.spec.ts; existing order-point-return.spec.ts | passed |
| Final receipt before accrual, zero-publication closure and participating zero | agency-commission.integration.spec.ts (real purchase/transfer/terms owners) | passed |
| Captured rights survive transfer/rate/suspension; role and account fences | real API integration incl. other agent 404, customer/operations 403, changed actor 409 | passed |
| Unique immutable entries and independent rollback | eight concurrent accruals, DB rejection, injected post-write error, unchanged final wallet receipt | passed |
| Process crash and restart | commission process SIGKILL before commit, two restarts, one final entry | passed in controlled OrbStack DB |
| Default off, bounded scan cursor and shutdown | agency-commission-runtime.spec.ts and runtime-config.spec.ts | 14 focused tests passed |
| Integration regression | full backend suite: 862 passed, 13 existing special-environment skips; two subsequently added worker tests passed in focused run | passed; skips not counted as passes |
| Web | 222 tests, exact large-fen formatting, source explanation and administrator links | passed |
| Contracts/build | OpenAPI generation, full build, typecheck, format and framework | passed |
| Browser | synthetic agent 13900011023 views closed order with original funded200/granted100, returned67/33, retained133, rate20%, commission266fen; administrator13900011020 follows Records→Commission→actual order ledger | passed locally; no real funds |

The first full suite exposed duplicate Delivery write-port registration: the new module changed the globally selected test instance, causing the old concurrency barrier to time out. Commission now uses a dedicated Delivery read projection and API reuses existing Identity provider; only the isolated Worker supplies its own identity reader. Affected 26 integration tests and the final full suite passed after correction. No timeout was increased or test removed.

Review axes: approved final-consumption meaning, no publication multiplier, ownership/dependency direction, immutable money, permission scope, retry/concurrency, generated contract and continuity. No unresolved material findings. Summaries intentionally derive from owner facts in a consistent snapshot; no new writable balance or payout model. Estimates use batch reads rather than a second allocation algorithm.

Migration adds only the commission ledger/index/source constraints. Applied to owned `geoeval_issue100` in OrbStack; CI verifies fresh migrations. No historical backfill or dual compatibility path. `AGENCY_COMMISSION_ENABLED=false` remains default. Disable it to stop new entries; do not erase booked money for recovery.

Current specs, product-definition extraction marker, existing commission glossary term and architecture updated in place. Withdrawals stay with parent #100. Release:skip (unreleased engineering slice; no version or production activation). Temporary browser/API/Web hosts stopped, infrastructure retained. After merge keep a110 and its branch clean/read-only under ZETAVI/#110 for short-term verification/recovery; remove after the next independent slice establishes its own owner and checkout. Old a100 remains untouched.
