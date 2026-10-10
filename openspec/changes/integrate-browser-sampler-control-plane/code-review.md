# Code review

## P4 review gate

固定diff：main636bd71→实现3c435a4。独立review只确认1项P2 must-fix：合法content.version2/blocks=[]让非空原回答在卡片消失（actualP3契约+SSR最小复现）。修复b96baec仅改富投影/卡片及负例：无可显示rich回原文；有效图/表格/嵌套列表不降级。Backend10/Web18、完整Web268、actualP3产品闭环/PG/rich29重验；原reviewer对b96baec窄closure为ready with follow-up，无新material finding。

Intent：原问题、模型/Prompt、17/20语义与130仅采样边界未改变；逐题独立、80 API竞速、完整真实案例输入多轮得到本地fixture证据。Engineering：唯一持久身份、统一cursor、接受CAS、已收到败方纯finish、独立预算/网络对账、富内容安全投影与默认off。Evidence：1154全量（既有16条件skip）、范围受影响的末次29/268/type/build；无生产/真实Provider/SLA声明。候选跨retry旧deadline问题经事务readiness唯一键否证，不加入猜测性防御改造。

Verdict：ready with follow-up，仅具名真实环境、production集成/激活门。Latest-head CI以GitHub为准。下方ac1a55e审查只保留历史，不作为本轮依据。

## Historical review — ac1a55e

## Fixed point

- Base: `origin/main@fe16def`
- Diff: working tree on `codex/issue-169-sampling-gateway`
- Intent: Issue #169 and this active Change

## Intent review

The diff implements the approved one-way dependency: GEOEval calls an HTTP JSON
control plane and contains no browser SDK, Cookie/Profile, login, Live View,
node-routing or account-pool implementation. Five GEO platform identities map
to five external platform adapters, while the current provider acquisition is
still the default. Partial items enter the existing evidence lifecycle and are
not turned into an all-or-nothing batch.

The scope does not claim production activation or a fresh real five-by-four
success. The retained control-plane result remains sixteen of twenty with
Doubao partial failure.

## Engineering review

Resolved during review:

- external task identity and per-cycle idempotency are durable before polling;
- external captured and failed items become terminal per-sample
  `AiExecutionAttempt` records before evidence/exhaustion advances;
- a process restart recovers the same submitted task rather than replaying
  successful siblings;
- transport unavailability defers the same work and has a bounded ten-minute
  terminal boundary rather than exhausting BullMQ retries or waiting forever;
- consumer Web/App attempts no longer fabricate a system instruction that was
  not sent;
- remote error bodies, bearer tokens, prompts and answers do not enter error
  messages or diagnostic telemetry projections; canonical answers remain in
  the existing evidence owner only;
- an inactive configuration preserves the prior module graph and provider
  behavior.

No unresolved must-fix finding remains in the local vertical slice.

## Evidence and continuity review

Targeted tests exercise request shape, idempotency key reuse, running/terminal
states, partial success, late capture, verification failure, query echo,
transport outage, durable continuation with fresh process objects, result
masking and the seventeen-of-twenty report boundary. The full backend suite and
build pass against an isolated database and Redis logical database.

Current accepted specs are intentionally not reconciled yet because the real
control-plane gate has not run and the Change is still active. The delta now
explicitly changes the objectivity-instruction rule for consumer Web/App
sampling rather than silently contradicting it.

## Verdict

`ready with follow-up` for a Partial PR. A controlled HTTP slice against the
independent service and a fresh authorized five-by-four gate remain required
before Issue #169 can close or current specs can be promoted.
