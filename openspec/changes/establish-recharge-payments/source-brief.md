# 网页支付接口证据与合同准备

首次核查：2026-09-08；支付宝协议更新核查：2026-09-11。Owner：[Issue #77](https://github.com/ZETAVI/GEOEval/issues/77)。范围：境内普通商户直连；当前优先支付宝PC，再手机网站支付，保留既有微信Native；不将服务商、合单或指定身份支付的附加要求混进基础支付。

本文件只拥有协议证据、差异和待验证点；业务架构由 [架构候选方案](design.md)持有。微信段使用其官方 APIv3 RSA 路径与微信支付公钥验签；支付宝段使用其页面接口及REST v3，分别核对；不是“所有最新能力必须引入”，也不意味着商户权限、SDK 和代码实现已经通过验证。

## A1 支付宝接入准备（2026-09-11，当前新增优先项）

最初确认企业支付宝注册和认证已完成、产品尚未核实开通；先PC官网收银台，再手机网站支付。已读以下当前原始官方正文（动态页面或其官方llms索引给出的.md），不是从第三方教程推定账号权限：

| 主题 | 官方来源与关键事实 |
| --- | --- |
| PC/H5产品及申请 | [PC](https://opendocs.alipay.com/open/270/105898)、[H5](https://opendocs.alipay.com/open/00f7nf)：签约后仍需技术集成；网站可访问且经营/商品信息完整，ICP备案主体一致，不一致时按要求授权。对应开通链接[PC](https://b.alipay.com/page/product-mall/product-detail/I1080300001000041203)、[H5](https://b.alipay.com/page/product-mall/product-detail/I1080300001000041949)；各自状态以[商家产品记录](https://mrchportalweb.alipay.com/dynlink/productSign/signManage.htm)为准 |
| 应用与绑定 | [自研准备](https://opendocs.alipay.com/open/270/01didh)、[创建应用](https://opendocs.alipay.com/open/009yp4)、[绑定](https://opendocs.alipay.com/open/0128wr)、[开通产品](https://opendocs.alipay.com/open/009ypa)：网页/移动应用、APPID、上线及同主体商家PID绑定；自研产品开通按应用上线后流程办理 |
| 加签配置 | [密钥配置](https://opendocs.alipay.com/open/02nlga)、[官方Node SDK](https://github.com/alipay/alipay-sdk-nodejs-all)：RSA2，SDK推荐公钥证书模式，提供私钥及三种证书；公钥模式也有正式支持。工具默认PKCS8与SDK默认PKCS1应通过keyType/格式转换明确匹配。npm latest 与发布包均为4.14.0；研究时下载源码审阅，A1a已精确安装并锁定完整性；执行证据见verification |
| PC执行和事实 | [快速接入](https://opendocs.alipay.com/open/00dn7k)、[异步通知](https://opendocs.alipay.com/open/00dn7l)：pageExecute生成网页动作，并不代表服务器已创建远端交易；通知与主动查单共同确认。通知以success应答且不能重定向，验签之外必须核对商家/应用/订单/金额，保留幂等处理 |
| 沙箱边界 | [PC沙箱](https://opendocs.alipay.com/open/00dn7o)、[手机沙箱](https://opendocs.alipay.com/open/00f7np)：可在产品签约前并行开发，身份/数据/网关与正式隔离；仅余额等受限场景，账单是模板，不能证明正式对账。尚未实际调用 |

协议准备中特别保留：TRADE_CLOSED可指未付款关闭，也可指付款后全额退款；TRADE_SUCCESS/TRADE_FINISHED与已采用付款事实相结合。不能复制微信的状态解释、body解析或通知ACK；SDK的checkNotifySignV2避免已解析form的重复decode。商家净结算收入、买家实付和订单总额不可混用，积分继续按本地冻结订单与匹配的交易总额结算。

官方资料存在局部不一致：通用创建应用页将应用网关标为选填，PC准备页标为必填；支付通知正文明确使用支付API传入的notify_url。实施需区分应用网关、支付notify_url、return_url和OAuth回调，按目标产品检测核对。PC准备页含“已开通当面付无需再次开通”和另一产品编号的立即开通链接，不能据此推断网站支付权限；采用PC/H5产品介绍中的各自链接。H5沙箱正文同时写不支持浏览器内支付与iOS可模拟H5登录，移动验收前需再核对实际支持；当前先PC。

公开费率/新商家结算规则只作申请预期，公司额度、费率、有效期、结算安排必须看自己的协议/后台。09-11研究阶段未登录私有后台或处理密钥；后续账户级状态由管理员回执和仓库外交接档案持有，协议与实现由#77持有。资料/产品政策、SDK版本、商家/应用或选定接口变化时重新核对。

### A1 正式账户接入回执（2026-09-15）

- 企业主体、电脑网站支付、应用上线及同主体商家绑定已由后台回执确认；当前应用使用RSA2公钥模式。应用私钥和支付宝公钥只保存在仓库外的受保护文件，不在本文件记录内容。
- 官方SDK4.14.0通过正式网关执行随机不存在商户订单的签名查询，返回预期`TRADE_NOT_FOUND`。这确认当前APPID、私钥、公钥、HTTPS传输和查询权限可配合工作，没有创建交易或发生资金。
- 该结果不证明公网`notify_url`、浏览器`return_url`、付款/到账、关单或退款语义。正式小额和关闭专项仍按design15A的独立准入边界执行。

### A1 协议定稿依据（2026-09-11）

本次问题：选择真实支持的最新接口，同时证明现有微信记录格式/恢复语义可以怎样兼容；不把文档示例当作已运行结果。基线为项目8eb5759，当前代码和SQL仍仅接受微信。

| 决策关键点 | 原始依据与结论 |
| --- | --- |
| 网页下单 | [v3目录的page.pay](https://opendocs.alipay.com/open-v3/2423fad5_alipay.trade.page.pay?scene=22)正文更新2026-08-16：仍是pageExecute页面接口，不是JSON REST下单；推荐POST，FAST_INSTANT_TRADE_PAY，qr_pay_mode=2为官方跳转模式。time_expire是绝对期限，范围1m–15d；重开不能重置期限 |
| 查单 | [v3 query](https://opendocs.alipay.com/open-v3/e9ce4f59_alipay.trade.query?scene=23)：POST /v3/alipay/trade/query，body含out_trade_no；返回trade_status、total_amount、交易号，send_pay_date为特殊可选的打款给卖家时间。schema的“必选”交易号另注未生成真实交易时可能不返回，必须按状态验证 |
| 关单 | [v3 close](https://opendocs.alipay.com/open-v3/429ffb46_alipay.trade.close?scene=common)：POST /v3/alipay/trade/close，仅用于未付款交易；身份响应字段标为特殊可选。ACQ.SYSTEM_ERROR、ACQ.TRADE_NOT_EXIST、状态错误均可能是HTTP400，不能把所有400归永久失败，也不能把HTTP200当作付款成功 |
| 官方Node SDK | [仓库](https://github.com/alipay/alipay-sdk-nodejs-all)、[4.14.0发布元数据](https://registry.npmjs.org/alipay-sdk/4.14.0)：MIT；发布包engines>=18，README要求>=18.20，项目24.12兼容。pageExecute保留；exec为deprecated，curl为v3推荐路径。下载包SHA-1 5993155c1e11bc730c293169c52dd593353da76d，SHA-512完整性保留本地研究记录；未执行包脚本 |
| SDK验签限制 | 发布包src/alipay.ts的curl：成功响应先验签再JSON.parse；HTTP>=400先抛业务异常，没有经过该成功验签分支。curl只返回data/status/traceId，不返回成功响应原始字节或验签头；不得将错误码或重新序列化data冒充已认证原报文。SDK错误对象/debug可能含报文，应用日志只能写分类 |
| 响应认证 | [v3验签规则](https://opendocs.alipay.com/open-v3/054d0z)：timestamp、nonce和原始响应体参与验签；证书模式匹配alipay-sn。SDK封装与我们证据格式是两层责任，不能补造微信签名头或时间 |
| 通知 | [PC异步通知](https://opendocs.alipay.com/open/00dn7l)：form POST，notify_id最长128；同条重试ID不变。所有返回参数参与验签（排除sign/sign_type），一次解码后用checkNotifySignV2；强制RSA2，验签后核对app_id/seller_id/out_trade_no/total_amount；成功应答纯success。gmt_payment及买家实付标为可选，不把缺值当0 |
| 关闭/不存在 | query的TRADE_CLOSED同时涵盖未付关闭和全额退款；ACQ.TRADE_NOT_EXIST只描述本次查询。SDK错误响应未认证、旧页面可稍后提交、关单响应丢失都使“查询不存在/已关闭→直接释放”不成立。文档未证明自然超时后的统一无歧义关闭依据，列为激活前专项验证，不能靠缺少付款时间字段推断 |
| 退款核验边界 | [退款查询](https://opendocs.alipay.com/open/028sma)要求对应退款请求号；它不是可无条件查遍任意交易全部退款的接口。不能凭空增加该API就宣称消除了TRADE_CLOSED歧义。后续[交易对账](https://opendocs.alipay.com/open/03axlt)是独立事实来源，缺一条账单记录不自动证明未付 |

取证方式：open/llms索引的官方Markdown用于v2字段和通知；从官方query页“查看V3版本”进入v3目录，直接读取page/query/close与验签规则正文；查询和关闭均在电脑网站支付目录，不能因为内页沿用“当面付”场景标签就推断PC不支持。v3的llms地址没有得到有效索引，未把HTML壳或搜索摘要当证据。Node公开发布包比示例代码优先：旧API页可能写pageExec，当前SDK明确提供pageExecute；示例中的加号、旧时间、其他产品码与多余参数不复制。

下一步使用临时测试密钥、受控HTTP响应和隔离数据库验证；协议定稿阶段只有源码/文档研究；后续A1a已使用临时密钥验证真实SDK，仍没有生成商户密钥或调用沙箱/正式支付，具体执行证据见verification。SDK升级、目标接口变化、通知字段变化、商户绑定/签名模式变更时才重新核对受影响部分。

### A1a 实际传输依据与验证

固定运行版本为SDK4.14.0、urllib4.9.0、Undici7.29.1。Context7检索指向[Undici公开Dispatcher文档](https://github.com/nodejs/undici/blob/main/docs/docs/api/Dispatcher.md)和[interceptor文档](https://github.com/nodejs/undici/blob/main/docs/docs/api/Interceptors.md)；当前文档含v8说明，因此实际实现再对照已锁定7.29.1的types/dispatcher、dispatcher.compose与connector源码，并以真实SDK/HTTPS验证，未升级依赖。

源码证明：SDK curl传入agent到urllib dispatcher；urllib默认允许10次重定向，SDK没有覆写；Undici handler的请求开始回调在连接建立后才可获得活动请求controller，单靠该钩子不足以取消TLS握手。实施选择每次调用的私有Agent、连接器AbortSignal和现代compose回调，避免全局拦截或强杀共享池。代价是调用间不复用TLS连接；后续优化不能降低隔离和完整期限保证。128KiB响应上限、identity编码和16KiB默认头上限是本地约束，不冒充支付宝标准。

PC沙箱[当前说明](https://opendocs.alipay.com/open/00dn7o)明确time_expire最多当前时间15小时，已与正式协议15天上限区分。电脑沙箱可用专用买家账号登录付款、支持query/close；它不替代正式银行卡/花呗或真实账单验收。沙箱控制台已打开，但仍需用户登录；未取得沙箱应用/签名配置，不声称已调用官方沙箱。

## O1a 一致读取依据（2026-09-11）

决策仅涉及已锁定 Prisma 7.9.1 / PostgreSQL 的读取事务，不升级依赖。[Prisma v7 事务参考](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/transactions)支持交互事务的隔离级别与等待/执行时限；[PostgreSQL Repeatable Read](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-REPEATABLE-READ)说明同事务查询保持快照。本片显式设置只读事务，验证订单/流水关系查询期间第二连接完成到账也不会拼接不同版本。原无版本Prisma网址已转向v8，不能用它的新版API替代项目v7接口；本轮通过官方v7页面、已安装生成类型和实际数据库测试核对。实现/驱动/数据库版本或关系查询方式变化时重新验证。

## R1 操作感知失败核查（2026-09-11）

本轮读取[微信 Native 商户订单号查单](https://pay.wechatpay.cn/doc/v3/merchant/4012791880)错误说明：404 ORDER_NOT_EXIST 要求核对订单是否创建，429 表示频率限制，500 为系统错误。项目保留原有“发起未知后查单404仍核验原单”的恢复行为，避免丢失迟到付款；该选择由现有反例与有界调度支持，不把404解释为已关闭，也不声称官方承诺最终一致性。INITIATE/CLOSE 的不明404及其他未知组合仍受限；401/403不得按普通临时故障重试。精确可重试集合由 domain classifier 持有。

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

项目 `api-app.ts` 已在支付配置存在时启用 `rawBody: true`，并分别限制JSON与form parser；Nest以 `RawBodyRequest` 提供 Buffer。默认解析过程可能发生在验签前，但不得依据解析结果执行业务，验签始终使用原始 Buffer。[Nest raw body](https://docs.nestjs.com/faq/raw-body)

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

## N3 后台生命周期来源（2026-09-09）

决策只涉及已有 Native runtime 的常驻驱动，微信协议、密码学、Prisma 事务与 Node HTTPS 8 秒整体超时仍复用未变化证据。

- [Nest lifecycle](https://docs.nestjs.com/fundamentals/lifecycle-events)：本次读到 shutdown hooks 需显式启用；异步 hook 按阶段等待，`beforeApplicationShutdown` 先于 `onApplicationShutdown`；`app.close()` 本身不替应用清理残留 timer。现有 PrismaService 在最后阶段断开，故支付 drain 放在前一阶段。仓库 Nest 11.2.2 的真实 app 测试验证实际顺序。
- [Node 24 process signals](https://nodejs.org/docs/latest-v24.x/api/process.html#signal-events)：本次读到 SIGTERM/SIGINT listener 改变默认退出行为，SIGKILL 无法拦截；本片不注册伪 crash cleanup，而用持久记录和另一个实际进程恢复。页面当前显示 v24.20.0，CI/local 24.12.0 的具体行为以实际测试为准。
- Node timers 文档页面/固定源码本次读取失败或超时，未计为通过来源；已安装 Node 类型文档的 ref/unref 说明与实际定时器测试共同约束本进程持续运行/关闭。不从 timer 存在推断跨进程调度、持久性或总 QPS 保证。

不增加依赖、队列服务或通用后台框架。刷新触发：Nest/Node major/lifecycle 变化、从独立进程改为共享宿主、引入全局商户限流或改变 provider/DB 超时与退出政策。

## N4 持久通知边界来源（2026-09-09）

本次复核 [PostgreSQL 18 ALTER TYPE](https://www.postgresql.org/docs/18/sql-altertype.html)：事务内新增 enum 值需提交后才能使用；N4 迁移只增值，不在该事务插入该种通知。复核 [CREATE TRIGGER](https://www.postgresql.org/docs/18/sql-createtrigger.html)：行级 constraint trigger 可延迟到事务末，适用于通知待办与已完成充值的关联验证；普通 CHECK 不承担跨行账务校验。

Notification 现有 source UUID 唯一、upsert 不更新已读、SSE revision/list 恢复、ProductOutbox 评测路由和前端无条件选 Brand 均直接读当前源码。版本未变的 Nest 生命周期、原支付认证和 C1 事务证据继续复用；不新增库、网络服务或支付 Provider 调用。具体并发和失败语义由本片真实 PostgreSQL/HTTP/进程验证，不从 SQL 语法推断通过。


## R1 恢复与对账补查

本轮仅核实影响下一片边界的普通商户 APIv3 文档，未下载商户账单或调用支付接口。

- [支付回调和查单实现指引](https://pay.wechatpay.cn/doc/v3/merchant/4012075249)：后台主动查单、可调整的递增间隔和次日交易账单核对互补。本文据此选择有预算的恢复；具体算法不是官方强制方案。
- [申请交易账单](https://pay.wechatpay.cn/doc/v3/merchant/4013071227)：GET /v3/bill/tradebill，按日期和账单类型申请；文档说明每日10点后生成昨日账单、金额单位元、支持近三个月。响应给出 hash_type/hash_value 与5分钟有效下载地址。生成中、无账单、限流和服务错误有不同含义，不能都当空账单。
- 摘要用于校验文件一致性，不代替来源认证。下载接口链接本轮抓取失败；下载请求认证、压缩摘要计算顺序、文件格式和完整性校验细则留待 O1 对照完整下载文档与受控样本固定。本轮不声称这些细节已确认。
- 本地直接证据：网关 UNRESOLVED 附带 httpStatus，但 Native attempt 仅存 diagnosticCode；RETRY_EXHAUSTED 阻断 due 扫描，客户 supportRequired 来自统一 reviewRequired。R1 必须同时处理错误分类、历史兼容与提示，不能只提高 maxFailures 或移除扫描过滤。

设计归属为 design14，验收在 R1 tasks；账单只触发逐单认证复核，未新增账单直写积分权威。刷新条件是正式商户/账单类型/下载格式或对应接口规则变化。
