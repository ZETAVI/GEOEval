# 边界与架构设计

## Outcome and Boundary

- Owner and observable outcome: Agency Withdrawal拥有收款资料、最低规则、提现申请、金额占用、管理员处理和审计；代理商能从正式佣金完成一条人工线下付款闭环。
- In: 一份当前收款资料、不可变申请快照、整数分金额、一次进行中申请、待审撤回、管理员处理、结果通知和基础密文。
- Out: 第二个钱包、订单到提现逐笔分配、自动付款、文件资产、多账户、部分付款、税务和生产启用。
- Upstream prerequisites and downstream consumers: Commission提供正式金额；Identity提供身份；Notification消费结果事件；Web/API是两个角色的调用者。

删除测试：移除Withdrawal时，代理商佣金生成和读取、客户订单/积分、Recharge、Delivery和Support仍可运行；只失去可提现派生、收款资料、申请、处理和对应通知。

## Lifecycle and Data

状态只允许：

`PENDING_REVIEW → PAYING | REJECTED | WITHDRAWN`

`PAYING → COMPLETED | PAYMENT_FAILED`

所有终态不可重开。撤回后下一次提交必须有新ID、编号、请求键和收款快照。

权威记录：

- `AgencyWithdrawalPolicy`: 全局最低金额和revision；未配置时拒绝提交。
- `AgencyPayoutProfile`: 每代理一份当前资料和revision；银行账号密文/尾号、同意版本/时间。
- `AgencyWithdrawalRequest`: 代理、整数分金额、状态、不可变收款快照、批准/最终结果事实和revision。
- `AgencyWithdrawalAudit`: 去敏的追加式动作、操作者、状态、原因、请求键和服务端时间。
- `ProductOutboxEvent`: 已完成、已驳回、付款失败的通知义务；不携带银行或内部付款信息。

余额不落表：

`available = SUM(booked commission) - SUM(PENDING_REVIEW, PAYING, COMPLETED requests)`

提交与每个状态命令先锁代理账号，再锁当前申请；同一代理所有提现资金动作串行。正式佣金只增不减，所以并发入账最多让一次提交暂时看见较低金额，不产生超额提现。数据库部分唯一约束确保每个代理最多一笔进行中申请。

申请金额和快照创建后不可修改。管理员完成不输入金额，系统确认完成金额等于申请金额；银行流水号必填，可选外部付款时间仅作为内部事实。付款结果未知保持PAYING。

当前开发数据无需回填或双轨兼容。回滚先关闭功能开关阻止新命令，保留已接受金额和历史；不得通过删除申请或佣金恢复。

## Contracts and Dependencies

Withdrawal只依赖三个窄接口：

- `CommissionEarningsReader.bookedFen(agentId, tx)`: 同一事务内读取正式佣金合计。
- Identity当前账号锁/最小状态投影：验证AGENT/ADMINISTRATOR及ACTIVE。
- Notification Outbox事实：由Withdrawal事务写入，Notification异步物化。

Withdrawal不读取Commission私有表结构的调用方逻辑，不把Identity目录当业务授权，不让Notification回调资金状态。页面和API只使用Withdrawal命令/查询。

基础安全接口保持很小：`SensitiveDataCipher.seal/open`返回或消费带版本的认证加密信封；脱敏规则由Withdrawal字段适配器负责。接口存在的真实变化点是生产密钥版本/未来托管密钥适配，不建设字段注册、保留策略或通用隐私工作流。

## Failure and Recovery

| Failure | Classification | Recovery owner | Evidence |
| --- | --- | --- | --- |
| 两个并发提交 | business concurrency | Withdrawal transaction | 账号锁+进行中部分唯一约束，至多一笔 |
| 余额读取与新佣金同时发生 | safe stale read | 下一次用户提交/刷新 | Commission只增不减，不超提 |
| 过期页面执行命令 | business conflict | 用户刷新 | expected revision，无部分写入 |
| 同请求重试 | transient/replay | Withdrawal | actor+request key恢复原结果，意图变化冲突 |
| 银行结果未知 | ambiguous external fact | 管理员 | 保持PAYING与冻结，不自动重试/释放 |
| 完成事务失败 | transient | 管理员重试 | 状态、审计、Outbox原子提交 |
| 通知投递失败 | transient asynchronous | Notification runtime | source event幂等恢复，不回滚资金状态 |
| 密钥缺失/密文损坏 | permanent configuration/data | operator | fail closed，禁止查看/新提交，保留记录并告警 |
| 代理停用 | permission change | Identity+Withdrawal | 禁止代理命令/查询，管理员可完成在途申请 |

## Tool and Framework Decision

| Candidate | Decision | Evidence and limitation | Refresh trigger |
| --- | --- | --- | --- |
| Node认证加密原语+注入式小接口 | Adopt | 无新依赖；满足本片密文、版本和测试替身；不等同生产KMS | 第二个消费者或托管密钥要求 |
| 可变佣金钱包/余额表 | Reject | 会与不可变佣金和请求占用形成第二真相 | 出现跨币种、冲正或外部自动结算 |
| 通用财务/工作流引擎 | Reject | 当前只有固定短状态机 | 多种资金产品共享稳定生命周期 |
| 通用文件资产 | Defer | 首期无转账凭证 | 财务确认凭证为强制证据 |
| 后台提现Worker | Reject | 所有资金动作由用户/管理员同步命令触发 | 出现自动银行接口或调度义务 |

## Operational and Verification Boundary

- Security: 银行账号密文，列表/普通详情脱敏，管理员显式查看单独审计且no-store；明文不进日志、通知、Outbox或普通审计。提交保存敏感信息同意版本/时间。
- Capacity: 一代理一进行中申请；列表有界分页，汇总在一致快照派生；没有定时扫描成本。
- Observability: 仅记录申请ID/编号、代理ID、动作、状态、错误类别；禁止银行账号和收款快照。
- Completion: 领域状态/金额性质、数据库约束、权限、加密、幂等/并发、通知恢复、OpenAPI、完整测试、构建和两角色浏览器路径均有判别证据。
- Residual production gate: 密钥托管/备份、真实最低金额、公司付款SOP、敏感信息处理影响评估、生产代理与真实资金验收由Product Owner/财务另行批准。

架构评审：ready。边界符合高内聚/单向依赖；不需要ADR，原因和替代已由本Change设计持有。若通用加密接口获得第二个业务消费者或引入托管密钥，再评估提升为稳定架构合同。

