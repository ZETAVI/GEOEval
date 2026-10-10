# Code review

## P4 review gate

当前P4实现与定向验收已冻结；新的固定diff审查进行前需记录具体revision。下方ready结论只覆盖旧ac1a55e，不作为P4结论；本轮最终全量与新审查门完成后更新。

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
