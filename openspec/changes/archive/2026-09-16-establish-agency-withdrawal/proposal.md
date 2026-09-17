# 代理商收款资料与提现闭环

Owner: [Issue #116](https://github.com/ZETAVI/GEOEval/issues/116)，父 #100。architectural / critical money and sensitive-data / main-direct，基线 `main@1c60d36`，ZETAVI。

## 结果

代理商从正式已入账佣金派生可提现金额，维护一份当前收款资料，提交、撤回待审核申请并查看历史；管理员审核、线下付款并记录确定结果。金额冻结、付款未知、并发、停用和历史快照保持可解释且不可重复使用。

## 范围

包含最低提现规则、当前收款资料、银行卡号基础加密/脱敏、申请与冻结、待审核撤回、管理员审核及付款结果、追加式审计、代理/管理员页面、三类结果通知、统一业务记录和恢复验收。

不包含自动银行接口、转账凭证文件、多个收款账户、部分或分批付款、手续费、周期限额、提现发票、税务代扣、身份材料、历史数据回填或生产真实付款。

## 边界

Agency Commission继续唯一拥有正式佣金；Withdrawal只读累计金额并拥有申请占用。Identity提供当前角色与状态，Notification只物化无敏感信息的结果事件。没有第二个佣金钱包，不修改订单、客户积分、充值或履约事实。

本片拥有Schema、迁移、ApiModule、生成OpenAPI、Notification代理商事件和管理业务记录导航的共享写入窗口；Issue #109保持Ready。生产能力默认关闭，生产密钥、最低金额、付款SOP和真实资金验收属于后续Release Gate。

## 当前态对账

完成时新增Agency Withdrawal current spec，并更新Agency Commission、Notification、产品定义、术语和架构的当前事实；产品定义中人工填写金额/精确付款时间、可上传转账凭证等旧候选规则将被本片已确认边界替代。Change在PR集成前归档。
