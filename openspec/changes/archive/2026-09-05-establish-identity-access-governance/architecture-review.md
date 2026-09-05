# Architecture Review: Identity and Access governance foundation

- Result: `ready` for bounded implementation
- Reviewed base: `main@82f70564889698d501129b5188f4046a1a20dfa9`
- Reviewed artifacts: Issue #50, Product Vision/Glossary/Product Definition,
  Architecture Overview, current Identity schema/service/repository/HTTP Guards,
  authenticated controller inventory, Media Supply access usage, Web login role
  route, decision brief, proposal, delta spec, source brief, design, and tasks
- Review scope: ownership, contracts, dependency direction, data integrity,
  concurrent administrator governance, Session security, CSRF, Bootstrap,
  migration, recovery, frontend role shells, and reconciliation

## Review contract

The Change must establish the four fixed single-role account journeys and
server-authoritative access without creating generic RBAC, JWT/OAuth token
layers, customer/internal role conversion, duplicated role truth, public
Bootstrap, real SMS activation, or production side effects. Identity owns the
security transaction; business modules declare roles and consume a principal.

## Affected slice

- Backend Identity is deepened into Account, Authentication, Session, Access,
  Governance, Audit, and Bootstrap responsibilities inside the modular monolith.
- Every authenticated controller migrates from selecting Identity Guard/request
  internals to one explicit role/public contract.
- PostgreSQL gains additive account/session/governance/audit state. Redis,
  Background Work, business aggregates, and provider systems remain outside
  authorization truth.
- Web gains centralized fixed-role entry and role shells; the administrator
  shell owns account governance while Media Supply remains its own capability.
- OpenAPI/client/current specs and architecture must reconcile before close.

## Findings resolved in the proposed design

### Must-fix — temporary Guard composition can create divergent authorization — resolved in design

- **Artifact:** current `SessionGuard`, `AccountSessionGuard`, `RoleGuard`,
  `AuthenticatedRequest`, and their business-controller imports.
- **Violated boundary:** callers select implementation details and one Guard
  hides a customer-only policy.
- **Consequence:** a new supporting-role controller can choose the wrong Guard,
  omit a role declaration, or interpret a different authenticated account.
- **Remediation:** one fail-closed global access boundary, explicit public/fixed
  role metadata, and narrow `CurrentPrincipal`; verify the complete route
  inventory before removing old Guards.
- **Origin:** pre-existing debt exposed by Media Supply and Issue #50.

### Must-fix — Session cryptography exists without a complete lifecycle — resolved in design

- **Artifact:** current seven-day hard-coded Session, single-session logout,
  Cookie serialization, and missing CSRF boundary.
- **Violated boundary:** server-side Session lifecycle and browser request
  integrity are incomplete.
- **Consequence:** inactive/changed accounts cannot invalidate all credentials,
  idle sessions persist, and state-changing Cookie requests rely too heavily on
  CORS/SameSite.
- **Remediation:** preserve the opaque credential/digest, add idle/absolute
  policy, revoke-all, reason, bounded inactive-record retention/cleanup,
  host-only production Cookie, exact Origin/custom-header enforcement, and
  focused expiry/cleanup/CSRF tests.
- **Origin:** pre-existing debt; no JWT or new authority store is needed.

### Must-fix — last-administrator and audit checks can race — resolved in design

- **Artifact:** proposed account-governance writes.
- **Violated boundary:** the account update, administrator count, Session
  revocation, revision, and audit must share one serializable owner.
- **Consequence:** two individually safe-looking concurrent demotions could
  remove all administrators, or a failed revoke/audit could leave partial truth.
- **Remediation:** lock one explicit Identity governance-control row, reload
  actor/target, enforce expected revision and invariants, update/revoke/audit in
  one PostgreSQL transaction, and force concurrent/rollback failures in tests.
- **Origin:** introduced by this Change and addressed before implementation.

### Should-fix — role entry is coupled to the first administrator module — resolved in design

- **Artifact:** Web `postLoginRoute` administrator special case and unsupported
  operations/agent result.
- **Violated boundary:** Identity role entry should not be owned by Media Supply.
- **Consequence:** later modules would compete over post-login routing and
  supporting roles appear invalid despite successful authentication.
- **Remediation:** centralized fixed role-home mapping plus role shells; modules
  attach below the shell and never grant backend authority.
- **Origin:** pre-existing incremental-delivery shortcut.

## Final finding disposition

### Must-fix — offline recovery could become a second Bootstrap backdoor — resolved by deferral

- **Artifact:** `design.md`, Bootstrap and bounded recovery.
- **Violated boundary:** recovery authority, secret ownership, target selection,
  last-administrator preservation, and audit need one explicit human-approved
  contract.
- **Consequence:** reusing Bootstrap or accepting any deployment secret while an
  active administrator exists could silently create a second administrator; no
  recovery path could instead leave the company permanently locked out.
- **Remediation:** the product owner decided not to build a separate Recovery
  Secret or automated break-glass command in the first release. Bootstrap stays
  closed. The normal runbook establishes another active administrator; a true
  sole-admin lockout fails closed and requires a separately authorized incident
  and later recovery-security decision.
- **Origin:** exposed while defining the Bootstrap and exceptional-lockout
  boundary; not a current
  runtime regression.

## Confirmed architectural qualities

- **Cohesion:** the design deepens the existing Identity owner instead of adding
  a microservice or a generic permission engine.
- **Dependency direction:** business modules depend on declarative role metadata
  and a current principal; Identity does not depend on business modules.
- **Data integrity:** PostgreSQL remains the only Account/Session/governance
  truth and can atomically enforce the critical changes.
- **Reuse:** current random opaque credentials, digest lookup, Nest metadata/
  Guards, Prisma, and role enum are retained where their semantics are sound.
- **Security:** customer/internal conversion, self-governance, plaintext Token
  evidence, public Bootstrap, permissive Origin, and stale post-change sessions
  are explicitly rejected.
- **Proportionality:** device risk, SSO, access/refresh tokens, custom roles,
  impersonation, and a second datastore are deferred or rejected because no
  current variability or acceptance boundary earns them.
- **Design knowledge:** the active Change owns only proposed behavior. On
  acceptance, Identity receives one owner-local current spec, Architecture
  Overview is updated in place, the Product Definition Evolution marker is
  resolved, and an ADR is created only for durable cross-change rationale.

## Residual validation after decision

- Prove every current controller is explicitly public, any-active-role, or one
  of the fixed roles before retiring the old Guards.
- Rehearse additive migration and rollback against an Issue-owned PostgreSQL
  database; no shared or production database is authorized.
- Measure indexed Session authentication and coarse last-seen writes; do not add
  Redis or caching without disconfirming evidence.
- Validate custom-header/Origin behavior in the actual local Web/API topology
  and later in the separately authorized release topology.
- Browser verification must cover allowed, wrong-role, inactive, role-changed,
  revoked-all, idle/absolute-expired, and CSRF-rejected states.

## Close

The proposed bounded context, access contract, account/session data, governance
transaction, Cookie/CSRF boundary, Bootstrap boundary, and Web role shells are
coherent and proportionate. The product owner's explicit decision not to add a
dormant automated recovery authority closes the final finding. The Change is
`ready` for bounded implementation and isolated verification. No PR merge, real
account, SMS call, deployment, production migration, activation, or exceptional
recovery operation is authorized by this review.
