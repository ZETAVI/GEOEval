# Identity and Access internal production pilot delta

## ADDED Requirements

### Requirement: Internal demo access keeps the normal Identity lifecycle

The internal production pilot MAY use deterministic Challenge delivery and
disabled human verification only when an explicit demo mode and an outer HTTP
access gate are both active. It SHALL continue to use the normal Challenge,
Session, role, expiry, rate-limit and audit contracts.

#### Scenario: A user enters the protected internal demo

- **WHEN** Nginx Basic Authentication admits the request and the API is
  explicitly configured for internal demo mode
- **THEN** the existing deterministic Challenge adapter may issue a short-lived
  Challenge without CAPTCHA or SMS delivery
- **AND** the Web may immediately complete the returned demonstration code
- **AND** account creation, existing-account checks, Sessions, role redirects,
  expiry, revocation and audit remain owned by Identity.

#### Scenario: The outer gate or explicit mode is absent

- **WHEN** the application is configured as ordinary production
- **THEN** deterministic Challenge delivery and disabled human verification are
  rejected before serving requests
- **AND** there is no direct Session creation, account impersonation or SQL
  shortcut.

#### Scenario: A payment provider sends a callback

- **WHEN** Alipay or WeChat calls its exact notification route
- **THEN** the outer Basic Auth gate is disabled only for that route
- **AND** the payment owner's provider authentication remains required
- **AND** no broader Web or API path becomes public.
