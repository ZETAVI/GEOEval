# Final fixed-diff code and architecture review

Date: 2026-09-04

- Fixed comparison base:
  `origin/main@18b69d0bdd97752d1f2fde8504564062beb8a62f`.
- Reviewed head after current-truth reconciliation and main sync: `727d431`.
- Reviewed scope: 128 files, 13,256 additions, and 800 deletions across the
  approved Issue #50 Identity, authenticated-access, generated-contract, role-
  entry, administrator-workspace, migration, test, and evidence boundary.
- Review method: approved proposal/spec/task trace, architecture-boundary
  inspection, critical security/data paths, generated public contracts,
  complete automated regression, isolated migration/rollback, and real browser
  evidence.

## Requirement fidelity

Verdict: `ready`.

- Each Account retains exactly one fixed role. Public authentication only
  creates a terminal customer; internal accounts are pre-provisioned; customer
  and internal role families cannot convert.
- PostgreSQL remains the one Account, Session, Governance, Bootstrap, and audit
  authority. The opaque 32-byte credential remains browser-only while storage
  uses its digest.
- The implementation adds idle/absolute expiry, current/self-all/admin-all
  revocation, inactive-account enforcement, bounded failure codes, and cleanup
  without JWT, refresh-token, Redis-authority, or multiple-role expansion.
- Every product controller is explicitly classified under one fail-closed
  access contract. Business modules consume role metadata and a narrow current
  principal rather than selecting Identity Guard or Cookie internals.
- Administrator governance enforces immutable mobile, expected revision,
  reason, audit, self-operation constraints, last-administrator safety, and
  Account/Session/audit atomicity.
- Bootstrap is an offline one-time command with replay protection and no HTTP or
  automated recovery path. Real SMS and production activation remain outside
  the Change.
- Web role entry and account governance follow server-owned fixed roles. The
  operations and agent homes are truthful shells, not invented business
  modules.

No implemented behavior materially widens the approved product meaning or
crosses the Issue #57 GEO Optimization/article boundary.

## Engineering-quality findings

All material findings discovered during the fixed-diff pass were resolved
before this verdict.

| Severity | Finding | Resolution |
| --- | --- | --- |
| Must fix | A malformed percent-encoded Session Cookie escaped decoding and returned 500 instead of a generic authentication failure | `e3a896b` catches decoding failure and the HTTP forgery matrix proves the bounded 401 response |
| Must fix | Null/malformed authentication and Governance bodies, including invalid UUID input, could reach property access or Prisma and return 500 | `e3a896b` validates unknown input before repository access; focused HTTP tests prove 400 responses |
| Should fix | Embedded Media Supply editors handled a 401 as a local form error while their workspace used the shared Session state | `c231d1f` routes editor and refresh failures through the shared access-failure handler; Web regression passes |
| Should fix | The Governance audit action was a closed domain/database enum but an unbounded OpenAPI string | `a267115` publishes the same enum through OpenAPI and the generated client |
| Should fix | The rollback evidence could be read as authorization for old code after new status/idle-expiry semantics activate | `a267115` limits the proof to pre-activation rollback and requires a separate human-approved post-activation invalidation plan |
| Improve | A remaining test filename described the retired `RoleGuard` | `b4abe59` renames it to the current access contract |

After the initial review, Issue #26 Query Generator entered `main`. Four textual
conflicts and the automatically merged shared surfaces were reviewed by owner,
not by choosing one side wholesale. The merged schema retains both Account
relation families, all new Query endpoints consume `CurrentPrincipal`, the HTTP
test keeps both the Query harness and CSRF headers, generated contracts contain
both APIs, and Architecture Overview retains both current boundaries. The
post-merge complete regression is the final evidence.

No unresolved must-fix or should-fix code finding remains in the reviewed diff.

## Architecture qualities

- **Cohesion:** Identity is deepened inside the modular monolith into focused
  application responsibilities; no microservice or generic authorization engine
  was introduced.
- **Dependency direction:** product controllers depend on Identity's small
  metadata/principal boundary. Identity does not import business modules.
- **Integrity:** the Governance control row serializes the last-administrator
  invariant, and one serializable PostgreSQL transaction owns Account revision,
  Session invalidation, and audit.
- **Security:** authorization fails closed; Cookie/Origin/CSRF, unknown
  credentials, inactive/revoked/expired Sessions, Bootstrap, and audit-secret
  boundaries have discriminating evidence.
- **Proportionality:** fixed roles, opaque server sessions, one datastore, and a
  manual rare-incident boundary fit the approved small-team application. SSO,
  custom permissions, impersonation, device risk, JWT, and break-glass recovery
  remain intentionally absent.
- **Change shape:** the branch is large because it replaces one cross-cutting
  temporary boundary and supplies migration, generated contracts, UI, tests,
  browser evidence, and reconciliation in one architecture Change. The commit
  sequence remains divided into small reviewable checkpoints, and splitting by
  frontend/backend would create parallel writers for the same access contract.

## Evidence continuity and residual gates

The aggregate result is 41 backend files / 219 tests and 11 Web files / 56
tests, plus typecheck, production build, formatting, framework, migration,
generated-contract, Diff, rollback, and browser evidence. The evidence files
record their exact targets and cleanup rather than relying on this review as a
second source of truth.

The following are release or later-Issue gates, not incomplete Issue #50 code:

- select and validate a real SMS adapter, credentials, cost, templates, and
  production availability;
- review the production Origin/Cookie topology and Session policy values;
- authorize production migration, one-time Bootstrap, verification of a second
  active administrator, monitoring, deployment, and activation;
- design a post-activation rollback/session-invalidation procedure if a release
  needs that path;
- open a separate recovery-security Change only if lockout frequency, compliance,
  or team scale justifies it;
- let Issue #57 continue independently and rebase/regenerate only after this
  shared Identity contract is accepted.

## Final verdict

The fixed diff is `ready for reconciliation and human PR review`. It is not a
merge, deployment, migration, Bootstrap, production-activation, or residual-risk
acceptance decision.
