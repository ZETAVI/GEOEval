# Parser异步执行设计

已接受：PR176 / main636bd71。当前行为由AI模块、迁移/测试、evaluation-evidence spec和架构overview拥有；以下为归档设计，不承载后续P4计划。

本片实现已批准P2，不拥有#169的网页优先策略。当前共享接口owner为中台execution.v1/b2ca795。代码、迁移和测试是细节事实owner。

## Architecture card

能力：原生Parser请求短提交后释放产品Worker，完成通知持久化再恢复原consume/语义校验。prepare/consume留GEO，真实网络调用、凭据和技术结果归中台。比较：直接remote await仍占槽；另建工作流引擎无必要。选择现有Postgres事务Outbox与一个后台SSE订阅。

状态：AI attempt创建时固定DIRECT/EXECUTION_CENTER，不因开关变化重发；receipt先于POST保存稳定requestRef/key/deadline和原生请求。ACK仅绑定，早到终态不可被迟到ACK降级。技术结果收集成功后inbox、cursor和独立resume Outbox同事务；重复通知不重复resume。未知已发请求恢复原task，不换key；旧210秒timeout不能给remote新调用权限。

Worker：受理后REMOTE_PENDING使短提交Outbox完成，业务Attempt保持STARTED；完成事件新增稳定resume businessKey，不复开旧completed Outbox。超过100个等待任务不会卡relay前100条。恢复扫描分页，不以老等待100条永久截断。

生命周期：新提交默认关闭；已有绑定沿原center/task完成。SSE监听者不占BullMQ业务槽，UTF8增量解码、授权、串行cursor CAS；GET失败不提交cursor。遥测不导出原文，remote不创建重复Provider Generation，完整Langfuse旁路留P5。

对账只扫描仍为STARTED/EXECUTION_CENTER的业务Attempt；明确失败的RESERVING receipt保留审计，但不得因配置恢复而重新POST。运行中不得将同一centerRef重指向另一个服务或caller身份；配置迁移/凭据退役仍属P6独立门。

数据：增量三表receipt/inbox/cursor与attempt transport字段；旧行DIRECT，不删除业务历史。结果只在receipt，通知只存安全ID/阶段。无跨库事务。截止是本Parser自身预算，不绑定130秒采样预算。

## 故障/恢复与回滚

| 故障 | 行动 | 不做 |
| --- | --- | --- |
| POST响应丢失 | 原key重查原受理任务 | 换key/改transport |
| 完成先于ACK | requestRef关联、原子resume | 等ACK后才监听 |
| inbox已提交后崩溃 | Outbox恢复同一次consume | 重新发Provider |
| 中台UNKNOWN/结果不可确认 | 明确非自动重发错误 | 编造NOT_SENT |
| 开关关闭 | 只停新attempt；在途仍恢复 | 删除账本/凭据即切直连 |
| 监听断线 | 从持久cursor补读并对账 | 用内存Promise作状态源 |

发布：本地fixture与增量迁移先验收；默认关闭。真实调用/密钥/具名部署另授权。回滚保留新表和原绑定，DIRECT历史可读。

资料边界：SSE依据[WHATWG](https://html.spec.whatwg.org/multipage/server-sent-events.html)（2026-10-09读取）；保持现有Prisma7.9.1，最新官网已指向ORM8，不采用其不同事务API，使用锁定本地类型/现有$transaction及PG演练；无依赖升级。
