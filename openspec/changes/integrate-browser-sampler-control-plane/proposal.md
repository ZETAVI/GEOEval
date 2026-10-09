# Change: 接入独立网页采样执行中台

- 状态：Active，2026-10-09规划修订；未按新目标实现、合并或部署。
- Class：Architectural integration。
- Owner：[Issue #169](https://github.com/ZETAVI/GEOEval/issues/169)；候选 [PR #170](https://github.com/ZETAVI/GEOEval/pull/170)。

## 问题与期望

现有候选已接外部网页批次，但只在终态读取、没有即时API兜底、富内容投影不完整；新目标需要一题完成即进入GEO解析，并在130秒内结束所有采样项，不让长远端调用占住产品Worker。

GEO保留业务题目、Prompt/模型/原生API参数、规范化、正式证据、解析/报告；独立中台承担真实外部调用、Token/地址/容量、网页身份与技术完成通知。

## 本Change范围

- 复用四题×五平台样本与平台batch，稳定itemId、幂等身份和远端任务恢复；
- 逐题即时事件及RUNNING期间富结果消费；
- 采样Acquisition的中台API运输，GEO保留原生请求/响应解释与显式业务重试；
- GEO持久80秒API竞速、130秒采样截止、channel尝试身份和cycle围栏；
- 安全富卡片、readingText、临时图片与内部来源保留，卡片不显示信源/引用映射；
- 迁移、重复/乱序/响应丢失恢复及本Change独立验收/回滚。

全部生成/解析/归并/报告API委托由链接的后续Change/Issue持有，实施前建立，不把#169无限扩张。跨项目规则入口为 [中台设计](https://github.com/ZETAVI/browser-sampler-control-plane/blob/codex/issue-4-execution-center/openspec/changes/unify-execution-center/design.md)，本地改动与验收见[design](design.md)/[tasks](tasks.md)。

## 不改变与非目标

不改四题×五平台、17/20门槛、模型/Prompt/语义规则；不在GEO实现浏览器或存Cookie/Profile、控制节点、绕过验证；不永久保存图片；不自动重放不确定外部提交。

本轮不部署、不迁密钥、不创建云资源、不发付费请求。当前API路径仍是生产现状和受控回滚路径，不以计划冒充已迁移。

## 控制状态

沿用 `codex/issue-169-sampling-gateway` worktree和既有PR；保留旧候选代码及历史验证，计划更新不表示新目标通过。独立后续工作只有在owner/公共接口固定后创建write branch。

当前规范owner仍为evaluation-evidence；Product Definition Evolution marker保留到相应能力激活。旧内部hunyuan键/新腾讯元宝标签与网页yuanbao映射保持历史兼容，不重写报告。
