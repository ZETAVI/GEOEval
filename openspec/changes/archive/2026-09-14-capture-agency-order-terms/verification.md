# Verification — Issue #104

## Controlled scope

OrbStack existing PostgreSQL/Redis, database geoeval_issue100 and Redis DB 10. No new containers, real SMS, provider, payment or production activation. Migration 20260915100000_agency_order_terms applied as migration 46 after a task-database custom-format backup. Additive migration preserves existing order rows; no backfill. Recovery keeps additive tables/history rather than dropping snapshots. Local backup: /private/tmp/geoeval-104-before.dump (synthetic test data, task owner ZETAVI, removable after integration acceptance). Permanent behavioral evidence is the tests and final PR/CI.

## Evidence

| Claim | Evidence | Result |
| --- | --- | --- |
| Public, unconfigured, enabled 0%, disabled retained rate | publishing-orders.integration.spec.ts | Passed |
| Suspend/reactivate, preserve pre-suspension orders, no retroactive eligibility | same integration suite | Passed |
| Migration changes future orders only; original request recovery | same suite plus agency-customer-service.integration.spec.ts | Passed |
| First configuration/suspension/migration coordinate with purchase; compatible readers | PostgreSQL barriers and pg_blocking_pids assertions in purchase suite | Passed |
| Account-owned changes permit wallet foreign-key checks | NO KEY UPDATE / KEY SHARE regression | Passed |
| Changed discovery rolls back and retries | injected retry signal through actual transaction reader and purchase | Passed; real changing-discovery scheduling is covered by reader recheck and locking path, not a timing benchmark |
| Atomic failure after order/snapshot creation | injected ledger failure; no order, snapshot, delivery or debit | Passed |
| Settings duplicate/stale/conflicting requests, role/privacy/validation | API and repository tests, including concurrent same request across agents | Passed |
| Snapshot immutable | database UPDATE rejection | Passed |
| Final focused tests | 3 files, 41 tests | Passed |
| Full backend after lock refinement | 719 passed, 13 skipped before final duplicate-request conflict mapping | Passed; affected final paths rerun in focused suite, final PR CI owns final whole-suite result |
| Web | 213 tests | Passed |
| Types, OpenAPI, build, framework, whitespace | repository commands | Passed; final PR CI rechecks fixed revision |
| Browser | local 3290 Web / 3390 API, synthetic admin | Passed: default off → enabled 0% → off retaining 0%, audit expanded; no customer status added |

13 local skips are existing explicit target guards: Recharge worker/notification process suites require their owned databases (or CI default target); Delivery recovery requires its dedicated isolated recovery database. Their guards were preserved and other owners' databases were not used.

Initial test execution accidentally ran the whole suite because pnpm passed a literal --; it exposed test cleanup missing the immutable snapshot table. Test-only reset now truncates just the new tables before existing cleanup. Final targeted invocation uses pnpm exec vitest run paths. An approval-service connection failure delayed one test attempt; after target/backup verification the same action succeeded. No approval block remains.

## Review / reconciliation

Business review: customer-facing order flow unchanged; configuration off does not block purchase/acquisition; zero rate is distinct; old terms preserved; no ledger/withdrawal claim.
Architecture review: narrow Agency leaf participates in existing Commerce transaction, Identity controls lock/role semantics, no full Agency module import or duplicate wallet. Subject NO KEY UPDATE and other actor SHARE locks replaced unnecessarily broad account UPDATE locks after foreign-key wait-cycle review. Same-request unique conflicts roll back and return a conflict rather than a partial configuration.
Current owners: agency-order-terms, agency-customer-service, publishing-commerce, product-definition, glossary, architecture overview and ADR 0005. Product evolution marker retained for later settlement/withdrawal activation. Production guard retained. PR owns fixed diff review, CI, integration and final workspace exit.

Release disposition: candidate for administrator commission configuration and purchase-history integrity; no production activation.
