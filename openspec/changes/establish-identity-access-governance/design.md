# Design: Identity and Access governance foundation

- Status: Approved for bounded implementation on 2026-09-04
- Owning Issue: [#50](https://github.com/ZETAVI/GEOEval/issues/50)
- Reviewed current base: `main@82f70564889698d501129b5188f4046a1a20dfa9`

## Current truth and redesign boundary

The current Identity code has useful primitives but not a complete module:

- `Account` owns a globally unique normalized mobile and one role, but no status
  or optimistic revision.
- authentication creates an opaque 32-byte credential, stores its SHA-256 digest,
  and gives every session one seven-day absolute expiry;
- Challenge completion upserts a new terminal-customer account or keeps an
  existing role;
- session lookup resolves the current account role from PostgreSQL, but only the
  current credential can be revoked;
- `SessionGuard` implicitly rejects every non-customer role, while Media Supply
  separately composes `AccountSessionGuard`, `RoleGuard`, and role metadata;
- business controllers import the Identity-owned HTTP request shape and read
  `geoevalAccount` directly;
- Web routes administrators directly to `/admin/media`, with operations and
  agents treated as unsupported.

The Change keeps the opaque-credential and current-account lookup semantics,
then replaces the surrounding lifecycle, access, governance, audit, and role
entry design. It does not create another identity service or permission engine.

## Outcome and Boundary

- **Owner and observable outcome:** Identity and Access owns every Account,
  Challenge, Session, authenticated principal, fixed-role decision,
  administrator governance command, governance audit, and Bootstrap transition.
- **In:** account state/revision, Challenge completion, Session lifecycle,
  declarative backend access, governance HTTP/CLI, fixed role homes, migration,
  recovery evidence.
- **Out:** role-owned business data, generic permissions, agent attribution,
  real SMS, external identity, device risk, production activation.
- **Upstream prerequisites and downstream consumers:** Product role/account
  meaning and Issue #50 decisions are upstream. Brand, Geo Intelligence,
  Notification, Media Supply, Operations, Agent, Web, and future business
  modules consume the narrow principal and role-declaration contracts.

## Internal module map

```text
Identity and Access
├── Account        mobile, fixed role, active state, revision, transitions
├── Authentication Challenge lifecycle and delivery port
├── Session        issue, authenticate, expire, revoke, cleanup
├── Access         public/role metadata, guard, current principal, 401/403
├── Governance     administrator account commands and queries
├── Audit          accepted governance history and bounded security evidence
└── Bootstrap      one-time first administrator; no recovery command in v1
```

These remain cohesive packages inside the NestJS modular monolith. They are not
microservices or generic service layers. The deletion test is positive: without
this owner, Cookie parsing, current-role checks, self/last-admin policy,
revoke-all, audit, and Bootstrap would leak into every business module and CLI.

## Public contracts and dependency direction

Backend business controllers may depend on only:

- `PublicAccess` metadata for deliberately unauthenticated routes;
- `RequireAccountRoles(...fixedRoles)` metadata;
- `CurrentPrincipal`, containing `accountId`, `role`, and `sessionId` only;
- a parameter decorator or equivalent request accessor that supplies that
  principal after the shared access boundary succeeds.

Brand creation additionally retains the accepted login-mobile-as-default-
contact behavior through a scalar `CurrentAccountMobile` accessor. This is a
compatibility projection from the already authenticated Account, not a second
principal or an exposed `AccountView`; no other business controller receives
Account state through it.

They do not import Session repositories, Cookie parsers, `AccountView`, account
status, `AuthenticatedRequest`, or individual Guard implementations. Business
services continue to receive actor/account IDs where their own contracts need
them; they do not repeat Identity role truth.

Identity's administrator workspace may call Governance commands and queries.
No other module mutates account, session, governance control, or Identity audit
records. Authentication depends on a Challenge-delivery port; the deterministic
adapter is local/test only and a later real-SMS adapter must satisfy the same
owner contract.

## Access-interface comparison

| Candidate | Depth and locality | Migration/risk | Decision |
| --- | --- | --- | --- |
| Keep controller-selected `SessionGuard` versus `AccountSessionGuard + RoleGuard` | Shallow; every controller must understand Identity implementation and one Guard hides a customer-only rule | Low immediate diff, high omission and wrong-Guard risk as roles grow | Reject |
| One fail-closed global access guard plus explicit public and fixed-role metadata | Deep owner; authenticates Session/Account once and exposes one principal | Requires every current public and customer route to be classified, but the controller surface is bounded and testable | Adopt |
| Put role checks inside every business service/repository | Duplicates policy, couples business code to identity state, and still misses HTTP/route consistency | Large drift and transaction reach-through | Reject |

The global access guard authenticates every route unless the route is explicitly
public. A role declaration is optional only when any active authenticated role
is allowed. Health, Challenge request/completion, and intentionally retained F0
behavior receive explicit treatment rather than accidental exemption. The final
route inventory is a verification artifact.

## Lifecycle and Data

### Account

Add:

- `AccountStatus = ACTIVE | INACTIVE`, defaulting existing accounts to `ACTIVE`;
- `revision`, defaulting to `1` and incrementing on role/status governance;
- Identity audit and governance-control relations.

Mobile remains normalized, unique, and immutable. No `AccountKind` is needed:
the allowed-transition policy partitions `TERMINAL_CUSTOMER` from the three
internal roles and rejects every cross-partition transition. There is no account
deletion API in the first release.

### Session

Keep `id`, `accountId`, `tokenDigest`, `createdAt`, `expiresAt`, and `revokedAt`.
Add `lastSeenAt`, a bounded idle expiry or policy snapshot, revocation reason,
and optional revoking actor when an administrator command owns the revocation.
Expired state is derived from time and is not stored as a competing enum.

Recommended initial policy defaults are:

| Role family | Absolute timeout | Idle timeout | Browser persistence |
| --- | --- | --- | --- |
| Terminal customer | 7 days | 24 hours | Persistent only to the server absolute limit |
| Internal roles | 12 hours | 30 minutes | Browser-session Cookie |

These values are configuration with security minimum/maximum validation, not
product vocabulary. `lastSeenAt` may update in a coarse interval to avoid one
write per request, but a stale value can only expire a session earlier, never
extend it beyond policy. Authentication never trusts the Cookie expiry.

Session revocation reasons distinguish at least `USER_LOGOUT`,
`USER_LOGOUT_ALL`, `ADMIN_REVOKE_ALL`, `ACCOUNT_DEACTIVATED`, and `ROLE_CHANGED`.
Privilege changes never retain or rotate an old credential; the user
reauthenticates and receives a new session.

Expired or revoked Session rows remain available for 30 days after their
terminal time for bounded security correlation, then a scheduled or explicit
owner-local cleanup deletes them in limited batches. Consumed or expired
Challenge rows use a shorter 24-hour retention. These are initial operational
defaults, not product history. Governance audit is never part of either cleanup
path, and the cleanup predicate can never select an active Session or usable
Challenge.

### Governance control and audit

Use one deterministic singleton Identity governance-control row as the explicit
serialization point for Bootstrap and administrator-count invariants. Identity
governance commands lock it before reading or changing administrator state.
This is clearer and easier to rehearse than a process lock or undocumented
database advisory lock, and governance write volume is low.

An append-only Identity audit records:

- actor kind: authenticated account or Bootstrap operator;
- actor account ID when the actor is an authenticated account;
- a non-secret Bootstrap key identifier for the offline actor;
- target account, action, reason, bounded before/after role/status/revision, and
  server time.

The client never supplies actor or time. `beforeState` and `afterState` never
contain a mobile, Challenge, token digest, Cookie, device detail, or business
record. `append-only` means application contracts grant no update/delete path
and production database privileges protect the table. It does not claim a
cryptographically tamper-evident external ledger.

## Transaction and concurrency boundary

Every account creation, activation, deactivation, internal-role change, and
administrator revoke-all runs inside one PostgreSQL transaction:

1. authenticate and authorize the current actor at the HTTP boundary;
2. start the Governance transaction and lock the singleton control row;
3. reload actor and target accounts and verify both active state and displayed
   revisions;
4. reject administrator self-governance and customer/internal conversion;
5. evaluate the last-active-administrator invariant against the locked state;
6. update target role/status/revision when applicable;
7. revoke every target session when required;
8. append the accepted audit; then commit once.

The actor is rechecked inside this critical transaction because a governance
command changes the authority system itself. Ordinary business commands use the
principal resolved at request admission. `Immediate revocation` means an old
credential cannot authenticate after the Governance commit; cancelling work
already admitted before the commit would require cross-module transactions and
is outside this boundary.

## Authentication and Challenge delivery

`Authentication` consumes one Challenge repository and one delivery port. It
owns normalization, expiry, single use, failed-attempt limits, invalidation of
superseded Challenges, and request/verification rate policy. Delivery receives
only the target and generated code plus correlation metadata; it does not own
Account or Session.

Public responses remain enumeration-resistant: Challenge request and invalid
account-state failures do not reveal whether a mobile is pre-provisioned or
internal. Production still rejects deterministic delivery. Real SMS provider,
templates, credentials, commercial limits, and live validation stay behind a
later external-dependency and release Gate.

## Cookie and CSRF boundary

Production uses a host-only `__Host-` Session Cookie with `Secure`, `HttpOnly`,
`SameSite=Lax`, `Path=/`, and no `Domain`. Local HTTP development may use an
explicit non-`__Host-` name because the prefix requires `Secure`; no production
fallback is permitted. Cookie expiry is presentation cleanup, while PostgreSQL
is the validity authority.

Every browser state mutation uses JSON plus a required application request
header and exact configured Origin allowlist. The backend rejects simple-form
content types and missing/mismatched Origin on Cookie-authenticated unsafe
methods. This applies consistently to login completion and logout as well as
business mutations. If the release topology cannot keep an exact trusted-origin
allowlist, implementation stops and replaces this boundary with a session-bound
synchronizer token rather than weakening CORS.

## Administrator workspace

The administrator shell owns an `账号与访问` module whose first-release
information architecture is:

- account list with normalized-mobile search and role/status filters;
- account summary: mobile, role, status, revision, created/updated time, active
  Session count, and last successful authentication time when available;
- create internal account with one fixed internal role;
- activate/deactivate, internal-role change, and revoke-all actions;
- required reason and an in-product typed or target-aware confirmation for
  dangerous actions;
- read-only governance-audit list with actor, target, action, time, reason, and
  bounded before/after state.

No edit-mobile, delete, impersonate, assign-custom-permission, inspect plaintext
credential, or role-switch action is present. An administrator can use ordinary
logout and self logout-all, but cannot target their own account through a
Governance command.

## Fixed Web role shells

Replace the current post-login special case with one role-home mapping:

```text
TERMINAL_CUSTOMER -> /brands
ADMINISTRATOR     -> /admin
OPERATIONS        -> /operations
AGENT             -> /agent
```

The mapping consumes the `/identity/me` projection and never grants access.
Each route independently handles unauthenticated, wrong-role, session-expired,
loading, empty, and temporary-failure states. The administrator shell links
Identity account governance and Media Supply as separate modules. Operations
and Agent receive honest role shells and capability-owned empty states, not
customer APIs or fabricated dashboards.

## Bootstrap and exceptional-lockout boundary

The first-administrator CLI reads the target mobile explicitly and reads the
Bootstrap secret from protected input rather than a command-line value. The
deployment environment holds the expected secret digest or equivalent
deployment-managed verifier. The control row records completion, target, time,
and a non-secret key identifier; the audit records an offline actor kind.

Inside the locked transaction, Bootstrap requires no prior completion, no active
administrator, and an unused mobile. A matching replay returns deterministic
no-change only when the control record and resulting active administrator still
match; every different target/key or existing active administrator is a conflict.

Ordinary Bootstrap never reopens. The first release does not add a distinct
Recovery Secret, break-glass command, implicit second Bootstrap, mobile rewrite,
or HTTP recovery surface. After Bootstrap, the operating runbook directs the
company to create and verify a second active administrator through normal
Governance before production depends on administrator-only work. The database
continues to require at least one, not two, active administrators so a small
team is not forced into a quorum model.

If the only active administrator truly becomes inaccessible, the application
fails closed. The company pauses administrator-only work, preserves and backs up
the current database, opens a separately authorized production incident, and
decides the exact exceptional repair against the then-current environment.
Neither this Change nor Bootstrap pre-authorizes direct data editing. A real
incident, a compliance requirement, or material team growth is the trigger for
a later recovery-security Change with stronger secret custody and approval.

## Failure and Recovery

| Failure | Classification | Retry or recovery owner | Idempotency or reconciliation evidence |
| --- | --- | --- | --- |
| Duplicate or customer-owned mobile during internal creation | Business conflict | Administrator uses another mobile | Unique constraint and transition test; no account/audit/session change |
| Stale account revision | Concurrent business conflict | Administrator refreshes, reviews, and resubmits | Expected-revision update and unchanged audit count |
| Two mutations would remove all administrators | Concurrent invariant conflict | One command commits; the other refreshes | Locked governance-control row plus concurrent integration test |
| Role/status update succeeds but revoke or audit fails | Transaction failure | Administrator retries after repair | Forced-failure test proves all account/session/audit state rolls back |
| Old Session used after deactivation/role change | Authentication failure | User reauthenticates only if account is active | HTTP integration test with pre-change Cookie after commit |
| Session exceeds idle or absolute limit | Normal expiry | User authenticates again | Controlled clock tests and server-side rejection |
| CSRF header/Origin missing or mismatched | Security rejection | Web/config owner corrects request or origin | HTTP matrix proves no mutation |
| Bootstrap replay or conflicting target/key | Deterministic replay or permanent conflict | Deployment operator inspects control/audit | First/repeat/conflict tests; one administrator and one audit only |
| Sole administrator loses mobile access | Rare production incident outside automated first-release recovery | Product/deployment owner pauses work and opens an explicitly authorized incident | Bootstrap stays closed; current backup and account/audit state are preserved before a later repair decision |
| Real SMS unavailable | External dependency outside this Change | Later release owner | Deterministic/local tests only; production remains disabled |

## Tool and Framework Decision

| Candidate | Adopt, defer, or reject | Evidence and limitation | Exit or refresh trigger |
| --- | --- | --- | --- |
| Existing PostgreSQL/Prisma Identity repository | Adopt | Only current owner can atomically combine Account, Session, audit, and invariants; runtime rehearsal remains required | Transaction or lock evidence fails, or Identity moves to another datastore |
| NestJS global Guard plus metadata/decorator boundary | Adopt | Current application already uses Guards and metadata; one fail-closed composition removes business knowledge of Guard internals | Framework API/version changes or controller inventory disproves safe classification |
| Existing custom opaque Session | Adopt after lifecycle refactor | 256-bit random credential and digest lookup fit current standards; surrounding timeout, revoke-all, and Cookie controls are incomplete | Delegated/native client or external IdP becomes an approved requirement |
| Passport or a generic auth framework | Defer | It would not own GEOEval account transitions, last-admin invariant, revoke-all transaction, or audit; no second authenticator exists | A second mature authentication protocol proves shared semantics |
| JWT/access-refresh layering | Reject | Duplicates server role truth or still requires server lookup while adding replay/rotation complexity | A separately approved delegated-resource API requires it |
| Redis Session authority | Reject | Prevents one durable transaction with Account and audit or creates dual truth | PostgreSQL capacity evidence fails and a coherent replacement transaction exists |
| Custom-header plus exact Origin/CORS CSRF boundary | Adopt with release validation | OWASP supports this JSON API pattern; it depends on exact trusted origins | Release topology cannot preserve exact origins or adds form/non-browser clients |
| Device/IP risk engine | Defer | No first-release evidence justifies privacy, false-positive, or recovery cost | Repeated confirmed account/session abuse changes risk acceptance |

## Migration and rollback

Migration adds account status/revision, session lifecycle fields, governance
control, and Identity audit with additive defaults. Existing accounts become
active and retain their one current role. Existing sessions receive a bounded
last-seen baseline no later than creation/current migration time; deployment may
intentionally invalidate them when the production Cookie name changes.

Before formal deployment, migration and rollback are rehearsed only against an
independent Issue-owned database. Application rollback must remain able to read
the additive schema. A migration rollback never deletes customer/business data;
if the new access contract fails before activation, revert application code and
leave new nullable/defaulted fields dormant. Any formal session invalidation,
deployment, real account, or production migration remains a separate human Gate.

## Operational and Verification Boundary

- **Security and sensitive data:** no plaintext Challenge or Session secret in
  logs/audit; exact CORS; server-derived actor/time; protected offline secrets;
  no impersonation or customer/internal conversion.
- **Capacity:** account governance is low volume and serializes deliberately;
  Session authentication remains an indexed digest/account lookup. Coarse
  last-seen writes must be measured rather than cached into a second authority.
- **Metrics and logs:** count Challenge issue/failure/rate-limit, Session
  creation/revocation/expiry, 401/403/CSRF outcomes, Governance results, and
  Bootstrap results through identifiers that cannot authenticate.
- **Completion evidence:** migration rehearsal, domain transition matrix,
  transaction rollback/concurrency, Bootstrap replay, Session expiry/revocation,
  controller role inventory, CSRF HTTP matrix, OpenAPI/client build, and browser
  allowed/denied/expired flows.
- **Residual risk owner:** product owner accepts the small probability of a
  sole-administrator lockout without a dormant recovery authority; deployment
  owner separately controls real SMS, production migration, administrator
  creation, readiness of a second administrator, and release.
