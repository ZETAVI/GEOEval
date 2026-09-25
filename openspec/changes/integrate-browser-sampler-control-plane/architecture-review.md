# Architecture review

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
