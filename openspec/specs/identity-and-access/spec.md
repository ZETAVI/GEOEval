# Identity and Access Specification

## Purpose

Define the accepted Account, Authentication, Session, Access, Governance,
Audit, first-administrator Bootstrap, and fixed role-entry boundary. Identity
and Access owns authentication and authority; business modules own what an
authorized role can do with their facts.

## Requirements

### Requirement: Fixed single-role accounts

Identity and Access SHALL assign each account exactly one fixed role and SHALL
keep customer identity separate from internal-role identity.

#### Scenario: A new public mobile completes authentication

- **WHEN** a mobile with no account completes the public challenge
- **THEN** Identity creates one active `TERMINAL_CUSTOMER` account
- **AND** never infers an internal role from a request, route, acquisition source,
  or client-provided field.

#### Scenario: A pre-provisioned internal mobile signs in

- **GIVEN** an administrator previously created an active `OPERATIONS`,
  `ADMINISTRATOR`, or `AGENT` account for the mobile
- **WHEN** the mobile completes the same challenge flow
- **THEN** Identity creates a session for that one assigned role
- **AND** public authentication does not change the role.

#### Scenario: An administrator enters an existing customer mobile

- **WHEN** an administrator tries to create an internal account for a mobile
  already owned by a terminal-customer account
- **THEN** Identity rejects the conflict without changing that account or its
  brands, history, sessions, or authority
- **AND** the person must use a separate mobile for a separate internal account.

#### Scenario: An internal duty changes

- **WHEN** an authorized administrator changes an account among `OPERATIONS`,
  `ADMINISTRATOR`, and `AGENT`
- **THEN** the account retains its identity and history under the new sole role
- **AND** a transition to or from `TERMINAL_CUSTOMER` is rejected.

### Requirement: Active account status is authoritative

Identity and Access SHALL admit only an active account to a new or existing
authenticated session.

#### Scenario: An inactive account completes a valid challenge

- **WHEN** an inactive account submits a correct unconsumed challenge
- **THEN** Identity does not create a session
- **AND** returns a role-appropriate account-unavailable result without exposing
  internal governance detail.

#### Scenario: An account becomes inactive

- **WHEN** an administrator commits account deactivation
- **THEN** every active session for that account is revoked in the same
  transaction
- **AND** every later request using an old credential is rejected
- **AND** reactivation does not restore any revoked session.

### Requirement: Server-owned opaque session lifecycle

Identity and Access SHALL use an opaque server-issued session credential whose
authority, status, role, and expiry are resolved from server-owned records.

#### Scenario: Authentication creates a session

- **WHEN** an active account completes a valid challenge
- **THEN** Identity generates a new high-entropy opaque credential
- **AND** stores only its lookup digest with the account, creation time,
  last-seen time, absolute expiry, and revocation fields
- **AND** stores no role, account status, mobile, or permission claim in the
  browser credential.

#### Scenario: A session authenticates a request

- **WHEN** a request presents a known, unrevoked, unexpired credential
- **THEN** Identity also checks the account's current active status and role
- **AND** enforces both absolute and idle expiry on the server
- **AND** returns one current authenticated principal for authorization.

#### Scenario: A known session can no longer authenticate

- **WHEN** a presented known Session belongs to an inactive account, has been
  revoked, or has exceeded its idle or absolute expiry
- **THEN** Identity returns the corresponding bounded machine-readable failure
  state so the Web can present an honest recovery action
- **AND** missing, unknown, or already-cleaned credentials remain the same
  generic authentication-required result.

#### Scenario: An account uses several devices

- **WHEN** the same active account authenticates in several browsers or devices
- **THEN** each receives an independently revocable session
- **AND** creating a new session does not silently revoke an earlier one.

#### Scenario: A user exits sessions

- **WHEN** the user chooses ordinary logout
- **THEN** Identity revokes the current session and clears its Cookie
- **BUT WHEN** the user chooses logout-all
- **THEN** Identity revokes every active session for that account, including the
  current one, and clears the current Cookie.

#### Scenario: Privilege changes

- **WHEN** an account's internal role changes
- **THEN** every active session is revoked atomically with the role and revision
  change
- **AND** the account must complete a new authentication before using its new
  role.

#### Scenario: Inactive Session and Challenge records age out

- **WHEN** a Session has been expired or revoked beyond the configured security-
  correlation retention period, or a Challenge has been consumed or expired
  beyond its shorter retention period
- **THEN** Identity may purge those inactive records in bounded batches
- **AND** never purges an active Session
- **AND** never deletes or rewrites Identity governance audit as Session or
  Challenge cleanup.

### Requirement: Cookie and request-origin protection

Cookie-authenticated HTTP SHALL protect the opaque credential and reject forged
state-changing browser requests independently of frontend navigation.

#### Scenario: Production issues a session Cookie

- **WHEN** production authentication succeeds
- **THEN** the Cookie is host-only, `Secure`, `HttpOnly`, `SameSite=Lax`, and
  scoped to `Path=/`
