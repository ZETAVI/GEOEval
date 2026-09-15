# Capture agency order terms

Owner: [Issue #104](https://github.com/ZETAVI/GEOEval/issues/104), child of #100.
Class: architectural. Human decisions approved in the current agency task on 2026-09-14.

## Outcome

Administrators control commission enablement and a fixed agent rate. Successful purchases atomically preserve attribution and commission terms; subsequent migration, suspension, reactivation or configuration cannot rewrite history.

Unconfigured means disabled. Disabled commission does not prevent acquisition, reassignment or purchase. Enabled zero rate participates with zero result. Disabled accounts retain customer relationships but cannot serve/acquire; purchases during suspension are uncommissioned. Reactivation only resumes still-attributed customers and future orders. Previously purchased orders retain their captured entitlement. Moving customers into inactive agents remains forbidden.

## Scope

Agency configuration/audit, a transaction-bound purchase reader, Commerce immutable snapshot, administrator UI and discriminating concurrency/recovery tests. Identity remains status owner. No commission ledger, payout, 72-hour appeal implementation, public-pool table, automatic support assignment, production activation or Recharge/Writer changes.

## Reconciliation

Add agency-order-terms spec; update product-definition commercial frontier, agency-customer-service suspension behavior, publishing-commerce and ADR 0005 at their owners. Retain product evolution marker for settlement/withdrawals. Archive this change only after accepted behavior and verification reconcile.
