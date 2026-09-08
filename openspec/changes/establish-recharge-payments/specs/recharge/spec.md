# Recharge delta (proposed)

## ADDED Requirements

### Requirement: Stable account-owned recharge intention

Recharge SHALL create a customer-owned order with frozen whole-yuan amount, CNY amount in fen, funded points at ten per yuan and immutable acquiring identity. The customer SHALL see Pending payment, Confirming, Recharge successful or Closed.

#### Scenario: Duplicate create or unknown response

- **WHEN** the same account request key and normalized amount/method repeat
- **THEN** the same recharge and merchant order identity are recovered
- **AND** different content under that key conflicts without another payment attempt
- **AND** a client timeout neither closes the order nor replaces its merchant number.

#### Scenario: Customer moves through recharge

- **WHEN** the customer enters recharge from publishing review and later succeeds
- **THEN** the saved publishing intent remains available
- **AND** current availability and price are checked again
- **AND** purchase requires fresh explicit confirmation; recharge reserves no publishing price or media.

### Requirement: Authenticated provider evidence and durable notification acceptance

The system SHALL authenticate provider-originated messages before business use, preserve a recoverable accepted observation before acknowledging delivery, and distinguish delivery acceptance from successful account credit.

#### Scenario: Valid notification is acknowledged then the process exits

- **WHEN** the notification is verified and durably accepted but settlement has not committed
- **THEN** the worker can recover it from PostgreSQL after restart without relying on Redis contents
- **AND** the recharge remains non-successful until its complete credit transaction commits.

#### Scenario: Forgery or business mismatch

- **WHEN** a signature, decryption or signed-message identity is invalid
- **THEN** no recharge or funded ledger success is produced
- **AND** a validly authenticated but unknown/mismatched business reference is retained as a restricted discrepancy rather than silently treated as a paid local order.

#### Scenario: Different provider result shapes

- **WHEN** a signed close response has no body or a notification has a provider notification ID
- **THEN** each retains its real protocol meaning
- **AND** neither is transformed into fabricated transaction amount, ID or payment time.

#### Scenario: Retransmission changes wire representation

- **WHEN** a newly authenticated delivery has the same notification identity and normalized payment facts but different encryption/signature metadata or JSON representation
- **THEN** the original immutable observation and recoverable processing state are reused
- **AND** raw-message digests remain tracing evidence rather than business equality
- **AND** changed merchant, transaction, order, amount or other payment facts cannot overwrite the original observation.

#### Scenario: Receipt is committed but acknowledgement is lost

- **WHEN** the receiver exits after the observation and its processing state commit but before an ACK reaches the provider
- **THEN** a retry resolves the existing receipt without creating a second processing obligation
- **AND** if that transaction instead rolls back, the receiver does not acknowledge durable acceptance.

#### Scenario: Order total differs from payer payment

- **WHEN** the authenticated provider response includes distinct order total and payer-total amounts
- **THEN** both amounts and their currencies remain distinct in the safe payment evidence
- **AND** frozen order matching uses the order total while later authorized financial consumers do not infer actual payment from credited points.

#### Scenario: Same notification identity contains different authenticated facts

- **WHEN** provider, merchant and notification ID match a receipt but the versioned canonical fact digest differs
- **THEN** the new immutable variant and a monotonic conflict marker commit before delivery is acknowledged
- **AND** the first observation is never overwritten, and the receipt is excluded from automatic pending scans
- **AND** acknowledgement does not settle the conflict or grant permission to credit.

#### Scenario: Notification reception outlives its response budget

- **WHEN** the receiver cannot confirm durable acceptance within its processing budget
- **THEN** it returns a retryable failure without claiming the database rolled back
- **AND** a later commit is safely discovered by duplicate acceptance and database scans without a persistent timestamp watermark.

#### Scenario: A pending scan becomes stale before settlement

- **WHEN** a receipt becomes conflicting after a worker's scan and before its credit transaction
- **THEN** settlement rechecks the receipt under the agreed lock order and does not credit from the stale scan
- **AND** acquiring a task lease never leaves a receipt/task lock held while later acquiring the point-account lock.

#### Scenario: Unresolvable notifications precede valid work

