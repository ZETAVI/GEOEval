# Change: Optimize Evaluation Analysis Task Graph

- Status: Validate stable business-subject interpretation and fresh transfer
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
Langfuse input/output export. Four questions, five platforms, score formula,
17/20 readiness and immutable accepted records remain unchanged. The owner now
approves a simpler experimental position meaning: distinct brand subjects in
first-appearance order, including formerly co-listed names as separate positions.
Current runtime semantics and history do not change in this experimental PR.

## Current evidence and next decision

The stable task is per-answer GEO interpretation: understand the consumer question,
identify the business subjects actually introduced/evaluated in the answer,
preserve first-appearance order and explain the target's portrayal. This is neither
fine-category reselection nor named-entity collection. The owner rejected the
agent-added platform/tool inclusion rule and its subsequent exception-list repair.
A payment/lookup name used as context is not an extra merchant to count. This is
a correction of agent task framing, not a new customer statistical decision.

Preserve single-call parsing, complete source/query, inline target interpretation,
array-derived positions and Qwen3.8 Flash low. Change the brand-row Prompt/version
and remove the conflicting all-name scope from the array's description. Schema
fields/types/limits, source inspector, program projection, downstream inputs and
runtime remain unchanged. Legal false-null
still requires semantic checking; simpler fields are not proof of correct mention.

Current package:
- Rewrite one coherent role/task/workflow and complete fictional example around
  consumer-facing business subjects; no blacklist, source crop or program repair.
- Reuse the old long-answer, supplemental-merchant and absence cases as regression
  only. They have repeatedly informed Prompt design and are not independent tests.
- Freeze the Prompt and protocol before obtaining two new open coffee answers.
  Inspect/parse those unedited answers once each without intervening Prompt edits.
  This is a fresh single-platform diagnostic, not formal Query or report acceptance.
- Cap the whole package at eight Provider calls: four regression parses, two fresh
  acquisitions and two fresh parses; concurrency two, no retries/fallback/synthesis.
  Use existing Qwen acquisition and low interpretation routes and actual IO-only
  private Langfuse logging. Keep all review and program outputs local.
- Judge target state, business-subject completeness/order and useful target prose,
  not proper-name coverage or polished wording. Retain both successes and failures.
  Stop the package without another automatic Prompt candidate.

The [design](design.md#current-package--business-subject-interpretation) records the
unchanged interface/recovery boundary. [Tasks](tasks.md) own current next actions.
All previous protocols and outcomes remain in the
[chronological experiment record](research/chain-quality-experiment.md), not as
competing active instructions here. In particular, the prior long-answer result
is corrected to three omitted merchants in the first reply, and complete merchant
coverage plus a spurious lookup-platform row in the second. Missing payment names
are not Parser defects.

Retained evidence supports inline target descriptions on six present/two absent
replies, not stable overall quality. Grouping/narrative candidates and the direct
Parser's readable-name residual still need actual report-path disposition.
No current-spec change, formal Parser activation, merge, migration, #49 mirror
delivery, or success timing/UI/recovery acceptance is part of this probe.

## Impact and exit

Application execution does not import experimental assets. No database or public
API changes are included. Reverting this Partial removes preparation only.
Keep this Change active and PR #62 Draft while probes, runtime selection and
implementation remain outstanding. Parent #39 stays open.
