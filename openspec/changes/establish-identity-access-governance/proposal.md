# Change: Establish Identity and Access governance

- Status: Approved for bounded implementation on 2026-09-04
- Class: Architectural / critical identity and security boundary
- Owning Issue: [#50](https://github.com/ZETAVI/GEOEval/issues/50)
- Base: `main@82f70564889698d501129b5188f4046a1a20dfa9`
- Decision owner: Product owner for account, administrator, recovery, and risk
  boundaries; architecture owner for the bounded implementation

## Why

GEOEval can authenticate a mobile challenge and issue an opaque server-side
session, but its current Identity implementation was built for the first
terminal-customer slice. New mobiles are always created as terminal customers;
accounts have no enabled state; logout revokes only one credential; role and
session governance have no formal transaction or audit; and internal roles can
only be prepared through tests or direct database writes.

Media Supply made the gap reachable by adding a temporary all-role session
Guard plus administrator-role Guard while Brand, Evaluation, and Notification
still depend on a differently named terminal-customer-only Guard. Business
controllers import Identity HTTP request types directly, and Web routes an
administrator straight to the media workspace while operations and agent
accounts receive an unsupported-role message. Extending these paths independently
would create several authorization systems.

## Outcome

Create one Identity and Access bounded context that owns Account,
Authentication, Session, Access, Governance, Audit, and first-administrator
Bootstrap. It exposes one small declarative backend access contract, a fixed
role-home projection, and administrator account-governance capabilities. All
account and permission truth remains in PostgreSQL and every sensitive account
change can immediately and atomically revoke its sessions.

## Scope

- Add active/inactive account state, optimistic revision, allowed fixed-role
  transitions, and immutable mobile identity.
- Preserve opaque random session credentials while adding server-enforced idle
  and absolute expiry, current logout, self logout-all, administrator revoke-all,
  machine-readable revocation reasons, bounded lifecycle evidence, and cleanup.
- Add secure Cookie issuance and one consistent CSRF/Origin boundary for the
  Cookie-authenticated JSON API.
- Replace `SessionGuard`, `AccountSessionGuard`, `RoleGuard`, and business-module
  request-type imports with explicit public/required-role metadata, one access
  guard, and one current-principal projection.
- Add administrator account queries, internal-account creation, activate,
  deactivate, internal-role change, revoke-all, dangerous-action confirmation,
  reason, audit, self-operation constraints, and last-administrator protection.
- Add one deployment-only first-administrator CLI with replay protection and no
  HTTP entrypoint. Do not add a separate automated recovery authority.
- Route the four fixed roles to `/brands`, `/admin`, `/operations`, and `/agent`,
  and provide role-appropriate shells without implementing their future business
  modules.
- Reconcile accepted Identity behavior into an owner-local current spec,
  Architecture Overview, OpenAPI/client contracts, and an ADR if the final
  server-authoritative boundary remains cross-change rationale.

## Non-goals

- Multiple simultaneous roles, a role switcher, user-defined permissions,
  generic RBAC/ABAC/ACL policy language, or a permissions editor.
- Customer/internal role conversion, mobile-number editing, or physical account
  deletion.
- JWT, OAuth access/refresh tokens, third-party OAuth, SSO, service accounts,
  API keys, device binding, behavioral risk scoring, or administrator
  impersonation.
- Agent attribution, customer delegation, Media Supply behavior, operations
  fulfilment, points, packages, orders, commissions, or withdrawals.
- Real SMS provider selection, credentials, paid calls, production deployment,
  production database changes, or creation of a real administrator.

## Confirmed Decisions

1. One account has exactly one of the four fixed roles. Customer and internal
   roles never convert; internal roles may change under governance.
2. New public mobiles become terminal customers. Internal mobiles must already
   exist as administrator-created accounts before login.
3. The current 32-byte opaque credential and digest lookup remain the security
   primitive; server state, not Cookie content, owns role and account status.
4. Multiple sessions are allowed, but current/self-all/administrator-all
   revocation, idle/absolute expiry, and permission-change invalidation are one
   Session lifecycle.
5. Administrator self-service logout is distinct from governance. An
   administrator cannot administratively change their own role/status or revoke
   their own sessions; another active administrator must do it.
6. A valid administrator may create or promote another internal administrator
   without dual approval, with explicit reason and audit. The last active
   administrator remains protected under concurrent writes.
7. Backend authorization is fail-closed and authoritative. Frontend role shells
   only select the experience after the backend returns a current principal.
8. Account/status/role/revision change, associated revoke-all, and governance
   audit commit as one PostgreSQL transaction.

## Approval Result

The product owner confirmed on 2026-09-04 that the first release does not need a
separate Recovery Secret or break-glass CLI. Bootstrap remains one-time and
never reopens while an administrator exists. The small-team operating path is
to establish another active administrator through normal governance before
production depends on administrator-only work. A true sole-administrator
lockout is a separately authorized production incident, not a dormant product
backdoor. Repeated incidents, compliance requirements, or material team growth
may trigger a later recovery-security Change.

## Delivery and Topology

The default topology is direct to protected `main`. This Issue branch owns the
single Identity contract and no parallel writer may redefine the schema,
principal, role metadata, or current Identity spec. Compatible implementation
slices may be reviewed sequentially, but no proposal-only PR, Stacked PR, or
Integration Branch is created merely to divide backend and frontend work.

## Impact

- PostgreSQL migration for account state/revision, session lifecycle fields,
  Identity governance control, and append-only audit.
- Backend refactor across Identity and every authenticated controller.
- New administrator HTTP contracts and offline Bootstrap/recovery CLI boundary.
- Web authenticated shell, fixed role homes, account-governance workspace, and
  session-expired/access-denied states.
- OpenAPI and generated client updates plus focused unit, integration, migration,
  concurrency, security, and browser verification.
- No Redis authorization state, external service, paid call, deployment, or
  formal data mutation.
