# Agency Entry Specification

## Purpose

Define the controlled A0 entry, anonymous source and atomic initial account attribution. This capability is opt-in and is not enabled for production acquisition.

## Requirements

### Requirement: 一致且可恢复的客户入口

The product SHALL use one neutral-brand registration flow for public and agent-acquired customers, with equivalent entry-link form and no visible invitation field or agency hierarchy.

#### Scenario: 从代理商入口返回主页

- **GIVEN** 未注册访客在有效访问上下文中首次经代理商 A 的有效链接进入
- **WHEN** 访客回到根目录主页并查看或点击注册按钮
- **THEN** 按钮复用该入口的同一地址，注册流程保留 A 来源
- **AND** 刷新、普通站内导航和来源有效时重新打开不将其变为公共来源
- **AND** 普通访问不延长首次代理来源期限

#### Scenario: 浏览官网不锁定公共归属

- **GIVEN** 访客只浏览过官网且尚未注册，没有有效代理商来源
- **WHEN** 访客首次通过 A 的有效链接进入并完成注册
- **THEN** 新客户归属 A
- **AND** 没有任何代理来源的普通注册仍产生无代理关系的终端客户

#### Scenario: 已有来源不被其他入口替换

- **GIVEN** 同一访问上下文中已有有效的首次代理来源 A
- **WHEN** 访客随后打开 B 或公共入口
- **THEN** 该上下文继续使用 A
- **AND** 页面和按钮使用服务端确定的入口，不将前端编号当作绑定授权

#### Scenario: 分享不分享身份

- **WHEN** 访客复制入口链接给其他人
- **THEN** 链接只传递公开获客入口，不携带账号会话、访问凭据或个人资料
- **AND** 接收者依据自己的有效来源上下文注册，已有账号不被改绑

### Requirement: 新客户归属与注册原子提交

The product SHALL establish initial agency attribution only for a newly created terminal-customer account, atomically with the accepted registration.

#### Scenario: 验证码流程固定来源

- **WHEN** 后端接受一次新的验证码流程
- **THEN** 在服务端保存该流程的可信来源快照
- **AND** 完成时按该快照核对资格，后续导航或其他标签页不能修改它
- **AND** 验证码失效/替代规则仍由 Identity 拥有

#### Scenario: 首次注册成功或失败

- **WHEN** 有效验证码首次建立客户账号
- **THEN** 验证码消费、账号、归属及审计、会话在同一事务提交
- **AND** 失败不留下已成功注册但漏绑的账号
- **AND** 归属覆盖该账号的全部品牌，但不授予代理商客户写权限

#### Scenario: 既有账号和不确定响应

- **WHEN** 已有账号完成登录，或注册成功后因响应丢失再次登录
- **THEN** 保留已有账号及其归属，不重复绑定或凭当前链接改变归属
- **AND** 不使用时间相等或非事务预查猜测账号是否首次创建

#### Scenario: 入口失效时已有账号继续登录

- **WHEN** 获客入口无效或当前来源不可用
- **THEN** 页面提供统一手机号登录，保留原来源而不替换成公共注册
- **AND** Identity 将“仅登录已有账号”冻结到验证码记录，新手机号不能通过该流程创建账号
- **AND** 完成请求不能改写已冻结的登录限制，旧账号归属保持不变

### Requirement: 有限来源与隔离

The product SHALL distinguish public entry keys, anonymous visit credentials and authenticated account sessions, and prevent cross-visitor entry-context leakage.

#### Scenario: 两名访客与共享缓存

- **GIVEN** 两名访客分别拥有 A 和 B 的上下文
- **WHEN** 访问主页及注册流程，包括刷新、返回与预取
- **THEN** 任何访客都不会收到另一访客的个性化入口或凭据
- **AND** Web/独立 API host 的凭据边界不会通过扩大登录 Cookie Domain 绕过

#### Scenario: 来源丢失或期限到达

- **WHEN** 浏览器凭据丢失或服务端来源期限到达
- **THEN** 系统不按 IP、指纹或当前客户信息猜测原代理商
- **AND** 已注册账号的真实归属不因匿名来源过期而变化
- **AND** 首次有效代理来源固定保留连续 30 天，普通浏览不续期；公共来源首次升级为代理来源时开始该期限
- **AND** 过期后重新打开有效链接可以建立新来源周期，无效入口使用中性不可用提示

#### Scenario: 暂时无法读取有效来源

- **WHEN** 已有来源的服务端读取暂时失败
- **THEN** 保留访问凭据并允许有限恢复，不静默降级成公共注册或绑定其他代理商
- **AND** 不将不可用业务伪装成成功注册

### Requirement: Bounded role entry management

Administrators SHALL issue one stable acquisition link for an active AGENT account; an agent SHALL read only that agent's own link. Repeated issuance SHALL recover the same link without duplicate audit. Both actor and target eligibility SHALL be checked within the transaction.

#### Scenario: An administrator selects an agent

- **WHEN** the current administrator selects an active agent in account management and opens the acquisition action
- **THEN** the link belongs to that selected account, and a first issuance appends an actor-bound audit
- **AND** switching the selected account clears the prior link and ignores stale responses
- **AND** customers, operations users and agents cannot invoke the administrator action

### Requirement: Controlled activation and maintenance

`AGENCY_ACQUISITION_ENABLED` SHALL default to disabled. The API SHALL reject acquisition activation in production until purchase-time agent/rate snapshots and commercial acceptance are established under their owner.

#### Scenario: Stop new acquisition while a challenge is accepted

- **WHEN** new acquisition is disabled
- **THEN** new entry resolution and source-bearing challenge requests are unavailable
- **AND** an already accepted, still-valid challenge retains its frozen source during completion, with current agent eligibility checked
- **AND** prior account attribution and audit are retained

#### Scenario: Clean expired anonymous records

- **WHEN** the bounded Identity maintenance command runs
- **THEN** the Agency-owned cleanup removes at most the configured batch, capped at 500 expired visits
- **AND** newly renewed records are not removed by an earlier stale selection
- **AND** account attribution and initial-binding audit survive anonymous and challenge cleanup

## Implementation boundary

A0 adds source entry management and initial binding only. Customer lists/report access, administrator reattribution, purchase agent/rate snapshots, commissions, the 72-hour point-return claim window and withdrawals are not activated here. Existing customer data and orders are not retroactively attributed. Web and API configuration must refer to the same controlled deployment; source-enabled pages cannot be rolled out against an older API that ignores source input.
