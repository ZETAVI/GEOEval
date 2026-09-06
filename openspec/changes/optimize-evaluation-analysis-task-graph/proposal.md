# Change: Optimize Evaluation Analysis Task Graph

- Status: Real merchant matrix reviewed; identity/statistics repair remains experimental
- Class: Architectural
- Owning Issue: [#42](https://github.com/ZETAVI/GEOEval/issues/42)
- Parent: [#39](https://github.com/ZETAVI/GEOEval/issues/39)
- PR #62: Partial experiment preparation and parent-plan reconciliation

## Why

Historical evaluation exposed slow synthesis recovery and readable but unfaithful
model output. The owner's 2026-09-05 feedback requires examining the entire
sampling/parsing/synthesis context chain and improving normal generation before
selecting topology. Each layer receives task-relevant context; the first Parser
focuses on recognizable brand subjects, not unnamed teams or organization detail.
Source evidence preserves enough meaning for the customer-level task. Earlier
failures reject those candidates, not all one-call designs. Projection recovery
is a safety boundary, not the quality being optimized.

## Outcome and scope

Use real acquisition, parsing and synthesis results to select the smallest useful
improvement. Retain the single-call open Parser; neither further Parser splitting
nor a one-call/two-call synthesis comparison is mandatory without a new reason.
Preserve raw output, projected output, useful
evidence, quality findings, token usage and latency separately. Select the
smallest supported runtime only after evidence and architecture approval.

This Partial revises the existing proposal, prepares non-runtime experimental
assets, records controlled real-call evidence, and reconciles #39 planning. #41
retains synthesis semantic ownership; #32 remains completed. A new Parser
implementation requires explicit owning scope based on experiment findings.

## Non-goals and authority

No runtime Prompt activation, current-spec change, migration, new queue, model
purchase, Hy3 billing, production, customer data or automatic experiment sweep.
The owner separately approved controlled real acquisition and diagnostic
Langfuse input/output export. Four questions, five platforms, metric meaning,
17/20 readiness and immutable accepted records remain unchanged.

## Current evidence and next decision

The owner accepts practical, readable directions and requests another real
merchant and measured four-question/five-platform concurrency. The first full
controlled matrix at `9e62f84` is complete: 20 acquisitions, 20 Parser calls and
one synthesis, actual peak concurrency five, without retries or fallback.
All Provider calls succeed; 19 parses pass their stage checks, including four
direct and fifteen open samples. One direct parse is rejected, not counted absent.
This is controlled analysis evidence, not the formal application/report path.

The current Parser is an experiment, not a canonical report adapter. It retains
target points/position/evidence and a target summary, while other brands have
one subject name, source position, recommendation eligibility and evidence.
Original names remain in source excerpts; absence display follows the model's
null decision. The owner confirms ordinary drawbacks do not disqualify an
overall-positive recommendation. Keep the customer-level quality bar and do not
revive fine condition/role or minor wording gates.

The historical coffee shared-item case stays a retained observation/regression,
not a reason to keep tuning indefinitely. The new matrix provides higher-priority
reachable failures: a target-identity false positive, unnamed entities entering
competitors, direct-Parser malformed names, and synthesis grouping distinct brands
by category. Synthesis also contradicts the program's available direct count.
These affect identity/statistics, unlike minor wording. Preserve the failed output;
Schema/source/reference acceptance is not semantic acceptance. Exact manifests,
results and limits live in the [experiment record](research/chain-quality-experiment.md).

The experiment-only synthesis handoff preserves actual parsed facts and restored
excerpts, assigns short local reference IDs, and leaves counts with code. A
single synthesis generates overview, themes, proposed brand groups and practical
directions. It does not invent legacy Parser roles or satisfy the formal report
contract. #41 retains final synthesis/customer-report ownership.

Wall time is 352.014 seconds: sampling/parsing reaches its barrier at 240.829
seconds, then synthesis takes 109.705 seconds. This run misses the owner's
three-to-five-minute preference. Use these measured components to choose the
next bounded concurrency or synthesis experiment; do not claim an SLA, linear
scaling, billed cost, or a proven benefit from splitting.

Next repair only the demonstrated identity/statistics boundaries using retained
real answers, and freeze any new call package separately. Keep full source,
ordinary recommendation tolerance and broad practical directions. Do not add
alias databases, critics, workflow tables or word-for-word proof gates. A second
merchant matrix follows the targeted replay; it is not a repeated sweep of an
unchanged failing package. #41 retains final synthesis/customer-report ownership.

Langfuse contains actual model input/output and operational metadata only;
42 private observations have been read back against the wire. Independent review
and the raw readable preview remain local. Actual UI/database/recovery, runtime
activation and formal 17/20 report acceptance remain unverified. Trace logging
does not complete #49 Prompt Management mirroring.

## Impact and exit

Application execution does not import experimental assets. No database or public
API changes are included. Reverting this Partial removes preparation only.
Keep this Change active and PR #62 Draft while probes, runtime selection and
implementation remain outstanding. Parent #39 stays open.
