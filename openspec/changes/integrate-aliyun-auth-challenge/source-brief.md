# Alibaba Cloud authentication source brief

Evidence refreshed: 2026-09-22 CST. Scope: mainland China Web/H5 login and
registration at approximately 1,000–2,000 SMS messages per month.

## Selected products

- Alibaba Cloud CAPTCHA 2.0 pay-as-you-go, Web/H5 V3 invisible verification.
- Alibaba Cloud domestic SMS `dysmsapi20170525` `SendSms`.
- Official TypeScript SDK packages
  `@alicloud/captcha20230305@1.1.4` and
  `@alicloud/dysmsapi20170525@4.6.0`; both publish Apache-2.0 metadata.
- Direct SDK runtime helpers are pinned as
  `@alicloud/openapi-core@1.0.8` (ISC) and
  `@darabonba/typescript@1.0.5` (Apache-2.0). The former's Node-version
  postinstall selector is explicitly disabled because the shipped runtime is
  complete and the script is unnecessary on the project's pinned Node 24.

## Current controlled account facts

- CAPTCHA pay-as-you-go exists with AI basic protection enabled and custom
  policy disabled.
- The account's public browser identity prefix is `1fz571`. This value and the
  SceneId are browser configuration, not credentials; the `ekey` and runtime
  AccessKey material remain secret.
- Test scene `geoeval_auth_challenge_web`, SceneId `18hnihr4`, is Web/H5,
  invisible, default policy and test status. Encryption mode and security
  events are off.
- SMS is active. The account has approved existing company-qualified assets,
  but they visibly use the company identity and do not satisfy the desired
  `HDP` public signature.
- A dedicated API-only RAM runtime identity is configured with the two required
  actions. A separately authorized local AccessKey exercised both provider
  calls; no credential value, legal-person detail or raw account identifier is
  part of this Change.
- Controlled application validation with the approved company signature and
  approved login template completed one `CAPTCHA -> Challenge -> SendSms -> OTP
  -> Session` path. Alibaba accepted the SMS, the carrier receipt later showed
  successful delivery, and the user-entered OTP created a customer Session.
- Earlier use of the same sign/template/number produced one carrier rejection
  for signature real-name filing, followed by successful deliveries. The
  current evidence proves reachability on one observed route, not stable
  three-carrier delivery or production readiness.

## Interface facts

- CAPTCHA Web/H5 V3 loads Alibaba's client script and returns one opaque
  `CaptchaVerifyParam`.
- The backend calls `VerifyIntelligentCaptcha` with the opaque value and its
  own fixed SceneId. Mainland client region `cn` maps to
  `captcha.cn-shanghai.aliyuncs.com` or the documented dual-stack endpoint.
- `VerifyResult=true` is success. F008/F018 are replay, F012/F020 cover scene
  mismatch, and the other F results are normal denials rather than service
  unavailability. `T005` is the current test-plan pass code.
- Alibaba recommends availability fallback only for invocation failures such as
  network, DNS, timeout or HTTP 5xx. GEOEval narrows that advice with a finite
  local budget and automatic fail-closed threshold.
- `SendSms` uses approved `SignName`, `TemplateCode` and JSON
  `TemplateParam`; `Code=OK` means accepted submission and `BizId` is the
  receipt-query identity.
- `SendSms` has no idempotency guarantee. Alibaba advises checking delivery
  state after a timeout before deciding whether to retry; GEOEval performs no
  automatic retry inside authentication.
- Alibaba documents custom minimum-permission policies for both runtime calls:
  `yundun-afs:VerifyCaptcha` for CAPTCHA verification and `dysms:SendSms` for
  one-recipient SMS submission. Both currently use `Resource: "*"`; this does
  not imply management access. Do not grant `AliyunYundunAFSFullAccess`,
  `AliyunDysmsFullAccess`, `PowerUserAccess` or primary-account credentials to
  the GEOEval runtime.
- Use a dedicated API-only RAM identity so the two permissions can be revoked,
  rotated and audited without affecting console administrators or other
  applications in the shared Alibaba Cloud account. Prefer temporary
  credentials when the hosting surface supports them; the current application
  configuration accepts a protected AccessKey pair and must never persist it in
  Git, Issues, logs or command output.

## Primary sources

- [CAPTCHA scene management](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/scene-management)
- [CAPTCHA Web/H5 V3 integration](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/new-architecture-for-web-and-h5-client-access)
- [CAPTCHA server verification](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/server-access)
- [CAPTCHA RAM minimum authorization](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/authorize-a-ram-user-to-access-alibaba-cloud-captcha)
- [SMS TypeScript/Node.js SDK](https://help.aliyun.com/zh/sms/developer-reference/using-typescript-openapi-example)
- [SendSms API](https://help.aliyun.com/zh/sms/developer-reference/api-dysmsapi-2017-05-25-sendsms)
- [SMS custom minimum authorization](https://help.aliyun.com/zh/sms/custom-permission-policy-reference)
- [SMS signature rules](https://help.aliyun.com/zh/sms/user-guide/signature-specifications-1)

## Refresh triggers

Recheck these sources before changing the RAM policy or production credential,
changing endpoints or SDK major versions, submitting a signature/template,
enabling formal mode, adding another provider/region/client type, or running
more than one production API replica. Repeat account-specific runtime probes
only when the relevant account, route, configuration or decision boundary has
changed.
