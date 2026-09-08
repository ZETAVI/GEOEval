# Change: Optimize Evaluation Analysis Task Graph

- Status: Review target-independent first-layer proposal; 3.1 not selected
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

The completed 3.1 package kept single-call parsing, complete source/query, inline
target interpretation, array-derived positions and Qwen3.8 Flash low. It changed
the brand-row Prompt/version and removed the conflicting all-name scope from the
array's description. Schema fields/types/limits, source inspector, program
projection, downstream inputs and runtime remained unchanged. Legal false-null
still requires semantic checking; simpler fields are not proof of correct mention.

Completed 3.1 package:
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

The [design](design.md#completed-package--business-subject-interpretation) records the
unchanged interface/recovery boundary. [Tasks](tasks.md) own current next actions.
The [completed eight-call result](research/chain-quality-experiment.md#business-portrayal-regression-and-fresh-transfer--identity-residual)
improves merchant scope on the long regression but still fabricates target identity
in the absent-target case, returns one vacuous target interpretation, and merges/
omits subjects in one fresh coffee answer. Both fresh answers naturally mention
the target and its main descriptions are faithful. Do not adopt 3.1 as a whole.
That eight-call package is closed. The owner's subsequent proposal asks whether
the first layer should stop receiving extra target context and instead retain
each business subject's portrayal for target identification in the existing
cross-sample second layer. This is a candidate responsibility change, not an
approved topology or a revival of per-answer inventory-to-judgment splitting.
The previous unchanged-structure next step is paused for this decision.

A separately frozen four-call repetition keeps 3.1 exactly unchanged on two
retained rich answers, twice each. Useful target descriptions return in all four;
the thin summary is not reproduced, while independent-subject merging and tail
omissions recur. This supports observing prose variability without new minimum
length rules, not declaring the candidate stable. The
[repetition and boundary review](research/chain-quality-experiment.md#unchanged-prompt-repetition-and-target-independent-boundary-review)
records actual IO and the
[current decision frontier](design.md#current-decision-frontier--target-independent-evidence)
separates the proposed handoff from accepted runtime. No new blind candidate or
runtime implementation precedes the owner's bounded decision.
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