- **AND** uses the `__Host-` prefix without a `Domain` attribute
- **AND** its browser expiry never exceeds the server-owned session expiry.

#### Scenario: A browser sends a state-changing request

- **WHEN** a Cookie-authenticated `POST`, `PUT`, `PATCH`, or `DELETE` request
  reaches the API
- **THEN** the server requires the approved non-simple request shape and custom
  request header
- **AND** validates the exact configured source Origin before mutation
- **AND** treats `SameSite` and CORS as defense in depth rather than the only
  forgery protection.

### Requirement: Declarative and fail-closed access contract

The backend SHALL authenticate by default, exempt only explicitly public
endpoints, and let business modules declare fixed role requirements without
depending on Cookie, Session repository, or Identity HTTP internals.

#### Scenario: A protected controller handles a request

- **WHEN** a controller has no public marker
- **THEN** one shared access boundary authenticates the session and active
  account
- **AND** exposes only a current principal containing account, role, and session
  identity
- **AND** the business controller does not parse a Cookie or select among
  alternative Session Guards.

#### Scenario: A controller requires a fixed role

- **WHEN** a protected controller declares one or more accepted account roles
- **THEN** the shared access boundary compares the current server-owned role
- **AND** a missing or invalid session returns an authentication failure
- **AND** a valid account with the wrong role returns access denial
- **AND** frontend routing or request fields cannot add authority.

#### Scenario: Existing product controllers use the contract

- **WHEN** Brand, Store Location, Evaluation, and their current terminal-customer
  notifications declare their access
- **THEN** each requires `TERMINAL_CUSTOMER`
- **AND** Media Supply administrator commands require `ADMINISTRATOR`
- **AND** no module imports a retired Guard or authenticated HTTP request
  implementation type.

#### Scenario: An account-owned capability needs terminal identity facts

- **WHEN** Publishing Commerce resolves an administrator-selected customer
- **THEN** Identity provides a narrow read-only ID/mobile/status projection only
  for a terminal account, without exporting its repository or role mutation
- **AND** the business controller still declares its own required role; directory
  access does not independently authorize a financial or governance action.

### Requirement: Administrator account-governance workspace

Identity and Access SHALL provide administrators one role-specific workspace
for account discovery and the bounded governance actions owned by Identity.

#### Scenario: An administrator finds an account

- **WHEN** an administrator searches or filters accounts
- **THEN** the workspace can filter by normalized mobile, fixed role, and active
  status with bounded pagination
- **AND** shows role, status, revision, creation/update time, and only the
  session summary needed for governance
- **AND** does not expose plaintext credentials, device fingerprinting, brand
  detail, or unrelated business records.

#### Scenario: An administrator opens an internal account

- **WHEN** an administrator supplies an unused normalized mobile and one
  internal role
- **THEN** Identity creates an active pre-provisioned account
- **AND** records the actor, target, role, status, reason, and time
- **AND** the mobile cannot obtain a session until it completes authentication.

#### Scenario: An administrator performs a dangerous action

- **WHEN** an administrator deactivates an account, changes an internal role, or
  administratively revokes all sessions
- **THEN** the command requires the displayed account revision, an explicit
  in-product confirmation, and a reason
- **AND** a stale revision rejects the entire command without a partial change.

#### Scenario: An account identity needs correction

- **WHEN** a mobile is wrong or an account is no longer used
- **THEN** the administrator deactivates the account and creates the correct
  separate identity when needed
- **AND** the first release neither edits the mobile nor physically deletes the
  account.

### Requirement: Administrator self-operation and last-admin safety

Identity and Access SHALL distinguish ordinary self-service session exit from
administrator governance and SHALL preserve at least one active administrator.

#### Scenario: An administrator targets their own account

- **WHEN** an administrator uses a governance command to change their own role
  or status or administratively revoke their own sessions
- **THEN** Identity rejects the command
- **AND** the administrator may still use ordinary current or logout-all
  self-service
- **AND** another active administrator must perform a permitted governance
  change to that account.

#### Scenario: The sole administrator attempts self-demotion

- **WHEN** the only active administrator targets their own active status or
  administrator role with a change that would remove the last administrator
- **THEN** Identity first returns the last-administrator safety result requiring
  another active administrator
- **AND** after another active administrator exists, the same self-target is
  still rejected as self-governance
- **AND** neither rejection changes Account, Session, revision, or audit state.

#### Scenario: An administrator creates another administrator

- **WHEN** an active administrator creates or promotes another internal account
  to `ADMINISTRATOR`
- **THEN** one explicit reasoned command is sufficient without a second approver
- **AND** the accepted change is audited and the target's prior sessions are
  revoked when its role changed.

#### Scenario: Concurrent writes target the last administrators

- **GIVEN** concurrent requests would each appear safe before either commits
- **WHEN** their combined effect would leave no active administrator
- **THEN** Identity serializes the invariant check and writes
- **AND** at most the safe mutation commits
- **AND** every rejected mutation leaves account, sessions, and audit unchanged.

