# Publication Delivery Specification

## Activation boundary

This owner implements admission, whole-order responsibility, sparse publication
work, explicitly Mock/manual content preparation, result recording/correction,
customer-safe progress, deadline-priority work lists and automatic normal completion. Negotiated exceptions,
replacement, termination and point settlement remain unactivated in the
[active change](../../changes/establish-publication-delivery/proposal.md).
Local/branch verification is not integration or production enablement.

### Requirement: Atomic admission with immutable purchase facts

Each successful purchase SHALL initialize exactly one Delivery aggregate in the
same transaction, without performing publishing work or copying the paid article.

#### Scenario: Purchase succeeds or admission fails

- **WHEN** Commerce creates its paid order
- **THEN** its owner-bound Delivery adapter creates the initial aggregate once
- **AND** failure rolls back wallet, ledger, order, aggregate and selection writes
- **AND** the receipt is the aggregate, not another entity or state machine.
- **AND** admission explicitly preserves the original purchase time as its
  immutable ordering projection rather than relying on independent time defaults.

#### Scenario: Existing orders enter Delivery

- **WHEN** the coordinated migration runs
- **THEN** original consumption existence, ownership and agreed amount are checked
- **AND** invalid history stops admission rather than becoming claimable work
- **AND** bounded inserts preserve purchase time without repricing or redebiting
- **AND** Commerce's former pending-only status column is retired.

### Requirement: One current operations owner per whole order

Delivery SHALL serialize responsibility changes with exact revisions and retain
the actor, reason and previous/next responsibility in the same transaction.

#### Scenario: Operators claim and start work

- **WHEN** eligible operators compete for one unclaimed order
- **THEN** only one succeeds, and customer state becomes Publishing
- **AND** claiming alone does not mean actual work or publication has started
- **AND** only the current operator can explicitly start or return the order
- **AND** unstarted return requires a reason and restores pending/pool state.

#### Scenario: Started work requires a new responsible operator

- **WHEN** the current operator tries to return started work
- **THEN** the request is rejected and administrator reassignment is required
- **AND** reassignment requires a reason and a different active operations target
- **AND** the start fact/history remain and former-owner new writes are denied.

#### Scenario: Requests race identity changes or lose their response

- **WHEN** a responsibility command executes
- **THEN** Identity-owned actor/target facts are locked and checked on the same
  connection before the Delivery aggregate, without reading Identity private
  tables outside its adapter
- **AND** stale revisions or changed request-key contents conflict
- **AND** exact same-actor replay returns the original operation revision only,
  never restores old responsibility or claims current detail access
- **AND** audit failure rolls back the entire responsibility change.

### Requirement: Role-bounded operational views

Operations SHALL read unclaimed and currently owned orders; administrators SHALL
read all orders and perform reassignment, without impersonating customers.

#### Scenario: The user opens a role page

- **WHEN** operations or administration opens its order list/detail
- **THEN** the page composes authorized Delivery facts and Commerce's bounded
  immutable-order reader, retaining one owner for each fact
- **AND** list reads are bounded to 50 plus one lookahead row and exclude body text
- **AND** internal work and work-history reads check current Identity and
  responsibility inside the same consistent snapshot as the returned data, so
  an earlier permission check cannot reveal a new assignee's later private work
- **AND** detail shows the frozen article, paid scope and internal responsibility
- **AND** customer reads expose current status but no operator identities/audit
- **AND** return/payment capability is not fabricated by this stage.

#### Scenario: Operations prioritizes unfinished work and finds completed history

- **WHEN** an eligible user opens unclaimed, owned or administrator order views
- **THEN** active orders are shown by earliest expected completion first, with
  the final 24 hours marked nearing and overdue work marked delayed
- **AND** completed history is separately selectable for owned/admin views,
  ordered by newest purchase first, never marked delayed or hidden by completion
- **AND** each page follows the immutable purchase-time and sequence pair in
  the same order as the database query; completion of a cursor order cannot skip
  the next still-active order
