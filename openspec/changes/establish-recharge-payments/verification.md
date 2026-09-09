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


## N1 设计与失败诊断（历史：2026-09-08，运行时 59930dd）

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


## Native URI 修复证据

本片解决前述历史诊断。生产改动仅 WechatPayGateway 的 URI 接受/拒绝边界，测试用现有 in-memory fixture；未接触商户、数据库、共享 contracts 或当前应用装配。

| Claim | Evidence | Result / limit |
| --- | --- | --- |
| 官方 URI 与原安全边界 | 正式 gateway suite：加入 2 个官方成功例证和 10 个 malformed URI 负例 | 修复前 5 failed / 75 passed（两种 URI 与 3 个原始字节清理缺口）；修复后 **80 passed**。原 68 项其余协议证据复用同一 suite |
| 实际 HTTPS 返回新版动作 | 现有 HTTPS suite 正向应答改用 /up，并断言完整原值；签名/TLS/负例保持 | **20 passed**。最初 sandbox listen EPERM，明确允许 loopback 后全部通过；非微信服务器或真实资金 |
| 静态兼容 | Backend tsc --noEmit；受影响文件 Prettier；框架/Markdown validator；git diff --check | Passed；没有端口/schema/生成物变化 |
| 局部性与连续性 | 对 8db5d66 的固定 Diff，#73 窗口与 runtime 文件清单 | 仅 1 个 gateway、2 份测试及 #77 文档；最终 revision/CI 与 producer 回执由 PR checkpoint 持有 |

复现：`pnpm --filter @geoeval/backend exec vitest run test/wechat-pay.gateway.spec.ts test/wechat-pay.https.spec.ts`（HTTPS 需允许 loopback）；`pnpm --filter @geoeval/backend typecheck`。修复前后的本地日志保留 /tmp/geoeval77-qr-regression-red.log、/tmp/geoeval77-qr-green.log、/tmp/geoeval77-qr-https-green.log；原研究诊断保留 artifacts，不再将失败描述为当前行为。

此 URI 修复 locally verified；整体 N1 仍 partially verified，未增加发起/取消持久化、Worker、二维码页面或商户验证。后续不以重复密码学测试代替这些缺失的实际边界。

## Native Web 组件验证（2026-09-08）

本片以 5c1563b 为前置运行时，只新增独立组件与注入来源。二维码包含显式不可付款的合成订单值；全部页面动作均由测试来源返回。没有商户 API、凭据、资金或数据库操作。上节“未增加二维码页面”是 URI 修复片的历史边界，当前组件证据如下：

| Claim | 最小判别证据 | Result / limit |
| --- | --- | --- |
| 本地生命周期 | `apps/web/test/native-checkout.spec.tsx` | **21 passed**：初始只读、有界轮询/请求、两个时限、错误客户端时钟、暂停/恢复、忽略 abort 的迟到响应、取消 ACK/丢响应/重载/跨标签、存储异常、终态/访问丢失、核验防连点、账户键隔离、StrictMode 和真实 SVG 输出 |
| 既有 Web 兼容 | Web 全部测试、tsc --noEmit | **18 files / 122 passed**，typecheck 通过；不把静态测试称为真实客户 API 授权验证 |
| 可解码 QR | 真 Next/React 浏览器中，Canvas 栅格化实际 SVG，独立 jsQR 解码 | 完整 URI 与输入逐字相同。没有手机微信扫码或支付成功证据 |
| 浏览器恢复/语义 | 取消丢响应后重载；12 秒忽略 abort 的旧读取与取消竞争；QR 到期；来源成功/关闭；键盘 Enter 核验 | QR 不恢复，客户端不伪造关闭/到账，核验仍待支付有明确提示；轮询预算结束后人工刷新读取最终关闭。页面控制台无 error |
| 窄屏布局 | 实际 CSS viewport 宽 374 px，随后恢复原视口 | document clientWidth = scrollWidth = 374；不展示需要另一台设备的 QR，按钮可访问。桌面/窄屏截图保留本地 `artifacts/recharge-native-ui/`，合成场景横幅明确 |
| 产品隔离 | 停止预览脚本并确认临时 route 移除后 Web 生产构建 | Passed；构建路由表没有 `/native-checkout-preview` 或 `/recharges`。没有向当前应用装配支付模块 |
| 依赖/共享写入 | 冻结锁文件安装；对前置 head 检查文件清单 | manifest 新增 qrcode.react 4.2.0、dev jsqr 1.4.0；lock 仅新增 26 行。backend、schema、API client/generated、全局 CSS 无改动；Next 临时生成声明已恢复 |

复现：`pnpm --filter @geoeval/web test`、`pnpm --filter @geoeval/web typecheck`、`pnpm --filter @geoeval/web build`。浏览器 fixture 用 `node scripts/recharge/preview-native.mjs` 启动，监听 127.0.0.1:32577；脚本拒绝覆盖已有同名目录，普通退出清除临时路由。结束后确认该目录不存在再构建；意外强杀留下的临时页面必须先按脚本内容核对后清除。脚本不写账户/数据库或启动支付后端。

