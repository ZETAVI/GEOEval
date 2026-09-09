# GEOEval 真实充值架构审查

审查日期：2026-09-08。Owner：[Issue #77](https://github.com/ZETAVI/GEOEval/issues/77)。对象：[架构候选方案](design.md)、[微信 APIv3 协议证据](source-brief.md)。主审自行复核，无独立 reviewer 或真实支付执行。

## 结论与用户批注

**A0 适配器与 B0 独立通知接收：implemented，作者审查 ready；充值全链路与渠道启用：not ready。**

用户已确认按上一轮独立模块范围构建并做初步测试，[A0 Decision checkpoint](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5582243258)开启A0 非冲突写入窗口。该阶段范围只有 Recharge provider port、微信协议实现、针对性测试和所属契约；不触碰共享 schema/API/Commerce 或应用启用。此前准备阶段的写入等待不再阻挡这一包。

用户已确认 Native → H5 和内部积分模块提取，并认可当前设计继续推进。官方规则和固定例证核清后，首版选择现有 Node 标准 crypto 与窄 HTTP Adapter；不增加未经评估的第三方 SDK 或语言进程。运行时仍需按合同验证。

边界结论：Recharge 与现有产品语义可以兼容，但上一版有真实的接缝遗漏，不能直接照写代码。本轮已修正方案中的事务顺序、回调接收、Provider 端口与回滚开关；剩余不确定性进入下列具体证据任务。

## 审查基线

- accepted main：a550fc4（#76 已合并）；A0 同步后 dfe98bc，准确 head 两项 CI 均通过。
- 履约积分装配：[PR #79@770a764](https://github.com/ZETAVI/GEOEval/pull/79)已实现但未合并；其验证由 [producer checkpoint](https://github.com/ZETAVI/GEOEval/pull/79#issuecomment-5583740565)持有，不等于 funded writer/reservation 已存在。
- B0 只使用 [通知新表 schema 窗口](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5583465643)，独立叠加 A0；API/Identity/Commerce 保持原 owner。
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

复盘结论：A0 已在用户确认的独立窗口完成实现，88 项实际代码验证覆盖官方固定输入、操作字段差异、安全投影和受控 HTTPS。接口/实现不导入 Commerce、Prisma、Nest 或旧 probe，不读取环境、不注册 Controller；全工作区类型检查和后端构建通过。固定 Diff 的意图、工程及证据复核由 PR 记录。B0 框架接收的后续实现证据见下一节；C0/N1 积分事务、Native/H5 客户旅程、运营恢复、真实渠道与资金仍须各自验证。

## B0 实现复核

固定范围：A0@dfe98bc → B0@4f30e10，[PR #80](https://github.com/ZETAVI/GEOEval/pull/80)。按意图、工程、证据三个角度自行复核，不冒充独立 reviewer。

| 角度 | 结论和可核查边界 |
| --- | --- |
| 意图/模块 | 只增加通知验真后的可靠接收；现有 API 不注册模块，handler 豁免与业务入账权限分开。新端口不接触 Commerce；没有钱包、通用支付平台或新队列抽象 |
| 持久性/并发 | 观察及 receipt 同事务；复合 FK 固定首份同身份观察，冲突变体只追加；READ COMMITTED 后续语句读取并发胜者；同事务失败不 ACK |
| 安全/隐私 | 真实原始字节验签/GCM；多值签名头不合并；仅投影必要字段；精确 Identity 元数据、报文和等待上限；原始密文与付款人标识不入库 |
| 修正后的完整性 | 内部调用传入非标准化时间可能使入库再读的事实摘要不一致，已补充规范化时间不变量及负例；数据库金额下界与 Adapter 的正整数规则一致 |
| 恢复/迁移 | 新表迁移重放通过；待处理扫描不持久推进时间水位；过期响应不声称取消提交。只有完整 settlement 事务未来可设置 processedAt/推进余额 |
| 证据 | 21 真实 Nest/Identity/PostgreSQL + 4 应用预算测试通过；现有 API 权限清单 2 项通过；类型、构建、格式/框架结果见 verification |

当前没有未解决的本片 material finding。实际应用装配、进程/存储崩溃、Worker 领取/结算、冲突运营处置与公网商户回调仍属于各自后续验收；扫描结果不能直接授权入账。固定 PR、CI 和 schema 交还回执由该 PR/Issue 持有。

## #79 消费方复核与 C1 结算设计（2026-09-08）

用户要求判断重构程度并继续打磨主线，合并留待后续。固定审阅 #79 的 a550fc4..770a764，实际变化是两个模块声明、装配测试和顺序改变的生成接口；服务、仓储、余额算法、锁、schema 均未改。真实消费者证明不引入 Publishing/Delivery/Media/GEO，完整 API 验证实例/路由只注册一次。复用 producer 的 63 项针对性检查和准确 head CI，不把重新计数当新增测试。

**结论：#79 对装配提取 ready；尚未完成 C1 资金能力是阶段边界，不能据此要求大范围重构。** 本任务不改 #79。现有 PointAccountService 依赖 Identity/HTTP 异常，其仓储自开事务，故不能直接充当充值原子写入口。最小后续是 Commerce 拥有的纯基础设施事务绑定 writer，复用账户锁和内部规则；不必须先再分一批 Nest modules。只有实际无 HTTP 消费者出现无法隔离的 runtime provider 依赖时才进一步拆装配。

| 级别 / 归属 | 可达风险与依据 | 下一实施动作 |
| --- | --- | --- |
| must-fix / C1 新增预留时 | 旧 adjustGranted 只检查可用余额；旧 spendPoints 只检查当前 revision，分别可能占满入账余额或最后序号槽位 | 所有账务 writer 共享 G+F+R、V+S 不变量；数据库行级上限保护，reservation 明细/汇总同事务 |
| must-fix / C1 跨模块写入 | 先调用会自行提交的账户服务、再更新充值状态，会留下半笔账 | Recharge repository 持有短事务；Commerce 绑定同一 tx，不反向 callback、不在事务内调用 Provider |
| must-fix / C1 系统幂等 | 现有账户客户端键空间跨赠点/购买唯一；系统到账复用公开/客户端键可被先占用 | 系统以充值业务关联去重，保留旧客户端键空间；候选 NULL 策略见 design 6.3，迁移与负例必须证明旧约束未放松 |
| must-fix / C1 nullable 迁移 | actor/key 变为可空后，旧 CHECK 中的相等表达式可能变 UNKNOWN 而通过 | 旧 kind 显式 IS NOT NULL；新 RECHARGE 行必须有非空业务关联和系统来源，不伪装用户再次操作 |
| must-fix / N1 receipt 消费 | worker 拿到 pending 后可能发生冲突；未知通知永远占据队首会饿死正常付款 | settlement 锁内重读；区分可重试、已应用与有原因的待核查，后续可执行行不会被永久阻塞 |
| retain / #73 退点语义 | 原来源返还、一次执行、Completed+待退点和停用客户旧义务均已确认 | 容量不足保留义务；不挪用 Recharge reservation，不新增退点预留产品规则或代替其 writer |

### 下一片最小反证矩阵

| 场景 | 必须观察到的结果 / 改变的实施决定 |
| --- | --- |
| G+F=M-20，R=20，同时赠送 1 点 | 拒绝挤占容量；本单 20 点仍能到账；不能只修 Recharge |
| V=M-1，S=1，同时购买扣 1 点 | 扣点也被序号容量保护拒绝；到账消费 S 并推进 V，说明负增量同样要经过策略 |
| 两个并发充值预留、同键创建重试 | R/S 明细与汇总一致，恢复同一个订单，不重复占用 |
| 两个通知 ID / query+notify 指向同交易 | 一条 RECHARGE 流水、同一订单成功；交易不能资助另一账户订单 |
| 客户创建键或公开订单 ID 先被购买使用 | 仍能结算已认证付款；旧购买/赠点的同键异意图继续冲突 |
| reservation 转换、余额、ledger、订单、receipt 任一步失败 | 全部回滚，没有半笔账；提交后丢响应恢复原结果 |
| listPending 后 conflict 先提交；账户先取得/receipt 后取得 | settlement 在锁内发现冲突，不使用过期扫描视图；无任务锁→账户锁倒序 |
| 未知/错配通知排在队首，后面为有效付款 | 未知记录有待核查原因，后续正常工作仍可推进；不能把待核查当已到账 |
| 客户停用、额度变更后重试已提交成功 | 恢复已提交结果，不重新授权新单/登录；新请求仍按当前资格执行 |
| 退点遭遇满余额/预留槽位 | 保留管理员待办与原履约事实，禁止挪用别单预留或伪造赠点 |

上述是 fc4dcb0 时的设计阶段记录；当时矩阵尚未执行，后续 C1 实际覆盖与限制见下一节。既有 A0/B0 与 #79 证据不被替代；共享写入窗口未重开。具体新 writer/迁移须在该窗口固定后实施，真实支付/生产仍未授权。

## C1 固定实现复核

实现初始 3457ee2，按 #79 accepted main@bcb81db 同步后为 be89fe0；冲突只有生成 OpenAPI/client，已按合并后的源码重新生成。C1 的模块/领域/仓储/迁移/测试内容在同步前后相同；新增主干装配在 26 项组合检查中验证。作者从意图、耦合、并发/资金完整性、安全、恢复/迁移和证据连续性复核，不冒充独立 reviewer。

| 检查 | 结论 |
| --- | --- |
| 模块 | 核心不导入 Publishing/Media/Delivery/HTTP-facing PointsService；事务绑定只提供本单预留/消费/释放及所需锁，应用端口不见 Prisma |
| 并发/原子性 | G+F+R、V+S 共用检查，旧购买 409 映射保持；唯一 provider transaction / recharge ledger，明确 wallet→order→reservation→receipt；四处实际写入失败整体回滚 |
| 持久图 | 延迟约束核对订单/预留、唯一系统流水/支付事实，以及 receipt 的成功订单匹配；不可变历史与 nullable old-kind 非空规则有负例 |
| 恢复 | 查询和通知竞争只记一次；丢响应重建宿主/连接后恢复已提交结果；扫描后的冲突重读、未知/错配进入独立待核查，后续合法任务可推进 |
| 修复的实现问题 | TypeScript 允许把完整扫描结果作为身份子类型；整对象传给 Prisma 会带入无关字段，现改为显式身份/请求投影，真实扫描恢复测试通过 |
| 兼容/隐私 | 原金额来源和客户余额投影保持；22 核心、2 新购买、1 新展示场景；73 路径不变，只有两种积分历史 DTO 合理扩展；旧数据升级逐字段一致 |

当前本片无未解决 material finding。技术不等于上线政策：测试配置没有变成默认额度/时限；后续 #73 退点、进程/存储崩溃、dispatcher/Worker、Native/H5 浏览器、真实商户/资金仍需对应证据。结论为本片 ready for fixed PR review，整体充值主线仍 partially verified。C1 窗口到固定 PR/CI 与交还回执结束。


## N1 官方来源设计复核（59930dd 运行时基线）

本轮只修改 #77 active change；用户明确先按官方文档推进 Native 设计。比较真实 Adapter、C1 事务/订单、发布 pending-purchase 与现行 Native 来源，复用无变化 C1/A0/B0 证据。作者审查，不冒充独立 review。

| Finding / 状态 | 具体可达后果 | 收束与下一证据 |
| --- | --- | --- |
| must-fix，已有 Adapter URI 过严，已复现未修复 | 官方 /up 链接验签后仍被拒绝，真实下单可能成功而二维码不可见 | N1 第一修复项；两种官方链接作为正式回归，保留恶意 URI 负例，不能靠旧通过数宣布现行兼容 |
| must-fix，N1 到期/lease 误作远端 fence，设计已纠正 | 延迟下单可被微信调整为至少一分钟可支付，过早释放后发生付款 | MAY_EXIST 只依可信关闭结果释放；用延迟发送→取消→NOT_EXIST→迟到成功检验，当前不是运行时通过 |
| must-fix，N1 丢弃旧 generation 的成功，设计已纠正 | 避免旧任务写入时顺便丢失已认证付款 | 陈旧 QR/计划写入被拒绝，付款事实仍经过 C1；两类结果分开检验 |
| should-fix，Native 与付款码状态混用，设计已纠正 | 把客户取消微信收银台或意外 PAYERROR 直接当关闭 | Native NOTPAY/SUCCESS/CLOSED 与 REFUND 核查独立；不使用 USERPAYING/PAYERROR 作为正常 Native 转移 |
| must-fix，误用现有 pending purchase 作为充值返回上下文，设计已纠正 | 为了绕过 shortfall 检查而构造已确认购买请求，可能误提交或保留过时价格 | 复用已保存 selection，单独保存账户限定返回引用；重新读报价与显式确认，保持购买恢复原语义 |
| retain，共享修改窗口 | C1 未合并，#73 拟消费固定 59930dd 后写 Delivery/RETURN；并行改 schema 会损伤迁移/接口责任 | 本轮无 runtime/shared 写入；#73 持有其明确范围，N1 实施前再次对齐窗口与精确 base |

设计在已确认的产品边界内可继续，当前无须重新询问模块所有权、充值兑换或付款凭证规则。额度/快捷金额/时限/客服联系方式与异常现金处置仍是对应产品/财务 Gate 的待定输入；测试 profile 不产生上线默认。结论：**ready for bounded N1 implementation planning；Native runtime not ready**，原因是已复现 URI 缺陷和尚未实现的调度/网页链路。真正接入前先以最小反例证明 9–11 节，而非再做整体钱包重构。
