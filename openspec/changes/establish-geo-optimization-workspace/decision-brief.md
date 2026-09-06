# Decision Brief: GEO 优化内容工作区与核心文章

## Outcome

让缺少 GEO 专业知识的终端客户在同一当前 Brand 上完善最少写作资料，通过 Mock
Writer 得到一篇可编辑、可显式保存和确认的核心文章，并为未来购买下单提供准确
文章 revision。

## Scope

- In: Brand 写作资料、最新成功优化方向、Mock 生成、当前文章生命周期、显式
  保存、非阻塞新旧提示、并发和 Future Order handoff。
- Out: 真实 Writer、材料上传/解析、套餐、积分、购买、订单、履约、部署和合并。

## Decisions

| Decision | Choice | Rationale | Owner |
| --- | --- | --- | --- |
| 品牌资料 | 一个当前 Brand 聚合，优化页原位补充 | 客户不重填、不维护同步副本 | Product owner |
| 主推主题 | Evaluation 与 Writer 复用同一 Featured Offering | 避免评测主题和文章主题漂移 | Product owner |
| Characteristics | 2–6 个 `{id,title,detail?}`；Evaluation 只消费 title | 原有短标题可继续完善，detail 不制造评测机会 | Product owner |
| Article Information | Brand 内强类型 value object | 无独立身份、权限或生命周期 | Product + architecture owners |
| 介绍字段 | 无必填整体介绍；只有品牌补充背景（选填） | Writer 从结构化资料组织介绍，减少重复填写 | Product owner |
| 适用客户 | 1–5 条客户自填短语，每条 2–80 字，无固定词条 | 同时覆盖消费者、企业客户与场景 | Product owner |
| 价格 | 人民币整数完整区间或面议，无小数、单边值或单位说明 | 满足首期写作需要而不建设报价系统 | Product owner |
| 期望定位 | 可选建议与自定义汇入同一组内容 | 保留曝光意图而不建立多套字段 | Product owner |
| 并发 | 一个 Brand revision；Evaluation/Writer 各自 purpose fingerprint | CAS 与输入语义职责分离 | Architecture owner |
| 输入依据 | 一份 WriterInputSnapshot 冻结可变 Brand 投影并引用不可变输入 | 保留历史依据且不多处硬拷贝 | Product + architecture owners |
| 保存 | Brand 资料和文章均使用保存按钮，不自动保存 | 未保存输入不应静默进入生成或覆盖服务器记录 | Product owner |
| 新旧提示 | 资料/指导依据较新只提示，不阻塞确认或购买 | 客户确认文章是商业链路的最终内容决策 | Product owner |
| 文章冲突 | 陈旧文章 revision 绝不被重新生成覆盖 | 提示不能替代数据完整性 | Architecture owner |
| 首期 Writer/材料 | 确定性本地 Writer；Digest 始终为 null | 验证主链路，不提前实现后续能力 | Product owner |

## Acceptance Boundaries

- 客户可以从当前 Brand 完成资料保存、Mock 生成、文章保存与确认。
- 当前文章只有“草稿 / 已确认”；生成技术状态独立。
- 重复生成请求不重复执行，失败或冲突不破坏当前文章。
- 未保存资料不进入生成；陈旧提示不使文章失效或阻塞 Future Order handoff。
- Writer、材料和商业能力的未实现状态诚实可见，不伪造成功。

## Assumptions and Open Questions

- Assumption: #57 的本地 Writer 同步返回，但持久化边界不把外部调用放入数据库
  事务，后续可替换为异步真实 Writer。
- Assumption: 用户上传内容的解析与冲突选择留给未来 Brand Materials change；
  当前 Writer Request 只保留可选 Markdown 接缝。
- Open: 真实 Writer 质量、Provider/cost、材料存储/解析、套餐与订单由后续 owning
  Issues 在激活前决定，不阻塞本 Change。

## Confirmation and Next Gate

- Confirmation: Product and architecture boundary approved by the product owner
  in Issue #57 on 2026-09-05; fixed-scope architecture review has no unresolved
  must-fix or should-fix finding.
- Next action: move Issue #57 to Ready and let the Project owner schedule one
  bounded implementation package after current P0 WIP.
- Confirmation required before: implementation, migration, real Provider work,
  commercial work, deployment or merge.
