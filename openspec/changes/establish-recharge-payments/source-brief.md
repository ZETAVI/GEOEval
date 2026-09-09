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

官方 API 示例有 `weixin://wxpay/bizpayurl/up?pr=NwY5Mz9&groupid=00`，调起页面另给出 `weixin://pay.weixin.qq.com/bizpayurl/up?pr=NwY5Mz9&groupid=00`。A0 固定 59930dd 的 URI 验证只接受旧 host/path。用真实 WechatPayGateway 与现有 wechatFixture 为这两个公开字符串构造受控签名应答，结果均为 INVALID_RESPONSE；旧 `/bizpayurl?pr=TEST` 对照通过。诊断 3 例中 2 失败 / 1 通过，证明字段解释过严，不是商户权限、TLS 或真实微信签名失败。该历史失败现已通过正式修复解决：两种当前例证纳入 gateway 回归，原受控 HTTPS 正向路径也使用 /up；80 + 20 项通过。既有失败材料保留，不将其从历史抹去。接受范围只扩展到已核查的支付目标，不放开任意 weixin 动作；URL 值原样返回，不重建 query。

文档未承诺向不存在订单关单会留下防未来创建的 tombstone，也未提供对旧网络调用的 generation fence。MAY_EXIST 不能用 NOT_EXIST/lease/本地截止来自动释放，是针对该未证明边界的项目推导。QR 重试是否返回同值及实际续期、关闭与迟到发起的交错，仍须命名商户环境验证；本地受控网络仅验证我们如何处理这些结果，不代替微信端保证。

## Native Web 组件来源与边界（2026-09-08）

