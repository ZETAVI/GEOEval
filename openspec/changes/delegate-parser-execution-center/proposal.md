# 委托 Parser 到持久执行中台

Owner：[Issue #175](https://github.com/ZETAVI/GEOEval/issues/175)。Architectural；用户已批准P2本地实现，与独立中台P3并行。状态：Implement，默认关闭，未合并/部署。

## 为什么

现有 Parser 在产品Worker中长期等待Provider；中台execution.v1已持久提交并推送结果，但GEO没有durable receipt和恢复消费。一次远端await不能解决占槽或旧210秒歧义超时触发新调用的问题。

## 范围

In：一个EVALUATION_INTERPRETATION原生prepare/consume接缝；固定transport；增量receipt/inbox/cursor；短提交与resume Outbox；原有Parser语义与显式重试；隔离PG及本地HTTP/SSE故障验收。

Out：改模型/Prompt/报告；网页80/130策略；全部API用途迁移；Langfuse exporter；真实密钥、付费请求、生产和新节点。

## 影响与归属

AI Execution拥有传输关联和技术恢复；GEO Intelligence继续正式接受和语义校验；Background Work复用原Outbox。共享接口只链接[中台b2ca795检查点](https://github.com/ZETAVI/browser-sampler-control-plane/issues/4#issuecomment-6077327310)，不复制公共schema。

文档影响：更新owner-local AI执行说明/本Change，Product Definition现有Evolution marker保留，本片不改变产品词义。Workspace：main-direct，base a963ceb，branch codex/issue-175-parser-execution-center，owner lead，工作树retain到评审；不动#169候选和生产。
