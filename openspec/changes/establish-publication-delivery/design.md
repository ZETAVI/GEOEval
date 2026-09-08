# Publication Delivery architecture proposal

Status: approved for bounded implementation; not merged or production-activated. The human owner approved the architecture and non-conflicting parallel implementation, followed by the scoped simplification recorded below.
Owner and control: [proposal](proposal.md). This replaces the previous local architecture candidate, not current specs.

## 1. Capability and dependency direction

| Owner                    | Owns                                                                                                                                                                          | Does not own                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Publishing Commerce      | Immutable order/agreement/article; original consumption; point return fact; wallet and append-only ledger; money idempotency                                                  | Assignment, replacement target, result validity, publishing progress          |
| Publication Delivery     | One order receipt; exclusive assignee/history; logical slots and operated items; variant preparation; replacements/results; fulfilment state; negotiated settlement intention | Prices, customer balance, editable copy of purchased article, payment gateway |
| API composition boundary | Connect owner ports for purchase admission, order view and settlement transaction                                                                                             | A third order/ledger/state owner or generic workflow framework                |

Deletion test: without Delivery, operational responsibility/results/termination would leak into Commerce, customer controllers and administrator point adjustment. A separate owner is warranted; a new generic workflow service is not.

Proposed public seams (semantic names, not final endpoint paths):

- Commerce reads: owned immutable agreement, paginated order summaries, original consumption and actual returned amount. Internal operational reads have explicit operator/admin access, not customer impersonation.
- Delivery commands: claim, return unstarted order, administrator reassign, prepare item, record/correct result, record agreed replacement, save settlement intention, stop remaining work. Queries: claimable/my orders, bounded slots/results, progress, unresolved settlement intentions.
- Commerce return command: execute the exact saved negotiated-result reference/revision once when settlement is eligible; amount and customer are read from authoritative records, never accepted as arbitrary browser wallet overrides.
- A local composition adapter binds same-transaction owner ports. Domain/application interfaces do not expose Prisma clients. Receipt creation does not call back into Commerce; Delivery business code does not import the Commerce implementation. Root wiring supplies readers and commands without a `forwardRef` cycle.
- Customer DTOs combine owner results in the existing order route. Do not introduce a second writable `status` in Commerce or copy the whole agreement into Delivery.

## 2. Paid order admission: recommend synchronous minimal receipt

Selected A: existing purchase adapter invokes a transaction-bound Delivery admission port after the immutable order exists; create the unique-by-order Delivery aggregate itself in its initial state, with owner/index references. There is no separate Receipt entity, receipt state machine or intake-log table. All purchase writes and this aggregate commit together. No work-item fan-out, variant generation, AI, external publishing or user interaction inside the transaction.

Alternative B: reliable outbox event and idempotent background admission. It is viable but needs visibility delay, replay and missing-admission recovery. The current `background-work/infrastructure/postgres-product-outbox.repository.ts` accepts Evaluation event types only; it is not an already-enabled Delivery transport, and extension overlaps #39/#42.

A reuses the accepted single-database transaction shape, with the human-approved narrow extension to ADR 0005's scope. New aggregate creation does not acquire an already-owned work record, so purchase's wallet → selection → article → package → media lock order remains, with aggregate insertion last. Recovery of an old successful purchase must return its true current composed order state, not a hard-coded pending DTO.

## 3. Quantity, work and results

- The frozen agreement defines stable one-based logical slots. Precise line order uses frozen canonical line ordering; random slots have no promised platform. A slot is pending without a physical row until actual operation.
- Read at most 50 slots per page and inspect at most the frozen agreement's 200 lines. Never allocate an array/table proportional to a possible 2,147,483,647 quantity. Do not change the purchase quantity limit as a hidden implementation shortcut.
- One `(orderId, slot)` has at most one effective result. Retried operations cannot count twice. Valid-result count and aggregate transitions update under the same Delivery lock/transaction; counters are owner-local projections that can be checked against actual results.
- Results retain required platform/title/URL/time and internal channel detail; customer projection omits the internal channel, notes and correction history. Optional media-resource association is not an inventory requirement. Original exact media cannot be rewritten by an ordinary result correction.
- Use an async-capable `VariantPreparer` port with frozen purchased article and slot/placement context, initially deterministic Mock or explicit manual content. Run preparation outside database transactions and fence its later save by the relevant item revision. Do not require selecting a historical variant when reporting publication, and never infer actual publication from generated content.
- Claiming marks the order publishing but not all slots as started. Recoverable slot exceptions do not force an overall exception when work can still meet the purchased promise. Seven-day delay is a marker, not automatic failure/refund.