### Requirement: Atomic Identity governance audit

Every accepted Bootstrap or sensitive account/session governance command SHALL
append server-derived audit evidence in the same transaction as its business
change.

#### Scenario: A governance command commits

- **WHEN** an internal account is created, activated, deactivated, changes role,
  or receives administrator session revocation
- **THEN** one append-only audit records actor kind and account when applicable,
  target account, action, bounded before/after role-status-revision state,
  reason, and server time
- **AND** the client cannot supply actor identity or occurrence time
- **AND** no audit field contains a Challenge code, plaintext Session credential,
  full Cookie, or unrelated business data.

#### Scenario: A governance command fails

- **WHEN** authorization, transition, revision, last-administrator, session, or
  database validation rejects the command
- **THEN** no audit claims that the business change succeeded
- **AND** security diagnostics remain distinct from accepted governance history.

### Requirement: One-time first-administrator Bootstrap

Identity and Access SHALL establish the first administrator only through an
offline deployment command with explicit target and secret boundaries.

#### Scenario: A new environment creates its first administrator

- **GIVEN** no Bootstrap has completed and no active administrator exists
- **WHEN** an authorized operator runs the CLI with an unused normalized mobile
  and the deployment-managed Bootstrap secret
- **THEN** one active administrator account, Bootstrap control state, and audit
  commit atomically
- **AND** no HTTP route can perform the operation.

#### Scenario: Bootstrap is replayed

- **WHEN** the same completed Bootstrap is replayed with its matching target and
  secret identity
- **THEN** the command returns a deterministic no-change result
- **AND** creates no second account, audit, or authority
- **BUT WHEN** the target or secret identity differs, or another active
  administrator already exists outside the completed replay
- **THEN** the command rejects without mutation.

#### Scenario: Administrator access is lost after Bootstrap

- **WHEN** Bootstrap has completed but the remaining active administrator is no
  longer reachable by the company
- **THEN** ordinary Bootstrap remains closed
- **AND** the first release exposes no Recovery Secret, automatic break-glass
  command, implicit second Bootstrap, mobile rewrite, or public backdoor
- **AND** the event requires a separately authorized production incident and a
  new recovery-security decision before any exceptional data operation.

#### Scenario: The small team prepares ordinary administrator recovery

- **WHEN** the first administrator has entered the normal governance workspace
- **THEN** the operating runbook directs the company to establish and verify a
  second active administrator before production depends on administrator-only
  work
- **AND** ordinary loss of one administrator is resolved by the other active
  administrator through normal governance
- **AND** this readiness recommendation does not change the database invariant
  from at least one active administrator to a mandatory quorum of two.

### Requirement: Fixed role-specific signed-in entry

The Web SHALL map the authenticated server-owned role to one fixed signed-in
shell and SHALL keep authorization on the backend.

#### Scenario: A role completes login

- **WHEN** Identity returns a current active principal
- **THEN** terminal customers enter `/brands`, administrators `/admin`,
  operations users `/operations`, and agents `/agent`
- **AND** administrators reach account governance and Media Supply as distinct
  modules inside the administrator shell
- **AND** operations and agent roles receive real role shells and bounded empty
  states until their business modules activate; the opt-in
  [Agency Entry](../agency-entry/spec.md) adds the agent's own acquisition link
  and an administrator action on the selected active agent
- **AND** no shell provides a role switcher.

#### Scenario: A role opens another role's route

- **WHEN** a signed-in account navigates to a shell or API outside its role
- **THEN** the Web presents access denial without loading protected data
- **AND** the backend independently rejects direct unauthorized requests.

### Requirement: Challenge delivery remains an adapter boundary

Identity and Access SHALL own Challenge lifecycle and abuse controls while a
delivery adapter owns only message transport.

#### Scenario: Local or test authentication requests a Challenge

- **WHEN** the deterministic adapter is explicitly selected outside production
- **THEN** Identity applies the same Challenge expiry, single-use, attempt, and
  request-rate rules used by other adapters
- **AND** may return the deterministic code only in the approved local/test
  response.

#### Scenario: Production selects Challenge delivery

- **WHEN** production authentication is prepared
- **THEN** deterministic delivery remains rejected
- **AND** real SMS provider selection, credentials, cost, templates, availability,
  and live validation require their own external-dependency and release Gate.

## Current environment boundary

The accepted implementation and evidence cover local/test deterministic
Challenge delivery and an isolated migration/rollback rehearsal. Production
still requires separate authorization for real SMS, configuration, migration,
Bootstrap, second-administrator readiness, monitoring, post-activation rollback,
deployment, and activation.

## Agency service integration

[Agency Customer Service](../agency-customer-service/spec.md) consumes Identity-owned minimal contact and eligibility facts. An AGENT can read the full login mobile only for a currently attributed eligible customer; this does not grant the administrator account directory, session/security details, a customer session, or customer actions. Governance and final service reads use ordered account locks. Identity account revision and Agency relationship revision remain distinct.
