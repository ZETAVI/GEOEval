# Decision Brief: Identity and Access governance foundation

- Owning Issue: [#50](https://github.com/ZETAVI/GEOEval/issues/50)
- Confirmation state: Confirmed for bounded implementation on 2026-09-04
- Next gate: implement and verify without creating an automated break-glass path

## Outcome

Terminal customers, operations users, system administrators, and agents need
one server-authoritative account, authentication, session, and access boundary.
Administrators must be able to establish and govern internal accounts without
database editing, while role or status changes immediately invalidate every
existing session and leave attributable audit evidence.

## Scope

- In: fixed single-role accounts, internal-account pre-provisioning, account
  status and revision, opaque Cookie sessions, complete session revocation,
  declarative backend access, account governance and audit, first-administrator
  Bootstrap, fixed role homes, and migration/recovery evidence.
- Out: multi-role accounts, role switching, user-defined RBAC/ABAC, JWT or
  OAuth access/refresh tokens, SSO, device fingerprinting, real SMS activation,
  agent attribution, production deployment, and real-account creation.

## Decisions

| Decision | Choice | Rationale | Owner |
| --- | --- | --- | --- |
| Role model | Exactly one of `TERMINAL_CUSTOMER`, `OPERATIONS`, `ADMINISTRATOR`, or `AGENT` per account | The product has four fixed journeys and no permission editor or combined authority | Product owner, confirmed |
| Customer/internal boundary | Customer and internal roles never convert in either direction; a person serving in both capacities uses separate accounts | Customer-owned brands and future money/order history must not become internal-role data through a role edit | Product owner, confirmed |
| Internal role change | Operations, administrator, and agent accounts may change between internal roles under administrator governance | The company can change a staff or partner duty without inventing a second identity system | Product owner, confirmed |
| Session credential | Keep a high-entropy opaque server-issued credential and store only its digest in PostgreSQL | Server-side state supports current-role checks and immediate revocation without self-contained stale authority | Product owner accepted direction; engineering owns implementation |
| Session governance | Allow concurrent sessions; provide current logout, self logout-all, administrator revoke-all, server-side idle/absolute expiry, and reasoned revocation | Multiple devices are legitimate, but every credential needs a complete lifecycle | Product owner accepted direction; engineering owns implementation |
| Access contract | Replace the temporary Guard combinations with one fail-closed declarative backend contract and a narrow authenticated principal | Business modules must declare fixed role needs without parsing Cookies or selecting Identity internals | Product owner accepted direction; architecture owner implements |
| Administrator self-operation | Self-service logout is allowed; an administrator cannot administratively change their own role/status or revoke their own sessions | Another active administrator must own consequential self-governance; no dual approval is added | Product owner, confirmed |
| Last administrator | No mutation may remove the last active administrator; concurrent governance writes serialize around this invariant | A check outside the write transaction can allow two simultaneous demotions | Product owner, confirmed; engineering owns transaction |
| Audit meaning | Server derives actor and time; accepted governance changes append actor, target, before/after, reason, and time in the same transaction | Client-supplied identity cannot forge the audit; cryptographic external-ledger tamper evidence is not implied | Product owner accepted direction; engineering owns storage |
| First administrator | A one-time offline deployment CLI uses an explicit mobile and deployment-managed secret; no HTTP Bootstrap exists | A new environment needs a recoverable initial authority without a public backdoor | Product owner, confirmed at boundary level |
| Sole-administrator loss | Do not build a separate Recovery Secret or break-glass CLI in the first release; establish another administrator through normal governance and treat a true sole-admin lockout as a separately authorized production incident | A dormant recovery authority is not justified for the current small application; real recurrence or compliance needs can open a stronger follow-up | Product owner, confirmed |

## Acceptance Boundaries

- Public registration can create only an active terminal-customer account; an
  administrator-pre-provisioned internal mobile signs into its assigned role.
- Inactive accounts cannot create or use a session. Role/status changes and
  explicit revoke-all commit with session revocation and audit or do not commit.
- The backend returns a current authenticated principal and enforces declared
  roles regardless of frontend routes, request bodies, or Cookie contents.
- Administrator self-mutation and every concurrent path that could remove the
  last active administrator are rejected without a partial write.
- Role homes are `/brands`, `/admin`, `/operations`, and `/agent`; none provides
  a role switcher or substitutes frontend hiding for authorization.
- Bootstrap is replay-safe, absent from HTTP, and never creates an additional
  implicit administrator when an active administrator already exists.

## Assumptions and Open Questions

- Assumption: initial implementation uses role-family session-policy defaults
  that remain configuration, not product vocabulary; exact values may be tuned
  from isolated runtime evidence without changing the ownership model.
- Assumption: `immediate revocation` means no request authenticated after the
  governance transaction commits can use an old session. It does not attempt to
  cancel a request already admitted before that commit.
- Assumption: operational readiness establishes a second active administrator
  through the normal workspace before production depends on administrator-only
  work. This is a runbook warning rather than a second-admin database invariant.
- Deferred trigger: if a real sole-administrator lockout occurs, compliance
  requires formal break-glass access, or the operator team grows beyond the
  current small-team boundary, open a separate recovery-security Change rather
  than extending Bootstrap in place.

## Confirmation and Next Gate

- Confirmation: role, account-conversion, session architecture, access-contract,
  administrator self-operation, last-administrator, and bounded recovery
  boundaries are confirmed.
- Next action: begin the first compatible implementation slice using isolated
  PostgreSQL and Redis targets.
- Confirmation required before: real SMS, real administrator creation,
  production migration, deployment, activation, PR merge, or a future
  break-glass capability.
