# 边界与架构设计

## Outcome and Boundary

- Owner and outcome: Recharge Invoice 拥有“成功充值后客户主动申请”到“运营确认外部开具并发送”的生命周期。
- In: 普票、个人/企业最小资料、不可变 revision、运营领取、补正、完成、管理员治理、审计和通知。
- Out: 支付结算、税务/邮件外部调用、PDF、退款/红冲、代理商票据与通用 Billing/Workflow。
- Upstream/downstream: 只读 `RechargeInvoiceOrderAccess` 提供资格与金额；Product Outbox 承载通知义务；Web/API 为角色调用者。

删除测试：移除本模块时，Recharge Provider、支付回调/查询、积分到账、代理商佣金/提现、Support 和其他 Notification 仍可运行；只失去充值开票申请及处理。

## Lifecycle and Data

客户状态只存 `PROCESSING / NEEDS_CORRECTION / ISSUED`；“可申请 / 不可申请”从 Recharge 事实和请求存在性派生。assignment 与客户状态正交。

权威记录：

- `RechargeInvoiceRequest`: 唯一充值单、账号、不可变金额/币种、状态、当前 revision/负责人、补正摘要、票号、开票日期、运营确认发送时间与完成人。
- `RechargeInvoiceSubmission`: 每次客户正式提交的不可变个人/企业资料快照。
- `RechargeInvoiceAudit`: 申请、领取、补正、重提、分配、改派、收回、接管和完成的追加式审计及请求幂等事实。
- `ProductOutboxEvent`: 补正与已开票通知义务，不含税号或完整邮箱。

允许迁移：

`无申请 → PROCESSING → NEEDS_CORRECTION → PROCESSING → ISSUED`

同一订单最多一份 request。补正重提保留 requestId 并新增 submission revision；`ISSUED` 终态不可在本模块回退。领取不改变客户状态。补正后默认保留原负责人。

## Contracts and Dependencies

`RechargeInvoiceOrderAccess.readInvoiceable(accountId, orderId, tx)` 只返回本人、`SUCCESSFUL`、`CNY`、未退款/无优惠歧义订单的 `invoiceableAmountFen`、支付时间、方式和订单引用。首发规则由 Recharge 明确给出 `amountFen`，Invoice 不读取付款观察或倒算金额。

客户提交事务锁定 RechargeOrder 后重新校验资格，再创建 request、submission 与 audit。读取列表分别由 Recharge 与 Invoice owner 提供，Web 按订单 ID 组合；组合失败不能授权提交，也不能改变支付状态。

Invoice 可写 Product Outbox；Notification 消费事件 payload，不能回调或回滚 Invoice。Support 只接收关联 request/order 的用户入口，不复制状态。

## Concurrency, Permissions, Recovery

- 客户：account fence、CSRF、`requestId + digest`、`expectedRevision`；他人订单按不存在处理；订单唯一约束防并发重复。
- 运营：共享池条件领取；仅当前负责人可退回补正或完成。完成要求票号、开票日期，并明确确认已经通过外部渠道发送。
- 管理员：全量读、审计、分配/改派/收回、显式接管；接管后才执行运营动作。管理员不能改客户法律资料、订单、金额或跳过资格。
- 通知：状态、审计和 Outbox 同事务；Worker 幂等物化，投递失败不回滚已接受状态。
- 回滚：先关闭/隐藏新命令入口并保留全部申请与审计；不得通过删除记录恢复。当前开发数据不需要回填。

## Interaction Decisions

- 客户充值页采用 Yunwu 式同页表格与页签，不建独立发票中心。
- 申请/补正使用 Apilio 式当前流程弹窗，不在页面内长展开，也不强制预先保存 Profile。
- 表单声明仅写“我确认以上开票信息准确”，不向客户讲内部状态机。
- 支付方式使用官方标识与可见文字，两个品牌同等视觉权重；禁用方式仍保持名称清晰。
- UUID 只以短引用显示（前 8 位与后 4 位），旁边提供复制完整编号；详情保留完整值。截断不是身份或查询输入。
- 已开票只显示运营确认的票号、日期、发送时间和脱敏邮箱；未收到时进入统一工单，不提供文件下载。
- 代理商工作台只呈现已激活的获客、客户、佣金和提现能力，不新增客户发票入口；运营与管理员激活各自开票处理入口。

## Tool and Source Decision

不引入状态机、工作流或表单依赖。现有 NestJS、Prisma、Zod、Product Outbox、React/CSS 足以表达固定生命周期。支付标识使用官方公开资源并保留来源/哈希；生产发布前仍需复核商户协议与品牌授权。

## Failure and Verification Matrix

| Failure | Owner | Expected result | Discriminating evidence |
| --- | --- | --- | --- |
| 他人/非成功/非人民币订单提交 | Invoice + Recharge access | 404/409 且不泄露 | HTTP 集成测试 |
| 并发/重复客户提交 | Invoice transaction | 一份 request，同意图恢复 | 并发和幂等测试 |
| 过期 revision 补正 | Invoice | 409，无覆盖 | revision 历史测试 |
| 两名运营领取 | Invoice | 仅一人成功 | 并发领取测试 |
| 非负责人处理 | Invoice | 拒绝且不写审计 | 角色/assignment 测试 |
| 管理员改派/接管 | Invoice | 显式动作与审计 | 管理命令测试 |
| 完成事务/通知失败 | Invoice/Notification | 状态真实、事件可恢复且不重复 | Outbox 恢复测试 |
| UI 过长编号/提示噪声 | Web | 短引用、复制完整值、短文案 | 组件与浏览器检查 |
| Schema 迁移/回滚 | Persistence | 空库可部署，保留已接受记录 | 独立数据库迁移与关闭入口检查 |

架构进入实现的 Gate 已由产品 Owner 在 Issue #109 会话中确认；设计保持 owner-local，不新增 ADR。若第二类真正相同的开票业务出现，再重新评估通用 Invoice 抽象。