[Native 调起支付](https://pay.wechatpay.cn/doc/v3/merchant/4012791878)要求把 code_url 转为二维码展示，再由手机微信扫一扫付款；普通 Native 下单返回的并非官方 PC 托管收银页 URL。[H5 调起支付](https://pay.wechatpay.cn/doc/v3/merchant/4012791835)则明确从已配置域名跳转 h5_url，经过微信收银台中间页检查后支付。返回商户页面仍应查单，不能由回跳认定成功。这一区别支持 design 11.1a 的页面装配选择，不把 H5 链接作为 PC 方案。

| 选择与核查 | 一手来源 | 实际使用范围 |
| --- | --- | --- |
| qrcode.react 4.2.0，运行时精确版本 | [维护者 README](https://github.com/zpao/qrcode.react)、npm registry 该版本元数据及本地安装包 LICENSE/源码声明 | QRCodeSVG/value/size/marginSize/level；4 模块静区。ISC，包内 QR Code generator 保留 MIT 声明。支持当前 React 19 peer，无新增运行时传递依赖（仅现有 React） |
| jsqr 1.4.0，仅开发依赖 | [维护者仓库](https://github.com/cozmo/jsQR)、该版本 registry 元数据及安装包 LICENSE/声明 | Apache-2.0，无传递依赖。真实浏览器把渲染后 SVG 栅格化，再用独立解码器核对完整原值；未进入正常产品路由 |
| 单一可订阅 controller | [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) | 稳定快照/订阅/SSR 初值；实际 StrictMode 清理重放和超时竞争由项目测试验证，不以文档代替运行证据 |

依赖由 #73 owner 交出的 Web manifest/lock 短窗口安装在项目内；锁文件只增加上述两个包，未更新既有版本。没有全局安装、远程二维码生成、第三方支付 SDK 或外部二维码数据传输。展示轮询 2 秒/60 秒、请求预算 8 秒与命令冷却 3 秒是本地 UI 策略；不宣称是微信限额、商户超时政策或服务端风控。库/React/二维码值来源变化时复核相应行为即可。

## 参考站业务学习记录（2026-09-09 UTC）

用户要求在 Chrome 中实际探索 [OpenLux 钱包](https://api.openlux.ai/console/topup)、[番瓜 AI 积分页](http://aigc.tuanjusmart.com/credits)，并随后提供 Doit 收银页与截图、授权使用企业资料继续。以下是已登录页面的交互观察，**不是对方数据库 schema、服务端事务或收单协议的证明**。只记录字段/状态和脱敏域名，不保留账户标识、真实开票资料、订单号、支付链接 token 或可付款二维码。

### 观察范围与结果

| 入口/动作 | 已观察到的事实 | 对本项目的启发或限制 |
| --- | --- | --- |
| OpenLux 金额选择 | 固定/自定义金额、到账额度、折扣和实付分别展示；有 Credit Card、Crypto Pay、WeChat Pay、Alipay、Alipay 2 | 金额确认与方式选择分层；其美元折扣规则不改变本项目整数人民币、1 元 10 分、首批无赠送的规则 |
| 首次付款资料 | 选择支付方式后先要求个人/企业付款凭证资料。企业含公司名、国家、地址、城市、开票邮箱；另有地址第二行、省州、邮编、VAT/GST 税号。个人改为姓名，不显示税号 | 表单字段来自其跨境付款凭证需求，不照搬到我们已确认的电子普票字段。此次只使用用户授权且实际需要的资料，未传银行账户/开户行/电话 |
| 资料保存后的确认 | 充值额度、实付、支付方式和资料“查看/修改”一起复核；已存资料可复用。页面明确说明到账后发送的是 Invoice 付款凭证，并非增值税发票 | 资料复用与本单确认分开。页面文案不证明其内部是否保存历史快照；我们需要自己保证订单/申请快照 |
| OpenLux 微信实际跳转 | 观察到 `pay3.apiplus.org` 的“聚合易支付”返回页；用户提供的后续页为 `checkout.doit-payment.com/ew-checkout/<id>/<token>`，显示 Powered by Doit、WeChat Pay、USD 9.90、商品与倒计时。继续后在同一 Doit 域名内打开二维码弹窗 | 这是第三方托管收银体验，不能称为普通微信 Native 提供的官方 PC 托管页面；多级订单/返回页面仍需要本地订单作为权威 |
| Doit 未付款按钮 | “完成”未出现可验证的支付成功；“返回支付页面”回到方式选择；“取消并返回商家”经 `gw.doit-payment.com` 回到 `pay3.apiplus.org` 的结果确认页，观察期内仍显示确认中 | 点击/导航只表达意图，不能证明远端已关闭。返回页需给本地订单恢复入口，不能让无限等待成为唯一结果 |
| OpenLux 充值记录 | 刷新后新增微信记录显示“未支付”；已支付历史记录有付款凭证邮件入口，未付记录没有。列含创建时间、额度、实付、支付方式、订单号、状态 | 未付订单历史独立于余额流水，可供离开后恢复。没有真实付款或邮件发送，不能证明成功到账/开票投递 |
| OpenLux 支付宝 | Alipay 也先进入 Doit，选择 Continue 后出现 `hkg-counter.everonet.com/DropIn/`，标题 Security Verification；访问审批超时，未读到后续内容。用户明确停止该段网络排障 | 不能声称已跳到支付宝官方页、已完成支付宝验证，也不按微信体验推测其协议完全相同 |
| OpenLux 账户页 | 概览与可用模型、账户绑定、安全、其他设置分区；账户绑定有独立的可复用付款资料入口。登录邮箱、通知邮箱、开票邮箱分属不同表单；安全区有令牌/密码/删除入口，仅查看未操作 | Identity 不承担支付商户密钥或所有业务资料；不要把三种邮箱强制变成同一个字段。个人设置首次出现错误，刷新后恢复，未作为持续不可用结论 |
| OpenLux 退款/回票 | 退款记录有订单号、退款额度/金额、原因和状态。“我的回票”明确是对公提现时上传销方发票的审核，通过放款，驳回退额度 | 回票不是客户充值开票；现金退款、积分 RETURN、代理提现各有独立责任，不混用一个退款/发票状态 |
| OpenLux 消费清单 | 导出任务有时间范围、状态、记录数/大小、有效期；创建表单含起止时间、令牌选择、按 Key 分 Sheet、按日汇总，文件展示 1 小时有效期 | 消费清单是独立报表任务，不是付款凭证/发票。只查看表单并取消，未创建导出、下载流水或发送邮件 |
| 番瓜充值 | 余额/充值/明细同页，套餐和自定义金额在弹窗确认；有 1 分测试档及赠分套餐，自定义显示 1～882 元。确认后仍在本站 `/credits` 弹窗显示微信 QR，要求扫一扫 | 同页入口、保留上下文、明确确认金额值得借鉴；其赠分和测试档不扩展本项目首批规则 |
| 番瓜金额补充复查 | 只填表不提交：输入 `1.5` 并移出焦点后，DOM 输入值及确认按钮均为 `15`；输入 `883` 后框内仍为 `883`，可用的确认按钮却显示 `¥0.01`；输入 `0` 也显示原测试档 | 这是可复现的 UI 金额不一致，未证明服务端会接受或实际扣款。我们的无效自定义草稿必须阻止创建，不能删字符、取整或回退快捷档；服务端严格整数校验继续保留 |
| 番瓜状态/恢复 | 未付款时可点击“我已在微信扫码”改变本地提示；“我已完成支付”进入确认中，观察期内未给出成功。关闭弹窗后积分未变化；已加载流水的微信充值筛选没有该未付单 | 扫码按钮不能证明扫码或付款；这次未证明其长期恢复/关单行为。我们的未付订单应从充值历史找回，不依赖积分流水 |
| 番瓜明细补充复查 | 正负变动、业务场景、耗时等一起展示；“充值/退款”筛选同时包含积分退回与平台调整；页面明确区分当前筛选条数和已拉取条数，并在空结果提示继续查看更早流水 | 采用正负金额、清楚原因和范围提示；本项目保留真实业务类型/关联订单，不把积分 RETURN 当现金退款。若提供全历史筛选，服务端筛选后再分页，不能把局部空记录冒充全部为空 |
| 番瓜资料/会员 | 个人信息弹窗显示脱敏手机号、昵称、注册时间；会员页显示暂无可售档位。已访问的客户路径未找到独立开票入口 | 不把当前账号可见范围等同于站点全部后台能力；没有为探索修改账号、创建会员或填写不存在的开票表单 |

两站的侧效应边界：本轮保存了获授权的 OpenLux 企业付款资料，并进入待支付订单/收银会话；番瓜进入一笔 1 分待支付单。没有扫码付款、扣款、正式开票/邮件发送、退款、提现、密钥或账号设置变更。探索中自动审批曾以可能创建真实待付单为由阻断进一步操作，用户随后明确补充继续探索与资料授权；支付宝后续访问审核超时，按用户要求停止，未绕过。未把离开收银台或关闭标签视为取消成功，也不删除这些真实待支付记录。

### 设计结论与证据边界

用户偏好明确为“我们页面选金额/方式，独立收银台承接付款，返回我们管理订单和开票”。可采用的 UI 分工不等于已选择 Doit/聚合易支付商户。其正式接口、通知认证、查单/关单、人民币结算、主体准入、费率和对账能力尚未核查，本次浏览不能代替选型。页面上的认证图标仅是展示，不作为资质审查证据。

微信直连 [Native 官方调起](https://pay.wechatpay.cn/doc/v3/merchant/4012791878)仍要求商户把 code_url 转为 QR 展示；支付宝的页面链接/表单与 H5 的跳转能力分别见本 brief 的官方接口来源。**支付方式、实际服务商和呈现动作需要区分**；具体字段/依赖及不变量在 design 11.0 / 11.3 收束，不从竞品 UI 推造第三方 API。刷新条件是选定实际服务商/商户产品，或其接口、返回/取消语义、开票范围发生变化。

用户在后续批注中明确具体收银形式不是当前重点；本次补查只学习金额确认/明细，不新建待付单、不重试受阻网关。渠道选择只限制对应真实 Adapter/商户启用，不限制共用业务设计。重新读取的[微信回调注意事项](https://pay.wechatpay.cn/doc/v3/merchant/4012075420)仍要求 5 秒内应答、正确处理重复通知及验签失败。由此结合本地资金完整性选择“持久 inbox 后 ACK、后台结算、数据库补扫”，是项目设计，不是声称官方指定了某个队列。回调/查单指引页面本次抓取超时，沿用此前明确记录的内容，不记为本次读取成功。
