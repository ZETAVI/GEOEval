## MODIFIED Requirements

### Requirement: Stable fulfilment end and one customer appeal

Delivery SHALL record the first transition to Completed, or the first closure after stopping remaining publishing. The original end time SHALL survive later result corrections, replies and financial settlement. A customer SHALL have at most one successfully admitted new appeal during the continuous 72 hours after that end; ongoing admitted tickets may continue beyond it.

#### Scenario: End and appeal race
- **WHEN** completion/closure and appeal submission overlap
- **THEN** the locked order and actual server admission time determine one consistent stage and deadline
- **AND** a duplicate accepted request recovers its ticket without consuming another opportunity
- **AND** admission at or after the deadline cannot create new order-appeal eligibility

### Requirement: One revisable agreed return total

Operations SHALL maintain one whole-point total on the original order, with reason and history. Changing it SHALL replace the total, not accumulate separate refunds. It SHALL not cause immediate point credit. A positive termination SHALL end publishing before the eventual financial settlement instead of waiting for credit to permit closure.

#### Scenario: Several negotiations
- **WHEN** the agreed total changes from 100 to 150 points before settlement
- **THEN** the eventual return uses the final confirmed 150 points once
- **AND** the customer-facing pending text remains "已约定退回 150 积分，待订单结束结算"

#### Scenario: Existing agreement/admin-credit flow is retired
- **WHEN** the new order settlement capability is active
- **THEN** order and ticket handling use one agreed-total path
- **AND** the old separate administrator credit action cannot bypass final settlement eligibility
- **AND** no second legacy credit or historical backfill path is retained for development data
