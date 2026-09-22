# Public authentication activation design

Design date: 2026-09-22. Owner:
[Issue #156](https://github.com/ZETAVI/GEOEval/issues/156).

## 1. Architecture readiness

**Verdict:** ready for bounded implementation. The existing Identity state
machine and Alibaba adapters remain unchanged. Public activation is an edge,
control-state, privacy and provider-account release change.

**Must-fix findings before Basic Auth removal:**

1. production currently exposes Swagger under `/api/openapi` once the outer
   gate disappears;
2. the public `FoundationController` and `/foundation-probe` are F0 validation
   surfaces, not product capabilities;
3. same-mobile limits do not bound distributed source-IP abuse or aggregate
   monthly SMS attempts;
4. the entry copy does not disclose Alibaba's browser, network, device and
   interaction-risk processing.

No new provider framework, general rate-limit service or notification platform
is justified.

## 2. Affected slice and ownership

| Surface | Owner | Change |
| --- | --- | --- |
| Challenge lifecycle and budget | Identity | add exact singleton attempt budget around existing Challenge persistence |
| CAPTCHA and SMS translation | Existing Alibaba infrastructure adapters | no interface change |
| Public HTTP edge | Application deployment | remove Basic Auth; add exact route throttles and response headers |
| Public entry/privacy copy | Web entry | link one public privacy notice before CAPTCHA/SMS processing |
| Swagger/F0 exposure | API/Web composition | omit in production; retain local/test validation |
| RAM/CAPTCHA account state | Release operation | formal mode, fixed source IP and credential rotation |

Recharge callbacks keep their existing exact locations and independent process.
No payment key, state machine, order or ledger is modified.

## 3. Public reachability contract

```text
anonymous browser
  -> public homepage / entry / privacy
  -> CAPTCHA client
  -> exact Nginx issue throttle
  -> server-side VerifyIntelligentCaptcha
  -> Identity aggregate + per-mobile budgets
  -> SendSms
  -> user-entered OTP
  -> Session cookie
  -> existing role guard / CSRF / owner checks
```

Public API methods are limited to health, acquisition resolution, Challenge
request and Session creation plus the two signed payment callbacks. Every other
registered product controller continues through the global AccessGuard and,
where required, fixed-role metadata. Swagger and Foundation validation routes
are absent rather than relying on obscurity.

## 4. Aggregate budget control

One singleton `mobile_challenge_budgets` row owns conservative attempt counts:

- `day_key` and `month_key` use Asia/Shanghai calendar boundaries;
- `day_count` and `month_count` count persisted Challenge attempts, including
  a later provider rejection or unknown outcome;
- migration initializes counts from retained current-month Challenge rows;
- `SELECT ... FOR UPDATE` serializes all mobiles before Challenge persistence;
- period rollover resets only the corresponding counter in the same transaction;
- exceeding either limit creates no Challenge and invokes no SMS.

A pre-verification snapshot prevents ordinary requests after an exhausted budget
from purchasing another CAPTCHA call. The transaction performs the authoritative
second check, so a concurrent race may consume at most a CAPTCHA call but cannot
exceed the SMS attempt cap.

At 80% of either cap, Identity emits one bounded warning event for the exact
threshold crossing. Public responses contain no count, phone, code or provider
detail. Operators can set `AUTH_CHALLENGE_SENDING_ENABLED=0` and restart the API
through the normal release path; existing Sessions and Challenges remain valid.

Initial deployment policy is 100/day and 2,500/month. These values are config,
not product invariants.

## 5. Edge controls

Nginx defines two IP-keyed shared zones:

- Challenge issue: 6 requests/minute with burst 6 for
  `/api/entry/challenge` and `/api/identity/challenges`;
- Session completion: 30 requests/minute with burst 10 for
  `/api/identity/sessions`.

Nginx returns 429 for excess traffic and stores no new application-level IP
record. Existing access logs retain their normal bounded operational lifecycle.
The server is the public edge; no untrusted proxy is allowed to replace
`$remote_addr`.

The HTTPS server adds HSTS, no-sniff, deny framing and a strict-origin referrer
policy. A broad CSP is deferred because Next, Alibaba CAPTCHA, Amap and payment
cashier flows need a separately verified directive set; the current release does
not add an untested policy that can break payment or CAPTCHA.

## 6. Privacy notice

The public notice names 互动派科技股份有限公司 and its published company contact,
and explains:

- mobile/account/session processing and Identity retention;
- Alibaba CAPTCHA processing of browser, IP/network, device and mouse/touch/key
  behavior data excluding input content;
- Alibaba SMS processing of the mobile and one-time code for delivery;
- GEOEval stores no raw CAPTCHA fingerprint or behavior trajectory;
- Challenge rows are cleaned after the configured 24-hour terminal retention and
  inactive Session rows after 30 days; account and business records follow their
  service/legal lifecycle;
- access, correction, deactivation/deletion and inquiry requests use the named
  contact path.

The entry action links the notice before the user triggers CAPTCHA. This Change
records operational facts and does not claim to replace counsel review of the
company's complete privacy program.

## 7. Formal CAPTCHA and provider evidence

Alibaba's official current documentation says test mode skips risk decisions and
must be switched to formal after integration; switching takes about five minutes.
Formal invisible mode decides second challenge from provider-controlled device,
environment and behavior signals. It offers no deterministic way to force a real
risk event.

Therefore:

- existing test-mode second-challenge pass/deny evidence proves UI integration;
- formal mode must prove an ordinary invisible pass;
- formal replay/invalid evidence must fail without Challenge persistence;
- a real second challenge is recorded when naturally observed, but is not a
  release prerequisite.

The default formal/basic policy is selected. A custom risk engine or forced
attack-mode test is out of scope.

## 8. RAM and credential lifecycle

The server's fixed outbound IPv4 is `8.138.100.3`. The existing two-action RAM
policy adds:

```json
{
  "IpAddress": {
    "acs:SourceIp": ["8.138.100.3"]
  }
}
```

The server must reach CAPTCHA after the policy update; the retained local
credential must receive a policy denial from an outside source. Then create or
activate the replacement runtime key, install it through the protected
`/etc/geoeval` environment path, restart only the API under both host locks,
prove the allowed route, and revoke the superseded key. No AccessKey value enters
Git, GitHub, logs or the verification record.

Permission edits and key creation/revocation retain an action-time human
confirmation even though the overall public-release outcome is approved.

## 9. Failure and recovery matrix

| Failure | Public/system result | Recovery |
| --- | --- | --- |
| Nginx issue/complete throttle | 429 before application/provider | wait; adjust only from observed false positives |
| Global daily/monthly cap | generic 503; no SMS | inspect aggregate state; stop or raise config through approved release |
| CAPTCHA reject/replay/mismatch | 400/403; no Challenge | acquire fresh verification |
| CAPTCHA infrastructure unavailable | existing finite degradation, then 503 | observe and close sending if growth continues |
| CAPTCHA/RAM permission/config error | 503 fail closed | restore policy/key or protected release |
| SMS explicit reject | existing 503, persisted attempt expires | repair provider state; no automatic retry |
| Public exposure regression | restore prior Nginx file, retaining current release if safe | Basic Auth returns immediately |
| Application regression | stop sending, restore prior immutable release and Nginx | preserve all business facts |

## 10. Verification matrix plan

- static: framework validation, formatting, types, generated Prisma/OpenAPI;
- focused: config limits, exact concurrent budget boundary, rollover, warning
  redaction, production controller inventory, Swagger absence, Nginx public/rate
  configuration and privacy-page rendering;
- regression: backend/Web suites and builds;
- staging/local: production-mode API route inventory and Nginx syntax;
- account: formal scene, allowed/denied RAM sources and credential lifecycle;
- production: anonymous homepage, protected unauthenticated API, formal
  Challenge/OTP/Session, roles, callbacks, payment fact counts, logs and rollback
  readiness.