格式、框架、Markdown link 与 Diff 检查以及准确提交/CI 结果由本片最终 PR checkpoint 记录。当前结论是独立 UI 组件 verified，整体 Native 链路 partially verified；尚缺真实客户 API、后台发起/关单/重建恢复、充值历史/发布上下文接线，以及商户权限和真实资金联调。已有 C1/A0/B0 资金/协议证据保持不变，不重复累计。

## 参考站业务学习验证（2026-09-09 UTC）

范围：用户指定的两个站点、随后提供的 Doit 页面/截图，以及授权填写企业付款资料后的待支付流转。完整脱敏观察在 source-brief；本节只界定证据强度。

- **Observed**：OpenLux 金额/方式/付款资料复用与确认、微信第三方域名跳转/QR、未付记录、付款凭证说明、账户绑定/安全/通知字段、退款/提现回票和消费导出表单。个人设置首次报错，刷新后恢复；未执行账号安全操作、导出或邮件发送。
- **Observed**：番瓜一笔 1 分待付单、本站 QR、手动扫码提示/核验等待、关闭后余额不变、已加载流水无该未付单；个人资料仅可见基础信息，会员为空。不能从已加载页面推断全站没有订单或开票功能。
- **Partial / blocked**：支付宝已到 Doit，继续出现 Everonet Security Verification 标签；其访问审核超时，未读取后续网关，用户要求停止排障。没有验证支付宝扫码/回跳，未绕过审批。
- **Not run**：两站真实付款、到账/关单最终一致性、正式开票与送达、退款/提现、真实收单协议、后端/schema/鉴权/事务审查。只凭 UI 不作这些完成主张。
- **Project consistency**：核对 PaymentGateway 的 WECHAT/CNY/NATIVE 现状与 product-definition 电子普票的字段/唯一关联/处理状态；design 11.0 / 11.3 仅定义当前决策与后续边界。无 runtime、schema、依赖或已通过测试修改，故复用 82c281f 的代码证据，不重跑资金测试。
- **Coordination**：在线读取 #81 当前 41d37c2 / Draft / base #82 和 comment5595292334；共享交还不等于合并或接收其未完成浏览器验收。未来实施拓扑由 tasks 约束。

文档交付只需框架/本地链接、Diff 和脱敏检查。用户提供的税号、地址、邮箱和银行资料、具体账户/订单标识、支付会话 token 及可付款 QR 不进入这些文档、Git 或项目 tracker。所建待支付记录保留，不把未付款、关闭标签或回跳描述为已经取消。

## 异步与全链路设计复核（2026-09-09）

本轮通过：读取现有 B0/C1/Commerce/购买/Notification/API/Worker 源码，与产品定义及旧设计逐项比对；修正总时序和 attempt 定义的两处实际冲突。Chrome 复查番瓜的快捷确认、金额草稿与明细：`1.5` → 输入/按钮均为 `15`；超限 `883` 保留在输入而可用按钮为 `¥0.01`，移出焦点后仍复现。仅 UI 观察，不提交新订单，不推断该站后台会接受错误金额；已加载筛选范围提示也已直接读取。

核对 main bcb81db、#81 c3b4800/Draft/base #82；只复用不变代码的既有证据，没有重新跑钱测试或宣称新同步/异步合同已实现。微信回调注意事项正文重读成功；回调/查单指引本次超时，沿用此前来源且不计作本次通过。当前差异仅 #77 active change，文档框架/链接、Diff 与脱敏为本片校验。

以下是落实设计后必须执行的 **Not run** 场景，不累计到已有通过数：

| 新的判别场景 | 应证明的行为 |
| --- | --- |
| 创建事务提交后、HTTP 响应和 worker 唤醒前进程退出 | 重建 API/Worker 后同键恢复一单/一预留，数据库扫描仍发起 |
| 回调已 ACK 后暂停处理进程，再送重复通知并恢复 | 没有丢事实；只一次到账；接收 ACK 不等待结算进程 |
| 外部查询持续慢，同时已有真实成功观察待结算 | 有界网络预算不饿死已收资金的数据库结算工作 |
| 通知持久创建成功、Recharge 待办完成标记前进程退出 | 重投只保留一条通知，余额/流水不再变更；SSE 丢失仍可读订单 |
| 快捷项后输入空/零/小数/超限/非法文本，或 create 响应未知后修改金额 | 不静默改价/回退档位/更换原未知请求的 key；没有重复活动付款路径 |
| 成功订单可见后，一个较早余额请求才返回 | 旧响应被丢弃；刷新失败保留成功状态，不执行浏览器加分 |
| 目标未付单在未加载的历史页、用户使用状态筛选 | 服务端筛选与游标覆盖正确账户范围；空态不误报全部无订单 |
| 充值期间其他设备更改余额/文章/选择/价格，或发票仍在补正 | 发布返回重新核价并要求明确购买；开票状态不阻挡已有余额使用 |

