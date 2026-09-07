# Publishing Commerce design

Status: archived implementation rationale for the accepted Issue #65 scope.
The staged notes below are historical; current owner-local specifications and
executable contracts own accepted behavior. Future payments remain separate.

## 1. Ownership and public boundary

| Owner               | Responsibility in this change                                      | Must not become its responsibility                                  |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Identity and Access | Principal, role, account authorization                             | Client-supplied ownership or Commerce-specific role copies          |
| GEO Optimization    | Transaction-bound exact confirmed article content                  | Package, price, points or order lifecycle                           |
| Media Supply        | Transaction-bound platform quote/availability and deletion gates   | Wallet, order price calculation or package lifecycle                |
| Publishing Commerce | Packages, unpaid selections, points, purchase and frozen agreement | Raw Brand/material/Writer internals, suppliers or future fulfilment |

Current `confirmedArticleReference` returns only IDs/revision; `quotePlatform`
reads on its own Prisma client. Calling those separately before a purchase does
not freeze what was checked. Add narrow owner-provided transaction participants,
not Commerce SQL over another owner's private tables.

Commerce application sees one `runPurchase` boundary. The transaction-scoped
wallet/order operations and two owner readers stay private to its PostgreSQL
adapter, rather than becoming a general public session API. Concrete
PostgreSQL composition binds all participants to the same Prisma transaction.
The Prisma transaction handle stays in infrastructure; domain/application code
does not receive it. Owner-exported factories build transaction-bound readers;
they cannot silently open an independent transaction or survive the callback.
This is one local purchase seam, not a general Unit of Work framework.

Compared alternatives: independent service reads are smaller but permit stale
content/price commits; a Commerce repository querying all private tables breaks
ownership; a distributed Saga introduces compensation without an external effect.
One local transaction with owner readers is the smallest adequate boundary.

## 2. Durable records and snapshots

- `PublishingPackage`: administrator-owned current configuration with name,
  successful-publication quantity, positive whole-point total, explicit platform
  scope, enabled state and revision. Disable instead of deleting used packages.
  Package changes are audited with actor/reason and conditional revision.
- `PublishingSelection`: one saved unpaid intention per account/Brand, containing
  exact article reference and either package ID or unique platform quantities.
  Explicit saves use its revision. Editing selections or the article is allowed
  before purchase; changed article content requires reconfirmation and a fresh quote.
- `PointAccount`: one per terminal account, initially zero, internally holding
  granted/funded balances and a revision/sequence. No stored second total; customer
  total is their sum. Creation is lazy and idempotent, not a new registration step.
- `PointChange`: immutable signed origin deltas, resulting customer balance,
  account sequence, actor, customer reason, internal reason and business reference.
  Balance and change commit together. No per-point lots, general event sourcing,
  editable historical rows or separate customer origin balances.
- `PublishingOrder`: account, Brand, submission time/number, initial
  `PENDING_HANDLING`, exact article reference plus frozen title/body, frozen
  package scope or precise lines, paid total, origin consumption and canonical
  submission request/idempotency key. Its purchased agreement cannot be edited.
  Later fulfilment can own progress without rewriting that agreement.

Order content must be copied once because the current Core Article is mutable;
an ID/revision alone cannot reproduce historical contents. Keep references to
other immutable facts where possible. Do not copy Writer Request, report,
materials, supplier details or all Brand data into the order. The paid article
view is immutable; the separate current optimization draft cannot edit it.

Precise lines and random scope members retain platform identities with restrictive
foreign keys. Add their references and current package-scope references to Media
Supply's existing deletion gate. Inactivity remains allowed; referenced identity
deletion is rejected. No fake Listing layer or resource reservation is introduced.

## 3. Quote and submission

Selection is intention, quote is a current observation, order is the paid
agreement. A quote does not reserve inventory or price and needs no separate
durable quote entity. Return the selection revision, exact article reference,
relevant package/platform facts, quantities, total, balance and shortfall. The
submit command carries that observed quote for comparison; the server derives
all authoritative prices again and never trusts the submitted amount.

Random packages promise quantity within the explicit maintained scope, not
particular destinations or distinct-platform inventory. Only an enabled package
with at least one currently buyable platform in scope can be purchased; resource
counts are not inventory. Package total is independent of precise unit prices.
Freeze the stated scope, not a provisional fulfilment assignment. Changes to
irrelevant catalogue records or random-mode precise unit prices do not invalidate
the commercial quote. Relevant changed facts require a visible new quote and
another explicit confirmation.

Submission in one short transaction:

1. Parse strict input and derive account/role from Principal. Lock the account's
   PointAccount (`FOR UPDATE`), creating its zero row safely if absent.
