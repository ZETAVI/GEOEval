# Alibaba Cloud authentication source brief

Evidence date: 2026-09-20. Scope: mainland China Web/H5 login and registration
at approximately 1,000–2,000 SMS messages per month.

## Selected products

- Alibaba Cloud CAPTCHA 2.0 pay-as-you-go, Web/H5 V3 invisible verification.
- Alibaba Cloud domestic SMS `dysmsapi20170525` `SendSms`.
- Official TypeScript SDK packages
  `@alicloud/captcha20230305@1.1.4` and
  `@alicloud/dysmsapi20170525@4.6.0`; both publish Apache-2.0 metadata.

## Current controlled account facts

- CAPTCHA pay-as-you-go exists with AI basic protection enabled and custom
  policy disabled.
- Test scene `geoeval_auth_challenge_web`, SceneId `18hnihr4`, is Web/H5,
  invisible, default policy and test status. Encryption mode and security
  events are off.
- SMS is active. The account has approved existing company-qualified assets,
  but they visibly use the company identity and do not satisfy the desired
  `HDP` public signature.
- No credential value, legal-person detail or raw account identifier is part of
  this Change.

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
- The narrow RAM action for sending is `dysms:SendSms`. CAPTCHA documentation
  names `AliyunYundunAFSFullAccess`; production credential creation and any
  tighter custom policy require their own approval and runtime check.

## Primary sources

- [CAPTCHA scene management](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/scene-management)
- [CAPTCHA Web/H5 V3 integration](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/new-architecture-for-web-and-h5-client-access)
- [CAPTCHA server verification](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/server-access)
- [SMS TypeScript/Node.js SDK](https://help.aliyun.com/zh/sms/developer-reference/using-typescript-openapi-example)
- [SendSms API](https://help.aliyun.com/zh/sms/developer-reference/api-dysmsapi-2017-05-25-sendsms)
- [SMS signature rules](https://help.aliyun.com/zh/sms/user-guide/signature-specifications-1)

## Refresh triggers

Recheck these sources before creating RAM policy/credentials, changing endpoints
or SDK major versions, submitting a signature/template, enabling formal mode,
making the first paid call, adding another provider/region/client type, or
running more than one production API replica.

