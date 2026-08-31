# Customer Entry Delta

## ADDED Requirements

### Requirement: Passwordless terminal-customer entry boundary

The product SHALL establish a terminal-customer account from a verified mobile
challenge, SHALL assign exactly the terminal-customer role through the public
entry, and SHALL use an opaque revocable session without exposing credential
material to the Web client.

#### Scenario: A direct customer enters for the first time

- **WHEN** a visitor completes the configured mobile challenge
- **THEN** the product creates one unattributed terminal-customer account when
  the normalized mobile number is not already registered
- **AND** creates an authenticated session for that account
- **AND** offers the optional first-brand step
- **AND** cannot create an operations, administrator, or agent role through this
  public flow

#### Scenario: A returning customer signs in

- **WHEN** an existing terminal customer completes a fresh valid challenge
- **THEN** the product creates a new revocable session for the existing account
- **AND** later ordinary entry opens My brands
- **AND** an expired, consumed, incorrect, or over-attempted challenge does not
  authenticate the request

### Requirement: Optional first brand and current-brand context

The product SHALL let an authenticated terminal customer continue without a
brand or maintain multiple account-owned brand profiles with at most one current
active brand.

#### Scenario: A customer skips the first brand

- **WHEN** a newly authenticated customer skips brand onboarding
- **THEN** My brands opens in an intentional no-brand state
- **AND** brand-independent navigation remains visible
- **AND** brand-dependent actions explain that a complete brand is required

#### Scenario: A customer saves a brand

- **WHEN** the customer creates or edits a brand profile
- **THEN** the saved record remains owned by that account
- **AND** its evaluation readiness is derived from the required basic fields
- **AND** its evaluation fingerprint changes only with normalized fields used
  for question generation, not contact-only edits
- **AND** the first created active brand becomes the current brand

#### Scenario: A customer switches brands

- **WHEN** the customer selects another account-owned active brand
- **THEN** that brand becomes the sole current brand for subsequent product
  reads and actions
- **AND** a customer cannot read, edit, or select a brand owned by another
  account

### Requirement: Responsive customer service home

The product SHALL present My brands inside the agreed terminal-customer shell
without fabricating diagnosis, optimization, or publishing data.

#### Scenario: A customer opens My brands

- **WHEN** an authenticated terminal customer uses a common desktop or mobile
  viewport
- **THEN** the page provides the shallow left navigation and current-brand
  utility context
- **AND** presents an intentional no-brand entry or real account-owned brand
  cards
- **AND** uses capability explanations for unavailable later modules rather
  than zero-valued statistics
- **AND** remains operable without a native mobile application

## Explicitly Deferred

- Production SMS provider selection and delivery evidence.
- Agent acquisition-channel attribution.
- Brand archive/delete rules that depend on S2-S5 business-record ownership.
- Evaluation generation, execution, report, and notification behavior owned by
  later increments of this same change.
