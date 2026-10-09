# #169 消费侧任务与验收

## 已有候选事实

`ac1a55e` 已有配置、gateway、持久platform batch、稳定key、externalTaskId、延期读取和部分成功证据链；旧本地测试详见verification。本节不是新目标完成清单。PR170仍未合并/部署。

## 规划完成（2026-10-09）

- [x] 核对main、候选、模块owner、Attempt/Outbox/正式证据链及新目标缺口。
- [x] 与中台单writer设计对齐；记录逐题事件、80/130、channel/cycle及API保真边界。
- [x] 将全部API purpose委托划为实施前建立的独立后续Change；#169验收不等该后续全部完成。

## 最小实施顺序

- [ ] 固定生产者contract revision，形成相同fixture的消费者契约，不复制公共schema真相。
- [ ] 增量保存remote request ref/channel、结果receipt和inbox/cursor；历史Attempt正确backfill。
- [ ] 中台受理落库后完成短submit Outbox；事件同事务追加resume，Worker不长期await。
- [ ] 接入Acquisition一次raw API submit/consume，保留Provider参数与原显式重试；未确认发送不重发。
- [ ] 网页任务RUNNING期间逐item接受；actual验证字段、content/readingText/images/native sources不丢。
- [ ] 绝对cycle锚点、80秒剩余item兜底、130秒采样封口、attempt/channel及cycle CAS围栏。
- [ ] 富内容卡片消费：安全表格/图片保留，引用映射/信源不显示；内部来源仍提供。
- [ ] GEO remote span/业务disposition连接trace，usage只由中台实际调用owner计量，metadata-only。

共享API接缝与中台web即时事件分别在生产者P2/P3推进，#169在P4整合；下列门是#169自身验收，不等后续Query/全部Parser/Resolver/Composer运输完成。

## 最小判别验收

- [ ] 第一题完成时兄弟题和cleanup仍进行，首题立即落证据并启动Parser。
- [ ] 同key响应丢失恢复同任务；事件早于taskId落库、重复/乱序、inbox提交后崩溃不重复解析。
- [ ] >100个远端等待任务时，新完成resume和deadline仍及时派发，不受relay窗口饥饿。
- [ ] 原生参数/body、来源/usage、网页rich result与DOM fixture一致；200/空正文不能假成功。
- [ ] 79秒3/4已接受，80秒仅补1/4；web/API同时成功只有一份正式证据及一份解析Outbox。
- [ ] API先失败不终结web；130秒仅关闭未采集者，已接受者Parser可继续。
- [ ] 旧cycle和晚到结果不能进入新cycle；提交/恢复不重置绝对期限。
- [ ] 代表性历史数据/部分在途迁移、数据库恢复、Langfuse不可用和原transport在途回滚。
- [ ] 获准后真实5×4与故障测试：题目原样、逐项返回、总采样≤130秒或明确剩余项错误。
- [ ] 公共fixture/typecheck/影响测试与已有回归按实际变动执行；未跑/失败单独披露。

## 发布与退出

- [ ] 具名环境revision、密钥配置/付费测试/部署授权与回滚凭据窗口分别确认。
- [ ] accepted行为归并evaluation-evidence；保留Product Definition marker直到其触发，PR按真实接受边界处理。
- [ ] 记录main合并、生产部署与workspace退出为不同事实；不删除未合并worktree。

本轮退出：retain现有#169 worktree；只保存规划，代码与main/生产不改。下一步为公共fixture/短提交事件纵切；不先迁移Token或全面重写服务。
