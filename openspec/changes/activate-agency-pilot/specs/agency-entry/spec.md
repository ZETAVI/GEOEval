# Agency Entry delta: controlled production pilot

## MODIFIED requirements

### Requirement: Controlled activation and maintenance

`AGENCY_ACQUISITION_ENABLED` SHALL remain disabled by default in both API and
Web. A named production pilot MAY enable both after purchase-time agent/rate
snapshots are present and the product owner accepts the test scope. Activation
does not imply commission accrual or withdrawal activation.

#### Scenario: Controlled demo activation

- **GIVEN** an active demo agent and coordinated API/Web activation
- **WHEN** an administrator issues that agent's stable entry link
- **THEN** a new customer can follow the link into the uniform registration
  page, complete normal CAPTCHA/SMS/OTP and receive one durable attribution
- **AND** a public new customer remains unattributed, while an existing
  customer's relationship is unchanged
- **AND** no commission or payout is inferred from entry activation alone.

#### Scenario: Pilot is disabled again

- **WHEN** both entry flags are turned off
- **THEN** new entry resolution and source-bearing Challenges are rejected
- **AND** accepted account attribution, audit and order snapshots are retained.
