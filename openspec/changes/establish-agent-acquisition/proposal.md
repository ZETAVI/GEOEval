# Change: 建立一致的代理商入口与首次注册归属

- Status: A0 implemented in the Issue branch; bounded verification and PR review in progress; no merge or production activation
- Issue: [#100](https://github.com/ZETAVI/GEOEval/issues/100)
- Owner: ZETAVI
- Lane/class: feature / architectural, identity and customer-attribution boundary

## Why

代理商获客客户应完成与公共客户相同的注册流程。客户从代理链接进入后先浏览主页，注册按钮仍须复用原入口地址，来源不能被公共导航覆盖。当前 Web 首页固定指向 `/enter`，Identity 共用验证码登录/注册，但没有获客上下文或账号归属。

本片先建立可验证的入口与首次归属基础；佣金、提现、客户迁移及完整客户协助由 #100 后续有界切片接续，不复制它们的设计。

## Confirmed outcome

- 同一域名、同种入口格式、同一页面与验证码流程；不展示邀请码、代理层级或内部佣金。
- 浏览器中的首次有效代理商来源保留；回主页、刷新、普通导航不覆盖来源。首页注册按钮复用同一个入口地址。
- 仅浏览官网不锁定公共归属；未注册访客随后首次通过代理商 A 的有效入口可归属 A。
- 浏览器保存访问凭据，服务端保存并验证来源，新账号注册成功时建立初始关系；已有账号不自动改绑。
- 个性化入口响应不进入共享缓存；入口或浏览器凭据不是账号登录凭证。

## Scope and activation

In: 普通/代理入口解析，匿名来源保留，主页及注册页一致性，管理员已开通代理账号的最小入口管理，验证码来源快照，原子首次绑定及其审计，针对性恢复与浏览器验证。

Out: 多级代理、贴牌/独立域名、真实短信开通、代客户操作、公共客户跟进人、迁移界面、佣金账本、提现、现金退款、72 小时退积分规则的实现、支付或 Writer 改动。

本 PR 已承接 A0 入口和首次归属实现。运行时默认不启用真实获客；启用真实代理获客前，必须完成后续购买归属/费率快照和对应商业验收，避免有新归属却没有历史订单依据。不得按当前归属回填旧订单或把未实现费率默认为零。

## Current owners and impact

- [Identity](../../specs/identity-and-access/spec.md) 保留账号、验证码、角色与会话；[Customer Entry](../../specs/customer-entry/spec.md) 保留注册体验。
- Agency 增量拥有渠道入口、匿名来源和首次账号归属；未来查询和迁移复用此事实。
- [Commerce](../../specs/publishing-commerce/spec.md) 保留购买事务和账务；订单快照接缝按 [ADR 0005](../../../docs/architecture/adr/0005-atomic-publishing-purchase.md) 单独接续。
- 后续 schema、Identity 装配、API client、Web 入口及公共配置须固定共享写入窗口；当前 #77 / #89 文件未与本提案目录重叠。

## Control state

- Documentation: add 本 change 的 proposal/design/tasks 和 agency-entry delta；仅更新 README 的提案索引。已将 A0 行为归入 agency-entry spec、Identity/Customer Entry 索引与架构概览；Product Definition 对首次入口执行局部提取，其余代理业务显式保留 Evolution marker。README 无该 marker。
- Workspace: `codex/issue-100-agent-acquisition`，base `fc1a8ca`，main-direct；当前 A0 写入范围由 Issue Decision checkpoint 固定，包含入口模块、Identity 接缝、schema/生成接口和 Web 入口。精确路径与实时状态由 Issue 持有。
- Exit: 提案 Draft PR 可独立评审或撤回，保留此 Issue 工作树接续；不合并、不部署、不执行迁移。
- Review: 固定 30 天及整体方向已获用户认可；实现与证据见 [verification](verification.md)，后续业务不扩入本片。
