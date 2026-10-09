# GEO网页采样接入：消费侧重构规划

Owner：[Issue #169](https://github.com/ZETAVI/GEOEval/issues/169) / [PR #170](https://github.com/ZETAVI/GEOEval/pull/170)。
状态：2026-10-09只读审视与规划修订；实现候选仍是 `ac1a55e`，未合并或部署。本轮仅改规划文件。

跨项目责任、公共执行契约和P0–P6依赖的入口为 [中台设计](https://github.com/ZETAVI/browser-sampler-control-plane/blob/codex/issue-4-execution-center/openspec/changes/unify-execution-center/design.md) 及同目录tasks；此处只维护GEO消费侧影响。具体schema是下一片待固定内容，不是现行spec。

## 1. 当前代码与可复用事实

GEO main `a963ceb`：

- GEO Intelligence拥有四题×五平台样本、唯一正式答案、解释、17/20有效样本readiness和报告。
- `postgres-evaluation-process.repository.ts` 的acceptEvidence通过PENDING CAS接受一次，在同一事务写证据与解释Outbox。
- Query/Acquisition/Parser/Resolver/Composer的API仍在GEO provider adapters中真实send；原生参数构造与响应规范化都有现有owner。
- 三个执行服务长期await adapter；产品Worker并发5，不能以增加一个远端await替代异步化。
- 客户重试保留已接受证据，只恢复失败/未完成阶段，可继续复用。

PR170候选：

- 已有platform batch、稳定幂等键、externalTaskId、延期读取、部分成功、正式Attempt和平台键映射。
- 仍只在整批终态获取结果，投影主要answer，遗漏content/readingText/images/native sources；不支持立即API兜底。
- 以submittedAt等起算等待会重置预算；网页固定attempt1与新增API1可能撞唯一键。
- 候选中的验证证明字段不能无条件填true；captured-late只在本周期截止前接受，不再无限承认晚到。

上述是代码审视，不是当前生产测试或新重构通过证据。旧verification的测试只覆盖对应revision。

## 2. 保持和调整的职责

GEO继续拥有：

- 不变的题目、业务Route/模型/Prompt版本和Provider原生搜索/思考/JSON参数；
- 原响应规范化、模型身份与结构/语义校验、业务Attempt与显式有界重试；
- 网页优先、80秒未完成API竞速、130秒采样封口及唯一正式结果；
- Parser/Resolver/Composer、统计、报告和客户安全呈现。

中台负责实际web/API调用、地址/Token/容量、浏览器身份与资源、技术状态、原生API响应及网页富输出、逐项完成通知。GEO不import浏览器代码、不管理Profile/node，不让中台替GEO判定“有效样本”。

## 3. 改动面与最小接缝

以下路径位于 `apps/backend/`。

| owner | 局部改动 | 不改变 |
| --- | --- | --- |
| `src/ai-execution/infrastructure/providers/` | prepare native request / consume raw response与实际transport分开；授权endpoint引用 | 现有厂商model/来源/usage解释及输出合约 |
| `src/ai-execution/application/ai-*-execution.service.ts` | 持久远端请求、短submit、完成resume | 业务Attempt、purpose模型与原重试策略 |
| `src/geo-intelligence/domain/browser-sampling.gateway.ts`、HTTP adapter | 接受任务仍RUNNING时的逐item结果/事件；稳定itemId | 四题平台batch组织、平台键兼容 |
| `src/geo-intelligence/application/evaluation-process.coordinator.ts` | 逐题接受、API fallback、绝对预算 | 既有解析与报告语义 |
| Prisma、`postgres-evaluation-process.repository.ts` | channel尝试身份、cycle/deadline CAS、remote receipt、inbox/cursor | 一个sample/唯一evidence及历史数据 |
| `src/background-work/` | 提交短工作的Outbox完成；完成事件新增resume；恢复扫描 | 现有BullMQ/Postgres Outbox，不新建工作流引擎 |
| evidence / reading view / 前端卡片 | content、readingText、图片、内部来源的兼容投影 | 原回答不经LLM改写；卡片不显示引用映射或信源列表 |

## 4. 业务生命周期与必须守住的围栏

cycle建立事务固定samplingStartedAt、fallbackDueAt、deadlineAt；定义/客户重试、入队、远端提交、备用尝试不得重置已建立周期的预算。130秒只约束acquisition，已接受答案的解析和报告使用独立预算。

每次物理通道有稳定尝试身份。首选在现有Attempt唯一键纳入channel，或等价独立身份；历史Provider记录可映射API，既有网页候选记录须按其真实provenance迁移，不能全部假定API。最小schema在实施前fixture中固定，不用API=attempt2吞掉原有重试机会。

- 收到结果：按itemId与exact attempt对应，GEO做技术完成/Provider和业务验证。
- 正式接受事务：复查当前cycle、PENDING、attempt和deadline；写一次evidence并追加一次解释Outbox。
- 80秒：先接收已有结果、检查最新逐题状态，再仅向无正式答案者提交API；明确web失败/无容量可提前兜底。
- 单一路失败不关闭另一条仍可用路径；已知API失败按GEO现有政策处理，不在中台暗中重试。
- 130秒：只终结没有正式回答者；晚到/落败/旧cycle不覆盖既有答案、不重开周期。
- 提交响应丢失：恢复同key原任务；已发送但结果未知不改key或自动切transport再付费。

中台通知先于结果可读的协议不接受。GEO提交前写callerRequestRef；中台结果+event先提交，然后SSE推送。GEO可靠记录inbox/cursor并追加resume Outbox，重复、乱序、完成早于externalTaskId落库均需幂等处理。

中台受理身份可靠落库后，“提交”Outbox立即完成；业务Attempt保持STARTED。DEFERRED只用于短暂恢复，不让100个长期DISPATCHED提交事件占满relay最旧100条，挡住resume或deadline工作。等待外部结果既不持有产品Worker槽，也不依赖内存Promise。

## 5. 内容与可观测性

API raw body、HTTP状态和安全headers由中台原样返回；GEO继续解释并保留正式Provider证据。web的answer/content/readingText/images/native sources/finality分开保留；source PARTIAL/NOT_OBSERVED不是正文一定失败。临时图片由调用者决定保存，未保存不保证历史显示。

Parser使用GEO选定的阅读视图，正文不让LLM整理覆盖；前端富卡片安全渲染表格/图片、隐藏引用映射和信源区；来源仍作为内部输入。旧Markdown记录保持可读。

实际Provider Generation/usage在中台唯一计量；GEO记录remote span和规范化/采用裁决，不重复记费用。trace carrier跨HTTP/队列/重启，metadata-only，exporter失败非阻塞。观测不能替代完成事件、状态数据库或130秒判定。

## 6. 任务归属、依赖与发布门

#169本次必要接入：web逐题/富内容/卡片、Acquisition的中台API transport、80/130竞速、正式样本与迁移/恢复。其验收不等待所有生成/解析/归并/报告迁移。

全部API purpose委托具有独立可启用/回滚边界；实施前建立链接的后续GEO Change/Issue，持有公共异步API接缝及其余purpose。中台P2一个Parser fixture可先验证接缝，P3网页actor并行；P4复用接缝完成Acquisition。此划分是规划，不在本轮创建实施branch或改代码。

新attempt固定transport；回滚仅切新任务，在途仍沿原task恢复。灰度窗口保留旧API路径所需凭据，或先证明无需旧凭据回滚；窗口退出后才退役旧Token。增量表不删除历史答案。生产部署、密钥迁移、真实调用和第二节点均另行明确授权。

本Change完成前将accepted消费行为归并 `evaluation-evidence`；Product Definition的既有Evolution marker继续保留，由能力激活时处理。共享执行契约在中台归并，不在GEO复制一套。当前main和runtime不因计划修改而改变。
