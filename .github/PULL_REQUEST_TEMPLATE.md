<!-- PR 标题建议使用 `feat(scope): 中文意图`、`fix(scope): 中文意图` 等 Conventional Commits 风格。 -->

## Outcome（交付结果）

本次改变了什么用户、业务、开发或运维结果？

## Scope（范围）

- 本次包含：
- 本次不包含：
- 关联 Issue / Sub-Issue / Change：

## Implementation（实现说明）

具体说明关键实现边界，使评审者无需重新拼接整个 Diff 就能理解设计。只覆盖适用项：

- 执行路径与参与模块；
- 所有权和依赖方向；
- 重要接口、Schema、迁移、状态变化、重试和失败处理；
- 与已确认方案的实质偏差或改变结果的替代选择；
- 兼容、上线、回滚及运行边界；
- 为什么这是能够形成闭环的最小实现。

链接正式规范、ADR 和关键文件，不粘贴 Diff，也不复制完整当前态规范。

## Evidence（验收与证据）

| 验收项或声明 | 证据 | 结果 |
| --- | --- | --- |
| | | |

## Tests & Specs（测试与当前态影响）

- 新增测试：
- 修改测试：
- 删除的过时或重复测试：
- 已更新的当前态规范或设计权威：
- 未执行的检查及原因：

## Risk & Recovery（风险与恢复）

- 已知风险：
- 迁移或兼容影响：
- 回滚或恢复方式：

## Lifecycle（生命周期）

- 文档影响：`none | update | add | move | split | merge | delete | generate | supersede`
- 正式权威或演进标记：<路径与对账方式，或 `none`>
- 发布影响：`release:skip | release:candidate` <适用时补充说明或链接>
- Handoff：`none | <链接>`
- Worktree 退出状态：<引用[分支与 Worktree 生命周期](../docs/process/human-agent-collaboration.md#branch-and-worktree-lifecycle)中的状态>
- 后续 Issue：`none | <链接>`

只解释实际适用的影响。标签不是证据：当前事实发生变化时，Diff 与证据必须显示已完成对账。

## Merge Checklist

- [ ] 已关联负责本次变化的 Issue；新增独立结果已拆为 Sub-Issue 或后续 Issue
- [ ] Issue、当前态文档、实现与测试证据彼此一致
- [ ] 实现说明覆盖关键边界，但没有复制 Diff 或完整规范
- [ ] 已更新、重构或删除因行为变化而过时、重复或误导的测试
- [ ] 已记录未执行检查、已知风险以及可行的恢复方式
- [ ] 已确认发布影响、Handoff 与 Worktree 退出状态
