## ADDED Requirements

### Requirement: Administrator commission settings
Administrators SHALL maintain an agent commission switch and fixed rate. Missing settings mean disabled. Enabled zero rate SHALL remain distinct from disabled. Acquisition, service and purchase SHALL not require commission enablement. Disabling retains the rate. Successful changes SHALL be version checked, audited and recoverable by request identity.

#### Scenario: Enable zero commission
- **WHEN** an administrator enables commission with a zero rate
- **THEN** future eligible orders participate in commission with zero money
- **AND** disabling prevents participation without erasing the configured rate

### Requirement: Immutable purchase terms
Successful new purchases SHALL capture current attribution and applicable commission terms in the same transaction as order, debit and delivery admission. Later changes SHALL affect only future purchases. Customer responses SHALL not expose the snapshot.

#### Scenario: Suspension and reactivation
- **WHEN** an agent is suspended
- **THEN** its customers retain attribution and continue purchasing and fulfilment
- **AND** new orders during suspension do not participate in commission
- **AND** orders successfully created before suspension preserve their terms
- **WHEN** the agent is reactivated
- **THEN** only still-attributed customers resume agent service and future eligible orders participate
- **AND** suspension-period orders are not retroactively commissioned

#### Scenario: Purchase competes with migration or configuration
- **WHEN** purchase overlaps customer reassignment, agent suspension or a rate change
- **THEN** its captured facts correspond to a consistent serial result
- **AND** successful retries return the original order without new debit
- **AND** failure rolls back every purchase effect

#### Scenario: Legacy order
- **WHEN** a preexisting order lacks agency terms
- **THEN** the system does not infer historical attribution or rate from current settings
- **AND** no extra customer-facing status is added
