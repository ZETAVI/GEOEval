# Change: 接入独立网页采样执行中台

- 状态：Active；P2已接受main636bd71。P4本地闭环、全量回归及固定审查窄修已验证（实现3c435a4、修复b96baec）；待Partial PR集成与后续真实联调，未合并/部署P4。
- Class：Architectural integration。
- Owner：[Issue #169](https://github.com/ZETAVI/GEOEval/issues/169)；候选 [PR #170](https://github.com/ZETAVI/GEOEval/pull/170)。

## 问题与期望

现有候选已接外部网页批次，但只在终态读取、没有即时API兜底、富内容投影不完整；新目标需要一题完成即进入GEO解析，并在130秒内结束所有采样项，不让长远端调用占住产品Worker。

GEO保留业务题目、Prompt/模型/原生API参数、规范化、正式证据、解析/报告；独立中台承担真实外部调用、Token/地址/容量、网页身份与技术完成通知。

## 本Change范围

- 复用四题×五平台样本与平台batch，稳定itemId、幂等身份和远端任务恢复；
- 逐题即时事件及RUNNING期间富结果消费；
- 采样Acquisition的中台API运输，GEO保留原生请求/响应解释；P4兜底调用失败不自动重试，旧DIRECT/Parser政策不改；
- GEO持久80秒API竞速、130秒采样截止、channel尝试身份和cycle围栏；
- 安全富卡片、readingText、临时图片与内部来源保留，卡片不显示信源/引用映射；
- 迁移、重复/乱序/响应丢失恢复及本Change独立验收/回滚。

全部生成/解析/归并/报告API委托由链接的后续Change/Issue持有，实施前建立，不把#169无限扩张。跨项目规则入口为 [中台设计](https://github.com/ZETAVI/browser-sampler-control-plane/blob/codex/issue-4-execution-center/openspec/changes/unify-execution-center/design.md)，本地改动与验收见[design](design.md)/[tasks](tasks.md)。

## 不改变与非目标

不改四题×五平台、17/20门槛、模型/Prompt/语义规则；不在GEO实现浏览器或存Cookie/Profile、控制节点、绕过验证；不永久保存图片；不自动重放不确定外部提交。

本轮不部署、不迁密钥、不创建云资源、不发付费请求。加入真实案例输入的本地多轮Query→报告回放；后续真实完整案例外部调用另过账号/成本/具名环境门。130秒只约束采样段，不限制Query准备、Parser或整份报告。

## 控制状态

沿用 `codex/issue-169-sampling-gateway` worktree和既有PR，同步已接受P2；保留旧候选历史验证，不改PR base。固定共享接口后Agent按不重叠文件并行，lead统一集成与验收；不为每个Agent建分支。

当前规范owner仍为evaluation-evidence；Product Definition Evolution marker保留到相应能力激活。旧内部hunyuan键/新腾讯元宝标签与网页yuanbao映射保持历史兼容，不重写报告。
