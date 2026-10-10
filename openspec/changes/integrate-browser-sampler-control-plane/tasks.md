# #169 P4 实施与验收

P2已接受main636bd71，P3 producer135bb96及execution.v1已本地验证；本片只接GEO消费侧。旧PR170验证保持历史范围，不充当P4通过证据。详细决策归[design](design.md)。

## 共享前置（lead单writer批准，固定后并行）

- [x] 用户批准P4本地实施、逐题互不阻塞及后续真实完整案例多轮联调。
- [x] 用户授权正常合并P2 PR176；main已接受，未部署/默认关闭。
- [x] 同步现有#169基线，兼容合并与受影响类型/Provider/browser检查（18d12c6，57项回归）。
- [x] 更新当前Issue/设计/spec，固定channel/批次item/统一cursor/富DTO与绝对窗口；划定Agent文件owner（9edede3）。

## 实现

- [x] 增量channel与WEB旧记录回填，API1/WEB1身份及Outbox键分离。
- [x] cycle.createdAt锚定80/130窗口；提交时建窗、独立预算对账、只关闭PENDING采样。
- [x] Web batch/item原请求先持久，统一SSE通知事务与独立技术resume；丢ACK/早通知可关联。
- [x] Acquisition复用P2 native prepare/consume与一次中台API；原模型/参数不改，P4 API失败不自动业务重试，旧DIRECT/Parser政策不改。
- [x] 逐题正式接受事务验证cycle/attempt/期限，evidence与Parser Outbox原子；败方仅完成技术事实、不重复接受。
- [x] content/readingText/images/内部sources保留；确定性Parser阅读视图、富report DTO与既有卡片安全呈现；旧Markdown兼容。
- [x] default-off、配置有效性、模块注入和旧DIRECT/P2兼容；最小关联/阶段信息，不提前做完整Langfuse面板。

## 本地端到端与故障验收

- [x] 一题证据/解析已可读，另外三题及reset仍等待；问题原样不增加上下文。
- [x] 79秒同平台3/4已接受但无API，80秒仅补第4题；另一16题不阻塞；另有完整案例16/4。明确失败提前兜底；API失败不关闭web。
- [x] WEB1/API1并发成功只一份evidence/Parser Outbox；UNKNOWN不换身份重发。
- [x] 130秒只关闭未采集题，已接受Parser/报告可继续；排队、重启不延长窗口。
- [x] 重复/乱序/断SSE/早完成/丢ACK、Inbox或接受事务崩溃、旧cycle、截止与成功竞态恢复。
- [x] keyset恢复不受最旧等待前缀限制；复用P2的>100验证，新增窗口分页；取消与技术资源停止不混淆。
- [x] 富fixture的段落/列表/表格/图片/信源通过持久层、Parser、报告投影到卡片；公开卡片无引用映射/来源区。
- [x] 真实案例输入的本地多轮Query→四题→5×4→解析/归并→报告；输出来源明确fixture/历史回放，不冒充真实API。
- [x] 专用PG/Redis迁移/恢复，旧历史Markdown/Attempt可读，默认路径回归；typecheck/build/格式/框架/固定diff审查及窄修复验通过。
- [x] 文档与验证快照更新、P2已接受Change归档；worktree retain/PR Partial，不部署/收费调用/关闭#169。最新CI与review门见PR。

## 后续真实联调门（本轮不执行）

- [ ] 确认中台历史依赖集成、新旧管理入口唯一身份owner和云worker/actor配套协议。
- [ ] 具名环境/Token/成本/真实账号权限授权后，多轮完整真实Query→报告案例。
- [ ] 单节点真实5×4、DOM/信源/原题/逐题返回、正常约85秒目标与故障130秒封口，分别度量采样段/解析段/整报告。
- [ ] 独立节点账号故障转移、Langfuse、剩余purpose和最终生产启用保持后续范围。

状态：P4本地闭环verified，独立review finding已窄修并收口；Partial PR170待集成/真实联调，#169保持开放，worktree retain，不改base、不部署。
