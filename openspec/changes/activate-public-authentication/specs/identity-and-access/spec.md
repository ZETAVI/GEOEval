# Identity and Access delta: public authentication activation

## MODIFIED requirements

### Requirement: Challenge delivery remains an adapter boundary

Identity and Access SHALL own Challenge lifecycle, human-verification policy,
aggregate and per-mobile abuse controls, code generation and Session creation
while the delivery adapter owns only message transport.

#### Scenario: Public production requests a Challenge

- **WHEN** an anonymous Web/H5 visitor requests a login or registration Challenge
- **THEN** the edge applies its coarse source-IP throttle
- **AND** Identity rejects an exhausted day or month budget before sending SMS
- **AND** one opaque freshly acquired formal CAPTCHA value is verified against
  the server-configured scene
- **AND** the authoritative budget check and Challenge persistence commit
  atomically before delivery
- **AND** the cryptographically secure code remains represented only by its
  keyed digest.

#### Scenario: Aggregate Challenge budget is exhausted

- **WHEN** the Asia/Shanghai day or month has reached its configured maximum
- **THEN** no new Challenge or SMS submission occurs
- **AND** the caller receives a generic temporary-unavailable result without
  usage counts or provider details
- **AND** existing Sessions and previously issued Challenges retain their
  lifecycle.

#### Scenario: Aggregate usage approaches its limit

- **WHEN** a successful persisted attempt reaches the configured warning
  threshold
- **THEN** the system emits a bounded operational warning with period and count
- **AND** it contains no mobile, code, CAPTCHA value, credential or raw
  device/behavior data.

### Requirement: Public entry is protected by product authentication

The public product SHALL rely on Identity authentication and role authorization
rather than a shared outer Demo password.

#### Scenario: An anonymous visitor opens the product

- **WHEN** the visitor opens the homepage, entry page or authentication privacy
  notice
- **THEN** those pages are available without shared Basic Auth credentials
- **AND** registration creates only the existing terminal-customer role
- **AND** protected product APIs still independently require a valid Session and
  role.

#### Scenario: A production visitor probes non-product surfaces

- **WHEN** the visitor requests Swagger or Foundation validation HTTP/Web routes
- **THEN** those routes are not registered or return not found
- **AND** no validation record, queue state or API catalogue is disclosed.

#### Scenario: The visitor requests a verification code

- **WHEN** the visitor is about to trigger CAPTCHA and SMS processing
- **THEN** the entry presents a readily accessible notice covering processor
  identity/contact, purpose, data categories, retention and rights path
- **AND** it identifies Alibaba CAPTCHA/SMS processing
- **AND** GEOEval does not persist Alibaba raw device fingerprints or behavior
  trajectories.

### Requirement: Production provider credentials are narrowly usable

#### Scenario: The runtime invokes authentication providers

- **WHEN** the dedicated RAM identity calls CAPTCHA or SMS from the fixed
  production egress
- **THEN** exactly the approved two actions are allowed
- **AND** the same credential from an outside source is denied
- **AND** superseded credentials are revoked after replacement verification.
