# Identity and Access delta

## ADDED Requirements

### Requirement: Human verification gates mobile Challenge creation

Identity and Access SHALL require server-verified human-verification evidence
before a production login or registration Challenge can be created.

#### Scenario: A browser requests a Challenge

- **WHEN** a supported Web/H5 client requests a mobile Challenge
- **THEN** it submits one opaque, freshly acquired CAPTCHA verification value
- **AND** the server verifies that value against its configured fixed scene
  before persisting or delivering a Challenge
- **AND** the client result alone never grants permission to send SMS.

#### Scenario: Verification is missing, invalid, rejected or replayed

- **WHEN** the verification value is absent or malformed while the gate is
  enabled, or Alibaba returns a normal denial, replay or scene mismatch
- **THEN** Identity returns a bounded input or access failure
- **AND** creates no Challenge and sends no SMS
- **AND** does not expose the provider's risk details.

#### Scenario: Verification infrastructure is unavailable

- **WHEN** a syntactically valid value cannot be checked because the provider
  invocation has a network, DNS, timeout or server-availability failure
- **THEN** the configured application policy either fails closed or permits only
  its finite constrained degradation budget
- **AND** local mobile/entry/cost controls and the stop switch remain effective
- **AND** exhaustion of the budget automatically restores fail-closed behavior.

#### Scenario: A configuration or account error prevents verification

- **WHEN** credentials, permissions, account state, endpoint/region or request
  configuration is invalid
- **THEN** Identity fails closed and reports one operator-observable category
- **AND** never treats the error as an availability degradation.

### Requirement: Real Challenge codes remain secret and provider-independent

Identity and Access SHALL generate real Challenge codes with a cryptographically
secure generator and SHALL keep code generation independent of message
transport.

#### Scenario: Real authentication issues a code

- **WHEN** real Challenge delivery is selected
- **THEN** Identity generates one six-digit code using a cryptographically secure
  source
- **AND** stores only the existing keyed digest
- **AND** never includes the plaintext code in a response, log or durable
  provider-observation record.

#### Scenario: Local or test authentication issues a code

- **WHEN** deterministic generation and delivery are explicitly selected outside
  production
- **THEN** the existing fixed development code may be returned
- **AND** all Challenge lifecycle, request-rate and consumption rules remain the
  same as real delivery.

### Requirement: Authentication Challenge delivery has explicit external outcomes

Identity and Access SHALL distinguish provider acceptance, explicit rejection
and submission-unknown outcomes without treating carrier delivery as identity
truth.

#### Scenario: The SMS provider accepts submission

- **WHEN** Alibaba Cloud returns `Code=OK`
- **THEN** Identity returns the persisted Challenge to the client
- **AND** records only bounded redacted submission evidence
- **AND** does not claim that the carrier delivered the SMS or the user logged
  in.

#### Scenario: The provider explicitly rejects submission

- **WHEN** Alibaba Cloud returns a credential, permission, qualification,
  signature, template, balance, rate-limit or other explicit failure
- **THEN** Identity returns a recoverable service failure
- **AND** does not retry the non-idempotent SendSms request automatically
- **AND** lets the already-persisted short-lived Challenge expire unused.

#### Scenario: The submission outcome is unknown

- **WHEN** the SMS call times out or loses its response after the provider may
  have received the request
- **THEN** Identity returns the persisted Challenge and asks the user to wait
- **AND** does not automatically submit another SMS
- **AND** a later retry must pass the normal resend interval and all gates.

#### Scenario: An operator stops new authentication messages

- **WHEN** the stop-new-Challenge control is closed for cost, abuse or provider
  recovery
- **THEN** Identity creates and sends no new Challenge
- **AND** existing Sessions and previously issued Challenges retain their
  existing lifecycle.

## MODIFIED Requirements

### Requirement: Challenge delivery remains an adapter boundary

Identity and Access SHALL own Challenge lifecycle, human-verification policy,
code generation and abuse controls while a delivery adapter owns only message
transport.

#### Scenario: Production selects Challenge delivery

- **WHEN** production authentication is configured
- **THEN** deterministic generation/delivery and disabled human verification are
  rejected
- **AND** the real adapter requires explicit provider identifiers and
  deployment-managed credentials
- **AND** signing, template approval, paid tests, formal CAPTCHA mode and
  production activation retain separate external gates.

#### Scenario: The selected provider is unavailable or removed

- **WHEN** the Alibaba adapter is disabled, rolled back or deleted
- **THEN** Account, Challenge and Session semantics remain owned by Identity
- **AND** local/test deterministic behavior remains usable outside production
- **AND** no generic provider registry or automatic failover is required.

