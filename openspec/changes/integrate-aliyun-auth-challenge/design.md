# Protected authentication challenge design

Design date: 2026-09-20. Owner:
[Issue #64](https://github.com/ZETAVI/GEOEval/issues/64).

## 1. Architecture readiness

**Decision:** ready for credential-free implementation. Human verification and
SMS transport are two distinct external boundaries with different failure
semantics. They are represented by two narrow ports owned by Identity rather
than a generic provider framework.

**External gates:** a compliant signature, minimum-permission RAM runtime
identity, named paid test numbers, formal CAPTCHA policy and production
activation remain human-owned. No implementation or passing offline test grants
those permissions.

## 2. Current behavior and invariants

`AuthenticationService.requestChallenge` currently normalizes the mobile,
creates a deterministic code, persists only its digest, applies database-backed
same-mobile resend/window limits and then invokes
`ChallengeDeliveryPort.deliver`. Production rejects deterministic delivery.

This Change preserves:

- Identity ownership of Challenge ID, digest, expiry, supersession, failed
  attempts, single consumption and Session creation;
- the existing persist-before-deliver order, which is necessary when a provider
  may have received a request whose response is lost;
- acquisition-token ownership at the same-origin server bridge;
- no plaintext code, provider credential or CAPTCHA parameter in durable
  records or ordinary logs.

## 3. Module architecture card

### Outcome and boundary

- **Owner:** Identity and Access.
- **Capability:** admit one human-verified request, issue one mobile Challenge
  and submit its code for delivery.
- **Owned state:** existing MobileChallenge and mobile rate-limit records.
- **Not owned:** Alibaba risk data, carrier delivery truth, provider account
  balance, registered trademarks, RAM credential lifecycle or a general
  messaging platform.
- **Consumers:** public registration/login and agent-acquisition entry use the
  same application command.

### Public commands and facts

The public command adds one opaque `captchaVerifyParam`. The public response
remains `challengeId`, `expiresAt` and a local/test-only
`developmentCode`. Provider request IDs, error codes, risk codes and SMS
receipt identities stay internal.

### Dependency direction

```text
Web/H5 CAPTCHA V3
  -> captchaVerifyParam
  -> same-origin Web bridge or generated API client
  -> Identity requestChallenge
       -> HumanVerificationPort
       -> HumanVerificationPolicy
       -> ChallengeCodeGenerator
       -> IdentityRepository.issueChallenge
       -> ChallengeDeliveryPort
  -> Challenge response
```

Application/domain ports do not import Alibaba SDK types. Infrastructure
adapters translate SDK requests, responses and errors into owner-local result
types. One provider client is reused for the process lifetime.

### Failure and recovery

| Failure | Public result | State and recovery |
| --- | --- | --- |
| CAPTCHA parameter missing or malformed while enabled | 400 | no Challenge; client reacquires verification |
| CAPTCHA returns `VerifyResult=false`, including replay or scene mismatch | 403 | no Challenge; no detailed risk code exposed |
| CAPTCHA network, DNS, timeout or HTTP 5xx | constrained degradation or 503 | policy budget decides; local limits and stop switch remain active |
| CAPTCHA credential, permission, account or request 4xx | 503, fail closed | operator fixes configuration; never degraded |
| SMS returns `Code=OK` | Challenge response | means provider accepted submission only |
| SMS returns an explicit business/configuration error | 503 | persisted short-lived Challenge is unusable and expires; no retry |
| SMS call is transport-timeout/unknown after possible submission | Challenge response with internal unknown observation | wait; normal resend only after existing interval |
| cost/abuse incident or manual stop | 503 before new Challenge creation | existing Sessions and prior Challenges are unchanged |

No provider call is retried automatically. Alibaba documents that SendSms is
not idempotent; timeout recovery must not manufacture duplicate SMS.

### Security, privacy and capacity

- Production requires real CAPTCHA and SMS modes; deterministic/disabled
  combinations fail configuration.
- Credentials come only from deployment environment/credential injection, use
  a minimum-permission RAM identity and are never returned or logged.
- Logs/metrics may contain internal Challenge ID, provider request ID, outcome
  category and latency. They exclude code, full mobile,
  `captchaVerifyParam`, AccessKey material and raw device/behavior data.
- Existing same-mobile protection is calibrated to 60 seconds and five
  requests/hour. Alibaba SMS-side limits remain a second boundary.
- A coarse request-origin/IP control, daily/monthly usage observation and the
  stop switch must exist before paid activation. The first implementation does
  not create a durable delivery ledger merely for counters.

## 4. Interface alternatives

### A. Verify CAPTCHA in the HTTP controller

Rejected. It would protect only one transport, let acquisition and future
callers drift, and mix Alibaba failures with presentation code.

### B. Add `HumanVerificationPort` and policy at the application boundary

Selected. The port owns external verification translation; the policy owns the
approved constrained degradation decision; the command guarantees verification
precedes Challenge persistence.

The port returns `verified | rejected | unavailable` plus a bounded internal
category. The policy must never treat a normal `VerifyResult=false`,
parameter/scene error, replay, credential error or permission error as
unavailable.

### C. Build a generic verification/provider registry

Rejected. There is one approved provider and no stable second implementation.
A registry would expand configuration and public concepts without removing a
current complexity.

### Delivery seam

The existing `ChallengeDeliveryPort` is retained. It returns
`accepted | unknown` and optional local development code; it throws one
owner-local explicit-rejection error for provider-declared failures. This makes
persist-before-deliver behavior visible to the application without leaking SDK
classes.

`ChallengeCodeGenerator` is a new earned seam because real and deterministic
code generation have different security and test contracts. It is not coupled
to the transport adapter.

## 5. CAPTCHA policy

- Browser V3 uses region `cn`, the configured public prefix and fixed SceneId
  `18hnihr4`; popup mode preserves the invisible default journey.
- The browser submits the opaque value unchanged. The backend separately sends
  the configured SceneId to `VerifyIntelligentCaptcha`.
- `T005` is the expected pass signal while the scene uses its current test
  plan. Formal operation accepts any response with successful API status and
  `VerifyResult=true`; it does not hard-code `T005` as the only pass code.
- Rejected results, including F008/F018 replay and F012/F020 mismatch, are
  denied. Only invocation-layer unavailability may enter degradation.
- Degradation is disabled by default. If explicitly enabled, it has a finite
  per-process consecutive-unavailable allowance and automatically closes after
  the threshold. The first production activation must remain single-replica or
  budget the allowance across replicas; a restart is an activation event that
  requires the same stop/health check.

The per-process choice is deliberately bounded for the current small
single-instance runtime. A shared distributed circuit is not introduced until
real multi-replica operation demonstrates that need.

## 6. SMS adapter

- Package: official Apache-2.0
  `@alicloud/dysmsapi20170525` V2 SDK; version is pinned by the repository
  lockfile.
- Endpoint: `dysmsapi.aliyuncs.com`; one domestic mobile per request.
- Request: approved SignName, TemplateCode and
  `TemplateParam={"code":"<six digits>"}`.
- `OutId` is omitted in the first release because the internal Challenge ID is
  already owned locally and provider metadata must not become an alternate
  identity.
- `Code=OK` is accepted. Non-OK response bodies are explicit rejections.
  Transport exceptions are unknown only when submission may have occurred.
- SDK automatic retry is disabled and the timeout is explicit.

Provider return categories are bounded to permission/credential, qualification,
signature/template, balance, rate-limit, explicit provider failure and
transport unknown. Raw messages are diagnostics, not public contracts.

## 7. Runtime configuration

Local/test defaults keep deterministic delivery and verification disabled.
Production requires:

- `AUTH_CHALLENGE_MODE=aliyun`
- `AUTH_HUMAN_VERIFICATION_MODE=aliyun`
- deployment-provided Alibaba Cloud credentials
- `ALIYUN_CAPTCHA_SCENE_ID`
- `ALIYUN_SMS_SIGN_NAME`
- `ALIYUN_SMS_TEMPLATE_CODE`
- explicit provider timeout and unavailable-policy values
- `AUTH_CHALLENGE_SENDING_ENABLED=1`

The runtime schema rejects missing combinations, deterministic production,
enabled delivery without sign/template, and enabled CAPTCHA without SceneId.
Secrets are not copied into non-Identity config projections.

## 8. Web integration

The client wrapper owns dynamic loading of `AliyunCaptcha.js`, initialization,
popup invocation and cleanup. EntryFlow asks it for one opaque result only when
the user requests a code. Rejected or expired client verification returns to
the mobile step with a concise retry message.

Direct API requests and the acquisition same-origin bridge both forward the
opaque value. The acquisition bridge continues to ignore any client-supplied
visit token and reads its signed token only from the server cookie.

The Alibaba script observes browser/device/network and interaction data for
risk detection. Product privacy disclosure and processor review are release
requirements; GEOEval neither serializes nor stores those raw observations.

## 9. Rollout and rollback

1. Keep the scene in test mode and verify pass, second-challenge pass and deny
   plans against a mock SMS adapter.
2. Verify the real SMS adapter offline with fake SDK clients and fixed
   response/error fixtures.
3. Separately create minimum-permission RAM runtime credentials and perform
   named-number paid tests only after approval.
4. Switch the CAPTCHA scene to formal mode only after the three test plans pass.
5. Activate production with stop switch initially closed, then open it during a
   named observation window.

Rollback closes new Challenge sending or restores the prior release. It does
not delete Challenge/Session records, retract a possibly delivered SMS or change
Account/role state.

## 10. Verification

Smallest discriminating evidence:

- missing, forged, rejected, replayed and scene-mismatched CAPTCHA values never
  create a Challenge;
- infrastructure unavailability degrades only within the configured finite
  budget and then closes;
- generated real codes are six digits and do not use the deterministic value;
- explicit SMS rejection returns 503 without retry; transport unknown returns
  the persisted Challenge without retry;
- production configuration cannot select deterministic/disabled adapters and
  cannot start without required provider identifiers;
- direct and acquisition Web paths forward only the opaque CAPTCHA value while
  preserving Origin/CSRF and server-owned acquisition token rules;
- stop-new-Challenge leaves existing Sessions valid;
- logs and errors contain no plaintext code, full mobile, token or credential.

