## MODIFIED Requirements

### Requirement: Attempt and delivery separation
AI Execution SHALL distinguish direct attempts from delegated Parser attempts.
The existing direct ambiguity policy SHALL remain unchanged. Delegated
attempts SHALL persist their transport and recover the same center key/task
without using that ambiguity timer as authority for a new physical call.

#### Scenario: A delegated attempt outlives the direct ambiguity timer
- **WHEN** a STARTED EXECUTION_CENTER attempt is recovered after the old direct timeout
- **THEN** its original receipt is consulted and the attempt is not relabeled retryable
- **AND** the default DIRECT history remains readable and behavior-compatible

## ADDED Requirements

### Requirement: Durable delegated Parser execution
The system SHALL retain GEO-owned native request preparation and response validation while delegating one authorized Parser call to execution.v1. New delegated execution SHALL be opt-in, and each attempt SHALL retain its original transport across recovery.

#### Scenario: Remote acceptance releases product work
- **WHEN** the center accepts the persisted Parser request
- **THEN** the submission Outbox completes while the business attempt remains STARTED
- **AND** waiting does not occupy a product Worker or the relay's first hundred records

#### Scenario: Early or replayed completion
- **WHEN** completion arrives before ACK persistence or is replayed after restart
- **THEN** stable callerRequestRef identifies the receipt
- **AND** inbox, cursor and one resume Outbox commit together
- **AND** existing GEO normalization and semantic acceptance execute without a second physical call

#### Scenario: Ambiguous dispatch and rollback
- **WHEN** dispatch acknowledgement is lost or a delegated attempt remains unknown
- **THEN** recovery retains the original key and task
- **AND** no timeout or disabled gate authorizes switching to a new direct Provider call
- **AND** historical DIRECT attempts remain readable
