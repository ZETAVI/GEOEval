# Proposed Publishing Commerce delta

Approved behavior delta, not yet activated. Extends the current Commerce owner rather than moving wallet authority into Delivery. Security and architecture boundaries below were approved for bounded implementation, not real-money or production activation.

## ADDED Requirements

### Requirement: Purchase admission preserves one atomic commercial result

The accepted purchase transaction SHALL also establish one minimal Delivery receipt through an owner-bound port, without performing fulfilment or external work inside the transaction.

#### Scenario: Admission cannot be persisted

- **WHEN** the minimal receipt write fails during purchase
- **THEN** no debit, ledger, order or consumed selection is left behind
- **AND** historical admission remains idempotent without repricing or redebiting.

### Requirement: Administrator executes one exact order-linked return

Commerce SHALL credit an exact saved operator-recorded agreement through an administrator-only action after settlement becomes eligible, with an append-only original-consumption-linked money fact.

#### Scenario: Administrator confirms the agreed amount

- **WHEN** a currently authorized administrator submits the exact saved agreement revision after retained work has finished or all remaining work was stopped
- **THEN** integer amount, original account, original consumed composition and whole-order return cap are checked server-side
- **AND** wallet, source-preserving ledger and paid settlement fact commit together
- **AND** a terminating return also commits Closed atomically; continuing compensation leaves Completed intact
- **AND** original spending is not edited and granted adjustment is not used as a return substitute.

#### Scenario: Return is stale, duplicate, uncertain or fails

- **WHEN** a stale agreement, changed request or new key tries to repeat an already paid settlement
- **THEN** no extra credit is made
- **AND** same-request replay recovers prior success after response loss
- **AND** a failed transaction cannot report paid or Closed; a prior stop remains enforced
- **AND** waiting obligations remain accessible for administrator recovery.

#### Scenario: The original customer is inactive

- **GIVEN** an existing valid original order and saved agreement eligible for settlement, not a new arbitrary point grant
- **WHEN** an active authorized administrator executes its return
- **THEN** customer inactivity alone does not prevent fulfilling that retained agreement
- **AND** the customer is not reactivated and gains no session or new purchase authority
- **AND** inactive actors cannot execute operations and existing integrity/amount bounds remain enforced.

## MODIFIED Requirements

### Requirement: Owned immutable pending orders and linked history

Customer order reads and recovered purchase results SHALL compose immutable Commerce facts with the current Delivery projection rather than the old Commerce-owned PENDING_HANDLING placeholder.

#### Scenario: An order has progressed since purchase

- **WHEN** the customer revisits it or recovers the original purchase response
- **THEN** the current fulfilment and independently pending/paid return information is shown safely
- **AND** there is no second writable lifecycle or duplicate purchased article/agreement.
