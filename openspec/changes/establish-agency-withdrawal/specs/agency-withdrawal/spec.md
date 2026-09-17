## ADDED Requirements

### Requirement: Derived withdrawable commission

Agency Withdrawal SHALL derive integer-fen balances from immutable booked commission and accepted withdrawal requests without maintaining another commission wallet. Pending commission and zero-value entries SHALL not add withdrawable money.

#### Scenario: Amounts move through the lifecycle

- **GIVEN** an agent has 10000 fen booked commission and no accepted withdrawal
- **WHEN** the agent submits 6000 fen
- **THEN** available is 4000 and processing is 6000
- **WHEN** that request completes
- **THEN** processing becomes zero, cumulative withdrawn becomes 6000, and available remains 4000

### Requirement: One current protected payout profile

Each active agent SHALL maintain at most one current payout profile with recipient type, account name, encrypted bank-account number, bank name, opening branch and contact mobile. Ordinary reads SHALL return only a masked account number. Every request SHALL capture an immutable snapshot and the profile SHALL record the accepted sensitive-data notice version and server time.

#### Scenario: Profile changes after submission

- **WHEN** an agent changes current payout data after submitting a request
- **THEN** the accepted request retains its original snapshot
- **AND** the agent re-enters a full account number rather than retrieving stored plaintext
- **AND** only a later new request uses the changed profile

### Requirement: Bounded withdrawal lifecycle

An active agent SHALL submit at most one unfinished request when amount is at least the configured minimum and no more than current available commission. The immutable request SHALL use `PENDING_REVIEW`, `PAYING`, `COMPLETED`, `REJECTED`, `PAYMENT_FAILED`, or `WITHDRAWN` with only the accepted transitions.

#### Scenario: Agent withdraws a pending request

- **WHEN** the owner withdraws a `PENDING_REVIEW` request
- **THEN** it becomes terminal `WITHDRAWN` and releases its amount
- **AND** it cannot be reopened, edited or resubmitted
- **AND** any later submission creates a new request with a new identity and current payout snapshot

#### Scenario: Payment result is unknown

- **WHEN** an approved request is `PAYING` and the external bank result is not known
- **THEN** it stays `PAYING` and remains reserved
- **AND** timeout, refresh, retry or a second submission cannot release or reuse the amount

### Requirement: Administrator manual processing

Administrators SHALL approve pending requests, reject them with a reason, complete paying requests with a bank transaction reference, or mark a definite payment failure with a reason. Amount, snapshot, agent and server timestamps SHALL not be operator-editable. Completion amount SHALL equal requested amount.

#### Scenario: Complete offline transfer

- **WHEN** an administrator confirms that the exact requested amount was transferred and supplies a bank reference
- **THEN** the system records `COMPLETED`, actor and server confirmation time in one transaction
- **AND** an optional external paid time remains internal and is never substituted by the server time
- **AND** no transfer receipt file is required or stored

### Requirement: Permission, suspension and sensitive access

Only an active AGENT SHALL manage its profile and own requests. Only an active ADMINISTRATOR SHALL query all requests or execute processing commands. An inactive agent SHALL have no withdrawal read or command access, while administrators may finish its already accepted requests. Full bank-account access SHALL require an explicit administrator command and append an audit without returning plaintext elsewhere.

#### Scenario: Agent becomes inactive during payment

- **WHEN** the agent becomes inactive after a request enters `PAYING`
- **THEN** the request stays reserved and the agent loses access
- **AND** an administrator may complete it or record definite payment failure
- **AND** reactivation restores access to history and remaining derived balance

### Requirement: Idempotent commands and auditable recovery

Every accepted create, profile/policy update, transition, withdrawal and sensitive reveal SHALL use current authority, expected revision where applicable, a bounded request identity and a sanitized append-only audit. Replay with the same intent SHALL recover the original result; changed intent or stale state SHALL fail atomically.

#### Scenario: Concurrent submissions

- **WHEN** two requests submit against the same agent and available amount
- **THEN** at most one unfinished request commits
- **AND** the rejected transaction leaves no request, reservation, audit or notification obligation

### Requirement: Minimal result notifications and controlled activation

Withdrawal SHALL append idempotent result events for `COMPLETED`, `REJECTED` and `PAYMENT_FAILED`; Notification SHALL materialize them for the agent without payout data, bank reference or internal note. The capability SHALL remain disabled by default and require configured encryption and minimum policy before accepting writes.

#### Scenario: Notification delivery fails

- **WHEN** an accepted result event cannot be materialized immediately
- **THEN** the withdrawal result remains committed
- **AND** replay or restart creates at most one account-scoped notice

