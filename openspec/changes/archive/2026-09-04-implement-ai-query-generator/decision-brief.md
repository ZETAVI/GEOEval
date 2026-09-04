# Decision Brief: Snapshot v3 上的 AI 评测问题生成
<!-- Reopened on 2026-09-04 after the real-chain location acceptance failed. -->

## Outcome

普通中小商户在开始免费评测前，看到一组基于当前冻结门店资料生成的自然、具体、接近真实需求者口吻的四个问题；同一资料指纹只接受一套正式问题。

## Scope

- In: Snapshot v3 Query 窄投影、版本化 Prompt、最小模型输出、持久准备、有限重试与回退、不可变正式问题集和 Query-only 产品审查。
- Out: 客户编辑或刷新问题、候选选择、自然度评分器、Critic/Judge、模板回退、联网品牌调查、生产启用与未单独授权的 4×5 调用。

## Decisions

| Decision | Choice | Rationale | Owner |
| --- | --- | --- | --- |
| 品牌称呼 | Agent 可选完整名称或 `companyName` 中自然、可辨识的连续子串 | 比法定全称更接近普通用户提问，同时不发明别名 | Product owner |
| 位置语境 | Query 接收城市、区县和有类型的商圈或地址位置 | 能自然形成“广州天河猎德”，但不暴露地图技术事实 | Product owner |
| 主打与行业 | 三个开放问题以主打产品或服务为核心；行业推荐主题只辅助理解类别 | 避免问题过宽，也不丢失“私房菜”等关键区分信息 | Product owner |
| 特点使用 | Agent 理解全部 2～6 个同级特点，为两个问题自由选择或组合互补需求 | 不按数组顺序、不强求覆盖、不堆成长句 | Product owner |
| 模型输出 | 一次调用只返回自然品牌称呼和四个最终问题 | 删除候选、选择序号、重复文本和无消费者说明 | Product owner |
| Prompt 方法 | 正向定义目标、读者、输入职责、四问关系、处理顺序和完成标准，并提供少量跨行业示例 | 从任务语义提高质量，不积累症状式禁令 | Engineering owner |
| 程序校验 | 只校验结构、长度、品牌简称连续子串和品牌出现边界 | 保护评测含义，不让静态规则冒充自然度判断 | Engineering owner |
| 失败路径 | 有限重试和回退全部失败后显示“请重试”，不创建残缺 Definition | 保持旅程可恢复且不消耗正式评测机会 | Product owner |

## Acceptance Boundaries

- 一个调用返回严格四问，程序赋予固定角色和顺序。
- 品牌直接问题使用自然、可识别的目标名称；三个开放问题不包含目标品牌。
- 三个开放问题都有明确位置和主打产品或服务语境；两个特点问题自然且互补。
- 同一资料指纹的重复或并发准备不重复调用或创建多个正式问题集。
- 客户只看到准备、最终四问或“请重试”，看不到 Prompt、模型、路线、Attempt 或内部错误。
- 确定性证据先证明契约和生命周期；真实 Query-only 审查再判断自然度和针对性。

## Assumptions and Open Questions

- Assumption: 已验证的 Product Outbox、BullMQ、AI Execution 和准备状态机继续复用。
- Assumption: 确定性生成仅用于离线测试，不是客户路径的静默回退。
- Resolved: 真实调用前已重新核验 Qwen3.8 主路与 Hy3 回退配置，并完成受控 Query-only 调用；这不改变产品语义。

## Confirmation and Next Gate

- Confirmation: Product meaning confirmed on 2026-09-04; final Merge authorized on 2026-09-04.
- Next action: Archive this stable Change, promote PR #28 to the Final closing transaction, then complete post-integration reconciliation.
- Confirmation required before: 最终 4×5、生产启用或部署；这些授权不包含在本次 Merge 中。
