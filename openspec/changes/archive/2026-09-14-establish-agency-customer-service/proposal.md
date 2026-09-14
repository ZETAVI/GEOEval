# Archived change: 接通代理商客户迁移与只读服务视图

- Issue: [#102](https://github.com/ZETAVI/GEOEval/issues/102)，parent [#100](https://github.com/ZETAVI/GEOEval/issues/100)
- Owner: ZETAVI；feature / architectural
- Status: Approved and implemented controlled A1; archived for independently complete A1 integration; verification and integration evidence belongs to PR #103. No production activation.
- Baseline: main `90e0aa5`，A0 由 PR #101 合并；main-direct，复用原独立工作树。

## Outcome

管理员将小林从 A 迁给 B 后，B 能从客户列表进入小林全部品牌，并查看当前及历史客户版评测报告和完整联系方式；A 的旧客户链接随即不能再取得资料。小林继续使用同一账号、品牌和报告，日常页面不展示代理层级。

本片将迁移与只读访问一起验收，避免“关系改了、旧代理仍能读”或“新代理接手但没有历史报告”。

## Confirmed scope

- 管理员公共→代理、代理→代理、代理→公共的账号级迁移；不允许代理商自行认领已有客户。
- 当前归属代理商可查看完整登录手机号、客户填写的业务联系人和联系电话。完整登录手机号由用户于 2026-09-14 明确选择，不再按尾号设计。
- 客户→品牌→当前/历史客户版报告；沿用已有完整客户报告，含原始采样回答，不增加内部搜索证据、提示词或模型轨迹。
- 版本检查、迁移原因、原子审计、重复提交恢复，以及每次请求的当前归属校验。

Out: 客户写操作、评测/文章/订单代办、报告导出、余额和账号安全数据、其他代理历史佣金、公共池固定跟进人、通知推送、订单代理/费率快照、佣金/提现及真实生产激活。业务进度首片限已有报告是否可查看及报告历史，不拼接第二套写作/履约状态。

历史商业记录不是客户资料：迁移不会重写订单或佣金。现有订单没有代理快照时仍为未采集，不以新关系倒推。实际获客/商业启用须等 #100 后续购买快照与商业验收。

## Owners and reuse

- Agency：当前关系、关系版本、迁移及审计；提供限定的客户服务读取入口。
- Identity：角色、状态、完整登录手机号、账号治理；不让代理商使用管理员账号目录 DTO。
- Brand：客户版品牌资料和业务联系方式；不复制品牌档案。
- GeoIntelligence：当前/历史报告与客户版报告投影；不重新生成或保存第二份报告。
- Web：复用现有账号详情、代理商工作区和 EvaluationReportView，只传只读数据，不传发起评测回调。

[design](design.md) 记录接口和一致性候选；[delta](specs/agency-customer-service/spec.md) 记录可观察行为；[tasks](tasks.md) 记录实施与验收。

## Documentation and exit

当前 [Product Definition](../../../specs/product-definition/spec.md) 已明确 agent assistance 与管理员迁移；本片已将稳定行为局部提取到 Agency Customer Service current spec，保留初始入口在 [Agency Entry](../../../specs/agency-entry/spec.md)；更新 Product Definition 的 Evolution marker 及相应 Identity/Brand/报告索引，不复制商业结算规则。

本片实现由同一 PR 承接。保留工作树用于 #102 实施，准确路径/PR/退出由 Issue 持有；不将 A0 归档变成新需求清单，不改 #77/#89 或 Writer 工作树。
