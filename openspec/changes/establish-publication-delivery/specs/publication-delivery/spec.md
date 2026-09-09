# Proposed Publication Delivery behavior delta

Approved target delta. Admission, responsibility and normal results are implemented
and reconciled in the branch's `openspec/specs/publication-delivery/spec.md`;
exceptions and settlement below remain unactivated. Integration is a separate gate.

## ADDED Requirements

### Requirement: Every purchased order has one operational responsibility boundary

The system SHALL reliably admit each new and historical paid order without altering its purchased article, scope, quantity or price.

#### Scenario: A paid order becomes claimable

- **WHEN** purchase succeeds or a historical paid order is admitted
- **THEN** one claimable order exists with the original immutable agreement
- **AND** retries cannot create another receipt, charge or publication result.

#### Scenario: Operators compete for responsibility

- **WHEN** two operations users claim the same order
- **THEN** only one becomes current assignee
- **AND** an unstarted order may be returned with a reason; reassignment after work starts requires administrator action/history
- **AND** a former assignee cannot continue writing using an old page.

### Requirement: Publication progress counts actual results against the purchase

Delivery SHALL count at most one valid publication result per purchased quantity unit, without eagerly materializing all units.

#### Scenario: Operations handles a work item

- **WHEN** the responsible operator prepares or reports one item
- **THEN** preparation uses the frozen purchased article and explicit Mock/manual capability, not an invented real Writer or publication success
- **AND** paginated work remains bounded even for the existing maximum supported quantity
- **AND** recording valid platform/title/URL/time produces one customer-visible result without exposing internal publishing accounts or requiring a catalog resource match.

#### Scenario: Operations corrects a result or repeats a save

- **WHEN** a result is corrected with reason or the same operation repeats
- **THEN** original history remains and the result is not counted twice
- **AND** correction cannot silently change a precise purchased target or reopen ended service.

### Requirement: Agreed replacement does not rewrite the paid promise

Delivery SHALL distinguish routine random allocation from customer-agreed precise replacement.

#### Scenario: A random placement becomes unavailable

- **WHEN** another placement within the purchased scope can meet the promise
- **THEN** operations may continue normal allocation without a customer application
- **BUT WHEN** the overall promise cannot be met
- **THEN** operations may record a manually agreed termination and point return.

#### Scenario: A precise target is replaced with compensation

- **WHEN** operations records an offline agreed original-to-replacement target and optional whole-point compensation
- **THEN** original purchase remains unchanged and operations may continue without waiting for administrator payment
- **AND** no automatic amount calculation, surcharge, customer application or multi-level approval is introduced.

### Requirement: Completed publication and unpaid compensation remain independently visible

The customer SHALL see one of the existing five fulfilment states and separately see any agreed point return and whether it has actually been credited.

#### Scenario: All publications complete before compensation is paid

- **WHEN** all purchased publications have succeeded directly or through agreed replacement
- **THEN** the order is Completed with full actual progress, even if agreed compensation is unpaid
- **AND** the customer sees that agreed return as pending, never as already credited
- **AND** administrator outstanding-return views include every positive saved unpaid agreement before and after Completed; execution becomes eligible only when retained work has finished or remaining work was stopped, without a separate submission/finalization workflow
- **AND** later successful payment changes only return information, not Completed to Closed.

#### Scenario: Agreed remaining work is terminated with a positive return

- **WHEN** operations explicitly stops all remaining work after agreement
- **THEN** ordinary new work on that remainder is denied while existing results and original quantity remain
- **AND** pending settlement remains visible without pretending credit occurred
- **WHEN** the administrator successfully executes the agreed terminating return
- **THEN** the order becomes Closed and shows actual published progress and actual returned points
- **AND** returned points do not count as successful publications.

#### Scenario: Responsible operations closes agreed remaining work at zero

- **WHEN** the current responsible operator explicitly saves a negotiated termination with zero points against the current revision
- **THEN** remaining work stops and the order becomes Closed in the same transaction, with its reason, actor, history and existing published results retained
- **AND** no administrator confirmation, point ledger entry or unpaid-return task is created
- **AND** a new form defaults to zero but editing an existing agreement preserves its amount until explicitly changed; Completed is not converted into Closed
- **AND** exact replay returns the same receipt, stale/non-assignee writes fail, and failure to persist the audit rolls back closure.

#### Scenario: Only some remaining work should continue

- **WHEN** the agreement stops some items but retains other work
- **THEN** the retained work is completed before a consolidated terminal settlement
- **AND** the first release does not permit repeated in-progress returns, reopening or additional post-settlement returns.

#### Scenario: Publication takes longer than expected

- **WHEN** the seven-calendar-day expected period passes
- **THEN** delay is shown while actual state is retained
- **AND** time alone cannot refund, close or mark publication complete.

### Requirement: No unapproved customer or financial authority

The system SHALL preserve Identity ownership and the current absence of self-service refund, cash refund and real-payment activation.

#### Scenario: Customer or non-assignee attempts internal actions

- **WHEN** a caller attempts another customer's order, assignment, replacement or point-return mutation without authority
- **THEN** it is denied without mutation or internal-data exposure
- **AND** customers only inspect their safe order/results/return information and existing support entry.