- **AND** list/detail show actual published versus purchased quantity and the
  same seven-day expectation used by customer progress
- **AND** these markers do not create new stored states or automatic actions.

### Requirement: Bounded work with an honest preparation boundary

One logical slot SHALL represent one purchased publication. Untouched slots
SHALL remain unmaterialized, and reads SHALL expand at most 50 logical slots
against the immutable agreement rather than current media prices or availability.

#### Scenario: Operations prepares or starts one item

- **WHEN** the responsible active operator selects a random in-scope target or
  uses a precise slot's frozen target
- **THEN** explicit handling may move that item to Publishing, or a direct valid
  result may move it from Pending to Published without a separate start step
- **AND** any actual work establishes the order's start fact and prevents return
  to the unclaimed pool
- **AND** preparing content alone never increments published quantity
- **AND** manual and deterministic Mock content are distinguished; Mock remains
  unavailable in production and has no external publication authority.
- **AND** first Mock preparation needs no replacement confirmation when it
  replaces neither saved preparation nor unsaved content edits; real replacement
  remains explicit and warns about losing the current preparation.

#### Scenario: An asynchronous prepared response becomes obsolete

- **WHEN** the preparer runs outside a database transaction
- **THEN** saving its response rechecks ACTIVE/OPERATIONS through the Identity
  owner, current assignee, aggregate revision, item revision and terminal state
- **AND** a stale or unauthorized response does not create a work row, overwrite
  later content, increase progress or retain database locks while waiting
- **AND** already committed exact-actor requests recover their prior receipt
  rather than invoking the preparer again.

### Requirement: One effective result per purchased publication

Results SHALL retain actual platform, title, HTTP(S) URL and publication time.
Internal channel and notes SHALL remain optional operations-only information.
No historical article-variant selection or catalog account match is required.

#### Scenario: Operations records and repeats a successful publication

- **WHEN** a valid result is explicitly submitted for an eligible slot
- **THEN** the item, effective-result count, aggregate status and audit commit
  together; audit failure leaves none of those writes behind
- **AND** the same normalized URL cannot count in two active slots of one order
  and URL fragments do not create additional publications
- **AND** the result is immediately eligible for customer viewing, without
  waiting for the other slots
- **AND** the operator is responsible for checking actual link accessibility;
  the application does not fetch arbitrary links or claim automated verification.

#### Scenario: Operations corrects an ordinary entry error

- **WHEN** the current operator supplies an explicit correction reason
- **THEN** before/after history is retained without another completed count
- **AND** neither the frozen precise target nor an already published platform
  can change through ordinary correction
- **AND** completed orders remain Completed through correction or administrator
  reassignment; other ordinary assignment/start operations cannot reopen them.

#### Scenario: All purchased publications have valid results

- **WHEN** the effective-result count reaches the immutable purchased quantity
- **THEN** the order becomes Completed automatically in the same transaction
- **AND** the customer performs no manual acceptance action
- **AND** result storage and count remain bounded by the original quantity.

### Requirement: Safe progress-first customer results

The result subroute under the existing paid-order route SHALL first prove the
original customer's ownership through Commerce. It SHALL return only bounded
public result fields and progress, never preparation, channels, notes or audit.

#### Scenario: The customer follows partial publication

- **WHEN** a random order is incomplete
- **THEN** the customer sees aggregate progress and only actual published
  results, not provisional media allocation
- **WHEN** a precise order is incomplete
- **THEN** paginated purchased targets remain visible as In handling or Published
  while internal Pending/Publishing steps remain hidden
- **AND** completed count, original quantity, expected completion date, purchased
  terms and links remain distinguishable from the secondary frozen article.

#### Scenario: The seven-day expected period passes

- **WHEN** an unfinished order passes seven calendar days after purchase
- **THEN** a delay marker accompanies its actual state
- **AND** elapsed time alone never publishes, completes, closes or refunds it.
