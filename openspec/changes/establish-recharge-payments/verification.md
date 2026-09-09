# Recharge verification

Date: 2026-09-08. Current accepted main: bcb81db after [#79 integration](https://github.com/ZETAVI/GEOEval/pull/79#issuecomment-5587460726). A0/B0 historical matrices below retain their original evidence; the current C1 implementation/combination is recorded in the C1 section. Rebased stack: A0@47fb404 → B0@8d39710 → C1 implementation@be89fe0. Exact-head CI belongs to the corresponding PR.

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

A0, isolated B0 and C1 have implementation evidence; the whole recharge change remains **partially verified**. C1 now verifies order matching and reservation/ledger atomicity. Current API raw-body activation, Worker lease/retry and operational UI, process/storage crash recovery, real merchant keys/TLS/204, Native/H5 browsers, reconciliation, money and production enablement remain not run. Historical P0 receiver SIGKILL does not prove B0 process or database/storage crash recovery.

Existing product-definition/Commerce activation markers are unchanged because no customer recharge or funded writer is enabled. Executable Recharge ports/repository/schema and the Commerce transaction binding own implemented A0/B0/C1 behavior; remaining orchestration proposals stay in this change. Retain this worktree, A0/B0/C1 branches, recovery tags and research artifacts. [PR #82](https://github.com/ZETAVI/GEOEval/pull/82) owns C1 delivery, live Checks and schema-window handback; #77 remains open. No payment PR merge or production activation is inferred.

## 前序设计审查证据（fc4dcb0，C1 实施前）

审阅 #79 固定 a550fc4..770a764 的实际声明、2 项装配测试及未变化的账务代码路径；在线确认其 63 项针对性证据与准确 head 两项 CI。结论适用于装配提取，不声称 C1 结算已实现。当前设计的容量/序号算例、系统键空间及 receipt 竞争反例属于下一实现的验收定义，未计入通过测试数。

该设计轮只改 #77 自有 proposal/design/delta/tasks/review/source/verification；不改 #79、runtime、schema 或未合并依赖。复用未变化实现的 A0/B0 证据，执行文档框架/链接与 Diff 检查。新的共享账务写入窗口、C1 runtime、组合迁移/回滚和实际浏览器仍需对应实施证据；本轮不新建钱包框架或替代履约 owner。

## C1 实现与组合证据（2026-09-08）

固定代码：原 3457ee2，同步 accepted main@bcb81db 后 be89fe0；仅生成文件因 #79 的声明顺序移动发生冲突并重新生成。

| Claim | Evidence | Result / limit |
| --- | --- | --- |
| Atomic core | 22 real Nest/Identity/A0-signed HTTP/PostgreSQL core tests | Passed: reservation/replay/limits, notify+query race, unique credit, separate system key, inactive obligation, capacity/sequence bounds, cancellation/review, four injected write failures, restart of host/connection, DB guards |
| Existing money paths | Focused five backend files | 73 passed including 2 new real purchase HTTP cases; check new debit-capacity failure is an ordinary 409 rather than 500 |
| Point history | Web points suite | 5 passed including new system-confirmed recharge/privacy rendering; not payment-browser evidence |
| Accepted #79 combination | Core + points module assembly + access inventory | 26 passed after rebase; no copied/cherry-picked owner module |
| API | Compare parsed OpenAPI to accepted bcb81db | All 73 paths and other schemas unchanged; only PointChangeResponse and PointAdminChangeResponse extended. No customer payment route registered |
| Upgrade | Separate geoeval_issue77_upgrade_c1 DB: deploy 33 old migrations, insert synthetic historical accounts/wallet/ledger/B0 facts, deploy 2 C1 migrations | Passed; old fields identical before/after. SHA256 of both old-field projections: 4c35ca6ee8a48f164a2589341b196ac11720213d69e572da9b634f1c3a5b8b5f. This is schema/data upgrade proof, not an authenticated old-message or storage-crash proof |
| Schema alignment | Compare deployed database to the final Prisma schema | No Recharge/PointAccount/PointChange drift. The same 20 pre-existing non-Recharge index/FK statements from the B0 baseline remain; no unrelated repair or whole-database zero-diff claim |
| Static | Workspace typecheck, backend build, full format/framework/link/diff checks | Passed; post-integration generated contracts use current source |

No actual merchant key, provider request, money or production database was used. Main test resources are the #77-only database and Redis 56577; cleanup handles newly referenced immutable test tables, never production. Primary protocol fixtures/evidence are reused, not counted as newly implemented crypto.

C1 has no dispatcher, verified-close command, worker/lease scheduler, payment UI or production activation. Its 22 tests replace planned core claims with evidence; they do not prove future return semantics, controller activation, OS process/storage crash, real merchant limits or H5. Exact PR head/CI/window handback is owned by the PR checkpoint; do not treat a local or pre-rebase result as current full CI.


## N1 设计与失败诊断（2026-09-08，运行时 59930dd）

| Claim | Evidence | Result / limit |
| --- | --- | --- |
| 设计基于现行普通 Native | 本轮阅读全文的 prepay/invoke/query/close/development/callback-query 页面，直接链接在 source-brief | Passed，网页读取；不是实际商户权限或远端竞争验证 |
| A0 与现行 QR 例证兼容 | 真实 WechatPayGateway + 现有 wechatFixture，各次同一配置的受控签名响应，仅改变 code_url | **Failed：3 例中 2 失败 / 1 通过**。两种官方 /up 返回 INVALID_RESPONSE，旧 URI 对照通过。根因为 host/path 固定校验；未运行真实 Provider，也未修复 |
| C1 运行时/共享窗口保持 | `git diff 59930dd --name-only` 只含 #77 active change；临时诊断文件/日志保留本地 artifacts/recharge-native-design | Passed；不把诊断文件纳入已交付产品测试，也不删除其失败证据 |
| 设计对齐 | 9–11 节、Recharge delta、tasks 和 architecture-review 同一合同；框架/Markdown/diff 检查 | 以本轮最终提交及 PR checkpoint 记录结果 |

失败诊断复现：将本地 `artifacts/recharge-native-design/official-uri.diagnostic.spec.ts` 复制到 `apps/backend/test/native-official-uri.diagnostic.spec.ts`，执行 `pnpm --filter @geoeval/backend exec vitest run test/native-official-uri.diagnostic.spec.ts`。文件相对 import 针对临时 test 目录；运行前后都不读取凭据或数据库。日志保留在同一 artifacts 目录；正式修复应把两例迁入现有 gateway suite，并验证安全负例。退出时临时文件已移回研究目录，生产源代码未变。

N1 待实施的最小判别证据：

| 场景 | 必须证明 |
| --- | --- |
| 双击创建、页面丢响应、双 Worker 发起 | 同一意图/商户单号；一次有效发起权；结果可恢复 |
| 第一次发起前取消与领取竞争 | UNSENT 仅一方胜出；已取得权利后保留 MAY_EXIST |
| 旧执行者暂停→取消/NOT_EXIST→恢复发送 | 不提前释放，迟到付款仍只记一次；lease 不被当成微信 fence |
| 旧 QR / 新 generation 与成功竞态 | 旧动作不能覆盖新状态，认证成功不丢弃 |
| QR 两小时、deadline 剩不足一分钟、重载/同 URL 返回 | 展示期限不靠页面续期，过近不再发起，订单终态仍凭证据 |
| 关单 204 / CLOSED / SUCCESS / REFUND / 付款码状态 | 保存真实来源；只在允许分支关闭或到账；无凭空付款字段 |
| 提交关单/QR结果失败与 Worker 重建 | 同号查询恢复，无释放半笔账或新号重复收费 |
| 页面多标签 verify、429、队首错误、Redis 不可用 | 合并受限调度、数据库恢复、正常订单可推进 |
| 本人/他人/停用身份、CSRF、客户端伪造动作 | 读写权限和可见投影有真实 HTTP 负例；旧支付义务继续 |
| 保存发布选择→充值→价格/文章变化或品牌切换 | 恢复正确上下文并重新核价确认，不伪造 pending purchase |
| 桌面真实浏览器 QR/取消/超时/重载 | 本地二维码内容与安全动作一致；合成 adapter 明确标识，不能宣称微信扫码成功 |

以上 N1 矩阵是未来验收定义，**Not run**。没有新增 N1 运行时通过数；当前设计/诊断为 partially verified，不能继承旧 CI 来声称网页支付完成。
