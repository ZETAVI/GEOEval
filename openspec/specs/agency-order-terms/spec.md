# Agency Order Terms Specification

## Purpose

Own administrator commission configuration and the immutable commercial facts captured by new purchases. Commission ledger, 72-hour settlement and withdrawals remain future activation.

## Requirements

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

### Requirement: Narrow ownership and private history

Agency SHALL own settings and supply transaction-bound purchase terms through an Identity-owned account reader. Commerce SHALL own the immutable one-to-one order snapshot and retain original spending/return origins. Settings and snapshots SHALL not duplicate customer wallets, fulfilment states or contact data. An inactive agent's retained relationship SHALL not grant new-order commission or customer access.

#### Scenario: Concurrent first configuration
- **WHEN** the first settings write competes with a purchase
- **THEN** the snapshot consistently captures either default disabled or the committed settings
- **AND** parallel purchases may share agent read locks without a global serial queue

#### Scenario: Disable and replay
- **WHEN** an administrator disables commission
- **THEN** the stored rate is retained and future orders do not participate
- **WHEN** an earlier successful settings request is replayed
- **THEN** its original result is recovered without overwriting newer settings or adding an audit
