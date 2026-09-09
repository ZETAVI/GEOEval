# Change: 打通订单履约与人工异常结算

Issue: https://github.com/ZETAVI/GEOEval/issues/73
Change ID: `establish-publication-delivery`
Class / phase: architectural / approved for bounded implementation.

Current activation: PR #76 integrated normal admission/responsibility, results,
deadline lists and customer visibility at `main@a550fc4`; PR #79 integrated the
no-behavior-change points assembly at `main@bcb81db`. This Change remains active
for the manual exception/settlement outcome. #77 has fixed C1 at `59930dd` and
returned the shared window; the next #73 slice explicitly stacks on PR #82.
#73 owns order
meaning and customer/operations behavior, not a duplicate accounting engine.
The original rationale below is not a claim that integrated capabilities remain absent.

## Why

`main@0552aa7` 已提供真实积分购买与不可变待处理订单，但没有运营接单、发布结果或订单退点运行时。客户需要看见所购服务被谁处理（内部责任）、实际发布进度和可访问结果；不能让异常订单只能永久停留在待处理。

## Scope

- In: 新旧已购订单可靠接入，整单独占认领、未开始退池、管理员改派；按需 Mock/人工变体准备、人工发布结果、结果纠正；随机/精确计量；人工协商替换、停止剩余工作、一次性订单退点；客户安全订单投影和管理员待退点列表。
- Out: 真实 Writer/材料解析、自动媒体发布、充值/人民币退款、代理佣金/提现/发票、全站 UI/UX、通用审批引擎和通知平台、生产激活。保留相应未来接入边界，不在本包建设。

## Confirmed behavior

人工异常、金额和非目标以 Issue 正文与确认记录为准。精确替换全量发布后为已完成，正数约定补偿未到账时独立显示待处理且保留管理员待办；到账不把已完成改成已关闭。最新用户确认：新协商表单退点默认为 0，运营明确保存零额终止即可直接关闭，不经管理员、不生成积分流水。正数终止仍停止剩余工作并等待管理员实际退点后关闭。客户不申请、不验收；运营协商后继续发布不等待管理员。已有完成/补偿确认来源：https://github.com/ZETAVI/GEOEval/issues/73#issuecomment-5578598898 。

## Impact and proposal

采用一个 Publication Delivery owner 管理责任、工作项、结果和履约状态；Commerce 保留不可变协议、冻结文章及账务。应用组合层连接两个 owner 的窄端口，不相互访问私有表。购买短事务只创建履约聚合初始记录，不再额外建 Receipt 实体；实际发布/生成留在事务外，数量采用逻辑工作位和按需物化。协商结果只需明确保存，结算资格从履约进展判断，不另建定稿流程。

详细选择、失败边界和迁移在 [design.md](design.md)，行为 delta 分别位于 [Delivery](specs/publication-delivery/spec.md) 与 [Commerce](specs/publishing-commerce/spec.md)，实施/验证顺序在 [tasks.md](tasks.md)。用户已批准推荐架构与非冲突并行实施；本活动 change 是待交付方案，不是已经激活的当前能力。

## Documentation and workspace control

- `add`: 最终建立 `openspec/specs/publication-delivery/spec.md`；本草案仅表达待实现 delta。
- `update/move`: 产品定义中的已激活履约规则迁入新 owner，原段落保留索引；Commerce spec 更新账务/购买接收边界，退出自身待处理占位状态权威；glossary/vision/architecture overview 同步新终态和模块职责。
- `supersede`: ADR 0005 保留历史；接入切片中记录其获批的窄范围扩展，仅包含履约聚合初始化，不把实际履约塞进购买事务。
- `retain`: Product Definition 的 split-on-activation marker 仅执行履约部分，其余未激活能力继续保留；以实际文件标记为准，不为本包重写其他能力。
- `retire`: 草案已从忽略的准备区一次性迁入本目录，旧候选只保留到本 owner 的指针，不再维护第二套设计。
- Workspace: d92a / `codex/issue-73-publication-delivery`，base `0552aa7e60d5aa6b99645692e6090e64544087d5`，主 session 为唯一 writer，main-direct。原 #65 分支保留，不删除既有验收或恢复资料。
- #73 为 ZETAVI / P1，已按 Ready → In Progress 开始有界实施。用户明确批准此次与 #39 并行的 WIP 例外，不更改项目全局规则。#39/#42 owner 在 `6a7515a` 确认当前和下一实验切片均不写 Prisma、迁移、API 装配、生成客户端或 Web；共享接缝由 #73 负责，后续需求须先协调窗口。
- PR: 首个 Draft PR 记录本切片未完成状态；每个纵向切片标明 Partial，最后验收 PR 才关闭 #73。本批准不包含合并、真实积分/渠道费用或生产激活。
- Exit: retain；继续实现同一个 #73 outcome，首个结果链路经 HTTP/浏览器/真实隔离数据库验证后才请求该切片集成。不要把纯逻辑单测当完整业务验收。
