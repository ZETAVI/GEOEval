# Support Specification

### Requirement: Unified support with verified business references

Support SHALL own customer-visible tickets and conversation for publishing orders, recharge questions and general requests, without owning payment or point balances. Recharge questions SHALL use a copied recharge ID through the common support entry, without a separate recharge-detail ticket action.

#### Scenario: Business reference is entered
- **WHEN** a customer supplies an order or recharge ID
- **THEN** the corresponding owner verifies it belongs to that customer before accepting the business reference
- **AND** an unmatched or other customer's ID reveals no private business data
- **AND** payment success and point recovery remain Recharge decisions

### Requirement: Minimal responsibility and conversation

Order tickets SHALL follow current order operations responsibility. Ordinary/recharge tickets SHALL be claimable from a pool by one eligible operations account. Customers SHALL see only Processing or Resolved; conversations and automatic audit SHALL not require duplicate staff explanations.

#### Scenario: Concurrent claim or order reassignment
- **WHEN** operations compete to claim an ordinary ticket
- **THEN** one succeeds and retries cannot steal the ticket
- **WHEN** an order is reassigned
- **THEN** its ticket processing authority follows the current order without a copied assignee

#### Scenario: Operator starts customer communication
- **WHEN** an operator needs to explain or negotiate an order exception
- **THEN** the operator can start or continue a ticket and record a telephone discussion in the same conversation
- **AND** this does not impersonate a customer appeal or consume the customer's one post-completion opportunity

### Requirement: Handling means agreement is complete

Resolving a ticket SHALL mean the issue and negotiation are handled; a promised point return may still await final order settlement. Outstanding required work SHALL remain Processing. Resolving or repeating a ticket SHALL not reset the order appeal window or restore a consumed appeal opportunity.

#### Scenario: Agreement reached with a planned return
- **WHEN** operations resolves the issue and confirms a planned order return
- **THEN** the customer sees the outcome in the same ticket
- **AND** no points are credited by the resolution action
- **AND** the original order and ticket have authorized links in both directions

### Requirement: Bounded support context

Recharge questions SHALL continue to use the copied ID in the common Support form. This activation SHALL NOT add a recharge summary to the ticket or give operations access to payment administration. Order tickets and original orders SHALL have authorized bidirectional links; attribution alone grants agents no ticket access. Support does not infer relationships between recharge and publishing consumption.

### Requirement: Operator and account boundaries

Reads, commands and successful-request recovery SHALL enforce current account status and current responsibility. Ordinary tickets have a single claimable operator; order tickets do not persist a second assignee. A current unresolved order ticket is continued rather than duplicated. Events and successful admission are durable and append-only; a failed submission does not consume the customer's post-end opportunity.
