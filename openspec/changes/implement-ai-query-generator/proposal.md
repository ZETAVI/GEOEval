# Change Proposal: Implement AI Evaluation Query Generator
<!-- Reopened on 2026-09-04 after the real-chain location acceptance failed. -->

## Status

- Phase: Implement; save-time background preparation refinement
- Owning Issue: [#26](https://github.com/ZETAVI/GEOEval/issues/26)
- Parent outcome: [#39](https://github.com/ZETAVI/GEOEval/issues/39)
- Decision owner: Product owner
- Decision brief: [decision-brief.md](decision-brief.md)

## Why

GEO Intelligence 已经拥有同一品牌资料版本一套不可变四问、问题确认后才能开始评测、以及评测运行期间冻结问题等产品生命周期。旧实现曾把 AI Query Generator 建立在 v2 品牌上下文和模板式语义上，并因一次成功演示而过早归档；M4 的真实门店评测随后证明行业问题过宽、位置不具体、主打品类和可扩展特点没有得到充分利用。

Snapshot v3 现已由 Brand Knowledge 提供经过验证的门店位置、主打产品或服务和 2～6 个同级特点。#26 需要在不改变正式评测生命周期的前提下，重新实现一套自然、具体、面向普通需求者的 AI 问题生成能力。

## Outcome

一个版本化 Query Agent 使用一次结构化调用，根据冻结 Snapshot v3 生成最终四问：

1. 一个明确品牌的直接问题；
2. 一个不出现目标品牌、围绕具体位置和主打品类的行业推荐问题；
3. 两个不出现目标品牌、基于全部特点形成互补需求场景的问题。

客户只看到最终四问并决定是否开始评测。候选、Prompt、模型、路线、尝试和内部失败保持受保护。

## In Scope

- 扩展 GEO-owned Query 窄投影，使其包含城市、区县和有类型的最终 Query locality；
- 重写版本化 Query Prompt 和跨行业参考示例；
- 将模型输出收缩为自然品牌称呼和四个最终问题；
- 复用现有持久准备、Product Outbox/BullMQ、AI Execution、有限重试和回退；
- 保留一个正式 Definition、重复和并发准备幂等、失败后显式重试；
- 更新迁移顺序、契约测试、集成测试和客户页面状态；
- 先做确定性验证，再经单独授权做真实 Query-only 产品审查；
- 在最终接受前对账 Current Spec、Architecture、PR 和 Worktree 状态。
- 当前品牌资料保存或切换后，在资料已可诊断时立即幂等启动后台问题准备，诊断页仍保留兜底触发。

## Out of Scope

- 客户编辑、刷新、选择候选问题或查看问题生成历史；
- 候选列表、选择理由、Critic/Judge Agent、自然度评分器或模板回退；
- 联网搜索、品牌事实补全或现实信息核验；
- 修改五个平台、采样、解析、综合报告、推荐指数或报告视觉；
- 合并 #32 或 #41 的 owner-local 变化；
- 真实商业客户数据、生产启用、部署或自动执行最终 4×5。

## Impact

- GEO Intelligence owns the Query projection, preparation lifecycle, model-to-domain projection, and immutable question definition.
- Brand Knowledge remains the only owner of editable brand facts, Store Location verification, industry reference data, and fingerprint meaning.
- AI Execution owns provider translation and append-oriented attempt evidence; it does not decide whether a question is good business output.
- Background Work continues to own durable delivery and reconciliation; Redis remains delivery infrastructure rather than business truth.
- The Web gains no question editor or candidate UI and continues to render only durable public state.

## Change Classification

- Lane: feature
- Class: architectural
- Reason: AI boundary, durable preparation lifecycle, persistence, asynchronous delivery, external cost, and immutable history.

## Approval and External Gates

The product decision brief was confirmed on 2026-09-04. The first Query-only
review bypassed Brand/Amap preparation and used a manually assigned Interaction
Pie locality, so its acceptance was withdrawn. The reopened Gate has now passed
with verified Amap selections for three Brands, a complete browser preparation,
real Qwen calls across the three frozen projections, and an explicit Hy3
fallback replay. Final representative 4×5, Merge, production customer data, and
deployment remain separate explicit gates.
