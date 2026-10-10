# P2 local verification — 2026-10-09

Issue #175；此本地候选已经用户授权通过PR176合入main636bd71，默认关闭、未部署。固定审查a963ceb→c490d383发现一项must-fix，已以最小修复和真实PG/中台纵切回归消除；下面保留原已执行证据，合并不等于生产启用。

| Claim | Evidence | Result / limit |
| --- | --- | --- |
| Parser原模型、参数、JSON结构及usage/source规范化不变 | codec32 +既有Provider17对照 | 49/49通过；不证明真实Provider账号权限 |
| receipt先于提交、早到ACK、inbox/cursor/resume原子、重复与回滚、超过100等待恢复、terminal排除 | PG receipt integration | 最终13/13通过；真实事务故障注入 |
| 短提交、SSE UTF8/CRLF与串行回调、断线、错误分类、body授权边界 | localhost client | 19/19通过；无真实Token |
| submit→原Outbox完成→事件→独立resume→原Parser接受；丢失ACK同key、默认关闭及在途关开关 | delegated product integration | 7/7通过；实际GEO PG状态机；协议fixture与实际P1 SQLite/API/HTTP两种模式各7/7 |
| 默认关闭、安全配置、非法URL不回显 | config | 4/4通过 |
| 全后端及既有回归 | pnpm test，专用PG/Redis，实际P1 fixture | 审查窄修前1036通过、16既有条件跳过，0失败；149.17s。配置测试在全套枚举后新增，另4/4通过。最终受影响边界75/75重验，不伪称一次1041全量 |
| 类型、生成、后端/前端构建、框架 | pnpm typecheck；pnpm build；validate_project_framework.py；diff check | 均通过；OpenAPI/client无接口漂移 |

最终新增75项在同一次focused run全部通过、0skip（6.79s）；最终typecheck及后端build重验通过，前端未受窄修影响，复用此前完整pnpm build证据。16个skip是既有recovery/process/payment类显式opt-in，不作为本片已验证事实。Node24.12.0、Prisma7.9.1；依赖复用锁文件，未升级、全局安装或下载浏览器。

独立审查复现：403已使Attempt FAILED/nonretryable，receipt仍RESERVING；原对账仅按receipt状态查询，恢复403配置后再次POST且实际Provider计数变为1。定向纵切先红后绿，修复仅加STARTED/EXECUTION_CENTER关联过滤，失败receipt不删除；明确失败后Provider仍0、原提交计数仍1。新repo测试同时证明FAILED/SUCCEEDED不扫描、STARTED仍恢复。无新业务重试策略。

本地仅使用新建geoeval_issue175库与专用Redis127.0.0.1:56380，不迁移共享默认库。测试首次失败原因是fixture JSONB键序查找与usage字段断言，修正fixture后两种纵切通过，未为测试改变业务输出。没有付费Provider、生产、云节点、真实5×4/SLA或密钥迁移。

当前行为归apps/backend/src/ai-execution、增量Prisma迁移、架构overview与openspec/specs/evaluation-evidence；共享execution.v1仍由独立中台owner维护。原parser-execution-center工作树保留为恢复材料，不继续写P4；本Change归档。后续P4/P5/P6不属于本片完成声明。
