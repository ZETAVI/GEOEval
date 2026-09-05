# Final fixed-diff code and architecture review

Date: 2026-09-05

- Fixed comparison base:
  `origin/main@ddadf7718a6896c5682603be9ec87de77556a98d`.
- Reviewed implementation head after current-truth reconciliation and latest
  main sync: `329d710`.
- Reviewed scope: the approved Issue #50 Identity, authenticated-access,
  generated-contract, role-entry, administrator-workspace, migration, test, and
  evidence boundary. M4/Issue #35 changes brought in from `main` were reviewed
  only for overlap and regression.
- Review method: approved proposal/spec/task trace, codebase-design deletion and
  dependency tests, architecture-boundary inspection, critical security/data
  paths, generated public contracts, three independent read-only review lanes,
  complete automated regression, isolated application rollback, and real
  browser evidence.

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
crosses the independent Issue #57 GEO Optimization/article boundary.

## Engineering-quality findings

All material findings discovered across the fixed-diff reviews were resolved
before this verdict.

| Severity | Finding | Resolution |
| --- | --- | --- |
| Must fix | A malformed percent-encoded Session Cookie escaped decoding and returned 500 instead of a generic authentication failure | `e3a896b` catches decoding failure and the HTTP forgery matrix proves bounded 401 |
| Must fix | Null/malformed authentication and Governance bodies, including invalid UUID input, could reach property access or Prisma and return 500 | `e3a896b` validates unknown input before repository access; focused HTTP tests prove 400 |
| Must fix | Authentication could read ACTIVE before a concurrent deactivation committed, wait on the Account write, then create a Session that the earlier revoke-all never saw | `08a9d53` locks and reloads the Account inside Session creation; a deterministic PostgreSQL interleaving proves no live Session survives |
| Must fix | Governance proceeded without the singleton control row, weakening the serialized last-administrator invariant | `08a9d53` requires exactly one GLOBAL control row and fails closed with `GOVERNANCE_CONTROL_UNAVAILABLE`; the integration rollback test proves no partial write |
| Should fix | Repeated query parameters could flow as arrays and produce 500 | `08a9d53` treats query input as unknown, accepts only one bounded string, and proves repeated search returns 400 |
| Should fix | Web offered only current-Session logout despite the approved self logout-all lifecycle | `39dd2b9` adds one confirmed shared action and generated-client call to all four role sidebars; Web contract tests verify the request |
| Should fix | Media editor authentication failures were not uniformly routed through the shared Session state | `39dd2b9` centralizes the decision across platform, supplier, resource, and refresh branches; a 401 test proves the local error path is skipped |
| Should fix | The Governance audit action was a closed domain/database enum but an unbounded OpenAPI string | `a267115` publishes the same enum through OpenAPI and the generated client |
| Should fix | Rollback evidence could be read as authorization for old code after new status/idle-expiry semantics activate | `a267115` and the refreshed `ddadf77` rehearsal limit the proof to pre-activation rollback |
| Improve | IdentityModule exported application services unused by external modules | `08a9d53` removes them; metadata and current principal remain the cross-module seam |
| Improve | A test filename described the retired `RoleGuard` | `b4abe59` renames it to the current access contract |

The runtime/Web and security/architecture reviewers independently rechecked
their findings after the repairs. The workflow/evidence reviewer identified the
required Final-PR, Issue-body/Project-status, stage wording, and Change-archive
closeout; those are the remaining remote and lifecycle actions, not code
findings.

After the initial review, Issue #26 Query Generator and later M4/Issue #35
changes entered `main`. Shared schema, controller, test, generated-contract, and
Architecture Overview surfaces were reviewed by owner instead of accepting one
side wholesale. The current schema retains both Account relation families, all
new Query endpoints consume `CurrentPrincipal`, and the latest main sync leaves
the final Identity/Web repairs untouched. The post-sync complete regression is
the authoritative evidence.

No unresolved must-fix or should-fix code finding remains in the reviewed diff.

## Architecture qualities

- **Cohesion:** Identity is deepened inside the modular monolith into focused
  authentication, Session, access, governance, maintenance, and Bootstrap
  responsibilities; removing the module would make those invariants leak back
  into every controller, so the boundary hides real complexity.
- **Dependency direction:** product controllers depend on Identity's small
  metadata/current-principal interface. Identity imports no business module and
  no caller receives repository, Cookie, or application-service internals.
- **Integrity:** Account locking serializes authentication against governance;
  the Governance control row serializes the last-administrator invariant; one
  serializable transaction owns Account revision, Session invalidation, and
  audit.
- **Security:** authorization fails closed; Cookie/Origin/CSRF, unknown
  credentials, inactive/revoked/expired Sessions, missing governance control,
  Bootstrap, and audit-secret boundaries have discriminating evidence.
- **Reuse and locality:** one declarative access contract and one Web Session
  boundary have multiple stable consumers with the same semantics. Business
  errors remain local to their modules.
- **Proportionality:** fixed roles, opaque server Sessions, one datastore, and a
  manual rare-incident boundary fit the approved small-team application. SSO,
  custom permissions, impersonation, device risk, JWT, and break-glass recovery
  remain intentionally absent.
- **Change shape:** this architectural Change replaces one cross-cutting
  temporary boundary and must carry migration, generated contracts, UI, tests,
  browser evidence, and reconciliation together. Its commit sequence remains
  reviewable; splitting by frontend/backend would create two writers for the
  same access lifecycle rather than independent value.

## Evidence continuity and residual gates

The authoritative aggregate result is 41 backend files / 228 tests and 11 Web
files / 58 tests, plus typecheck, production build, formatting, framework,
22-migration deployment, generated-contract Diff, current -> `main@ddadf77` ->
current application rollback, and browser evidence. The evidence files own
their exact targets and cleanup.

The following are release or later-Issue gates, not incomplete Issue #50 code:

- select and validate a real SMS adapter, credentials, cost, templates, and
  production availability;
- review the production Origin/Cookie topology and Session policy values;
- authorize production migration, one-time Bootstrap, verification of a second
  active administrator, monitoring, deployment, and activation;
- design a post-activation rollback/Session-invalidation procedure if a release
  needs that path;
- open a separate recovery-security Change only if lockout frequency,
  compliance, or team scale justifies it;
- let Issue #57 continue independently and rebase/regenerate only after this
  shared Identity contract is accepted.

## Final verdict

The fixed implementation is `ready for a Final PR and human review`. The
workflow is not yet complete until the PR relationship, Issue/Project review
state, active-Change archive, and remote checks are recorded. This verdict is
not merge, deployment, migration, Bootstrap, production-activation, or
residual-risk acceptance.
