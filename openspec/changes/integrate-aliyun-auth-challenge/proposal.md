# Change: Integrate protected real authentication challenges

- Status: Implemented and locally validated; protected server-Demo activation
  approved, public activation gates remain.
- Issue:
  [#64](https://github.com/ZETAVI/GEOEval/issues/64)
- Owner: ZETAVI
- Lane/class: identity / release readiness; architectural, critical identity,
  privacy and external-cost boundary

## Why

The accepted Identity flow can create, consume and expire mobile Challenges,
but it can only deliver a deterministic development code and production
correctly refuses that adapter. A public release therefore has no usable
authentication path. An unprotected SMS endpoint would also let an attacker
spend the shared Alibaba Cloud account and repeatedly target a mobile number.

The Alibaba Cloud enterprise account, SMS service and CAPTCHA 2.0 pay-as-you-go
instance are available. A Web/H5 invisible test scene named
`geoeval_auth_challenge_web` exists with SceneId `18hnihr4`. The product owner
accepted the approved company-qualified `互动派科技` signature for the initial
release. It is visible to recipients. The protected server Demo may therefore
activate the current test scene and real SMS behind Basic Auth; formal CAPTCHA
mode and removal of that outer gate remain separate public-release decisions.

## Outcome

Every production request for a login or registration SMS first crosses one
server-authoritative Alibaba Cloud CAPTCHA gate. Identity then creates a
cryptographically random six-digit Challenge and submits it through one
Alibaba Cloud SMS adapter with explicit accepted, rejected and unknown
semantics. Existing Account, Challenge, Session and fixed-role behavior remains
unchanged.

## Scope

### In

- One opaque `captchaVerifyParam` on every public Challenge request path.
- A narrow human-verification port, Alibaba Cloud adapter and application-owned
  policy for verified, rejected and provider-unavailable results.
- The fixed server-side CAPTCHA SceneId and the approved constrained
  unavailable degradation budget.
- A Challenge-code generator seam with deterministic local/test and
  cryptographically secure real implementations.
- One Alibaba Cloud domestic SMS delivery adapter behind the existing
  `ChallengeDeliveryPort`, with no automatic retry.
- Explicit runtime selection, fail-closed production configuration, stop-new-
  Challenge switch, bounded limits and redacted operational evidence.
- Web/H5 invisible CAPTCHA integration, same-origin acquisition forwarding,
  generated client updates and focused offline/integration tests.

### Out

- A provider registry, automatic second-provider failover, general notification
  platform, SMS queue, device-fingerprint store or custom risk engine.
- International or Hong Kong, Macao and Taiwan SMS.
- Changing fixed roles, account creation, Challenge consumption, Session
  authority, acquisition ownership or CSRF rules.
- Creating RAM identities or AccessKeys, changing shared account-wide alarms,
  switching the CAPTCHA scene to formal mode or removing the protected-Demo
  access gate as repository implementation. Separately authorized account and
  controlled-runtime operations may supply evidence without expanding this
  code Change.
- Claiming that an accepted SMS submission proves carrier delivery or login.

## Impact

- Identity application and infrastructure gain two external adapters but keep
  their dependency direction through owner-local ports.
- `POST /identity/challenges`, the generated client and both direct and
  acquisition Web paths gain the opaque CAPTCHA parameter.
- Runtime configuration gains explicit provider modes and Aliyun identifiers;
  credentials remain deployment-managed secrets.
- No database schema change is planned for the first implementation package.
  Existing Challenge digest, TTL, supersession and cleanup remain authoritative.
- Accepted behavior will reconcile into
  `openspec/specs/identity-and-access/spec.md` and the existing Identity
  operations runbook. No new permanent design document is admitted.

## Control State

- Documentation impact: `update` the current Identity spec and runbook;
  `generate` OpenAPI/client types; archive this Change after accepted behavior
  is promoted. The current Identity spec has no active Evolution marker.
- Workspace: Issue #64 worktree on `codex/issue-64-ram-policy` from
  `main@d099547`, following merged PR #134, owned by Issue #64,
  targeting protected `main` with `main-direct` topology.
- Shared ownership: this Change owns Identity/CAPTCHA/SMS code and its Web
  entry path. If implementation must touch payment-owned runtime composition,
  Recharge contracts or payment pages, stop and coordinate with Issue #77.
- Exit: remove the clean worktree and branch after PR #146 is merged and its
  post-integration revision is reconciled. Issue #64 and this active Change,
  rather than a merged workspace, retain the remaining production gates.
