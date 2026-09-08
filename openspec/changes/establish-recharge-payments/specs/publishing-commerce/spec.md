# Publishing Commerce recharge delta (proposed)

## ADDED Requirements

### Requirement: One internal account capability serves money operations

Publishing Commerce SHALL retain ownership of point balance, source allocation, ordered immutable changes and credit-capacity reservation. Consumers SHALL use owner-provided operations instead of updating private account persistence.

#### Scenario: Points are assembled for Recharge or its worker

- **WHEN** a consumer needs only the point-account capability
- **THEN** it can be composed without article, media or customer HTTP controllers
- **AND** existing purchase, administrator adjustment and accepted delivery admission contracts remain valid
- **AND** database transaction clients remain private to participating infrastructure adapters.

### Requirement: Recharge reserves a realizable credit

#### Scenario: A recharge is created while another point operation runs

- **WHEN** a recharge's future credit capacity is reserved under the account lock
- **THEN** the reservation has a unique account/business reference and holds its funded quantity and future sequence capacity
- **AND** grant, purchase, recharge and accepted order-return operations follow the same checked bounds and lock order
- **AND** the reservation is excluded from customer available balance and cannot be spent or used to reserve publishing inventory.

#### Scenario: Payment succeeds or safe closure is confirmed

- **WHEN** Recharge supplies a verified matched settlement or safe close command through its transaction adapter
- **THEN** Commerce converts that reservation to one funded change or releases it exactly once in the same transaction as the corresponding recharge state
- **AND** a callback replay cannot repeat either effect.

### Requirement: Business credit identity remains truthful

#### Scenario: Recharge and order return both increase points

- **WHEN** either operation credits the same account
- **THEN** recharge has its dedicated source relation and funded origin, while order return follows its original consumption and dedicated return relation
- **AND** neither uses the administrator gift endpoint
- **AND** ledger account/business composite ownership and uniqueness are enforced
- **AND** customer-initiated intent and system payment confirmation remain distinguishable in internal audit.

### Requirement: Preserve unresolved obligations under constraints

#### Scenario: A point return or exceptional paid recharge cannot safely settle

- **WHEN** an integrity constraint prevents immediate credit
- **THEN** no partial balance, ledger or successful business state is written
- **AND** the obligation remains visible for authorized recovery
- **AND** another recharge's reserved credit capacity is not consumed to conceal the failure.
