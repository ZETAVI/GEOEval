# 微信 APIv3 网页支付接口证据与合同准备

访问日期：2026-09-08。Owner：[Issue #77](https://github.com/ZETAVI/GEOEval/issues/77)。范围：境内普通商户直连，Native PC 后 H5 手机外部浏览器；不将服务商、合单或指定身份支付的附加要求混进基础支付。

本文件只拥有协议证据、差异和待验证点；业务架构由 [架构候选方案](design.md)持有。当前使用官方现行 APIv3 的 RSA 路径和微信支付公钥验签作为研究基线；不是“所有最新能力必须引入”，也不意味着商户权限、SDK 和代码实现已经通过验证。

## 1. 官方接口面

| 操作 | 方法/路径 | 项目需要的输入/输出 | 来源与限制 |
| --- | --- | --- | --- |
| Native 下单 | `POST /v3/pay/transactions/native` | 冻结的 appid、mchid、description、out_trade_no、amount、notify_url；成功动作是 code_url | [Native API](https://pay.wechatpay.cn/doc/v3/merchant/4012791877)、[官方 SDK API 表](https://github.com/wechatpay-apiv3/wechatpay-go/blob/main/docs/payments/native/README.md)；本轮已读现行网页全文；此前固定 SDK 模型证据保留，Native 编排新增事实见下文 N1 核查 |
| H5 下单 | `POST /v3/pay/transactions/h5` | 同上，增加 scene_info 的 payer_client_ip 和 h5_info；输出 h5_url | [普通 H5 API](https://pay.wechatpay.cn/doc/v3/merchant/4012791834)，页面更新 2025-03-31，本轮已读正文 |
| 按商户单号查单 | `GET /v3/pay/transactions/out-trade-no/{out_trade_no}?mchid=...` | GET 无请求 body；返回渠道状态，成功时核对交易身份/金额/时间 | [普通查单正文](https://pay.wechatpay.cn/doc/v3/merchant/4012791838)在 A0 构建前已成功读取，先前超时限制解除；以其字段可选性定义未支付与成功分支 |
| 关单 | `POST /v3/pay/transactions/out-trade-no/{out_trade_no}/close` | body 为 mchid；成功 `204 No Content`，无交易对象 | [关单 API](https://pay.wechatpay.cn/doc/v3/merchant/4012791839)，页面更新 2024-12-11，本轮已读正文 |
| 支付成功通知 | `POST` 到商户提供的 notify_url | JSON envelope + 加密 resource；签名在 Wechatpay-* headers | [普通支付通知](https://pay.wechatpay.cn/doc/v3/merchant/4012791836)，适用于 APP/H5/JSAPI/Native/小程序普通支付 |
| 申请交易账单 | `GET /v3/bill/tradebill` | bill_date 等受支持参数；返回 hash_type、hash_value、download_url | [账单 API](https://pay.wechatpay.cn/doc/v3/merchant/4012810606)；申请与下载是两个步骤，完整自动对账规范在 P0 后段固定 |

共同金额用整数分，订单号在同商户下唯一。GEOEval 生成值可选择官方字符集的简单子集，例如只用数字和字母，避免不必要的转义差异。下单参数由服务端订单快照生成，不能使用浏览器给出的商户/AppID、积分或回调 URL。

## 2. 请求签名与响应验签

官方：[签名总述](https://pay.wechatpay.cn/doc/v3/merchant/4012365342)、[带 Body 签名示例](https://pay.wechatpay.cn/doc/v3/merchant/4012365336)、[公钥验签](https://pay.wechatpay.cn/doc/v3/merchant/4013053249)。

请求签名输入结构：

```text
HTTP_METHOD + "\n"
实际发送的 path 与 query + "\n"
秒级 timestamp + "\n"
nonce + "\n"
实际发送的 body 字节 + "\n"
```

商户 API 私钥生成 SHA256-RSA 签名，Authorization 携带 mchid、nonce、timestamp、商户证书 serial 和 signature。GET 的 body 为空，最后换行仍保留。JSON 只序列化一次，签名与发送共用同一字节串；路径和 query 完成编码后再签名。

响应/回调验签输入是 `timestamp + "\n" + nonce + "\n" + 原始 body + "\n"`。使用 Wechatpay-Serial 定位预信任公钥/证书；不能信任请求携带的任意公钥，不能把接收 JSON 重新序列化后验签。`204` 空 body 也需验签，最后一行仅为换行。请求签名和响应验签所用密钥及 serial 含义不同。

失败规则：未知 key id、签名类型不支持、验签失败和签名探测流量不产生可信支付状态。TLS 错误、5xx 或未验签报文只能进入可恢复错误分类；不能据此记分或把“未查到”当不可逆关闭。

时效窗口、nonce、重放防护与官方测试向量分别核查。本轮已核清官方 Go SDK 的规则：响应和通知使用同一校验器，绝对时间差大于等于 300 秒时拒绝。固定时钟的正负边界已通过；时效不代替业务幂等。

## 3. 回调协议与可靠接收

官方 [回调文档](https://pay.wechatpay.cn/doc/v3/merchant/4012791836)与[公共注意事项](https://pay.wechatpay.cn/doc/v3/merchant/4012075420)支持以下要求：

- 顶层 `id` 是通知唯一编号；成功事件是 `TRANSACTION.SUCCESS`；resource 使用 `AEAD_AES_256_GCM`。
- 先验签，再使用 APIv3 密钥、nonce、associated_data 解密 ciphertext；解密失败即拒绝。
- 5 秒内应答；成功 HTTP 200/204，错误 4xx/5xx。官方推荐尽快应答、异步执行业务。
- `WECHATPAY/SIGNTEST/` 错签名探测必须拒绝，不能当成成功。

GEOEval 的推导实现：验真后先持久保存安全观察及待处理标记，再 ACK；后台从数据库消费。它比“ACK 后 fire-and-forget”多一个必要的 durable inbox 边界，避免进程退出丢失已确认接收的支付。B0 用一张不可变 observation 表保存事实变体，一张 receipt 表保存去重身份、首份事实引用与处理/冲突状态，不复制第二套支付事实。

通知 id 只用于通知去重，账务还必须依靠充值单/外部交易/流水业务唯一性。相同 id 不同内容需要异常检查；可信但未知订单、错误金额等进入安全差异记录，不写 funded。

## 4. 核验业务事实

解密或查单得到渠道事实后，Recharge 使用冻结的商户/AppID/单号核对订单，在 settlement 锁内再次检查，并只对匹配的成功交易入账。Adapter 无权自行查询或修改积分账户。

`amount.total` 是订单总额；`payer_total` 是付款人实付额，可能受优惠影响。核对订单总额不能误用实付额，也不能按减免后的实付额改写固定积分。是否接受某类渠道优惠/结算差异仍由真实商户合同与财务确定；系统不自行创建充值优惠。[字段依据](https://pay.wechatpay.cn/doc/v3/merchant/4012791838)

系统冻结 `(provider, merchantId, appId, outTradeNo)`，成功记录 transactionId。幂等索引使用真实 merchantId，不使用可随轮换变化的配置 alias。支付成功与商户资金结算是两个事实，不能由充值到账推断财务已到账。

## 5. Native / H5 的适配差异

- Native：只返回 QR_CODE 动作；浏览器有界轮询商户本地状态。[开发指引](https://pay.wechatpay.cn/doc/v3/merchant/4012791891)
- H5：手机外部浏览器，从配置域名正常跳转；微信内网页另走 JSAPI。[产品说明](https://pay.wechatpay.cn/doc/v3/merchant/4012791832)
- h5_url 当前有效期 5 分钟；time_expire 限制支付时点，不代替关单。只有官方允许的 redirect_url 拼接，不能改写其他参数。真实 IP 需从受信反向代理链取得，不能无条件信任客户端 X-Forwarded-For。[普通 H5 API](https://pay.wechatpay.cn/doc/v3/merchant/4012791834)、[H5 调起](https://pay.wechatpay.cn/doc/v3/merchant/4012791835)
- 页面“已完成支付”、取消、页面返回和二维码过期只能触发核验或关闭意图。继续原单与创建新单由后台渠道状态和冻结参数决定。[回调与查单指引](https://pay.wechatpay.cn/doc/v3/merchant/4012075249)

## 6. 对现有 HTTP 框架的具体影响

项目 `api-app.ts` 尚未保留 raw body；Nest 官方用 `rawBody: true` 与 `RawBodyRequest` 提供 Buffer，要求保持内置 parser 启用。默认解析过程可能发生在验签前，但不得依据解析结果执行业务，验签始终使用原始 Buffer。[Nest raw body](https://docs.nestjs.com/faq/raw-body)

现有 Identity 的 AccessGuard/CsrfGuard 在客户写接口强制 session、Origin、JSON 和应用 header。回调 handler 应精确使用现有 PublicAccess/CsrfExempt，而不是关掉全局 Guard；同时强制 Provider 验签、原始 body 存在、受限 body size、时限和安全响应。客户充值 create/cancel/verify 继续使用原认证和 CSRF。

find-docs 的已安装 CLI 查询不可用（ctx7 未安装），本轮改为直接读取 Nest 官方文档；没有为研究安装依赖。

## 7. SDK 决策与支付宝边界

[微信官方 SDK 组织](https://github.com/wechatpay-apiv3)和[接入参考](https://github.com/wechatpay-apiv3/wechatpay-skills)提供 SDK、示例与质量检查。官方例证与主要验证规则核清后，首版选择现有 Node 标准 crypto 和窄 HTTP 适配器，使用成熟密码原语实现明确协议，避免新增 Go/Java 进程及其发布/config 责任。不直接把 probe 升级为生产代码；HTTP、回调 parser 和持久化仍须逐项验证。没有具体维护/安全证据的第三方 Node 包不进入当前依赖。

支付宝官方 Node SDK 的 `pageExecute` 生成网站支付 URL/表单，`checkNotifySignV2` 处理已解析通知的验签且避免额外 decode。页面支付和 API v3 服务端调用各遵循自身协议；同一个 Recharge port 不要求两家用相同 HTTP body 或验签方式。[官方 README](https://github.com/alipay/alipay-sdk-nodejs-all)

## 8. 下一步需要的最小证据

| 未决点 | 下一证据 | 阻止的错误 |
| --- | --- | --- |
| 实际商户与部署 HTTPS | A0 代码及受控 HTTPS 已通过；随后核对真实商户权限、证书/公钥、回调域名与部署网络 | 把受控 TLS 验证当成实际商户联调 |
| 回调入口到可信观察 | Nest raw body、公开路由的精确豁免、验签解密后的字段/金额核对 | 单独 crypto 通过，却在 HTTP parser 或业务映射中丢失认证约束 |
| 商户生命周期与关单 | 有权限环境下同号下单、重复关单、NOT_EXIST/取消竞争 | 把一次未查到当永久未创建 |
| 可靠通知接收 | ACK 前落库失败；ACK 后进程退出；Redis 不可用数据库重扫 | 丢失已 ACK 通知 |
| 资金不变量 | 钱包/充值/退点并发和故障注入 | 重复积分、溢出、预留被占、关闭不释放/过早释放 |
| 原生产品入口 | PC、iOS/Android 外部浏览器、真实 H5 域名/Referer | 以合成页面冒充真实调起 |

A0 的实际代码测试和 P0 历史证据在 [verification](verification.md)分别记录，不累计成一个支付成功数字。B0/C1 已执行隔离 Nest/Identity/PostgreSQL 接收和积分事务；真实商户、生产数据库与当前应用激活仍未执行。刷新由产品模式、接口字段、SDK/运行时、商户/域名或 key 变化触发，不机械重复所有研究。

## 9. A0 实现使用的固定来源

- Native 固定 SDK revision `6dbd7ce2ec5967ac2de5fa053479b411967b9c29`：[下单字段](https://github.com/wechatpay-apiv3/wechatpay-go/blob/6dbd7ce2ec5967ac2de5fa053479b411967b9c29/docs/payments/native/PrepayRequest.md)、[code_url](https://github.com/wechatpay-apiv3/wechatpay-go/blob/6dbd7ce2ec5967ac2de5fa053479b411967b9c29/docs/payments/native/PrepayResponse.md)、[金额](https://github.com/wechatpay-apiv3/wechatpay-go/blob/6dbd7ce2ec5967ac2de5fa053479b411967b9c29/docs/payments/native/Amount.md)。notify_url 为 HTTPS 且不带 query；本实现不发送营销/开票等可选扩展。
- 普通 [query 正文](https://pay.wechatpay.cn/doc/v3/merchant/4012791838)：appid/mchid/out_trade_no/trade_state 必填，transaction_id/trade_type/amount 及付款人字段按接口可选。项目对 SUCCESS 的结算证据额外要求交易号、订单总额/币种和支付时刻；非成功状态不伪造这些字段。query 的可选实付字段保留空值，notification 的必填实付字段严格检查。
- [Go validator](https://github.com/wechatpay-apiv3/wechatpay-go/blob/6dbd7ce2ec5967ac2de5fa053479b411967b9c29/core/auth/validators/wechat_pay_validator.go)与[公钥校验器](https://github.com/wechatpay-apiv3/wechatpay-go/blob/6dbd7ce2ec5967ac2de5fa053479b411967b9c29/core/auth/verifiers/sha256withrsa_pubkey_verifier.go)：必需头部、key identity、原始字节、绝对时间差小于 300 秒。重复头、非规范 Base64 和安全整数检查是本地明确的拒绝策略。
- [SDK 常量](https://github.com/wechatpay-apiv3/wechatpay-go/blob/6dbd7ce2ec5967ac2de5fa053479b411967b9c29/core/consts/const.go)核对主/备 API 域名；仅显式选择，不自动重试/切换。
- [Node 24.12 HTTP](https://nodejs.org/download/release/v24.12.0/docs/api/http.html)、[HTTPS](https://nodejs.org/download/release/v24.12.0/docs/api/https.html)、[crypto](https://nodejs.org/download/release/v24.12.0/docs/api/crypto.html)：保留 Buffer 与 headersDistinct，主动中止总时限和不完整响应，显式 TLS 校验；使用标准 RSA PKCS#1 v1.5/SHA-256 与 AES-GCM 原语。只装当前锁文件依赖，没有全局安装或新支付 SDK。

独立官方例证的完整来源、公开测试 key 身份和一条失败页面 tuple 保留在 [verification](verification.md)；不把自签自验当作官方协议一致性。P0 的试验代码保留本地，A0 只迁入必要公开固定输入，并通过产品实现本身重新验证。

## 10. 后续接收与财务证据边界

[通知正文](https://pay.wechatpay.cn/doc/v3/merchant/4012791836)中的 associated_data 可以缺省。标准化支付事实与原始报文摘要分开；表示变化不自动成为业务冲突。total/currency 与 payer_total/payer_currency 分开持有，不以积分倒推付款，也不据此引入优惠或发票处理。

[PostgreSQL 18 Read Committed](https://www.postgresql.org/docs/18/transaction-iso.html)的 ON CONFLICT DO NOTHING 可能因当前语句不可见的并发结果而跳过插入。接收设计用后续语句读取唯一冲突行，观察与处理状态同事务，提交后 ACK。[P0 接收检查点](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5581997952)证明临时实现的提交屏障/并发/接收进程恢复，不能替代后续生产 repository、Worker 或 funded 事务。

成功 API 应答先验签再解释；非 2xx/网络错误只提供诊断，不形成支付或关闭事实。账单文件是官方明确例外：先验签取得下载 URL/hash，再校验文件 hash；没有通用 skip-signature 开关。[官方说明](https://pay.wechatpay.cn/doc/v3/merchant/4013053249)

## B0 框架与数据库边界核查（2026-09-08）

[Nest 官方 raw-body 文档](https://docs.nestjs.com/faq/raw-body)要求创建宿主时设置 rawBody:true，保留内置 parser；useBodyParser 尊重该选项。B0 实测 Nest 11.2.2 的 JSON parser（2 MiB、inflate:false）和真实 IncomingMessage 多值头，缺失 rawBody 返回 503。应用宿主装配仍待 N1，不把测试配置当成当前 API 已支持。

[微信回调注意事项](https://pay.wechatpay.cn/doc/v3/merchant/4012075420)要求无登录态验证、5 秒内应答、重复通知幂等与验签失败返回失败。3.5 秒应用处理预算、冲突事实持久化后 ACK 是项目实现选择，不是官方保证；不涵盖前置网络/正文读取耗时，部署入口仍需命名环境验证。

Prisma 官网 transactions 页面本轮抓取失败，未作为已读证据。实际使用的 Prisma 7.9.1 生成声明支持 createMany/skipDuplicates 和 transaction 的 isolationLevel/maxWait/timeout；真实 PostgreSQL 测试验证后续语句看见并发胜者，以及 lock_timeout 引发整笔回滚。升级 Prisma、Nest/parser、隔离级别或入口代理时重新验证这些边界。当前证据由 [verification](verification.md)持有，不证明数据库存储崩溃、正式 Worker 或商户连通。

## C1 数据库约束推导（2026-09-08）

本轮新增决策只涉及系统入账键与未来容量约束；不重新选择微信 SDK 或重跑旧协议实验。[PostgreSQL 18 约束文档](https://www.postgresql.org/docs/18/ddl-constraints.html)明确：普通 UNIQUE 对 NULL 默认互不相等，CHECK 为 NULL 也满足约束，普通 CHECK 不能保证其他行的数据不变量。因此 design 6.3 的候选系统键 NULL 必须与 kind-specific 非空关联/旧行非空检查配套，R/S 汇总一致性不能伪装为跨行 CHECK。[显式锁文档](https://www.postgresql.org/docs/18/explicit-locking.html)支持用一致获取顺序减少死锁；实际 account → order → reservation → receipt 顺序及任务锁释放仍须用 C1/N1 并发测试证明。这些 C1 迁移现已实施并验证，具体边界见 verification；N1 编排迁移尚未实施。

## N1 Native 编排与二维码核查（2026-09-08）

本轮从现行 Native 产品目录读取正文，不再用 H5 页面标题代替 Native 生命周期说明。没有重新选择 SDK 或机械重跑旧密码学证据。

| 官方事实 | 直接来源 | 项目设计影响 |
| --- | --- | --- |
| 下单结束时间与关闭不同；过近的期限会被调整为服务端下单后至少一分钟；QR 两小时有效，返回值不是固定值 | [Native 下单](https://pay.wechatpay.cn/doc/v3/merchant/4012791877)，页面更新 2025-03-31 | 首次/重试前检查剩余窗口；本地 deadline 不证明远端关闭。保留原参数、QR 单独展示期限，不硬编码旧 URI 形状 |
| 未支付 Native 可用原参数重取 QR；普通取消/失败仍可能是 NOTPAY；扫一扫调起，不支持长按/相册识别 | [Native 开发指引](https://pay.wechatpay.cn/doc/v3/merchant/4012791891)、[Native 调起](https://pay.wechatpay.cn/doc/v3/merchant/4012791878)，后者更新 2025-03-21 | 二维码与订单分开；手机 H5 独立验收；不从页面动作推导资金状态 |
| 认证查询的 SUCCESS/NOTPAY/CLOSED/REFUND 各有语义；REVOKED/USERPAYING/PAYERROR 标明只适用于付款码 | [Native 按商户单号查单](https://pay.wechatpay.cn/doc/v3/merchant/4012791880) | Native 不照搬付款码状态机；非成功响应不伪造成功字段，意外类型进入核查 |
| 未支付订单可因客户取消或到期关单，成功是无正文 204 | [Native 关闭订单](https://pay.wechatpay.cn/doc/v3/merchant/4012791881)，更新 2024-12-11 | 认证 ACK 是独立关闭证据；业务错误/未查到不能当作它。该现行页没有规定普遍等待五分钟，不移植 V2/其他产品的旧规则 |
| 前端有界轮询与后台补查、通知、T+1 核对互补；2 秒/60 秒及后台退避是示例，可按场景设置 | [回调和查单指引](https://pay.wechatpay.cn/doc/v3/merchant/4012075249)，更新 2024-12-18 | 页面仅查本地，受限命令合并后台调度；轮询结束不是订单关闭，用户离开不停止恢复 |

官方 API 示例有 `weixin://wxpay/bizpayurl/up?pr=NwY5Mz9&groupid=00`，调起页面另给出 `weixin://pay.weixin.qq.com/bizpayurl/up?pr=NwY5Mz9&groupid=00`。A0 固定 59930dd 的 URI 验证只接受旧 host/path。用真实 WechatPayGateway 与现有 wechatFixture 为这两个公开字符串构造受控签名应答，结果均为 INVALID_RESPONSE；旧 `/bizpayurl?pr=TEST` 对照通过。诊断 3 例中 2 失败 / 1 通过，证明字段解释过严，不是商户权限、TLS 或真实微信签名失败。修复前不得声称当前 Adapter 已兼容现行 Native QR；N1 第一项是将两种官方例证纳入正式回归并修正校验，不丢弃必要安全边界。

文档未承诺向不存在订单关单会留下防未来创建的 tombstone，也未提供对旧网络调用的 generation fence。MAY_EXIST 不能用 NOT_EXIST/lease/本地截止来自动释放，是针对该未证明边界的项目推导。QR 重试是否返回同值及实际续期、关闭与迟到发起的交错，仍须命名商户环境验证；本地受控网络仅验证我们如何处理这些结果，不代替微信端保证。
