# 委托 Parser 到持久执行中台

Owner：[Issue #175](https://github.com/ZETAVI/GEOEval/issues/175)。Architectural；P2经用户授权由PR176合入main636bd71，默认关闭、未部署。已接受行为归当前evaluation-evidence spec、架构overview与可执行AI模块；此处仅保留历史决策与验收，不再作为活跃backlog。

## 为什么

现有 Parser 在产品Worker中长期等待Provider；中台execution.v1已持久提交并推送结果，但GEO没有durable receipt和恢复消费。一次远端await不能解决占槽或旧210秒歧义超时触发新调用的问题。

## 范围

In：一个EVALUATION_INTERPRETATION原生prepare/consume接缝；固定transport；增量receipt/inbox/cursor；短提交与resume Outbox；原有Parser语义与显式重试；隔离PG及本地HTTP/SSE故障验收。

Out：改模型/Prompt/报告；网页80/130策略；全部API用途迁移；Langfuse exporter；真实密钥、付费请求、生产和新节点。

## 影响与归属

AI Execution拥有传输关联和技术恢复；GEO Intelligence继续正式接受和语义校验；Background Work复用原Outbox。共享接口只链接[中台b2ca795检查点](https://github.com/ZETAVI/browser-sampler-control-plane/issues/4#issuecomment-6077327310)，不复制公共schema。

文档影响：owner-local AI执行说明和当前spec已随PR176接受，Product Definition现有Evolution marker保留。本片不改变产品词义。原工作树retained作为恢复材料，不继续承载P4；P4复用#169工作树且不改生产。