- **WHEN** authenticated but unknown or mismatched notifications cannot automatically settle
- **THEN** they retain a visible restricted review reason without being presented as paid
- **AND** they do not permanently prevent later valid receipts from being selected
- **AND** transient infrastructure failure remains distinguishable from a business discrepancy.

#### Scenario: Notification module is constructed before application activation

- **WHEN** the isolated module is tested with real Nest, Identity and PostgreSQL
- **THEN** only its notification handler bypasses session and CSRF checks; cryptographic authentication remains required
- **AND** missing raw bytes, unsupported encoding and excessive body size fail closed
- **AND** the current customer application has no payment route until explicit composition work is completed.

### Requirement: Transport failures preserve business uncertainty

The provider transport SHALL preserve the exact signed bytes, bound request/response resources and elapsed time, authenticate success responses before business parsing, and leave retry and terminal-state decisions to Recharge.

#### Scenario: Provider received a request but the response is lost

- **WHEN** a request times out, its response is truncated or its connection resets after possible dispatch
- **THEN** the adapter returns an unresolved result without an automatic second attempt
- **AND** Recharge preserves the original merchant order identity and existing MAY_EXIST obligation.

#### Scenario: Error or redirect cannot become a payment fact

- **WHEN** the provider returns a redirect, 401/403, 404, 429 or 5xx
- **THEN** redirect credentials are not forwarded and error content does not produce payment success or confirmed closure
- **AND** diagnostic categories may change alerting/backoff without releasing reservation.

#### Scenario: Response bytes or headers are ambiguous

- **WHEN** a successful response has duplicate required signature headers, altered bytes, an unknown key, invalid signature, excessive size or an exceeded whole-operation deadline
- **THEN** it yields no authenticated trade snapshot or close acknowledgement
- **AND** a verified 204 is accepted only by the corresponding close operation without fabricating JSON.

### Requirement: Once-only funded settlement

Recharge SHALL use one short local transaction with Commerce-owned account operations to match the immutable order and apply successful payment exactly once.

#### Scenario: Query and duplicate notifications race

- **WHEN** several authenticated observations identify the same successful recharge
- **THEN** one credit consumes its reservation, advances the account sequence and appends one dedicated funded ledger entry together with Recharge successful
- **AND** the external transaction cannot fund another order even after credential alias/key rotation
- **AND** a partial failure rolls back all settlement effects.

#### Scenario: Customer becomes inactive after creating a valid order

- **WHEN** an existing lawful payment obligation is confirmed after customer deactivation
- **THEN** it remains visible and recoverable for the original account
- **AND** new login/purchase/recharge permission is not restored by settlement
- **AND** the grant-only inactive-target rule is not silently used to discard received money; any explicit financial freeze keeps a visible unresolved obligation.

### Requirement: Cancellation respects external uncertainty

The system SHALL distinguish never-dispatched intent, an external order that may exist and confirmed external closure.

#### Scenario: Cancel wins before any dispatch claim

- **WHEN** cancellation atomically prevents the first dispatch claim
- **THEN** the local recharge may close and release its reservation without claiming a nonexistent provider close operation.

#### Scenario: Delayed dispatch races cancellation

- **WHEN** an executor has claimed sending rights and the response is unknown
- **THEN** cancellation prohibits new dispatch and schedules provider verification/close
- **AND** lease expiry, abort or one ORDER_NOT_EXIST observation cannot release the reservation
- **AND** a delayed successful payment still enters the same once-only settlement.

#### Scenario: Unknown outcome cannot automatically converge

- **WHEN** signed query/close evidence has not established a safe terminal outcome
- **THEN** the order and held exposure remain visible with last attempt, next action and operational ownership
- **AND** the system does not invent successful closure after an arbitrary retry count.

### Requirement: Web presentation is not payment authority

#### Scenario: Native scan or H5 return

- **WHEN** the browser displays a QR, returns from H5, reports completion or times out
- **THEN** it reads the account-owned local recharge status and may request bounded verification
- **AND** none of these client observations authorizes funded credit.

### Requirement: Stopping new payments preserves old obligations

#### Scenario: Recharge creation is disabled during an incident or rollback

- **WHEN** new recharge and new payment initiation are disabled
- **THEN** existing accepted notifications, provider query/close, once-only settlement and reconciliation continue with compatible schema and trusted credentials
- **AND** payment, reservation and ledger history are retained.
