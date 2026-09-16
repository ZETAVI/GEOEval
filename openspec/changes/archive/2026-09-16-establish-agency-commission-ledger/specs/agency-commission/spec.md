## ADDED Requirements

### Requirement: Commission on final retained funded consumption
A participating order SHALL use captured agency eligibility/rate and original funded spending minus actual funded returns. Completed or Closed orders with final settlement SHALL follow the same rule regardless of publication count. Commission SHALL use renminbi fen rounded half up; grants and recharge actions are excluded.

#### Scenario: Sources and zero
- WHEN an order spends 800 funded and 200 granted points, returns 200 funded and 50 granted, with rate 10%
- THEN the final commission is 600 fen
- WHEN participating at zero rate, full return or all granted spending
- THEN a zero-value final commission record remains explainable
- WHEN commission was disabled or the agent inactive at purchase
- THEN the order does not participate.

### Requirement: Derived estimate and once-only final entry
Estimates SHALL follow the current agreed return using Commerce's source allocation. Formal entry SHALL require the final settlement and reference immutable source facts. Each order SHALL have at most one entry. Duplicates/crashes recover without additional credit or changing customer points.

### Requirement: Owned views without renewed customer access
An active agent SHALL read only its purchase-attributed estimates and entries, including history after customer reassignment. Administrators SHALL read all commissions. Historical commission access SHALL NOT grant current customer contact/report/ticket access. UI SHALL distinguish estimates from booked renminbi without presenting withdrawals as implemented.
