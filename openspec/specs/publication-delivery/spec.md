# Publication Delivery Specification

## Activation boundary

This owner implements admission and whole-order responsibility only: shared pool,
my orders, explicit start, unstarted return, administrator reassignment, audit and
customer-safe pending/publishing status. Per-publication preparation/results,
exceptions, completion and negotiated point settlement remain unactivated in the
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
- **AND** detail shows the frozen article, paid scope and internal responsibility
- **AND** customer reads expose current status but no operator identities/audit
- **AND** result/return/payment capability is not fabricated by this stage.
