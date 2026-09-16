# 实现决策的现有依据

核对日期：2026-09-15，main@f37f9e0。不新增依赖或外部费用。

- 现有 PublicationResolutionWorkflowService 已组合 Identity → wallet → Delivery 的原单退点事务。保留原单来源、幂等和容量语义，执行者改为系统最终结算，运营负责约定。
- 当前 delivery_resolution_shape 及 check_publication_return 将正额关闭/退点与终态绑定；需在相同变更内改造，不能只改页面。
- 现有 ProductWorkerRuntime 与 RechargeWorkerRuntime 展示宿主生命周期、有界扫描和恢复做法，但分别含评估/充值语义；复用宿主与基础设施，不复制其业务状态。
- PostgreSQL 18 文档说明 clock_timestamp 返回实际当前时间，CURRENT_TIMESTAMP 是事务开始时间。因此锁等待后判断受理窗口不能使用陈旧事务时间：https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT
- PostgreSQL 行锁只在事务内保护已锁记录，互斥顺序须一致；唯一性与短事务仍需实际并发验证：https://www.postgresql.org/docs/current/explicit-locking.html

证据复用边界：数据库版本、现有退点/容量/身份/Worker 接口未变时复用；其变化触发对应局部复核。官方语义不是本项目运行证明，verify cases 中的真实数据库/重启验证必须执行。
