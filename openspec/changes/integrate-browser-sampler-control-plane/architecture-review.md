# Architecture review

## P4 implementation checkpoint

已批准的design card在3c435a4实现，b96baec窄修富呈现。保持GEO业务接受/策略、AI-native prepare/consume、独立中台物理执行三层边界；四item Web batch与单item API receipt不混合，统一一个Inbox/cursor owner。提交时建80/130窗口，SQL预算与Web网络backstop各自singleflight，未引入新工作流框架。旧DIRECT与P4共用Acquisition request builder，避免Prompt/参数双真相；收到败方纯finish不重发。

独立固定diff审查未发现额外material架构问题；唯一可达空富正文发现已修复。P2已接受设计归canonical spec/overview并归档，P4当前仍是未合并候选；不得把以下旧ready结论扩大为真实生产5×4/SLA通过。

## 2026-10-09 planning checkpoint

规划可以进入下一轮可执行合约/本地纵切设计；实现不具备新目标发布资格。责任、即时通知、raw API、130秒仅采样、旧cycle和唯一证据围栏已记录到design/tasks。

交叉审视改变了下一步：提交工作不能持续DEFERRED占据relay最旧100条；#169必须包含Acquisition中台运输而不等全部purpose委托；QUARANTINED标签不是writer安全释放证明；退役旧Token须晚于回滚窗口。每项都有任务和判别验收，当前代码尚未修正。

下面为ac1a55e历史最小片的审查，ready结论仅指该旧切片；85秒+grace/终态轮询并非最新发布目标，不得作为新版完成证据。

## Historical architecture review — ac1a55e

## Contract

This review covers Issue #169's GEOEval-side integration only. The independent
browser-sampler control plane remains a separate deployable and identity owner.
Current parser, name-resolution, composition and report contracts are not under
review.

## Findings

### Resolved must-fix: remote task identity cannot live only in Worker memory

A submit response may be followed by process failure, and an HTTP response may
be lost after the control plane accepted the task. The design first persists a
stable idempotency key and then stores the external task ID on a cycle/platform
batch. Recovery repeats the same request identity or polls the stored task; it
never creates a fresh uncertain submission.

### Resolved must-fix: external answers cannot bypass accepted-attempt integrity

`EvaluationSampleEvidence` requires an exact successful
`AiExecutionAttempt`. Directly attaching a control-plane answer would split the
existing evidence chain. Every remote item is therefore projected into one
per-sample acquisition attempt before evidence or exhaustion advances.

### Resolved must-fix: collection cannot occupy a Worker lock

The reviewed collection window is 85 seconds plus control-plane grace, and cold
preparation may be materially longer. Submit/poll processing returns a deferred
time and reuses the same durable Outbox job. No Worker performs a blocking wait
for browser completion.

### Resolved must-fix: partial success is the business result

A batch task can be terminal while only some items are captured. The design
accepts each verified item independently and exhausts only its failed sibling.
It does not replay captured platforms to manufacture an all-or-nothing result.

### Resolved should-fix: rollout cannot silently replace the current route

The existing provider acquisition remains the default. The new path requires
explicit validated Worker configuration, and a controlled two-by-one slice
precedes the five-by-four gate.

### Residual gates

- The independent control-plane branch is local experimental evidence, not a
  production release dependency.
- Real account login, verification recovery and production capacity remain
  control-plane gates outside this Change.
- The latest retained real batch captured sixteen of twenty; Doubao remains an
  honest partial-failure case until new evidence says otherwise.
- Production activation, paid resources and protected-main merge require new
  authorization.

## Conclusion

`ready with follow-up`. The minimal vertical slice may proceed with the resolved
constraints above. The Issue remains open until controlled and five-by-four
runtime evidence is recorded.
