# Change: Activate public authentication

- Status: Approved for implementation by the product owner on 2026-09-22;
  external account and production actions remain verified release steps.
- Issue: [#156](https://github.com/ZETAVI/GEOEval/issues/156)
- Owner: ZETAVI
- Lane/class: identity / public release; architectural, critical security,
  privacy, external-cost and production boundary

## Why

Issue #64 delivered real Alibaba Cloud CAPTCHA and SMS behind the server Demo's
outer Nginx Basic Authentication gate. The accepted product direction already
defines a public homepage and public terminal-customer registration. The product
owner has now approved removing that outer gate so any mainland mobile user can
complete the normal protected registration/login flow.

Basic Auth currently also hides non-product Foundation validation endpoints,
Swagger, and the full public attack surface. Removing two Nginx directives
without closing those exposures, formalizing CAPTCHA, constraining cost and
publishing the security-data notice would weaken rather than complete the
release boundary.

## Outcome

`app.geohdp.com` is publicly reachable without shared credentials. Registration
and login continue to require one fresh formal Alibaba CAPTCHA verification and
one SMS OTP. All non-public product APIs remain protected by the existing
Session, fixed-role and CSRF contract. Operators retain exact usage budgets, a
stop-new-Challenge switch and a reversible Nginx/release rollback.

## Decision brief

### Scope

- **In:** public homepage and registration/login; formal CAPTCHA; security-data
  notice; coarse IP throttles; persistent daily/monthly SMS-attempt budgets;
  RAM source-IP restriction and credential rotation; production surface audit;
  Basic Auth removal and named browser/runtime verification.
- **Out:** changing Account, Session, role, acquisition, evaluation, Writer,
  Recharge or payment meaning; a second SMS provider; a custom risk engine;
  repeating real payment; claiming general carrier reliability.

### Decisions

| Decision | Choice | Rationale | Owner |
| --- | --- | --- | --- |
| Public audience | Any mainland mobile user may register as an unattributed terminal customer | Matches the approved product vision and current Identity behavior | Product owner |
| Outer gate | Remove site-wide Basic Auth after the release checks pass | Identity is the product authentication authority; shared demo credentials are no longer required | Product owner |
| CAPTCHA | Switch the existing Web/H5 invisible scene to formal/default risk policy | Alibaba documents test mode as connection-only and requires formal mode for risk decisions | Product owner / release owner |
| Cost control | 100 persisted attempts/day and 2,500/month, with an 80% warning signal and the existing manual stop switch | Expected traffic is 1,000–2,000/month; limits are reversible deployment policy with bounded headroom | Product owner |
| Public technical surface | Production omits Swagger and Foundation HTTP/Web probes | Neither is a customer capability and Basic Auth currently masks both | Architecture steward |
| Risk-path evidence | Reuse deterministic test-mode second-challenge evidence; require formal ordinary pass and formal deny/replay evidence, but not a forced real-risk event | Formal risk classification is provider-controlled and cannot be deterministically forced | Architecture steward |

### Acceptance boundaries

- An anonymous visitor receives the public homepage and entry page without
  Basic Auth, but protected APIs and role routes disclose no business data.
- A fresh formal CAPTCHA value can produce one SMS Challenge and user-entered
  OTP can create the expected Session; missing/replayed/invalid evidence creates
  no Challenge.
- Daily/monthly attempt limits are transactionally exact across concurrent
  mobiles and return a generic stop result without provider calls once exhausted.
- Production does not register Swagger or Foundation HTTP endpoints and the Web
  Foundation probe returns not found.
- The runtime RAM identity works only from the named production egress; old/local
  credentials are rotated or revoked without entering repository evidence.
- Rollback can restore the protected Nginx configuration and prior immutable
  release without deleting Accounts, Challenges, Sessions or payment facts.

## Impact

- Identity gains one singleton budget-control record; it is operational control
  state, not an SMS delivery ledger or business truth.
- The public HTTP edge gains narrow rate-limit zones and security headers while
  callback routing remains unchanged.
- The existing Identity spec and runbook remain the current owners. Accepted
  public-release behavior will reconcile there; no new permanent architecture
  document is admitted.

## Control state

- Base: `main@bed4d41`; branch `codex/issue-156-public-auth`; isolated managed
  worktree; topology `main-direct`.
- Shared ownership: this Change owns Identity public activation, Web privacy
  notice, API production exposure and the application Nginx file. Recharge and
  payment behavior remain read-only regression surfaces.
- Documentation impact: update current Identity spec/runbook and application
  deployment owner; generate Prisma/OpenAPI only when executable contracts
  require it; archive this Change after integration and production evidence.
- Exit: remove branch/worktree only after the final PR is merged, deployed,
  reconciled and Issue #156 reaches Done.
