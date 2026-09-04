# ADR 0004: Server-Authoritative Identity and Access

- Status: Accepted
- Date: 2026-09-04
- Supersedes: Temporary customer-only and Media Supply Guard composition

## Context

The initial customer slice issued a high-entropy opaque browser credential and
stored its digest, but one service also owned Challenge, account creation,
Session, and authorization behavior. Customer controllers selected a Guard that
implicitly required the customer role, while Media Supply combined a separate
all-role Session Guard and administrator Role Guard. Supporting roles could sign
in only through prepared test data and had no product entry. Account status,
revoke-all, idle expiry, administrator governance, audit, and first-
administrator establishment had no coherent owner.

The application needs four fixed roles and immediate server-side permission
changes. It does not need delegated-resource credentials, user-defined
permissions, a role switcher, or an external identity provider. Adding JWT
access/refresh layers or Redis authorization state would retain the need to read
current server truth while introducing another replay, rotation, or consistency
boundary.

## Decision

Deepen one Identity and Access bounded context inside the existing modular
monolith:

- every Account has exactly one fixed role: `TERMINAL_CUSTOMER`, `OPERATIONS`,
  `ADMINISTRATOR`, or `AGENT`;
- customer and internal role families do not convert; controlled changes among
  internal roles remain possible;
- PostgreSQL is the only authority for active status, current role, Session
  lifecycle, Governance control, Bootstrap state, and append-only audit;
- the browser receives a random 32-byte opaque credential, while the database
  stores only its SHA-256 lookup digest and lifecycle state;
- authentication reads current Account state and enforces idle and absolute
  expiry. Role/status changes revoke all Sessions in the same transaction;
- one global fail-closed NestJS access boundary authenticates by default.
  Controllers only declare explicit public access or required fixed roles and
  consume a narrow current principal;
- sensitive administrator changes lock one Governance control row and commit
  Account revision, Session revocation, and audit in one serializable
  PostgreSQL transaction;
- the first administrator is created only by a one-time offline Bootstrap
  command. The first release has no automated break-glass recovery authority;
- Web role routing selects the experience but never grants authority.

## Consequences

- Account deactivation, internal-role changes, current logout, self logout-all,
  and administrator revoke-all take effect through one server-owned Session
  lifecycle.
- Business modules do not parse Cookies, query Session storage, select among
  Guard implementations, or maintain their own role truth.
- Multiple concurrent browser Sessions remain supported and independently
  revocable.
- Exact-Origin/custom-header protection is required for state-changing browser
  requests in addition to `SameSite` and CORS.
- The last active administrator cannot be removed through concurrent Governance
  writes, and an administrator cannot govern their own account. A second active
  administrator is an operating-readiness requirement, not a database quorum.
- Real SMS, production topology/configuration, Bootstrap execution, and
  deployment remain release decisions. The deterministic Challenge adapter
  cannot start in production.
- A pre-activation application rollback may leave additive fields dormant. A
  post-activation rollback requires a separately approved Session invalidation
  and operating plan because old code does not enforce every new security
  semantic.

## Alternatives considered

- JWT access and refresh tokens: rejected because current role, status,
  revocation, and administrator changes still require server authority while
  rotation and replay handling add complexity.
- Redis as Session authority: rejected because Account, Session, Governance,
  and audit could no longer share one durable transaction without dual truth.
- Generic RBAC, ABAC, ACL, or user-defined permissions: rejected because the
  product has four confirmed single roles and no present variability that earns
  a policy language.
- Separate Identity microservice: rejected because current scale and ownership
  fit a cohesive module and distribution would add consistency and operational
  failure modes.
- Reopening Bootstrap or adding a dormant Recovery Secret: rejected for the
  first release. A rare sole-administrator lockout fails closed and becomes a
  separately authorized incident.

## Revisit when

- a delegated or native client, external identity provider, or service account
  requires a different credential protocol;
- verified Session capacity makes PostgreSQL lookup/touch behavior inadequate;
- fixed roles no longer express confirmed product authority;
- repeated lockout incidents, compliance, or team scale justify a dedicated
  recovery-security design;
- release topology cannot preserve exact trusted Origins and host-only secure
  Cookies.

Current behavior is specified by the
[Identity and Access specification](../../../openspec/specs/identity-and-access/spec.md).
Operating and release gates are recorded in the
[Identity and Access runbook](../../operations/identity-and-access.md).