当前结论为设计与学习记录 verified、运行时新增场景 pending；不重写已接受产品意义，不把参考站交互当作其 schema/一致性测试。

## N1 后端持久恢复验证（2026-09-09）

范围：`codex/issue-77-native-recovery`，基于 #81 固定 `990ece2781dcb2b08281f24282f698ed4635be22`。沿用实际 A0 协议、B0 inbox、C1 事务与 #73 RETURN；新增 runtime 仅显式构造，没有当前 API/Worker 注册。下列均为本地受控证据，不含真实商户/资金。

| 完成主张 | 证据 | 结果与边界 |
| --- | --- | --- |
| 创建/领取/查询/关单可恢复且只一次记分 | [21 项 Native 集成测试](../../../apps/backend/test/native-recovery.integration.spec.ts)、[9 项本地规则测试](../../../apps/backend/test/native-recovery.spec.ts) | Passed。临时 RSA/APIv3 材料 + 实际 Adapter + 独立 PostgreSQL；不调用 provider |
| 金额与旧模块责任保持 | Native、C1、B0、积分、购买、RETURN、Commerce 模块、Delivery resolution、当前 API 合并检查 | **144 passed、2 skipped，11 个文件**。其中旧 Delivery migration/recovery drill 的 2 项仅允许 #73 专属资源，按原有保护条件跳过；未改变或访问该资源 |
| 中途失败不产生半笔账 | 结果事务最后一步触发器失败、关单后本地提交故障、入账后执行标记失败、重复 Worker/查单/通知竞争 | Passed；前两类保留义务并恢复，后一类重放 C1 不重复记分。连接重建通过，不声称做了 OS/磁盘故障测试 |
| 取消/过期不假关闭 | 未发送本地取消；已发出取消后 ORDER_NOT_EXIST、迟到 QR/SUCCESS；支付到期后查关单 | Passed；容量只随 C1 到账或认证关闭释放，旧二维码不能重新出现 |
| 恢复不会无限阻塞后续工作 | 失败领取/receipt 单独退避、批次为 1 时的后续有效单、鉴权失败立即核查、有限未知重试、重复旧 QR | Passed；宿主级频率/并发预算与告警尚待 Worker 接线 |
| 增量迁移保留历史 | `geoeval_issue77_native_upgrade`：先部署 #81 的前 37 条迁移，写合成 UNSENT、MAY_EXIST 与历史 CLOSED 各一单，再部署第 38 条 | Passed。账户/余额/订单/3 条预留旧字段投影完全一致；旧请求快照/关闭证据未伪造，仅活动旧单增加可恢复 due。演练 SQL/快照/输出保留本地 `/tmp/geoeval77-native-upgrade/` |
| 未激活当前客户支付、无生成漂移 | 后端 tsc/typecheck/build；在 backend 目录运行 OpenAPI 生成，再生成 API client 并检查 Diff；现有当前 API 测试 | Passed。没有新增公开支付 HTTP 合同或产品路由；Web 组件证据复用其不变基线，本轮未重做浏览器 |
| 框架/源码格式/本地链接 | 项目框架校验、Prettier、`git diff --check` | Passed；其最终固定 revision 和 CI 由本片 PR 保存 |

复现核心组合：显式指定自己所有的 `DATABASE_URL` 与 `REDIS_URL`，执行 backend Vitest 中 `native-recovery.spec.ts`、`native-recovery.integration.spec.ts`、`recharge-core.integration.spec.ts`、`recharge-notification.integration.spec.ts`、`point-accounts.integration.spec.ts`、`publishing-orders.integration.spec.ts`、`order-point-return.spec.ts`、`commerce-points-module.integration.spec.ts`、`delivery-resolution.integration.spec.ts`、`api.integration.spec.ts`。本次功能库为 `geoeval_issue77_native_n1`，Redis 为既有带 #77 标签的 `127.0.0.1:56577/0`；没有使用默认库或其他任务的清理入口。

一次初始夹具错误把交易号写成超过协议上限，真实 Adapter 拒绝，修正合成数据后通过；OpenAPI 初次从仓库根运行未加载 backend decorators 配置，改用既定 backend 工作目录后生成通过。这两次失败不被计入通过数，也未通过放宽产品校验修复。

本片结论：后端持久恢复 **verified within controlled assembly**；整体 #77 **partially verified**。客户 API/CSRF、常驻 Worker 与运营入口、成功通知/SSE、历史/发布返回、完整桌面旅程和真实商户测试仍 Not run。前节 8 个全链路场景中的实际 HTTP 进程退出、通知投递/SSE、历史和发布返回部分继续待验，不能用本片内部函数测试替代。
