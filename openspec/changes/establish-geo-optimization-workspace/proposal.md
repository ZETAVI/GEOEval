# Change: 建立 GEO 优化内容工作区与核心文章基础

- Status: Product and architecture boundary approved on 2026-09-05; Ready for
  Project scheduling, not yet authorized to implement
- Class: Architectural
- Owning Issue: [#57](https://github.com/ZETAVI/GEOEval/issues/57)
- Decision owners: Product owner and architecture owner
- Implementation authorization: Not granted by this proposal

## Why

GEOEval 已能让终端客户维护当前 Brand、完成 Evaluation 并查看报告与优化方向，
但“AI 搜索优化”仍只有入口说明，没有可继续完善写作资料、生成和确认核心文章的
客户旅程。现有 Product Definition 还保留公司介绍、品牌介绍、商圈、行业地位、
核心优势和完整材料解析等较早候选，已经与 Issue #57 逐项确认的减法设计不一致。

购买与 Publishing Order 需要一份客户明确确认、可按 revision 引用的核心文章。
在进入商业能力之前，系统必须先建立一份唯一的当前 Brand 写作资料和一篇当前
核心文章，并用确定性本地 Writer 验证保存、生成、编辑、确认和失败恢复，而不是
提前接入真实 Provider 或材料解析。

## Outcome

终端客户从当前 Brand 或最新成功 Evaluation 进入 GEO 优化工作区后，可以：

- 直接查看并显式保存同一 Brand 的既有基础资料和少量写作补充资料；
- 查看最近一次成功 Evaluation 的客户优化方向；
- 在资料完整后通过确定性本地 Writer 生成一篇标题和完整正文；
- 显式保存、确认、重新编辑或明确替换当前文章；
- 在资料、指导或材料依据较新时看到非阻塞提示；
- 形成未来购买下单唯一可接收的已确认文章 ID 与 revision。

## Scope

### In

- Brand characteristics 从字符串演进为稳定 ID、标题和可选详情；
- Brand-owned 强类型 `articleInformation` value object、派生 readiness、一个
  聚合 revision、Evaluation/Writer purpose fingerprints 与一次性迁移；
- 最新成功 `EvaluationOptimizationGuidance` 的受保护读取边界；
- GEO Optimization 工作区、`WriterInputSnapshot`、生成执行和一篇当前核心文章；
- 确定性本地 Writer Port/Adapter，以及显式保存、确认、重新编辑、明确替换、
  幂等和失败恢复；
- `preparedMaterialDigest: null` 的前向兼容 Writer Request 接缝；
- 已确认文章 ID/revision 的 Future Order handoff；
- OpenAPI/client、响应式客户页面和任务相称的迁移、契约、集成与浏览器验证。

### Out

- 材料上传、文件解析、Material Preparation、Prepared Material Digest 持久化或
  客户材料状态；
- 真实 Writer Provider、Prompt/Skill 质量体系、模型选择、付费调用或生产启用；
- 套餐、积分、媒体选择、购买、Publishing Order、履约或发布变体；
- 多产品、多服务区域、多 Campaign、多篇文章库、候选历史或回滚；
- Identity、角色、Session、账号治理、真实短信、部署或商业数据迁移。

## Impact

- **Brand Knowledge:** 当前聚合 Schema、验证、CAS、characteristic 投影、
  article information readiness 和 writing-context fingerprint。
- **Evaluation Report:** 面向同一账号/Brand 的最新成功客户方向和内部指导读取。
- **GEO Optimization:** 新 owner，管理 Writer 输入依据、生成执行与当前核心文章。
- **Writer seam:** 一个 provider-neutral Request/Result Port 和确定性本地 Adapter；
  Writer 不反向访问 Brand、Evaluation 或 Materials。
- **Web/API:** 当前品牌上下文中的单页优化旅程和显式保存交互。
- **Future Publishing Commerce:** 只消费已确认核心文章的准确引用；本 Change 不
  创建商业记录。

## Control State

- Documentation impact: `add` active Change and future `geo-optimization`
  current spec; `update` Brand Knowledge、Evaluation Report、Product Definition、
  Product Vision、Glossary 和 Architecture Overview；在 reconciliation 时执行
  Product Definition 的 `split-on-activation` marker，不维护重复 current truth。
- ADR: none proposed; owner、CAS、purpose fingerprint 和 snapshot 选择属于本能力
  激活设计，可在 owner-local specs/contracts 中表达。
- Workspace: branch `codex/issue-57-geo-optimization-article`, base
  `main@975f2d2`, merge destination protected `main`, owner `ZETAVI`; retain through
  Review / Decision and remove only after accepted PR integration and closeout.

## Approval Gate

产品 Owner 于 2026-09-05 确认本 Change 的整体规划、#57 到 confirmed-article
handoff 的独立边界，以及后续能力使用独立 Issue 推进。该批准使 Change 可以在
Project 安排 WIP 后进入 #57 的确定性 Mock 实现，不授权立即开始实现。

真实 Writer、材料解析、Publishing Commerce、运营履约、Provider 调用、部署与
合并仍需要各自的 Issue、证据和明确授权。
