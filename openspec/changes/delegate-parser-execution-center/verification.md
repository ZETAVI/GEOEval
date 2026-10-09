# P2 local verification — 2026-10-09

Issue #175；main-direct candidate，默认关闭，未合并或部署。固定版本审查尚待完成；下面只记录已执行证据，不将候选当成生产行为。

| Claim | Evidence | Result / limit |
| --- | --- | --- |
| Parser原模型、参数、JSON结构及usage/source规范化不变 | codec32 +既有Provider17对照 | 49/49通过；不证明真实Provider账号权限 |
| receipt先于提交、早到ACK、inbox/cursor/resume原子、重复与回滚、超过100等待恢复 | PG receipt integration | 12/12通过；真实事务故障注入 |
| 短提交、SSE UTF8/CRLF与串行回调、断线、错误分类、body授权边界 | localhost client | 19/19通过；无真实Token |
| submit→原Outbox完成→事件→独立resume→原Parser接受；丢失ACK同key、默认关闭及在途关开关 | delegated product integration | 7/7通过；实际GEO PG状态机；协议fixture与实际P1 SQLite/API/HTTP两种模式各7/7 |
| 默认关闭、安全配置、非法URL不回显 | config | 4/4通过 |
| 全后端及既有回归 | pnpm test，专用PG/Redis，实际P1 fixture | 1036通过、16既有条件跳过，0失败；149.17s。配置测试在全套枚举后新增，另4/4通过，不混成一次1040全量 |
| 类型、生成、后端/前端构建、框架 | pnpm typecheck；pnpm build；validate_project_framework.py；diff check | 均通过；OpenAPI/client无接口漂移 |

新增74项全部通过、无新增skip。16个skip是既有recovery/process/payment类显式opt-in，不作为本片已验证事实。Node24.12.0、Prisma7.9.1；依赖复用锁文件，未升级、全局安装或下载浏览器。

本地仅使用新建geoeval_issue175库与专用Redis127.0.0.1:56380，不迁移共享默认库。测试首次失败原因是fixture JSONB键序查找与usage字段断言，修正fixture后两种纵切通过，未为测试改变业务输出。没有付费Provider、生产、云节点、真实5×4/SLA或密钥迁移。

当前行为归apps/backend/src/ai-execution、增量Prisma迁移与openspec/specs/evaluation-evidence；共享execution.v1仍由独立中台owner维护。Workspace保留到评审；后续P4/P5/P6不属于本片完成声明。
