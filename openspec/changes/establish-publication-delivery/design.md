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

Implementation refinement: one sparse work-item row holds the currently prepared
content and effective result as separately validated value objects; a work audit
retains corrections and exact-request recovery. No separate result registry or
generation-run state machine is introduced. The aggregate's published count is
updated under the same lock as the result, and active canonical URLs are unique
within an order (fragments cannot count as new publications). Actual work sets
the order's start fact, even when a result is reported directly; Completed
assignment changes preserve Completed. Async preparation preflights briefly,
runs outside transactions, then rechecks current Identity role/status as well as
assignee and both revisions at save. The deterministic preparer is unavailable
in production; manual content/result recording is distinct from Mock generation.
Content limits must accept the full supported purchased core article rather
than impose a smaller hidden preparation limit. Customer result pages reuse
Commerce's original-order ownership check and exclude all internal work data.

Workbench refinement: active orders use original purchase time plus seven days
as the expectation and sort earliest-first; completed history is a separate view,
newest purchase first. The final 24 hours are a presentation-only nearing marker.
Delivery admission explicitly preserves the original purchase timestamp;
migration aligns the existing ordering projection, not paid facts. Pagination uses the immutable
`createdAt + sequence` pair, not a latest-sequence cursor or page-local sort.
The backend owns the one schedule calculation used by customer and operations
views. No stored urgency, timer, automatic failure/refund or new workflow owner.

## 3.1. Points assembly before the settlement slice

Normal delivery is integrated by PR #76 and points assembly by PR #79
(`main@bcb81db`). Current module ownership is documented in the
[architecture overview](../../../docs/architecture/overview.md), with the
executable declaration in `publishing-commerce/commerce-points.module.ts`.
This completed extraction is not a reservation, funded-credit or order-return
implementation and is not reopened as a larger wallet refactor.

The [C1 single-writer checkpoint](https://github.com/ZETAVI/GEOEval/issues/73#issuecomment-5587081614)
now owns the shared write window: #77 provides the common capacity policy,
accounting/schema changes and recharge transaction entry; #73 owns order-side
resolution, fulfilment eligibility and pages. During that window, #73 prepares
the behavior/acceptance below without changing shared accounting, Prisma or
generated public contracts. Order-return persistence/transaction integration
requires the fixed #77 contract and an explicitly reconciled next write window.

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

### 4.1. Next order-side slice: bounded decisions and acceptance

This is proposed activation detail, not currently available exception behavior.
Reuse the existing order detail, responsibility, aggregate/item revisions and
work audit rather than introducing a generic support-case or approval engine.

| Customer/operations intent | Minimum behavior | Evidence that must disprove incorrect behavior |
| --- | --- | --- |
| Record or clear a blocking exception | Retain reason and current responsibility; ordinary in-scope random reallocation need not create an order-wide exception. Already negotiated resolution may be saved directly without first opening a separate case | Recoverable random work continues; a promise needing intervention is visibly distinct; no required report/submit/approve chain |
| Agree a precise replacement | Delivery records the affected unpublished slot's previous/effective target and negotiation reason/version. Original Commerce promise remains unchanged; current published target/result cannot be replaced through this path | Original C remains in the purchase, new arrangement D is explicit; stale C preparation/result cannot overwrite the accepted D arrangement; replacement alone adds no published count |
| Save agreed compensation and continue | One explicit order-level agreed total/version, with necessary context; no automatic pricing, surcharge or customer confirmation page | Work continues while credit is pending; full N/N becomes Completed and its unpaid obligation stays in the administrator queue |
| End remaining work | Follow the approved first-release sequence: finish any work that is to continue, then explicitly stop all still-unfulfilled work with the current negotiated termination | No expansion of all logical slots; already published N/original quantity remain. A stop never fabricates a credit or prematurely closes a positive-return order |
| Correct a recorded fact | Existing result correction keeps its reason/history, target, count and money unchanged, and preserves an ended fulfilment state | Correction cannot become new publication, replacement, re-opening or another return; an unpublished stopped slot cannot be saved by calling it a correction |
| Display the outcome | Compose original promise, safely explained agreed replacement, actual results, and separate agreed/credited amounts | Hide internal channels/negotiation notes; Closed is absent from active deadline work; Completed history never hides an unpaid obligation |

Do not introduce persisted stopped-slot ranges or a separate partial-termination
planner in this first release. The confirmed "finish retained work, then end the
remainder" sequence can use a single aggregate stop barrier. If immediate
partial freezing while other slots continue becomes a real requirement, return
to that product decision rather than inferring it from a quantity example.

All new writes must recheck current role/assignee and exact revisions under the
existing locks. On a stop/result race, a committed result makes the old stop
request stale; after refresh it is retained. A committed stop rejects the old
new-result/Mock save. Already arranged external work remains an operational
coordination responsibility; late new publications after stop or closure need
manual review, not silent re-opening or another credit operation.

Three existing activation seams must change together when implementing this
slice: `actWork` currently validates only frozen purchase targets; result writes
currently derive Publishing/Completed only from count; assignment and active
lists currently know Completed as the only terminal state. These are correct
for the integrated normal slice, not current defects. The exception slice must
add effective negotiated-target validation, preserve stopped/Closed through
correction/reassignment, and exclude both terminal states from active work.

### 4.2. Human decision frontier

The existing confirmation only states that zero/absent compensation on
**continuing** service creates no credit entry. It does not decide whether a
customer-agreed **termination** may return zero, or who may close that order.
The pending question is whether to allow zero-point termination with administrator
closure, require a positive return, or allow operations to close a zero-point
termination. Do not implement one by analogy, create a zero-amount ledger entry,
or change closing authority before the owner answers. This affects only that
branch; the confirmed positive-return rules and the other preparation above stand.

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
