# GEOEval 真实充值架构审查

审查日期：2026-09-08。Owner：[Issue #77](https://github.com/ZETAVI/GEOEval/issues/77)。对象：[架构候选方案](design.md)、[微信 APIv3 协议证据](source-brief.md)。主审自行复核，无独立 reviewer 或真实支付执行。

## 结论与用户批注

**A0 独立适配器：implemented, ready for fixed-diff review；充值全链路与渠道启用：not ready。**

用户已确认按上一轮独立模块范围构建并做初步测试，[A0 Decision checkpoint](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5582243258)开启当前非冲突写入窗口。范围只有 Recharge provider port、微信协议实现、针对性测试和所属契约；不触碰共享 schema/API/Commerce 或应用启用。此前准备阶段的写入等待不再阻挡这一包。

用户已确认 Native → H5 和内部积分模块提取，并认可当前设计继续推进。官方规则和固定例证核清后，首版选择现有 Node 标准 crypto 与窄 HTTP Adapter；不增加未经评估的第三方 SDK 或语言进程。运行时仍需按合同验证。

边界结论：Recharge 与现有产品语义可以兼容，但上一版有真实的接缝遗漏，不能直接照写代码。本轮已修正方案中的事务顺序、回调接收、Provider 端口与回滚开关；剩余不确定性进入下列具体证据任务。

## 审查基线

- main/工作区：`0552aa7e60d5aa6b99645692e6090e64544087d5`；当前真实充值未启用。
- 履约：[PR #76 固定提交 2658295](https://github.com/ZETAVI/GEOEval/blob/2658295805238bef7a09d8047c6aafdf3632edc8/openspec/changes/establish-publication-delivery/design.md)，已批准在研设计，尚非 main 事实。
- 最新协调核查：#73 的 [0a88a5b 固定结果 checkpoint](https://github.com/ZETAVI/GEOEval/pull/76#issuecomment-5581859806)及 live head 一致；owner 确认 points 提取仍未执行，不将结果提交或 CI 本身当作共享写入窗口。
- 当前 Commerce：`publishing-commerce.module.ts` 把积分与媒体/文章/HTTP 装配在一起；`point-account.ts` 同时限制余额和账务序号；`point-account-lock.ts` 提供 wallet lock；原购买与拟议退点都是 wallet-first。
- 当前 HTTP：`api-app.ts` 未保留 raw body；AccessGuard、CsrfGuard 默认限制外部回调，已有精确豁免元数据可复用。
- 官方规范：普通商户 APIv3、普通 H5 API、回调/关单/验签正文、微信官方 SDK/示例与支付宝官方 Node SDK。

## Findings

这里的 must-fix 指正式设计/实现前必须落实的边界；不是已部署产品发现了付款事故。

| 严重度 / 归属 | 上一版缺口与可达后果 | 本轮收束及下一证据 |
| --- | --- | --- |
| must-fix / 提案新增 | Recharge 把 Commerce 当整包依赖，会把媒体、文章和 Controller 带入支付 Worker，并暴露私有表写入 | Commerce 内提取 Points 装配单元与明确 funded writer；应用端口不暴露 Prisma。P0 检查 API/Worker import graph 和禁止反向依赖 |
| must-fix / 提案新增 | Recharge-first 锁顺序与 wallet-first 的购买/退点组合后难以维持统一事务规则 | 统一 wallet → RechargeOrder/Delivery settlement → 处理记录；领取任务独立短事务后释放。未来并发测试覆盖四种账务写入 |
| must-fix / 提案遗漏 | 只预留点数、只检查赠点，会漏掉 #73 退点和 revision 上限；付款后仍可能无序号可记账 | 单一账户策略同时检查余额、reserved 容量、未来流水槽位；订单退点不能挪用充值 reservation。测试上限附近的 grant/purchase/return/recharge 交错 |
| must-fix / 提案新增 | 把 close/query/notify 统一为同一成功观察，关单 204 无 body 时只能伪造交易字段 | 分为 AuthenticatedTradeSnapshot、AuthenticatedNotification、CloseResult；Adapter 只证明来源，Recharge 锁内证明订单匹配 |
| must-fix / 提案新增 | webhook 等待账户入账锁后 ACK，可能超过官方 5 秒；改成 ACK 后内存任务又会丢单 | 复用 PaymentObservation 为 durable inbox，验真并落库后 ACK，后台幂等结算。用 ACK 前 DB 失败、ACK 后崩溃、Redis 不可用证明 |
| must-fix / 提案遗漏 | 租约过期或一次 NOT_EXIST 就释放容量，可能与已发送但延迟的下单竞争 | 持久发起权、关闭意图、generation；有在途/歧义时保留 reservation。接口文档不能证明本地超时撤销外部请求，终止条件需受控时序验证 |
| must-fix / 提案新增 | Provider 唯一键含可变配置 alias，轮换时可能把同一交易视为新交易 | 唯一性依赖真实 merchantId，订单冻结 app/merchant；key version 单独记录。模拟轮换后重复通知 |
| must-fix / 提案遗漏 | 客户支付后停用，若沿用赠点 TARGET_INACTIVE 就拒绝已收款结算 | 新充值和已有义务结算分开；建议原订单继续结算、账号继续停用，保留发起人与系统执行来源。Identity/财务处置规则在 P0 明确 |
| must-fix / 提案新增 | “关闭新的 Provider 调用”会连查询、关单、对账也停掉 | 开关只禁止新的支付发起；已付款/未知单继续接收、核验与结算。以未结订单存在时停新单演练 |
| must-fix / 提案歧义 | DEFINITE_REJECTION 混合本次 HTTP 诊断与整个商户订单终态，可能使 404/配置失败释放既有 MAY_EXIST 预留 | 传输只给认证数据或诊断，具体操作解释已认证结果，Recharge 决定恢复/终态；新增本地 HTTP 37 项验证，DB 状态转换仍待验证 |
| must-fix / 提案歧义 | 原始报文摘要兼任重复事实比较，重加密/排版变化可能误报冲突；接收成功与处理游标分开提交则可能丢已 ACK 工作 | 分离 raw digest 与标准化事实；唯一插入后用后续 SQL 语句读冲突行；观察/游标同事务。20 项 HTTP/PG 检查验证提交屏障、并发和接收进程崩溃；生产 repository 仍须接入 |
| should-fix / 提案遗漏 | 一个 amount 字段可能丢失 total 与 payer_total 差异，使未来财务读取误以积分倒算实付额 | 安全观察保留两种金额和币种；本片只验证证据不丢失，不扩展发票或优惠功能 |
| should-fix / 研究来源 | H5 用到指定身份支付页面；通知 id 被误记为没有；支付宝页面支付被统称 APIv3 JSON | 改用普通 H5 4012791834；记录微信顶层 id；支付宝 pageExecute/表单验签各自适配。协议简报标明未取到的普通查单正文 |

## 收束后的责任链

1. Identity 判定谁可发起新充值和访问自己的订单；
2. Recharge 创建固定金额/积分订单，调用 Commerce points 预留容量；
3. Provider Adapter 负责具体协议与认证，不拥有本地业务成功；
4. Recharge inbox 接收可信通知，Worker 查单并消化持久观察；
5. Recharge settlement 与 Commerce points 同一短事务确认并入账；
6. Commerce 购买/退点继续拥有原消费与返还，Delivery 只拥有协商意图和履约结果；
7. 页面恢复原发布复核，再由客户确认购买。

最小重构只作用于 Commerce points 接缝及 API/Worker 装配。尚无理由增加独立 Wallet 微服务、通用事务框架、PaymentAttempt 表、BRIDGE 类型或动态 Provider 插件系统。

## 不再扩大为本轮阻塞项

- 一个账户只能有一个活动充值单是产品体验策略；安全要求是活动单和总预留有界，不能把具体数量冒充已批准语义。
- 商户资质和真实 key 不阻碍 P0 合同准备；在渠道联调前必须就绪。
- Node 标准 crypto 与窄 HTTP Adapter 已在官方证据基础上选定；不重复选型，不在本轮安装依赖或付费验证。
- 官方通用检查材料中的可用性宣称不是 GEOEval 的 SLA，不照搬为新的项目架构要求。
- 不因上一轮 42/42 合成模型通过就宣称新 reservation/inbox/并发设计验证通过，也不重复跑未变化的教学模型。

## 下一包与证据矩阵

| 下一工作 | 具体产物/反证 | 当前状态 |
| --- | --- | --- |
| 官方协议固定 | 普通 Native/H5、query/close、签名字符串、空 204、通知 id/ACK/解密、商户与金额字段 | 普通 query 正文已取得；固定 SDK Native models 补充网页限制。旧 P0 证据与 1 条失败样例单独保留；A0 实际代码 88 项验证见 verification |
| Commerce 接缝 | points 装配/写入 owner、与 #73 退点的上限/锁顺序矩阵 | 文档和现有代码已对齐；新代码未实现 |
| 生命周期设计 | 创建→在途→关闭意图→可信观察→成功/关闭，以及租约、序号容量、停用客户处理 | 已列明确不变量；传输断线/总时限已验证，但持久化 dispatch/cancel 竞争、DB 与预留尚未执行 |
| 通知接收持久性 | raw HTTP→认证解密→安全投影→观察/处理状态同事务→ACK→接收进程重启 | 20/20 在独立 PostgreSQL 库通过；不证明生产 Nest route、Worker 恢复或 funded 结算 |
| A0 与正式 change | 业务端口/协议实现由代码持有，未来编排/积分语义仍在本 change；不保留重复接口草案 | A0 代码、测试和当前 change 进入同一 PR；没有应用装配或客户激活 |
| 执行窗口 | #73 agent 明确接受唯一提取 owner，在稳定结果片之后、退点之前给出有界提交；#77负责充值协议/Adapter | owner 已定；提取尚未执行 |
| 真实渠道 | 官方向量后再做受控商户、PC、iOS/Android、T+1 验证 | not run，不能以文档代替 |
| 本轮文件与 tracker | 迁移后的框架校验、链接/围栏检查和 #77 当前正文回读 | 随 P0 交付执行；此前 5 份旧路径的检查不替代迁移后结果 |

整体为 **partially verified**：可审阅的设计纠偏已完成，接口实现、原子性、恢复、浏览器支付和生产均未验证。

## P0 本轮进展

用户已认可 CommercePointsModule 重构方向；#73 owner 已确认结果片稳定后的单 writer 短窗口。正式 proposal/design/spec/tasks 已建立，旧本地候选迁入本 change，避免双重设计 owner。14/14 官方原语、23 项离线响应、37/37 受控 HTTP 和 20/20 通知/PG 持久性证据边界详见 [verification](verification.md)，一条失败页面样例仍单独保留。

复盘结论：A0 已在用户确认的独立窗口完成实现，88 项实际代码验证覆盖官方固定输入、操作字段差异、安全投影和受控 HTTPS。接口/实现不导入 Commerce、Prisma、Nest 或旧 probe，不读取环境、不注册 Controller；全工作区类型检查和后端构建通过。固定 Diff 的意图、工程及证据复核由 PR 记录。B0 框架接收、C0/N1 积分事务、Native/H5 客户旅程和运营恢复分别推进；生产 repository、Nest parser/Identity、Worker、预留/账本、真实渠道/浏览器/资金仍须对应验证。
