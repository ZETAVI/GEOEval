# Change: 收束 M4 评测质量、效率与等待体验

- Status: Final Integration Gate passed on `main@1269b69`; ready for the final
  acceptance PR and archival
- Class: Architectural parent
- Owning Issue: [#39](https://github.com/ZETAVI/GEOEval/issues/39)
- Decision owners: Product owner and architecture owner
- Implementation authorization: Parent coordination only; this Change does not
  replace any child Issue's implementation or external-operation authority

## Why

M4 的真实内部评测已证明注册、Brand、四问×五平台、逐样本解析、整体综合、
报告与通知能够形成闭环，但同一运行也暴露了会直接损害客户交付的四类问题：
评测上下文过宽、Agent 客户文案越过产品边界、明显品牌名称未归并，以及长耗时
缺少可理解的真实等待进度。Langfuse 的 metadata-only Trace 已证明连接正常，却
不能支持本地 Prompt 与结构输出诊断。

两份 M4 会议文字稿已按字节原样归档。它们只证明讨论发生过，包含互相冲突的
建议、实现猜测和未确认目标；已确认产品决定只来自 owning Issue #39，并由本
Change 的 [decision brief](decision-brief.md) 收口供审批。

## Outcome

在不改变既有四问×五平台、17/20 报告边界、推荐指数、历史不可变性和 Provider
名单的前提下，建立一组可由 #26、#32、#40–#44 独立交付、最终统一验收的父级
产品和接口契约，使下一次获授权的代表性门店评测同时证明：

- Brand 输入能形成准确门店位置、主打产品或服务和有序特点的冻结上下文；
- 四问保留既有业务角色，但三个开放问题围绕商圈和主打品类自然展开；
- 客户报告没有结构残片、内部枚举、引用 ID 或技术字段，并合理归并明显名称
  变体；
- 评测任务在不改变业务事实的前提下具备阶段耗时、预算、并发和回退证据；
- 等待页展示按平台的真实获取与分析数量，仍支持离开页面和完成通知；
- 本地/测试 Langfuse 可在显式模式下查看受控诊断内容，生产继续默认
  metadata-only。

## Scope

### In

- M4 研究输入的原样归档、哈希和非权威边界；
- 已确认产品决定、待批准实现边界和未决项的单一 change-local review pack；
- 七个子 Issue 的 producer/consumer 契约、GitHub 原生依赖图和集成顺序；
- 面向最终代表性门店 4×5 的父级 Integration Gate 与证据矩阵；
- 父级 product-definition、evaluation-evidence 和 evaluation-report 行为 delta。

### Out

- Brand、Query、Parser、Synthesis、Worker、Langfuse 或 Web 实现；
- 真实 Provider 调用、生产部署、真实客户数据迁移、生产内容遥测或额外 API 采购；
- 改变四问×五平台、推荐指数 70/30、17/20 可用边界、当前 Provider 名单、历史
  报告内容或通知事实；
- 全站或报告页视觉重设计；Issue #13 继续拥有报告视觉优化；
- 用父 Change 复制任一子 Change 的 Schema、Prompt、任务图或页面详细设计。

## Impact

该父 Change 只拥有跨子任务产品含义、接口兼容、依赖和最终验收。各子 Issue 在
自己的 Change/PR 内拥有实现和 owner-local delta；合并后的 current truth 仍由
Brand Knowledge、Evaluation Definition、Evaluation Evidence、Evaluation Report、
Notification、架构概览和可执行契约分别拥有。

本父 Change 的批准不修改任何 current spec。最终接受的子 Change 必须分别对账
其 owner-local current owner；父 Change 仅在所有集成 Gate 通过后完成最终对账和
归档。

## Approval Result and Remaining Boundary

产品负责人于 2026-09-02
[批准](https://github.com/ZETAVI/GEOEval/issues/39#issuecomment-5505659279)
以下父级边界：

1. [decision brief](decision-brief.md) 中 D1–D9 的产品含义；
2. [design](design.md) 中七个 producer/consumer 契约与依赖顺序；
3. 未确认项继续留在对应子 Issue，不被本 Change 默认为已批准；
4. 最终真实 4×5 需要独立 Provider 调用授权，生产遥测内容仍需独立数据与保留审批。

2026-09-04 的执行对账保留全部产品决定和子任务 owner，但不再用一个原生
Issue blocker 表达 #41 与 #42 之间的阶段级往返。#42 在同一 Issue 内先以 Partial
PR 固定最小任务边界，#41 再完成综合语义验收，随后 #42 完成运行时、耗时和进度
投影；不新增只为表达该顺序的子 Issue。

后续产品负责人已单独授权受控真实调用。该调用的范围、结果与保留边界记录在
[#42 验证摘要](../2026-09-13-optimize-evaluation-analysis-task-graph/research/validation-summary.md)
中；它不扩展为生产部署、客户数据迁移、API 采购或生产内容遥测授权。

2026-09-13，所有子 Issue 均已关闭并进入 Project `Done`。最终 Gate 在
`main@1269b69` 复用了未发生后端语义漂移的真实 Provider 证据和
`main@befd0c0` 的前后端、数据库、Worker、通知、刷新及离开返回隔离集成验收；
两者之间只有一个无运行时变化的随机测试修复。结果为 `ready`；生产容量与部署
验证仍属于后续独立边界，不阻塞本 Change 收口。
