# Identity and Access delta: controlled demo SMS routing

## ADDED requirements

### Requirement: Temporary delivery routing never changes account authority

#### Scenario: An existing demo account requests a code

- **GIVEN** an exact demo-mobile allowlist, one recipient mobile and an
  unexpired deadline are configured in the API
- **WHEN** an allowlisted mobile passes the normal CAPTCHA and Challenge limits
- **THEN** one real SMS is submitted to the configured recipient
- **AND** the Challenge remains bound to the entered demo mobile and can only
  authenticate its existing active account with the correct one-time code.

#### Scenario: A normal or absent account requests a code

- **WHEN** a non-allowlisted mobile requests a Challenge
- **THEN** the SMS is submitted to that same mobile under normal policy
- **BUT WHEN** an allowlisted demo mobile has no existing account
- **THEN** a correctly completed Challenge cannot create an account.

#### Scenario: Routing is disabled or expires

- **WHEN** the routing configuration is absent or its deadline passes
- **THEN** no future SMS is redirected
- **AND** prior account, Challenge and Session facts are not rewritten.