## 4. Fulfilment and settlement are separate facts

| Scenario                                            | Fulfilment                                                | Settlement information                             |
| --------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| Normal or replacement fulfils all quantity          | Completed                                                 | None, or independently pending agreed compensation |
| Administrator pays completed-order compensation     | Remains Completed                                         | Returned with ledger reference                     |
| Operations stops all remaining work after agreement | Exception handling; remaining ordinary operations stopped | Final agreed amount pending administrator          |
| Administrator executes termination settlement       | Closed; existing results/quantity retained                | Returned atomically with closure                   |

This does not add a sixth customer order state. A return intention is not money: Delivery owns one explicitly saved negotiated result with reason/context, mode (continue/terminate), agreed total and revision; Commerce owns the only actual return fact. Administrator outstanding views include ALL recorded, unpaid agreements, including those waiting for remaining work. Execution requires the exact saved revision and current eligibility (retained work finished or remaining work stopped), not a separate approval/submission entity or finalization endpoint. Completed state, customer inactivity, archived/current Brand selection or the original operator's later role/status must not hide a pending obligation. A settled marker must be written with the ledger or derived from it, never independently assumed.

Proposed minimum lifecycle:

1. Operations explicitly records the offline agreement/replacement and optional integer return amount. The customer has no application/review step. No automatic entitlement calculation or surcharge.
2. Continue remaining agreed work without waiting for administrator. Explicitly saving a correction increments the same agreement revision and preserves history. Do not silently change an already presented agreement.
3. Settle once after remaining executable work has finished, or after all remaining work has been explicitly stopped. The same explicit save holds the consolidated price-difference/compensation/termination total; no separate draft/submitted/finalized workflow is created. Zero/absent compensation on a continuing replacement creates no money entry and requires no administrator payment action.
4. Administrator performs one `confirm and return` action against that exact saved agreement revision and current settlement eligibility. A stale view conflicts instead of executing a changed amount. A correction uses the same operations save rather than an approval rejection state machine; the obligation remains visible. No multi-level approval engine or second business payment request.
5. One successful return per order in this first release; a new request key cannot evade the business uniqueness constraint. No additional returns after settlement/closure, partial-in-progress repeated returns, or reopening fulfilment. Cumulative original-spend cap remains an invariant rather than permission for repeated refunds.

Stopping work and final Closed are distinct moments: stopping must immediately prevent new ordinary work while waiting for administrator. Already-arranged external publication requires manual coordination; changing a local flag cannot cancel an external action. Preserve existing results and audit; correction of recorded facts cannot reopen service or silently trigger an extra return. Unexpected post-terminal business remedies require a separately authorized decision.

## 5. Money and transaction boundaries

- Original negative `PUBLISHING_ORDER` ledger association remains unique and immutable. Current schema permits only negative order spending or unlinked granted adjustment; add a dedicated return record/kind and separate relation, not a relaxed ambiguous existing link.
- Validate whole points, `returnedTotal <= originalConsumedTotal` across all reasons, original customer ownership, origin allocation, existing balance/sequence integer bounds and current administrator authority on the server. Do not infer original funded/granted composition from the current wallet.
- Full return restores original sources; partial return uses original consumption ratio and accepted integer remainder rule. Reuse the existing offline model as arithmetic evidence only; actual database proof remains required.
- Coordinate wallet → Delivery aggregate/intention lock in one fixed order. Ordinary Delivery commands never acquire wallet after locking Delivery. No provider or human waiting while locks are held.
- On exact replay, recover the previously committed success before rejecting changed mutable state; different request content conflicts. Unique order-settlement execution and ledger keys prevent another key from crediting twice. Preserve the exact actor-bound recovery request across browser reload as the existing purchase/adjustment flow does.
- Continuing compensation atomically credits wallet, appends ledger, and marks the intention paid, leaving Completed unchanged. Termination atomically performs those writes plus Closed transition; a prior stop flag remains effective even if the monetary transaction rolls back.
- Approved security boundary: an active authorized administrator may return an existing order's points to its original inactive terminal-customer account. This settles retained business, does not reactivate the customer, restore a session, enable purchases or authorize arbitrary funded credit. Do not inherit the grant-only `TARGET_INACTIVE` gate. Customer identity/order ownership must still be valid, with restrictive retention for order/intention/result/ledger references. A full wallet, missing ownership or other integrity failure retains a visible unresolved obligation for administrator recovery; never use the gift adjustment endpoint as fallback.

