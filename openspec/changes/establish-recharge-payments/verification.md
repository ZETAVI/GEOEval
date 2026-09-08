# Recharge verification

Date: 2026-09-08. Accepted main: a550fc4. A0 rebased without code changes to dfe98bc; exact-head [full CI](https://github.com/ZETAVI/GEOEval/actions/runs/34215243310) and [framework CI](https://github.com/ZETAVI/GEOEval/actions/runs/34215243277) passed. B0 is a linear stack under the [explicit schema window](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5583465643). The unmerged points extraction [producer checkpoint](https://github.com/ZETAVI/GEOEval/pull/79#issuecomment-5583740565) changes readiness, not accepted Commerce behavior.

## A0 implementation evidence

| Claim | Evidence | Result / limit |
| --- | --- | --- |
| The actual adapter implements Native, query, close and notification verification | [Business port](../../../apps/backend/src/recharge/application/payment-gateway.ts), [gateway](../../../apps/backend/src/recharge/infrastructure/wechat/wechat-pay.gateway.ts) | Implemented without application registration, database or environment lookup |
| Crypto agrees with independent official expected values | Published request signature, fixed official signed notification, pinned Java AES-256-GCM vector in [gateway tests](../../../apps/backend/test/wechat-pay.gateway.spec.ts) | Passed in product implementation, not inferred from the old probes |
| Operation-specific contracts preserve uncertainty | Missing unpaid fields accepted; success identity/amount/time required; nullable query payer fields differ from mandatory notification fields; 204, invalid identity/amount/state/URL and safe errors | 68 gateway/crypto checks passed |
| Actual bytes and transport security match the contract | [HTTPS tests](../../../apps/backend/test/wechat-pay.https.spec.ts): ephemeral CA, trusted/untrusted certificates, hostname mismatch, real signed requests/responses, empty 204, duplicate headers, truncation/size, slow body, reset, no redirect/retry | 20 passed; loopback socket redirection exists only in the test request factory; TLS verification stays enabled |
| Total targeted verification | The two suites above | 88/88 passed; no actual provider or money |
| Existing workspace compatibility | Locked dependency install, generated existing Prisma client, workspace typecheck and backend build | Passed; package manifests/lock/schema/migrations unchanged |
| Scope isolation | Imports stay within Recharge and Node; no ApiModule/WorkerModule, Controller, environment activation, Prisma or Commerce edit | Checked with fixed diff; no customer payment path is active |
| Documentation and fixed delivery | Framework/links, formatting and author review of 0552aa7..35732ae across intent, engineering and evidence | No unresolved material finding in the scoped author review; no independent-review claim. [PR #78](https://github.com/ZETAVI/GEOEval/pull/78) owns live CI/review state |

Reproduction from this checkout after the normal locked dependency install:

```bash
pnpm db:generate
pnpm --filter @geoeval/backend exec vitest run test/wechat-pay.gateway.spec.ts test/wechat-pay.https.spec.ts
pnpm typecheck
pnpm --filter @geoeval/backend build
python3 scripts/validate_project_framework.py
```

The generator writes only the ignored client from the existing schema; it does not migrate or access database rows. Local generation used a synthetic database URL. HTTPS tests require OpenSSL and loopback listening, generate an ephemeral test certificate/key in their own temporary directory, and remove it after execution. No test accepts merchant files or reads payment secrets from the environment. The adapter is never registered in the current application.

## Source custody and limitations

The [request fixture](../../../apps/backend/test/fixtures/wechat/request.public-example.json) is the public unusable example from [official request signing](https://pay.wechatpay.cn/doc/v3/merchant/4012365336); its key is published teaching material, not merchant credentials. The original request body and expected signature are preserved. JSON file formatting does not alter the embedded signed body. Its JSAPI path tests shared APIv3 crypto only; A0 exposes Native.

The [notification fixture](../../../apps/backend/test/fixtures/wechat/notification.public-example.json) comes from [official Go notify_test.go](https://github.com/wechatpay-apiv3/wechatpay-go/blob/6dbd7ce2ec5967ac2de5fa053479b411967b9c29/core/notify/notify_test.go). Its PAYSCORE event is used only by the crypto test, never as a valid recharge notification. The 300-second rule follows the pinned SDK validator. The AES-256 fixture is from [Java AeadAesCipherTest](https://github.com/wechatpay-apiv3/wechatpay-java/blob/1dab7bec717989e4a4f006d2469c3eebe9eabba7/core/src/test/java/com/wechat/pay/java/core/cipher/AeadAesCipherTest.java) and [TestConfig](https://github.com/wechatpay-apiv3/wechatpay-java/blob/1dab7bec717989e4a4f006d2469c3eebe9eabba7/core/src/test/java/com/wechat/pay/java/core/model/TestConfig.java). The Go AES example with a 16-byte key was not used for an AES-256 claim.

One earlier official webpage response tuple remains **failed**: page 4013053249's public key/signature/52-byte body matched downloaded HTML but both Node and OpenSSL rejected it. Message SHA-256: `2f190612debde9369868489ccda12b9b816381eb5632a8abb73bfe80b6dbd5da`. It is excluded from passing fixtures and counts. The independent SDK fixture is the positive response-auth evidence; no claim is made that every official example passed.

Ordinary query page 4012791838 is now read in full; its earlier fetch limitation is resolved. Native webpage fetch still fails intermittently; the fixed official SDK Native request/response/amount models were read through GitHub's contents API. See [source brief](source-brief.md).

## Historical P0 evidence

| Preparation result | Durable checkpoint | Scope |
| --- | --- | --- |
| 14 request/AES checks | [P0 vectors](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5581248136) | Offline protocol preparation |
| 23 response contract checks and one failed source sample | [Response/owner checkpoint](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5581506895) | Offline framing/header/key rules |
| 37 loopback HTTP checks | [HTTP checkpoint](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5581726654) | Experimental transport, not A0 implementation evidence |
| 20 HTTP/PostgreSQL receipt checks | [Receipt checkpoint](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5581997952) | Temporary schema, commit barrier, duplicate insert and receiver-process crash; database removed |

The preparation artifacts are retained locally under their research owner and are not imported or copied wholesale into this product-code transaction. Durable source references and public regression fixtures above carry the reusable evidence. The old 42-case teaching model is not a completion gate.

## B0 implementation evidence

Fixed implementation: 4f30e10, [PR #80](https://github.com/ZETAVI/GEOEval/pull/80), base dfe98bc. Subsequent reconciliation edits are documentation only; unchanged implementation evidence is reused.

| Claim | Evidence | Result / limitation |
| --- | --- | --- |
| Real framework reception | 21 `recharge-notification.integration.spec.ts` cases: real Nest 11.2.2, actual IdentityModule, actual Prisma 7.9.1 and PostgreSQL 18.6 | Passed; raw-body/duplicate headers, 204 after commit, 8-way duplicates, conflict retention, bad signature/GCM/fields, body/encoding limits, missing rawBody, private route session/CSRF |
| Durable failure/recovery | Same suite: PostgreSQL trigger commit barrier, injected receipt failure, real lock timeout, host/connection replacement after discarded ACK, late commit without watermark, safe projection, immutable DML and same-identity FK | Passed; no simulated DB replaces persistence. Host reconstruction is not OS-process SIGKILL or storage crash recovery |
| Bounded response and unknown commit | 4 `receive-payment-notification.spec.ts` cases | Passed; application timeout uses controlled promises/fake time and does not claim transaction cancellation; real lock timeout separately proved above |
| Current API stays unactivated | Existing access-policy inventory: 2 cases using full current ApiModule | Passed; B0 is tested only in an opt-in host. Existing guards were not stubbed |
| Canonical facts and compatibility | 68 gateway tests rerun after shared V1 serialization extraction; unchanged 20 HTTPS tests covered by A0 exact-head CI | Passed; provider adapter remains independent of Nest/Prisma/Commerce |
| Migration and compiler | Fresh owned database replayed all 33 migrations after final SQL constraint change; workspace typecheck, backend build | Passed; no production or another owner's database used |
| Schema alignment | Prisma migrate diff against current model and accepted main model | B0 tables have no drift. Whole-database zero-diff check failed on 20 existing non-Recharge index/FK statements; all 20 are identical against main@a550fc4. No unrelated schema changes made |
| Format and project contracts | Full format check, framework/Markdown link validator, git diff --check | Passed |

Local targets: `geoeval_issue77_notifications` on loopback PostgreSQL 55432 and exclusive Redis 56577. Receipt tests have no Redis dependency and originally passed with that endpoint unavailable. Only B0 tables are truncated between B0 tests. Temporary barrier functions are test-local and removed. All crypto material is generated in memory by the existing fixture; no merchant keys or provider requests.

Reproduce with the named isolated test DATABASE_URL and REDIS_URL: `pnpm db:generate`, `pnpm db:migrate`, then `pnpm --filter @geoeval/backend test test/recharge-notification.integration.spec.ts test/receive-payment-notification.spec.ts test/access-policy-inventory.spec.ts`. Current PR owns the fixed revision, review and CI outcomes.

## Remaining verification and exit

A0 and isolated B0 have implementation evidence; the whole recharge change remains **partially verified**. Current API raw-body activation, Worker lease/retry and conflict operations, local-order matching, reservation/ledger atomicity, process/storage crash recovery, real merchant keys/TLS/204, Native/H5 browsers, reconciliation, money and production enablement remain not run. Historical P0 receiver SIGKILL does not prove B0 process or database/storage crash recovery.

Existing product-definition/Commerce activation markers are unchanged because no customer recharge or funded writer is enabled. Executable Recharge ports/repository/schema own A0/B0 behavior; remaining orchestration/points proposals stay in this change. Retain this worktree, A0/B0 branches, pre-rebase tag and research artifacts. Deliver B0 through a linear stacked PR, return its scoped schema window to #73, and keep #77 open. No main merge or production activation is inferred.

## 本轮设计审查证据

审阅 #79 固定 a550fc4..770a764 的实际声明、2 项装配测试及未变化的账务代码路径；在线确认其 63 项针对性证据与准确 head 两项 CI。结论适用于装配提取，不声称 C1 结算已实现。当前设计的容量/序号算例、系统键空间及 receipt 竞争反例属于下一实现的验收定义，未计入通过测试数。

本轮只改 #77 自有 proposal/design/delta/tasks/review/source/verification；不改 #79、runtime、schema 或未合并依赖。复用未变化实现的 A0/B0 证据，执行文档框架/链接与 Diff 检查。新的共享账务写入窗口、C1 runtime、组合迁移/回滚和实际浏览器仍需对应实施证据；本轮不新建钱包框架或替代履约 owner。
