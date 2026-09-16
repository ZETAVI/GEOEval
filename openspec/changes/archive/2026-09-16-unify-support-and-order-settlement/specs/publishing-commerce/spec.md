## MODIFIED Requirements

### Requirement: Automatic once-only final order settlement

Commerce SHALL return points automatically only after fulfilment has ended, its continuous 72-hour window has elapsed, all relevant admitted issues are resolved and the final agreed total is confirmed. Operators establish the agreement; no last administrator/operator credit click is required. The original consumption, granted/funded restoration and reserved-capacity constraints SHALL remain authoritative.

#### Scenario: Deadline elapsed with a pending issue
- **WHEN** an order passed its deadline but an eligible issue remains unresolved
- **THEN** final settlement waits
- **AND** the unchanged customer wording is "已约定退回 X 积分，待订单结束结算"

#### Scenario: Positive settlement succeeds
- **WHEN** eligibility is confirmed under the order transaction
- **THEN** one actual return and one final settlement receipt commit atomically
- **AND** the customer wording changes to "已退回 X 积分"
- **AND** system execution and the operator's agreement are separately traceable without pretending a human clicked

#### Scenario: Zero, duplicate, crash or insufficient capacity
- **WHEN** the final agreed amount is zero
- **THEN** a final settlement receipt exists without a zero-value point ledger entry
- **WHEN** execution repeats or resumes after a process failure
- **THEN** existing success is recovered and no second return occurs
- **WHEN** capacity or database failure prevents credit
- **THEN** settlement is not completed and no commission consumer can treat it as final

### Requirement: Final facts are the commission handoff

Later commission processing SHALL consume the final settlement and immutable order attribution/rate, excluding returned/granted consumption. No customer balance, recharge-page state or unresolved promise SHALL stand in for settled consumption. This change SHALL NOT create commission balances or withdrawals.
