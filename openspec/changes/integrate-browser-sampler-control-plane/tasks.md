# #169 P4 实施与验收

P2已接受main636bd71，P3 producer135bb96及execution.v1已本地验证；本片只接GEO消费侧。旧PR170验证保持历史范围，不充当P4通过证据。详细决策归[design](design.md)。

## 共享前置（lead单writer批准，固定后并行）

- [x] 用户批准P4本地实施、逐题互不阻塞及后续真实完整案例多轮联调。
- [x] 用户授权正常合并P2 PR176；main已接受，未部署/默认关闭。
- [ ] 同步现有#169基线，兼容合并与受影响类型/Provider/browser检查。
- [ ] 更新当前Issue/设计/spec，固定channel/批次item/统一cursor/富DTO与绝对窗口；划定Agent文件owner。

## 实现

- [ ] 增量channel与WEB旧记录回填，API1/WEB1身份及Outbox键分离。
- [ ] cycle.createdAt锚定80/130窗口；持久fallback/deadline与重启对账；只关闭PENDING采样。
- [ ] Web batch/item原请求先持久，统一SSE通知事务与独立技术resume；丢ACK/早通知可关联。
- [ ] Acquisition复用P2 native prepare/consume与一次中台API；原模型/参数/业务重试不改。
- [ ] 逐题正式接受事务验证cycle/attempt/期限，evidence与Parser Outbox原子；败方不重复接受。
- [ ] content/readingText/images/内部sources保留；确定性Parser阅读视图、富report DTO与既有卡片安全呈现；旧Markdown兼容。
- [ ] default-off、配置有效性、模块注入和旧DIRECT/P2兼容；最小关联/阶段信息，不提前做完整Langfuse面板。

## 本地端到端与故障验收

- [ ] 一题证据/解析已可读，另外三题及reset仍等待；问题原样不增加上下文。
- [ ] 79秒已接受3/4，80秒只补1/4；明确失败提前兜底；API失败不关闭web。
- [ ] WEB1/API1并发成功只一份evidence/Parser Outbox；UNKNOWN不换身份重发。
- [ ] 130秒只关闭未采集题，已接受Parser/报告可继续；排队、重启不延长窗口。
- [ ] 重复/乱序/断SSE/早完成/丢ACK、Inbox或接受事务崩溃、旧cycle、截止与成功竞态恢复。
- [ ] >100远端等待仍能交付新resume/deadline；取消与技术资源停止不混淆。
- [ ] 富fixture的段落/列表/表格/图片/信源通过持久层、Parser、报告API到卡片；公开卡片无引用映射/来源区。
- [ ] 真实案例输入的本地多轮Query→四题→5×4→解析/归并→报告；输出来源明确fixture/历史回放，不冒充真实API。
- [ ] 专用PG/Redis迁移/恢复，旧历史Markdown/Attempt可读，默认路径回归；按实际影响选择typecheck/build/框架/固定diff审查。
- [ ] 当前owner文档归并、PR证据、skips/限制及worktree retain；不部署、不发付费请求、不关闭整张#169。

## 后续真实联调门（本轮不执行）

- [ ] 确认中台历史依赖集成、新旧管理入口唯一身份owner和云worker/actor配套协议。
- [ ] 具名环境/Token/成本/真实账号权限授权后，多轮完整真实Query→报告案例。
- [ ] 单节点真实5×4、DOM/信源/原题/逐题返回、正常约85秒目标与故障130秒封口，分别度量采样段/解析段/整报告。
- [ ] 独立节点账号故障转移、Langfuse、剩余purpose和最终生产启用保持后续范围。

状态：开始P4本地实现，尚未新功能验收。沿用#169工作树和PR170；集成P2不改PR base。
