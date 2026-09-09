# Change: Optimize Evaluation Analysis Task Graph

- Status: 4.1 Prompt-only record/attitude calibration; runtime remains unselected
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

The owner now confirms concrete named business subjects, no absent-target
placeholder, and simple positive/neutral/negative attitude guidance. Prompt 4.1
tests these meanings without changing the 4.0 input, Schema or projector. The
existing boolean maps overall positive to true and neutral/negative to false;
mentionContext retains the useful distinction. An explicit ternary wire field
remains a later contract decision, not an implicit change to competitor metrics.
An absent target means all actual other rows have null targetDescription and the
projected target is null, not that actual other merchants are discarded.

Freeze a separate six-call batch over the same restaurant, coffee and absent-target
answers twice each, Qwen low/concurrency two. Reuse the reading algorithm, source
and existing adapter; no acquisition, synthesis, retries, in-batch edits or runtime
activation. LOCATE is owner-deprioritized, not retroactively removed from evidence.
This is a developer regression of a Prompt package, not proof of general stability
or separate causal effects. Review raw rows, target state, useful portrayal and
recommendation eligibility before deciding on fresh-source transfer.

### Previous completed 4.0 package

The owner approves algorithmic formatting cleanup that retains lists/tables,
removal of mandatory exact quotations/occurrences, and clear Prompt examples of
independent brands, aliases, repeats and tail additions. This is a coherent
first-layer task revision, not the deferred target-independent architecture.

The original answer remains immutable. A derived whole reading string is built
using the already locked Markdown/GFM parser and AST source positions. Remove only
recognised strong/emphasis delimiters; preserve headings, list numbers/nesting,
table cells/alignment, line endings, links, literal/code content and strikethrough
meaning. This is not a regex character stripper, a new LLM call, or HTML sanitization.

The existing brand-row asset advances to 4.0.0. Each brand has a concise
mentionContext; the target additionally has its positive/negative points. The
same target mentionContext becomes the sample summary, avoiding duplicate prose.
There are no mandatory evidence, exactText, occurrence, line or character fields.
The program still derives positions from model-array order and does not repair
brand identity, grouping or omissions. Structure is not semantic acceptance.

The explicit BRAND_CONTENT handoff identifies these as model interpretations,
not source quotations. The experimental second layer receives parsed contents and
program-assigned references, never complete raw answers or fabricated evidence.
Legacy quoted/line-based consumers still require their old contracts; current
runtime, score formula, readiness and historical interpretations are unchanged.

The [current design](design.md#current-package--algorithmic-reading-and-content-interpretation)
owns the implementation and source-research boundary. Freeze six authorized Qwen
low calls: retained restaurant, coffee and absent-target answers twice each,
concurrency two. No sampling/synthesis/retry/fallback, within-batch tuning, target
removal, additional Agent or runtime activation. Preserve actual IO and all semantic
failures; private Langfuse receives actual IO/settings/usage only, review stays local.
These repeatedly used cases are developer regression evidence, not fresh transfer.
Stop the package after six calls; choose the next action from measured meaning,
not a new label that counts previously unvalidated content as correct.

Previous whole-answer and quote-location failures remain in the
[research record](research/chain-quality-experiment.md); removing their exact-match
gate does not retroactively repair those results or prove the new task accurate.

The [six-call result](research/chain-quality-experiment.md#algorithmic-reading-and-content-interpretation)
preserves all target presence/absence decisions and useful target portrayal in
these developer cases. One coffee output now separates all nine subjects, but
another omits one; generic records and recommendation-eligibility variation remain.
Retain the reading algorithm and compact structure as the debugging candidate,
not formal stable adoption. Next keep input/schema/model fixed, make a bounded
record-scope/eligibility follow-up and then check new sources rather than endlessly
tune the same answers. No seventh call extends this completed package.

## Impact and exit

Application execution does not import experimental assets. No database or public
API changes are included. Reverting this Partial removes preparation only.
Keep this Change active and PR #62 Draft while probes, runtime selection and
implementation remain outstanding. Parent #39 stays open.