2. Recheck an existing order by `(accountId, idempotencyKey)` first. Same normalized
   request returns that order even if article/price/selection changed afterwards;
   different request is a conflict. It must not re-charge or revalidate old success
   against mutable current facts.
3. Lock/read the saved selection and check its expected revision. Through GEO
   Optimization lock/read the account-owned article and validate both current
   revision and confirmed revision. Freeze title/body from that very read.
4. Lock the package when used, then relevant platform rows in sorted ID order
   through Media Supply. Recompute the quote and compare commercial facts; reject
   unavailable or changed terms before any debit.
5. Validate balance and bounded integer totals; consume granted before funded.
   Append one spending change, update balance and create the immutable order in
   this same transaction. Clear only the consumed intention while retaining a
   monotonically increasing selection revision; deleting/recreating it at revision
   one would permit an old page to overwrite a later intention (ABA).
6. Commit before returning the order. All failures roll back together. No user
   prompt, Writer call, Provider, queue or network request inside the transaction.

Read-only article/package/platform participants hold `FOR SHARE` until commit,
blocking relevant edits/deletion. Lock order is wallet → selection → article →
package → sorted platforms. Selection writes do not lock wallet; article writes
do not enter Commerce; package maintenance follows package → sorted platforms.
Admin point adjustments lock only their account wallet. Verify actual opposing
paths and foreign-key locks in the concurrency tests rather than assuming this
description is executable proof.

After a transport interruption, the client keeps the same key and request for
explicit retry/reconciliation. Confirmed rollback can be retried with that key;
unknown outcome must first recover its order. Only a changed customer intention
gets a new key. Database unique `(accountId,key)` and unique spending-order link
backstop at-most-once effects; disabling the button is only interaction feedback.

## 4. Points and admin limits

All stored values and quantities are integers. Reject fractions, non-finite,
negative quantities and out-of-range input. Use checked integer arithmetic before
persisting; each monetary/point total and balance must fit signed PostgreSQL Int
(`0..2147483647`), with positive sales prices/quantities. Do not rely on floating
point multiplication or silently clamp overflow.

This stage exposes administrator grants and corrections to granted points only;
it does not create funded credits. Negative corrections cannot exceed granted
balance. A future real-payment owner will add funded credit under its own gate.
The spending policy will handle both origins and be tested with controlled internal
fixtures. Adjustment commands also need account-scoped idempotency, explicit
reason, actor audit and atomic balance/change writes. No direct balance setter.

## 5. Failure matrix and observable evidence

| Reachable event                              | Required result                                                 | Discriminating verification                    |
| -------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| Foreign account/body identity injection      | Denied before mutation, no private data                         | Real HTTP cross-account tests                  |
| Article edited/replaced during submit        | Exact checked content or conflict; never mixed revision/content | Two-connection barrier against save/generation |
| Selected price/state changes                 | Old accepted terms or reconfirmation; never silent new debit    | Concurrent media/package mutation              |
| Insufficient balance or numeric overflow     | Selection retained, zero monetary/order effects                 | Boundary and HTTP tests                        |
| Two orders race one balance                  | Only affordable commits, balance nonnegative                    | Concurrent different-key submissions           |
| Duplicate click or lost response             | One order/change; same-key result recoverable                   | Concurrent same-key and post-commit retry      |
| Failure after debit before order persistence | Entire transaction rolled back                                  | Injected repository failure and DB assertions  |
| Referenced platform removal                  | Clear dependency rejection; order remains readable              | Delete-gate plus FK tests                      |
| Current Brand/article/catalog later changes  | Paid agreement remains unchanged                                | Saved-order projection regression              |

Customer pages use explicit safe DTOs and the existing role shell/Media cards;
they display one balance, quantity/price, the saved article and pending order.
No funded breakdown, supplier cost, internal note or commission field leaks.
Unavailable recharge/fulfilment is labelled honestly; no invented dates, results
or guarantee of AI exposure. Desktop and actual narrow-width browser verification
must cover both modes, shortage, reconfirmation and recovery.

## 6. Migration, recovery and source evidence

Formal additive migration introduces owned tables, restrictive references, unique
keys and CHECK constraints. Existing accounts/articles/history are not rewritten;
no seeded sale prices, grants or paid orders, no long-lived compatibility copies
or dual writes. Rehearse on a dedicated database, verify existing journeys and
backup/restore with fixtures. Existing schema remains authoritative until approval.

Before production activation, a separate gate must authorize migration, commercial
data and release. If a staged application must be withdrawn, disable Commerce
entrypoints and preserve committed ledgers/orders; repair forward. Never roll
back successful spending by deleting tables or restoring a pre-purchase database.
No external payment effect exists in this implementation stage.

