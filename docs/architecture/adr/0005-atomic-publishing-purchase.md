# ADR 0005: Keep Publishing Purchase in One Owner-Participating Transaction

- Status: Accepted for implementation
- Date: 2026-09-06
- Owner decision: [Issue #65 approval](https://github.com/ZETAVI/GEOEval/issues/65#issuecomment-5558502117)
- Activation: implemented by the Commerce purchase adapter and owner-bound
  readers in Issue #65; production/commercial enablement remains a separate gate.

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

## Agency purchase terms extension (Issue #104)

Agency participates through a transaction-bound infrastructure reader, not its full service/report module. Commerce owns a one-to-one immutable order terms record; missing records on older orders are not backfilled from current relationships. Settings defaults are disabled, and enabled zero rate is valid. Agent eligibility and configured terms are captured separately; only their active/enabled conjunction permits future commission participation. No ledger or payout is activated here.

Before taking the wallet lock, new purchases discover attribution, acquire customer/agent account SHARE locks in stable UUID order through Identity, and recheck attribution. A changed discovery rolls back and retries the whole transaction, bounded to three attempts. Settings edits acquire agent NO KEY UPDATE and administrator SHARE locks in the same UUID order, covering absent settings rows; transfer acquires customer NO KEY UPDATE plus actor/destination SHARE in that account order. Account status updates conflict with purchase SHARE locks. Compatible purchase readers do not serialize all customers of one agent.

Existing success is recovered before mutable reads; another success is recovered again after acquiring the wallet lock. This preserves recovery while closing races between concurrent requests. No asynchronous snapshot filling, exclusive agent-wide purchase mutex or duplicate wallet is introduced.

Lock review correction: broad account UPDATE locks were rejected because an account foreign-key check from a wallet-owning adjustment can complete a wait cycle with a purchase and a concurrent settings/transfer mutation. NO KEY UPDATE protects the mutable subject against purchase SHARE while remaining compatible with foreign-key KEY SHARE. Only actual key changes/deletion require stronger exclusion. This is a local Identity leaf refinement, not a new global lock framework.
