# Agency Customer Service Delta

## ADDED Requirements

### Requirement: 管理员原子迁移当前服务关系

The product SHALL allow an administrator to assign a terminal customer to an eligible agent or the public pool without moving customer-owned data or rewriting historical commercial facts.

#### Scenario: 代理 A 迁到 B

- **GIVEN** 客户属于 A 并已有多个品牌和历史客户版报告
- **WHEN** 管理员按当前关系版本提交迁移到 B
- **THEN** 更新唯一当前关系并原子记录操作者、原因、前后代理和时间
- **AND** 账号、品牌、报告和旧订单标识及其历史事实保持不变

#### Scenario: 公共池与手动分配

- **WHEN** 管理员把客户迁回公共池或将公共客户分配给 B
- **THEN** 不授予公共池其他代理或运营全量客户访问
- **AND** 没有原始获客入口的客户不伪造邀请来源

#### Scenario: 陈旧操作与不确定响应

- **WHEN** 管理员提交的关系版本已过期
- **THEN** 拒绝覆盖并提示刷新当前关系
- **WHEN** 已成功提交的同一请求再次到达
- **THEN** 恢复原结果，不再次迁移或追加重复迁移事件

### Requirement: 当前归属代理商只读协助

The product SHALL authorize customer, brand and report reads from the current account-level relationship on every request, independently of historical performance ownership.

#### Scenario: 新代理接续完整客户资料

- **WHEN** B 读取当前归属客户
- **THEN** 可查看完整登录手机号、业务联系人和联系电话，以及该客户全部品牌和当前/历史客户版报告
- **AND** 包含迁移前形成的客户版报告和原始采样回答
- **AND** 不返回余额、账号安全数据、提示词、模型轨迹、日志或内部搜索证据

#### Scenario: 旧链接和读取中的迁移

- **WHEN** A 使用迁移后的旧链接、游标或直接 API 请求读取该客户
- **THEN** 不再取得客户、品牌、报告或联系方式
- **AND** 若读取期间关系版本变化，服务端不返回该次旧结果，页面清除已失效详情
- **AND** 既有历史业绩资格不能重新授予客户资料访问

#### Scenario: 伪造其他客户品牌或写操作

- **WHEN** 代理商替换客户/品牌/报告标识，或尝试客户写操作及导出
- **THEN** 校验归属链并拒绝越权；已有客户写接口继续拒绝代理角色
- **AND** 不生成客户会话，不代客户发起评测、文章生成或付费
