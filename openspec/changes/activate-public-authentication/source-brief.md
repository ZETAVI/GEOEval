# Source brief: public Alibaba authentication activation

Evidence refreshed: 2026-09-22. Decision: promote the existing mainland Web/H5
invisible CAPTCHA scene to formal mode, retain the one-provider adapter, and
bind its RAM actions to the fixed production egress before removing Basic Auth.

## Decision-critical facts

| Fact | Consequence |
| --- | --- |
| Alibaba says test mode only checks the integration and skips risk policy; formal mode performs risk consultation and takes about five minutes to apply | Public activation must switch the existing scene to formal before gate removal |
| Invisible verification gives ordinary users an unperceived pass and presents the configured second challenge only when provider risk policy requires it | A real risk popup cannot be deterministically forced in formal mode; test-mode evidence plus formal ordinary/deny paths is the honest gate |
| The backend must pass the opaque value unchanged to `VerifyIntelligentCaptcha`; replay is a normal rejection | Existing server-authoritative adapter remains correct |
| CAPTCHA collects browser, network/IP, device and pointer/touch/keyboard trajectory data, excluding entered content | Entry must link a clear processor notice; GEOEval must not copy raw observations |
| CAPTCHA statistics expose recent protection data and Alibaba offers call-count alerts/log service | Provider statistics complement, but do not replace, application SMS budgets |
| RAM common condition `acs:SourceIp` accepts a concrete IP and applies only to actions named in the statement | Bind both current runtime actions to the verified ECS egress and test both sides |
| Alibaba explicitly recommends RAM rather than the cloud-account AccessKey | Keep the dedicated API-only identity and rotate its key independently |
| PIPL Article 17 requires processor identity/contact, purpose/method/categories, retention and rights procedure to be disclosed clearly before processing | A one-line implicit-consent footnote is insufficient for public activation |

## Controlled environment facts

- Scene: `geoeval_auth_challenge_web`, `18hnihr4`, Web/H5, invisible,
  second challenge one-click, currently test/default policy.
- Public prefix: `1fz571`.
- SMS sign/template: `互动派科技` / `SMS_496905143`.
- Fixed production egress: `8.138.100.3`, observed directly from the server on
  2026-09-22.
- Current runtime is one API replica and keeps the finite one-event CAPTCHA
  infrastructure degradation allowance accepted in Issue #64.
- Published company contact used for the notice: 互动派科技股份有限公司,
  `marketing@hudongpai.com`, `020-38891740`.

## Primary sources

- [Alibaba CAPTCHA access guidelines](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/access-guidelines)
- [Alibaba CAPTCHA operations FAQ](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/function-related-issues)
- [Alibaba CAPTCHA server access](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/server-access)
- [Alibaba CAPTCHA information collection](https://help.aliyun.com/zh/captcha/captcha2-0/product-overview/captcha-2-0-collection-letter-description)
- [Alibaba CAPTCHA log service](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/log-service)
- [Alibaba RAM policy elements](https://help.aliyun.com/zh/ram/policy-elements)
- [Alibaba source-IP restriction](https://help.aliyun.com/zh/ram/use-cases/use-ram-to-limit-the-ip-addresses-that-are-allowed-to-access-alibaba-cloud-resources)
- [Alibaba SendSms API](https://help.aliyun.com/en/sms/developer-reference/api-dysmsapi-2017-05-25-sendsms)
- [PRC Personal Information Protection Law](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm)
- [Official 互动派 company contact](https://www.hudongpai.com/index.php?nav=2&s=index%2Fjoin)

## Rejected alternatives

- Keep test CAPTCHA after removing Basic Auth: rejected because test mode makes no
  risk decision.
- Treat CAPTCHA as protection for every application capability: rejected;
  CAPTCHA protects Challenge issuance, while Session/role/CSRF and cost controls
  protect later capabilities.
- Require a forced real second challenge: rejected because the formal risk model
  is intentionally opaque and not controllable by the application.
- Use account-wide cloud limits: rejected because the Alibaba account is shared;
  GEOEval owns application-scoped limits and alerts.

## Refresh triggers

Refresh before changing scene/client type, CAPTCHA mode, provider, region,
runtime replica count, production egress, RAM actions, SDK major versions,
privacy processor or monthly traffic order of magnitude.
