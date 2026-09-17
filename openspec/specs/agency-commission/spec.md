# Agency Commission Specification

## Purpose

Own derived order commission estimates, immutable final renminbi entries and scoped read-only earnings views. Purchase eligibility/rates belong to [Agency Order Terms](../agency-order-terms/spec.md); final point returns belong to [Publishing Commerce](../publishing-commerce/spec.md). [Agency Withdrawal](../agency-withdrawal/spec.md) reads booked totals without changing this ledger.

## Requirements

### Requirement: Final retained funded consumption
Commission SHALL equal original funded consumption minus actual funded returns, using immutable purchase eligibility and rate. Completed and Closed orders SHALL follow the same rule regardless of publication count. Grants and recharge actions SHALL not generate commission. Renminbi fen SHALL be exact integers rounded half up: `(net funded points × rate bps + 500) / 1000`, integer division.

#### Scenario: Closure without publication
- **WHEN** an eligible order spends 800 funded and 200 granted points, closes without publication, and finally returns 200 funded and 50 granted points
- **AND** the captured rate is 10%
- **THEN** it records 600 fen commission after final settlement
- **AND** no publication-count multiplier applies

#### Scenario: Zero and nonparticipation
- **WHEN** a participating order has zero rate, all-granted consumption or full return
- **THEN** an explainable zero-value entry is recorded
- **WHEN** commission was disabled or its agent inactive at purchase
- **THEN** it does not participate
- **AND** later activation does not rewrite its eligibility

### Requirement: Derived estimates and final entries
Estimates SHALL use current whole-order agreed returns through Commerce's shared source allocation, without another writable money balance. Formal commission SHALL require Commerce's immutable final settlement receipt; it SHALL NOT reimplement the 72-hour or ticket eligibility rules.

#### Scenario: Independent recovery
- **WHEN** final point settlement commits but commission accrual fails
- **THEN** customer points remain settled and persisted facts make commission retryable
- **AND** concurrency, replay and process restart create at most one entry per order
- **AND** database constraints reject altered source/rate/amount and ledger mutation

### Requirement: Scoped earnings queries
Active agents SHALL read only estimates and entries attributed to them at purchase. Administrators SHALL query all agents, orders and commission states. Summaries SHALL reflect the filter rather than only the visible page; pagination SHALL bind to actor and filters. Money SHALL cross the API as decimal integer strings.

#### Scenario: Historical rights after reassignment
- **WHEN** the customer transfers or the captured agent is later suspended
- **THEN** original commission rights survive and system accrual continues
- **AND** an inactive agent cannot query the ledger
- **AND** commission detail does not grant contact, brand report or support-ticket access

#### Scenario: Simple presentation
- **WHEN** an authorized viewer opens earnings
- **THEN** the page shows Estimated and Booked renminbi, with order number/title, original granted/funded consumption, return split, eligible funded points and captured rate
- **AND** forecast returns are distinguished from confirmed actual returns
- **AND** administrators can follow factual order/point-ledger links with renewed permission checks
- **AND** withdrawable availability and payout lifecycle remain owned by Agency Withdrawal

### Requirement: Controlled execution
Accrual SHALL run in the existing Worker with `AGENCY_COMMISSION_ENABLED=false` by default. Each scan SHALL be bounded and advance past individual failures; restart SHALL rediscover missing entries. Disabling stops new accrual without deleting accepted entries. Development data requires no backfill or parallel legacy path.

#### Scenario: Worker failure
- **WHEN** a worker dies before commission commit
- **THEN** restart discovers and commits the missing entry once
- **WHEN** it restarts after commit
- **THEN** it does not duplicate the entry