Primary-source check (2026-09-06): project `compose.yaml` pins PostgreSQL 18.6.
[PostgreSQL 18 row-lock documentation](https://www.postgresql.org/docs/18/explicit-locking.html#LOCKING-ROWS)
states that `FOR SHARE` conflicts with updates/deletes; locks last to transaction
end. Its deadlock guidance motivates consistent lock order and short transactions.
This supports the proposed mechanism, not this implementation's correctness.
Reuse while that database/lock boundary is unchanged; validate owner participation
with real two-connection tests before merge. No new library is needed.

## Architecture review disposition

Ready for scoped implementation, not implementation acceptance. Current code confirms
the independent-read race and deletion-gate extension points; this proposal gives
each a bounded owner and required test. Shared transaction participation and the
stage-specific granted-only admin boundary were explicitly approved by the owner.
No further Writer, material, payment or fulfilment design is needed for this gate.

First slice: packages own status/revision/scope and immutable administrator audit.
Only activated packages appear in the customer list; buyability is derived from
at least one buyable scoped platform via the existing Media Supply quote boundary.
This display is advisory, not a purchase quote or reservation. No debit exists yet.
Package-scope foreign keys block platform deletion without Commerce reading Media
private state. Do not add unimplemented wallet/order tables in this migration.

Second slice: point accounts start at zero without a registration step; ordinary
reads return zero before the first write and do not create records. Administrator
adjustment is a signed delta, not a balance replacement. Wallet row serialization,
account sequence, request identity and ledger insertion share one transaction.
Replay compares actor and normalized intent before applying new-write eligibility;
same-key success stays recoverable even when the target later becomes inactive.
Identity supplies a narrow terminal-account directory projection; Commerce never
queries account role tables directly. Inactive targets remain readable but receive
no new adjustments. The terminal role family is immutable under Identity governance.

The administrator client retains one actor-bound pending request in tab session
storage before sending it. Unknown transport outcomes and reloads offer only an
explicit retry of that same request/key until resolved. Session storage is recovery
intent, never balance truth; unavailable storage prevents starting an adjustment.
Known validation/balance failures permit correction, while uncertain failures keep
the pending intent. Customer history excludes origin, actor and internal reasons.
Validate cross-account HTTP, concurrent grants/negative deltas, exact-key replay,
failed-ledger rollback, integer caps, safe pagination, browser reload/retry and
backup restoration. No funded credit or purchase endpoint is introduced here.

Third slice: an account/Brand has one explicitly saved selection, bound by a
composite foreign key to its own article identity. A conditional revision also
serializes concurrent first saves. Catalogue IDs live in the typed intent, not
as reservations: removing an unpaid precise target preserves the selection and
returns an unavailable quote; paid-order restrictive references remain later.
GEO Optimization exposes a minimal current-brand/article preview without Writer,
report or full-content payload. API composition passes the same configured module
instance to Commerce rather than making Writer configuration global or querying
private article/Brand tables.

Independent source reads are appropriate only for this advisory quote. Saving
requires a currently confirmed exact article and available offers; later changes
retain the intention and produce a current quote with explicit article/availability
problems. The quote never reserves price and its fields cannot authorize a debit.
The atomic purchase participants and final terms comparison in section 3 remain
mandatory before adding any submit endpoint. No new order or spending schema is
introduced in this slice.

Verification targets: real HTTP ownership, two-brand isolation, first-save/update
CAS, article edit/reconfirmation, precise repricing versus random-price independence,
deleted unpaid media, overflow and absence of point writes; normal browser save,
leave/return, both modes and narrow layout; fresh/upgrade/restore migration.

Fourth slice readiness: retain the same owner-participating transaction. Use pure
domain rules for accepted commercial terms, comparison and granted-first spending;
one Commerce transaction adapter performs replay lookup, source locks, order/ledger
insertion and selection consumption. Only immutable order content/terms are copied;
origin deltas live in the linked ledger, not a second editable consumption record.
Order-platform references extend the Media deletion gate. Customer APIs expose
pending order summaries, immutable content and a point-history link, never origin
composition or internal administration detail.

The client stores one account-bound exact submission request before sending and
offers explicit same-key recovery after an uncertain response. Balance and freshness
are not accepted commercial terms. Article/price/scope changes require reconfirmation;
known rollback permits returning to selection, while an unknown outcome cannot turn
into a new purchase key. Both publishing modes must be exercised through normal
customer/admin pages with synthetic granted points, not a payment Provider.

Migration source check (2026-09-06): PostgreSQL 18
[ALTER TYPE](https://www.postgresql.org/docs/18/sql-altertype.html) requires an added
enum value to commit before use. Add the spending kind in its own migration, then
create order/restrictive references and checks. Keep consumed selection rows with
null intent and increasing revision. Withdrawal must preserve ledgers/orders and
use a forward-compatible reader; an old generated client may not read new kinds.
