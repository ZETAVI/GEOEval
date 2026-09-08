# ADR 0006: Initialize the Delivery Aggregate with Its Paid Order

- Status: Accepted for implementation; activation follows the #73 PR slices
- Date: 2026-09-08
- Owner approval: [Issue #73 architecture and parallel-write decision](https://github.com/ZETAVI/GEOEval/issues/73#issuecomment-5578916359)
- Supersedes: only the exclusion of minimal Delivery initialization from the transaction in [ADR 0005](0005-atomic-publishing-purchase.md); its commercial, cost and external-effect boundaries remain unchanged

## Context

Every successful purchase must be available to operations without a separate
background acceptance gap. Commerce and Delivery share PostgreSQL, while the
current product Outbox is routed to Evaluation, not a generic fulfilment bus.

## Decision

Commerce invokes Delivery's owner-bound adapter on the purchase connection to
create its one initial aggregate, keyed uniquely by paid order. This is the
aggregate itself, not another receipt entity or state machine. Failure rolls
back spending, ledger, purchase, consumed selection and aggregate together.

Delivery owns operational status, assignment and history. Commerce composes
customer status through Delivery's public read adapter and retires its old
pending-only column. Delivery never reads Commerce's private tables: the API
composition layer combines authorized Delivery views with Commerce's bounded
immutable-order reader. No reverse module injection or generic workflow engine
is required.

Actual preparation, AI calls, human agreement and publication remain outside the
purchase transaction. This decision adds no payment or Provider authorization.

## Consequences and recovery

Historical admission checks original spending existence, ownership and amount,
then creates one aggregate per order in bounded batches without redebiting or
inventing results. The migration and old-column retirement require a coordinated
deployment window; the old pending-only runtime must not serve the new schema.
After new operational history exists, recovery retains it and uses a compatible
build/forward fix, not a destructive restore that erases intervening work.

Assignment commands lock Identity facts before their Delivery aggregate,
revalidate actor/target roles and exact revisions, and commit audit with state.
They do not acquire wallet locks. The later money slice must keep its explicit
wallet-first order and exact negotiated-result version boundary.

## Alternatives and revisit

Outbox admission is deferred because no external or separate-store effect
requires eventual delivery here. Direct private-table access and a second status
owner were rejected. Revisit when a capability actually moves to another store
or reliable asynchronous admission becomes necessary; do not infer that local
transactions can span that future boundary.
