# 代理商佣金账本与收益查询

归档说明：本片设计已实现和本地验证；当前规格为 Agency Commission，集成事实由最终 PR 持有。

Owner: [Issue #110](https://github.com/ZETAVI/GEOEval/issues/110)，父 #100。architectural / main-direct，基线 main@3237111，ZETAVI。用户已经确认本片设计及不按发布篇数二次折算；没有新的产品审批前提。

结果：从购买时资格/费率快照、原消费来源和最终结算产生预计佣金与一次正式人民币入账；代理看自己的收益，管理员可全量核查。订单提前关闭且没有发布成功，仍按最终保留的实付消费计佣。

范围：来源读取/预计分摊共用、Agency 唯一账本、默认关闭的 Worker、两角色摘要/明细、管理入口、权限与恢复验收、current spec 对账。不包含提现/收款资料/付款/生产启用/历史兼容。旧 #107 不承接新实现。

当前 owner 为 [Agency terms](../../../specs/agency-order-terms/spec.md)、[Commerce](../../../specs/publishing-commerce/spec.md) 与 [Delivery](../../../specs/publication-delivery/spec.md)。新增 agency-commission 当前 spec，更新产品定义/术语/架构的佣金激活说明；提现 Evolution marker 继续保留。共享 schema/迁移/生成接口单写，充值/开票规则不改动。