## 6. Failure and recovery matrix

| Reachable failure                                                   | Recovery owner / behavior                                                                                                             | Discriminating evidence                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Purchase receipt fails or old order lacks receipt                   | Roll back new purchase; idempotent bounded historical admission                                                                       | Transaction injection; replay and pre/post inventory                                               |
| Two operators claim, or former assignee writes after reassignment   | Delivery serializes claim, checks latest owner + revision                                                                             | Concurrent real-DB claim and HTTP access tests                                                     |
| Preparation response returns after stop/reassignment/item edit      | Discard stale prepared save; do not fabricate result                                                                                  | Controlled delayed Mock with revision fence                                                        |
| Duplicate result or result-save/stop race                           | Unique slot result + aggregate lock; no extra progress                                                                                | Concurrent result/stop checks and retained original results                                        |
| Administrator reads old agreed amount                               | Reject stale revision; no money effect                                                                                                | Operations-edit versus return race                                                                 |
| Ledger insertion fails or response is lost                          | Rollback or recover same committed result, never new credit                                                                           | Injected failure, reload/retry, different-key duplicate                                            |
| Order has saved unpaid compensation before or after fulfilment ends | Query all saved unpaid agreements; show waiting-for-work or ready-to-execute explicitly                                               | Completed + pending browser path and admin queue assertion before and after settlement eligibility |
| Customer/operator becomes inactive or Brand context changes         | Preserve obligation; current admin can perform original-order return under the proposed permission, without restoring customer access | Inactive customer credit, original operator role change and archived-Brand queue tests             |
| Termination return fails                                            | Stopped remains stopped; not Closed/paid; admin can retry same intent                                                                 | Wallet-boundary/failure injection and stopped-item denial                                          |

## 7. Migration and rollback proposal

1. Inventory existing orders, original ledger uniqueness/ownership and supported agreement shapes read-only; back up and rehearse on a dedicated database. No production or human-review database reuse.
2. Slice 1 adds only the Delivery aggregate, operated items/results and currently required history/constraints; bounded idempotent backfill creates one aggregate per existing paid order without regenerating article, repricing, redebiting or fabricating results. Slice 2 separately adds negotiated settlement/return structures and ledger extension when it delivers that complete path. No real-Writer run/retry/trace tables are prebuilt. Invalid historical data is reported, never silently skipped as delivered.
3. Stage old-code compatibility during the controlled migration window only; prove every historical order admitted before activating the new read/write routes. New purchase path must always create a receipt before activation. Remove Commerce's placeholder status and generated-client dependency through the same coordinated change; no long-term dual writable state or speculative event-sourced rebuild.
4. Before any new activity, the prior build can be restored only with verified compatible schema. After real Delivery/return writes, do not serve the old pending-only API or remove return tables: disable affected commands, keep compatible read access and forward-fix. A database restore that would erase intervening orders/credits requires an explicit separate recovery decision.
5. Rehearse empty DB and representative existing orders, interrupted/repeated backfill, and compatible read-only recovery. Record exact boundaries in the implementation PR; do not claim a destructive down-migration is safe.

## 8. Reuse, evidence and acceptance gate

Reuse current Nest/Prisma/Identity/Media Supply composition and actor-bound request recovery; no new external dependency, billing integration, workflow engine, queue or cache is required for this slice. Existing project executable adapters and ADR 0005 support the local transaction pattern, but do not prove new cross-owner wiring/locking. Refresh official API evidence if implementation introduces a new API assumption rather than reusing checked patterns.

Verification progresses from pure slot/amount/transition rules → isolated PostgreSQL constraints and transaction races → HTTP role/ownership/reload tests → real browser customer/operations/admin journeys, including narrow screens. UI uses existing components and task-oriented lists/forms; broad design-system migration belongs to #74.

Primary first slice: purchase to claim to one real recorded result visible to the customer. Second slice: manual exceptions/replacement/stop and exact administrator return with both terminal paths. Deploy/enable only a coherent slice; do not expose unimplemented financial actions or a fake result as proof. Architecture and the #39 parallel write window are approved; shared files remain single-writer and integration/production retain separate gates.
