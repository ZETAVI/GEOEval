# Agency Customer Service Specification

## Purpose

Own current account-level service relationships, administrator reassignment, and agent-only customer/brand/report reads in the controlled deployment. Identity, Brand and GeoIntelligence retain their own facts and public projections.

## Requirements

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

### Requirement: Activation, recovery and read boundary

The feature SHALL share the existing controlled Agency activation boundary. It SHALL default to disabled and SHALL NOT remove the production acquisition guard before purchase-time attribution/rate snapshots and commercial acceptance exist.

#### Scenario: Recover a committed migration

- **WHEN** the same administrator retries the same request identifier and intent
- **THEN** the committed result is recovered without overwriting a later relationship
- **AND** reuse of that identifier with different intent is rejected
- **AND** a new request whose target already equals the current relationship returns unchanged without inventing a migration

#### Scenario: Revoke current service access

- **WHEN** the final read check observes a changed relationship version or ineligible actor/customer status
- **THEN** the response does not include customer data
- **AND** a paged list rechecks its bounded candidate set and omits revoked rows
- **AND** page navigation, refresh, visibility/focus restoration invalidate stale data; individual responses use no-store
- **AND** content already delivered before authorization changed cannot be retroactively withdrawn from the recipient

#### Scenario: Show operator-readable audit

- **WHEN** an administrator opens customer service attribution in account detail
- **THEN** the current relationship and latest 20 migration events are shown with readable account labels, reason, and automatically captured time
- **AND** event storage keeps stable account identifiers rather than copying contacts or reports; older events remain durable
- **AND** only administrators can read these service-governance events

## Existing source and commercial history

[Agency Entry](../agency-entry/spec.md) owns the stable acquisition link and 30-day anonymous source. Reassignment preserves the customer's original entry evidence and does not revoke the old agent's general acquisition link. That link can still acquire new customers; an existing customer opening it is never reclaimed.

Manual assignment of a pre-existing public customer creates no fictitious entry evidence. Account, brand, report, wallet and order data remain under their owners. This capability does not supply purchase-time agent/rate snapshots, commission, 72-hour point-return claims or [withdrawal behavior](../agency-withdrawal/spec.md); those remain separate commercial owners under #100. A customer's historical commercial ownership is never inferred from the current service relationship.

### Requirement: Suspension retains attribution

An inactive agent SHALL lose acquisition and customer-service access while retaining its existing customer relationships. The customer continues ordinary purchase and fulfilment with public service support; this does not assign administrators as daily service staff or grant broader customer access. Reactivation resumes only relationships not subsequently reassigned. No duplicate public-pool relationship is persisted.

#### Scenario: Inactive destination
- **WHEN** an administrator attempts to move a customer into an inactive agent
- **THEN** the transfer is rejected, including a concurrent suspension

#### Scenario: Resume after suspension
- **WHEN** an agent is reactivated
- **THEN** currently retained customer relationships become available again
- **AND** customers moved elsewhere are not reclaimed
- **AND** commercial history remains governed by [agency order terms](../agency-order-terms/spec.md)
