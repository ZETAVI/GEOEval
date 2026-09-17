# 充值订单开票与运营处理闭环

Owner: [Issue #109](https://github.com/ZETAVI/GEOEval/issues/109)。feature / architectural / money and customer-tax-data / main-direct，基线 `main@bc5791c`，ZETAVI。

## 结果

终端客户在现有充值页内查看“充值记录 / 发票记录”，只对一笔本人已成功的人民币充值主动提交电子普通发票申请。运营从共享池领取，必要时退回补正，在外部税务与邮件系统完成开票和发送后回填完成事实；管理员可查看、分配、改派、收回或显式接管。系统不上传、保存、预览或下载发票文件。

## 范围

包含 Recharge 提供的窄开票资格和金额合同、不可变资料 revision、一单一申请、客户补正、运营领取与完成、管理员治理、两类站内通知、同页记录表格、支付方式官方标识、短订单号展示与完整复制、统一工单入口和角色工作台更新。

不包含支付状态机变化、自动申请、专票、合并/拆分、折扣或退款金额规则、税务/企业校验接口、系统发邮件、PDF、重开/红冲、自助撤销、代理商提现发票或生产真实开票。

## 边界

Recharge 继续唯一拥有订单、支付成功和 `invoiceableAmountFen`。Recharge Invoice 位于 Recharge capability 内，拥有申请、资料 revision、assignment、处理事实和审计；Notification 只物化 `需补正 / 已开票` 事件；Support 只是已开票异常的目的入口。Recharge 不依赖 Invoice，代理商不读取客户开票数据。

共享写入窗口已经由 PR #108、Issue #100/#107/#116/#120 释放。本 Change 单一写入 Prisma、ApiModule、OpenAPI/生成客户端、Notification invoice 事件、充值页、运营开票页、管理员开票页与相应角色导航。支付 Issue #77 保持其 Provider/Worker/结算边界。

## 当前态对账

完成时从 Product Definition 抽取并校正充值开票场景到 `openspec/specs/recharge-invoice/spec.md`，更新 Recharge、Notification、术语和架构当前事实，并归档本 Change。生产启用仍须财务确认开票项目、处理时限、红冲/退款口径和实际运营 SOP。
