# Archived behavior delta

Accepted behavior is reconciled into the current Publishing Commerce owner.

## ADDED Requirements

### Requirement: Administratively prepared sales and points

The system SHALL provide administrator-controlled random packages and auditable
granted-point adjustments, using the existing Identity access contract.

#### Scenario: Administrator prepares a purchasable package

- **WHEN** an administrator explicitly saves a valid package with quantity,
  positive whole-point total, platform scope and enabled state
- **THEN** customers can see that maintained offer and its allocation boundary
- **AND** revision-conditional edits are audited; used records cannot be silently
  removed or used to rewrite an order.

#### Scenario: Administrator changes granted points

- **WHEN** an authorized administrator explicitly submits a signed whole-point
  adjustment with a reason and idempotency key
- **THEN** one new point change and the balance update commit together
- **AND** duplicate requests cannot add or remove points again
- **AND** negative adjustments cannot overdraw granted points, historical changes
  cannot be edited, and this path is not labelled or recorded as funded recharge.

### Requirement: One saved customer purchase intention

The system SHALL allow a customer to save a random-package or precise-platform
selection for an exact confirmed article and review a server-calculated quote.

#### Scenario: Customer selects either publishing mode

- **WHEN** the customer saves a package or unique platform quantities
- **THEN** the system preserves one unpaid selection for that account/Brand
- **AND** random mode shows quantity, total and non-guaranteed destinations;
  precise mode shows each selected platform, quantity and summed point price
- **AND** the quote shows unified available balance and shortfall without
  reserving price, media or inventory.

#### Scenario: Customer returns from editing or insufficient balance

- **WHEN** the customer returns to the purchase review
- **THEN** the saved selection is retained, while changed article content must
  be saved and reconfirmed before submission
- **AND** relevant changed terms are shown for explicit reconfirmation; no
  automatic purchase or fake recharge occurs.

### Requirement: Atomic authorized purchase

The system SHALL validate and freeze the exact authorized article and commercial
terms, debit whole points and create the order as one atomic operation.

#### Scenario: Customer submits an affordable valid purchase

- **WHEN** the customer explicitly confirms the current quote and submits
- **THEN** the server uses the Principal account, exact confirmed article revision,
  current relevant offer facts and adequate balance
- **AND** one order, one point change and the balance update commit together
- **AND** granted points are consumed before funded points, with the composition
  retained internally and no origin choice exposed to the customer.

#### Scenario: A purchase prerequisite fails or races

- **WHEN** ownership, article confirmation, selected terms, balance or numeric
  constraints fail, including concurrent changes
- **THEN** no partial debit or incomplete order remains
- **AND** the customer can recover/review their selection with a truthful error
- **AND** newer Brand or evaluation guidance alone does not block a confirmed
  article purchase.

#### Scenario: A submission is repeated after success or lost response

- **WHEN** the account repeats the same normalized request with the same key
- **THEN** it receives the same order without another debit, even when current
  article, price or saved selection has since changed
- **BUT WHEN** that key accompanies a different intention
- **THEN** the system rejects the conflict rather than interpreting it as success.

### Requirement: Immutable purchased agreement and bounded order visibility

The system SHALL preserve purchased content and terms independently of mutable
Brand, current article, package and platform records.

#### Scenario: Customer views a newly submitted order

- **WHEN** the owning customer opens their order
- **THEN** it shows pending handling, submission identity/time, purchased quantity,
  scope or precise selections, paid points and the frozen confirmed article
- **AND** no fulfilled result, date promise, operational assignment, self-service
  refund or payment capability is fabricated
- **AND** internal origins, supplier details, procurement prices and audit notes
  are absent from the customer response.

#### Scenario: Source records are maintained after purchase

- **WHEN** current profile/article or catalogue facts change
- **THEN** existing purchased contents and terms remain unchanged
- **AND** referenced platform identity cannot be deleted while disabling its
  future sale remains possible.
