# GEO 网页优先采样：P4 本地闭环

Owner：[Issue #169](https://github.com/ZETAVI/GEOEval/issues/169) / [PR #170](https://github.com/ZETAVI/GEOEval/pull/170)。2026-10-09：用户批准 P4 本地实施，先矫正规划再实现；生产/真实凭据/付费请求保持独立门。

## 1. 基线与职责

P2 [PR #176](https://github.com/ZETAVI/GEOEval/pull/176) 已经用户授权正常合入 main，接受 revision 636bd71；新 transport 默认关闭，没有部署。P4复用现有#169工作树同步main，不复制P2、改变PR170 base或创建并行集成分支。中台契约固定execution.v1，当前P3 producer为135bb96；[唯一交接](https://github.com/ZETAVI/browser-sampler-control-plane/pull/6#issuecomment-6080549943)。真实服务器状态尚未在本轮核查。

GEO拥有：四题×五平台的不可变样本、模型/Prompt/原生API参数、响应规范化、正式答案、80/130策略、Parser/Resolver/Composer、17/20 readiness与报告。中台拥有真实调用、授权endpoint/Token、技术状态、资源容量和网页身份。技术完成不等于有效样本。

## 2. Architecture card：最小接缝

- 保留现有Postgres/事务Outbox/BullMQ；不另建工作流框架或业务数据库。
- 平台网页批次仍为一次四item任务；每题独立接受、通知和解析，不拆成四次浏览器启动，不等siblings/reset。
- API运输复用P2 prepare/consume/receipt；扩展一个Acquisition用途，不一次迁移Query/Resolver/Composer。
- 一个center/caller只有一个SSE inbox/cursor owner，按已登记requestRef与channel分发。P2单API receipt不硬套四题网页批次。
- 比较：复制第二套Web监听/receipt会竞争cursor并重复事实；万能任务表会把业务采样与技术运输混合。选择稳定通知事务复用，API receipt与现有platform batch分别拥有对应映射。
- Web终态snapshot先可读，通知入口同事务保存Inbox snapshot、cursor和技术resume Outbox；Web业务处理再沿GEO公开repository应用item。技术入口不直接查询GEO私有batch表。API沿既有P2链路恢复。
- 共享schema/签名由lead批准并交给唯一写owner；并行包按持久化、原生执行/事件、富卡片、总编排和验收分离。

## 3. 固定身份与持久时间窗

AiExecutionAttempt增加executionChannel=API|WEB（默认API），与DIRECT|EXECUTION_CENTER运输方式分开。唯一身份为cycle/sample/purpose/channel/attemptNumber；WEB1与API1可并存，不能把API首发当attempt2。旧浏览器Attempt按真实BROWSER_EVALUATION_ACQUISITION provenance回填WEB，其余API；历史模型、证据和报告不重写。API/Parser旧Outbox key保留，WEB acquisition key带channel。

Cycle新增可空samplingStartedAt、samplingFallbackDueAt、samplingDeadlineAt、samplingClosedAt。启用P4时使用正式cycle.createdAt固定起点，80秒兜底、130秒截止包含排队；initialize/submit/重启不得重置。旧周期/default-off保持兼容。130秒只结束PENDING acquisition，不将整个cycle提前EXHAUSTED；已接受的Parser及合成沿原独立预算继续。

正式start/retry提交事务同时建立窗口和预算Outbox，不能等run.started被工作队列领取后才起算。独立SamplingRuntime以250ms SQL-only预算对账唤醒/封口，与5s网页结果对账分开；平台GET卡住、SSE重放卡住或五个Product Worker全被占用，都不能拖住130秒封口。所有动作仍由持久日期、事务和CAS决定；内存timer不拥有业务状态。不另建队列或工作流框架。

网页沿EvaluationSamplingBatch新增center/requestRef/fingerprint/原请求；新增batch-item保存sampleId、itemId（固定sample UUID）、WEB attemptId、单题终态snapshot和处理状态。请求/映射在POST前持久；ACK丢失恢复同key/request。新模式item rows为映射owner，旧sampleIds只兼容旧批次。

## 4. 逐题正式接受、兜底与恢复

正式接受事务重新校验当前ACTIVE cycle、exact attempt/channel与SUCCEEDED、sample=PENDING及本地受控时钟/绝对截止；写唯一evidence与唯一Parser Outbox。不能只相信异步前读到的context或远端capturedAt。exhaustion同样使用条件转换/行锁，不能覆盖已接受者。

80秒到达先看最新正式状态，只为未接受题创建API首发工作；明确无容量/授权失败/发送失败可提前兜底。API失败不关闭仍生成中的网页。网页/API竞速采用截止前第一份通过GEO校验并原子接受的完整答案；败方只留技术事实，不替换答案或重复解析。UNKNOWN不换key自动重发。

P4的API兜底只做一次原生调用，失败保留技术结果、不自动业务重试；网页仍可完成。旧DIRECT采样政策和Parser原有重试不改。已提交并持久receipt的DEFERRED可释放短Outbox；没有receipt的旧DIRECT在途DEFERRED仍保留原递延，不能假定一切请求都有远端恢复owner。

fallback/deadline以持久Outbox和对账恢复，不只用内存timer；旧等待前缀不得饿死新通知/截止。截止的未发送题使用真实本地reserved Attempt/NOT_SENT事实，不伪造Provider调用。结果返回与页面停止证明分离，正式失败不解除未知Profile writer。

## 5. 富内容与用途

保留原answerContent/MARKDOWN；新增可空content（Sampler实际version2 blocks/sources/sourceCapture）、readingText和images。信源从content.sources取，没有伪造nativeSources顶层字段；CAPTURED/PARTIAL/NOT_OBSERVED与正文完成分开。

输入对可选富JSON作确定性有界校验，失败仅降级展示，不丢已完成原回答。Parser用确定性readingText；报告沿既有卡片输出安全richAnswer={version:2,blocks,images}，不输出sources/sourceCapture/内部诊断。React不注入HTML；表格、图片信息、正文链接保留；引用badge和来源区从呈现投影隐藏。图片只返回metadata/URL，不下载或永久保存，历史URL失效可占位。旧Markdown继续使用原渲染。

富blocks不盲套旧Markdown绝对高亮偏移；暂时明确不可精确高亮，原Markdown既有行为不变。模型语义校验的文本锚点必须与实际Parser readingText一致，不让LLM润色后覆盖原回答。

## 6. 分包与可观察验收

1. 固定共享身份/迁移/事件路由/DTO；更新Issue后实现。
2. 一平台四题的首题→富证据→Parser异步→报告投影；刻意挂住其他题/reset，证明独立。
3. Acquisition原生API委托与80/130，双成功仅一份证据/解析Outbox。
4. 同一fixture覆盖表格/图片/信源→持久化→Parser输入→报告API→卡片，旧Markdown兼容。
5. 断线/早完成/丢ACK/重复通知/事务崩溃/旧cycle/时间截止及迁移恢复；专用PG和Redis，真实localhost中台，无收费Provider。

本轮增加真实案例输入的本地多轮Query准备→确认四题→20项采样→逐题解析→归并/报告闭环；外部平台/模型输出以明确标记fixture或历史捕获回放验证，不冒充新真实调用。后续授权联调使用真实完整案例，从Query到报告多轮，分别记录全链耗时与130秒采样段，不给真实模型加测试提示词/答案约束。

## 7. 非目标、迁移与退出

默认关闭新模式；保持旧DIRECT/P2行为和历史可读。生产入口与旧管理身份账本统一、云actor配套升级、真实Token/付费5×4、多节点、其余purpose及Langfuse exporter另设门，不将本地CLI伪装production启动。

回滚仅停新周期web-first；在途沿原task/transport/绝对期限恢复，保留账本/证据/Profile。本地迁移只在专用数据库演练。P2已经接受的稳定设计按项目规则归并/归档，不把已完成Change当新backlog；P4接受行为最终归evaluation-evidence/可执行owner，Product Definition Evolution marker保持原触发。

本轮退出目标：#169本地闭环verified，PR170仍Partial、worktree retain；main合并、真实联调、生产启用分别报告。不得因本地通过关闭含真实激活门的整个Issue。
