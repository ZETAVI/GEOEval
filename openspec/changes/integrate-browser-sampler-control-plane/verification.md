# Verification

## P4 local candidate

接受基线main636bd71，P3 localhost依赖为clean135bb96；不把旧ac1a55e验收当作P4证据。四題使用用户的花悦庭真实问题输入，但所有平台/模型回包均明确标记本地fixture，不调用外站或收费Provider。默认关闭；生产、账户、真实SLA尚未验证。

| Claim | Discriminating evidence | Result / boundary |
| --- | --- | --- |
| 逐题独立：首题已正式接受并Parsed，siblings/cleanup仍未完成 | p4-end-to-end.integration，实际P3 SQLite+HTTP+Unix actor | 五平台各首题先完成，另外15题及复位被闸门阻塞；不绕过正式Outbox/Processor |
| 完整真实案例输入多轮Query→20采样→Parser/归并→报告 | 同一正式产品闭环，新品牌revision再测 | 实际producer4/4（7.13s），协议fixture4/4（4.09s）；时间是fixture执行耗时，非真实平台SLA |
| 80仅补未采集；130仅封口采样；已接受Parser不受伤 | PG持久化14，端到端79/80/130及局部重试 | 16已接受、4待采样；80只补4，130结束4而16Parser继续，retry只采缺失4题恢复报告 |
| 队列全堵不延长预算 | submit/retry事务建窗、独立SQL预算loop；runtime6 | QUEUED尚未处理started仍可80/130封口，迟到started不复活；Web GET和预算互不阻塞 |
| 赢者唯一、崩溃与事务恢复 | PG持久化14 + Web Inbox12 + coordinator15 | 双成功唯一证据/Parser；真实PG trigger回滚、重复/早到/丢ACK同key恢复、旧cycle/截止围栏、keyset分页 |
| API原生请求/回包语义及败方账本 | native31 + codec32/Provider17 + eventRuntime5 | 模型、问题、原生搜索/JSON参数沿原builder/consume；收到的败方可纯finish且保留usage，不新POST、不第二Parser |
| 富内容及安全卡片 | backend rich8；frontend新旧卡片16；完整报告断言 | content/readingText/images/内部sources持久；Parser文本锚点一致；公开richAnswer无来源/引用映射；旧Markdown保留 |
| API/Web唯一通知owner和异常恢复 | client8、eventRuntime5、Inbox12、完整P3产品闭环 | Inbox/cursor/snapshot/resume原子；终态GET失败不提交cursor，独立Web对账兜底 |
| 迁移与生成/类型/构建 | 独立geoeval_p4_issue169的58次迁移；OpenAPI/client生成 | 全迁移成功，不迁共享默认库；全类型与build已通过，末次全后端回归进行中 |

新原生/通知、独立预算和编排的八个定向文件129/129通过；无跳过。全后端最终结果及固定审查在相应门完成后补充，不能把正在运行写成通过。历史16项条件跳过如仍存在，将单列不作为P4恢复证明。

修复的集成接缝：queued建窗过晚、没有receipt的DIRECT defer被吞、竞速败方账本残留STARTED。测试夹具修复：P2手动构造缺采样配置、千问Responses映射/HTTP native包字段、生成DTO后enum字面类型；未放宽产品合约或为通过测试改写问题。

资源：新建专用PG库和127.0.0.1:56381 Redis（复用OrbStack已有镜像，无重复安装）。实际P3 worktree只读/无改动；runtime临时HTTP/Unix/SQLite由fixture销毁。未来真实具名环境联调、生产身份统一、密钥迁移、多节点和Langfuse仍独立门。

## 2026-10-09 planning audit

本轮只修改规划，候选实现仍为ac1a55e。新目标的逐题事件、raw API委托、channel/cycle/deadline、富内容卡片和130秒竞速均未实现或测试。文档与模块定位及git diff --check已检查；没有生产操作、迁移、Provider付费调用或Langfuse运行验证。

以下历史证据仅对应旧候选行为，不能证明本轮新目标。当前行为/生产main没有因设计文档更新而改变；新增验收与分段发布由tasks维护。

## Historical evidence — ac1a55e

## Evidence matrix

| Claim | Evidence | Result | Notes |
| --- | --- | --- | --- |
| Existing API-provider acquisition remains the default | `runtime-config.spec.ts`; existing evaluation integration suite | Passed | Browser mode is explicit and production HTTP is rejected. |
| Tencent Yuanbao label and browser protocol alias preserve identity history | `evaluation.integration.spec.ts`; `api.integration.spec.ts`; browser batch assertions in `evaluation-process.integration.spec.ts` | Passed | New definitions show `腾讯元宝`; stored `混元` snapshots and `hunyuan` sample keys remain unchanged; browser submission uses `yuanbao`. |
| HTTP port sends one real batch with a stable idempotency key | `browser-sampling-gateway.spec.ts` | Passed | Request body, bearer/header boundary and task ID projection checked. |
| Remote running, partial, late and failed results normalize safely | `browser-sampling-gateway.spec.ts` | Passed | Running avoids result fetch; late and verification failure remain distinct. |
| Five platform batches feed the existing evidence/report lifecycle | `evaluation-process.integration.spec.ts` | Passed | Five four-question batches; 18 accepted, one verification failure, one echo rejection, one late item; report completes at 18/20. |
| Process restart does not resubmit a known task | `evaluation-process.integration.spec.ts` | Passed | External task ID is persisted before fresh coordinator/service objects continue polling. |
| Temporary control-plane outage reuses the same submission identity | `evaluation-process.integration.spec.ts` | Passed | First transport failure defers; next submit uses the same SHA-256 key. |
| External results preserve attempt/evidence integrity | migration rehearsal plus integration assertions | Passed | Twenty external acquisition attempts back 18 evidence rows and two exhaustion rows. |
| Sensitive control-plane data stays outside logs/diagnostics | gateway masking test, browser diagnostic projection, diff secret scan | Passed | Raw remote body and bearer token masked; browser projection carries only technical references. |
| Migration is additive and deployable | isolated `geoeval_issue169` migration from empty schema | Passed | All 56 migrations applied; new table has count/FK/uniqueness constraints and no historical rewrite. |
| Default behavior has no backend regression | full backend suite | Passed | 100 files passed, 3 skipped; 972 tests passed, 16 skipped. |
| Backend remains buildable and governed | backend typecheck/build; `validate_project_framework.py`; `git diff --check` | Passed | No framework or whitespace failure. |
| Real independent-service two-by-one HTTP slice | not run | Not run | Independent service runtime/session release is not an accepted deployment dependency yet. |
| Real five-platform/four-question gate | not run | Not run | Requires the separately operated control plane and explicit runtime gate; prior evidence remains 16/20. |
| Current spec reconciliation | active delta only | Blocked | Promote only after the real runtime gate is accepted. |

## Conclusion

`partially verified`. The local architectural vertical slice is verified and is
suitable for a Partial PR. Runtime interoperability, fresh five-by-four quality
evidence and current-spec promotion remain explicit Issue #169 gates. No
production deployment or merge has been performed.
