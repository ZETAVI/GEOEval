# Change: Optimize Evaluation Analysis Task Graph

- Status: Whole-answer input slice; controlled validation, no runtime activation
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

The owner now explicitly prioritizes whole-answer first-layer input. The previous
target-independent two-layer proposal is deferred, not approved or rejected;
record-constrained second-layer identity and all-subject content/latency comparison
remain later directions. This slice keeps target information, the business task,
one Parser call, inline target description, model and synthesis responsibilities.

Replace the experimental answerLines array with one originalAnswer string. Keep
the complete original question and answer, including Markdown, tables, whitespace
and line endings. The provider still serializes its normal JSON user context;
this is not a plain-text transport migration. No per-line objects or artificial
source numbering are sent to the model.

The coupled evidence change removes model-generated startLine/endLine and uses
source quotations with occurrence instead. Program code locates literal quotations
and adapts their containing lines to the existing parsed-only synthesis handoff.
Raw model quotations remain separate from the expanded source-line projection.
There is no fuzzy quote repair, name correction, source filtering or use of quote
offsets as brand positions. This input/reference change is not a pure input-only
causal experiment. Current formal contracts and historical records are untouched.

Update the existing versioned asset to 3.2.0 rather than creating another Prompt
copy. Verify full-source equality, actual provider messages, repeated quotations,
CRLF/multiline references, unresolved quotation rejection, unchanged positions
and target/other split, and the parsed-only synthesis handoff. Readiness is scoped
to this reversible controlled-validation seam, not formal activation.

Freeze a separate maximum four-call package: two existing rich restaurant/coffee
answers twice each, Qwen3.8 Flash low, concurrency two, no resampling, synthesis,
retry, fallback, target ablation or mid-batch instruction edit. Preserve all
semantic/source failures. Actual model IO/settings/usage may use the existing
private Langfuse authorization; review and projection stay local. Stop after this
package without automatically adding another Prompt candidate.

The [current design](design.md#current-package--whole-answer-input) and
[tasks](tasks.md) own the bounded next steps. Previous 3.1 evidence and unchanged
repetitions remain in the [research record](research/chain-quality-experiment.md).
They do not prove the new representation improves stability or total report time.

## Impact and exit

Application execution does not import experimental assets. No database or public
API changes are included. Reverting this Partial removes preparation only.
Keep this Change active and PR #62 Draft while probes, runtime selection and
implementation remain outstanding. Parent #39 stays open.
