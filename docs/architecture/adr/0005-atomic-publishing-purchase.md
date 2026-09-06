# ADR 0005: Keep Publishing Purchase in One Owner-Participating Transaction

- Status: Accepted for implementation
- Date: 2026-09-06
- Owner decision: [Issue #65 approval](https://github.com/ZETAVI/GEOEval/issues/65#issuecomment-5558502117)
- Activation: maintained packages first; this ADR does not claim the later
  wallet/order runtime has already been implemented.

## Context

The modular monolith stores article, media and future purchase facts in the same
PostgreSQL database. The existing article reference and platform quote are
independent reads. Checking them before a separate debit/order write permits
concurrent content or price changes to invalidate what the customer confirmed.

## Decision

Publishing Commerce coordinates one short database transaction for final purchase.
GEO Optimization and Media Supply provide narrow readers bound to that same
transaction; they retain ownership of article confirmation and media sale facts.
Commerce owns the order, point account/change and idempotent purchase outcome.
Application/domain interfaces do not expose the database transaction client.

Exact confirmed article contents, relevant accepted commercial terms, point
debit, spending history and order commit or roll back together. Existing success
is recovered by account-scoped request identity before mutable inputs are checked
again. Customer-confirmed changed article/price requires reconfirmation; newer
Brand/evaluation context alone remains advisory.

An order freezes title/body once because the current article is mutable. Other
immutable facts remain referenced; the order does not duplicate Writer inputs,
reports or the full Brand. Media identity references participate in the existing
deletion gate, with database constraints as the final integrity boundary.

## Consequences and alternatives

Owner readers must share the actual connection and follow a consistent lock
order, proven by concurrent transaction tests. These are local purchase adapters,
not a general transaction framework or a new service deployment boundary.

Independent reads then writes were rejected because they admit stale commits.
Commerce querying private owner tables was rejected because it erases module
boundaries. Distributed compensation was rejected because no external effect
requires it in this stage and local atomicity already fits the deployment.

Writer calls, human confirmation, future payment interactions and fulfilment do
not run inside this transaction. Future external payment credit receives its own
verified business event and idempotent account-entry boundary. Revisit this
decision if an owner actually moves to a separate datastore or external effect;
do not assume a database transaction spans that new boundary.
