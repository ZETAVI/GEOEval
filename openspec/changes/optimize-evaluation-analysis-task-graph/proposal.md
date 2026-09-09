# Change: Optimize Evaluation Analysis Task Graph

- Status: second-layer adaptation compared; article-topic quality still unaccepted
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

The owner approves the second-layer adaptation discussed after frozen transfer.
Narrative 1.3 clarifies parsed-content inputs, theme completion, overall versus
point attitude and article-topic value, with one complete fictional example.
Frequent mention alone does not make routine process details a promotional topic;
do not hardcode a waiting-area ban or delete that source information. Only exact
duplicate sampleSummary is removed from explicitly content-based narrative inputs;
independent/absent/legacy summaries and all points remain. Assignment 1.1 corrects
the obsolete always-present evidence wording without changing its slots or behavior.

Freeze eight narrative calls: captured 1.2 baseline versus the 1.3 adaptation,
hotpot/appliance inputs twice each, Qwen medium/concurrency two. No sampling, Parser,
assignment calls, retry or within-batch editing. Output shape and empty-case support
stay unchanged. This is a coherent adaptation comparison, not isolated causal proof
for any one Prompt sentence or summary deduplication.

The [eight-call comparison](research/chain-quality-experiment.md#second-layer-context-and-topic-adaptation)
is complete: both baseline and candidate now return themes/directions, so the old
empty result did not recur and cannot be claimed fixed by 1.3. Exact-context
adaptation is verified, but candidate hotpot directions still over-promote waiting
and one appliance suggestion assumes unprovided software-improvement material.
Retain the adaptation as an experimental candidate, not semantic acceptance.
Next narrow topic selection/expression only; no ninth call, first-layer change,
new field, forced nonempty rule or Agent. Assignment 1.1 had no real call this batch.

### Previous first-layer and frozen-transfer result

The owner confirms neutral brands remain competitors, broadens positive to include
ordinary qualified recommendations, and deprioritizes peripheral additions.
Do not treat prior nondeterminism as a proven two-task conflict. The current
[bounded design](design.md#current-package--simple-ternary-attitude) replaces the
experimental boolean with one ternary attitude, keeps parsed content into synthesis,
and derives eligibility as non-negative. Legacy boolean records retain their old
meaning. No extra Agent, score, public/runtime contract or source cleaning change.
Freeze a new six-call regression over the same three authorized retained sources,
twice each, Qwen low/concurrency two. Stop on provider/wire/schema failure; no
automatic resampling, retry, synthesis, seventh call or within-batch changes.
This tests the combined candidate, not whether a specific sentence caused old errors.

The [six-call result](research/chain-quality-experiment.md#simple-ternary-and-non-negative-competitors)
shows consistent main restaurant membership and coffee attitudes in these repeats;
neutral Starbucks is retained and both absent-target outputs omit unnamed/target
placeholders. Peripheral omissions/combined rows remain recorded without becoming
new gates; individual target-point polarity can still vary. Retain 5.0 for a bounded
fresh-source and synthesis/report check instead of more same-source tuning. Do not
equate owner-approved neutral inclusion with model accuracy improvement or claim
formal runtime acceptance, whole-report timing or generic stability. Batch ended.

The owner asks to test overall behavior without further minor tuning. A separate
[frozen new-source batch](research/chain-quality-experiment.md#frozen-new-source-and-report-check)
keeps every Prompt/code asset unchanged at d54716f, acquires four new Qwen answers
for two public brands, parses each twice, and composes previews from first-pass
outputs only. All 16 requests complete, but one narrative returns only overview
with empty themes/directions despite receiving useful target points. Hold 5.0;
next replay only that narrative at unchanged input/model/Prompt to assess recurrence,
without resampling, choosing better parses or raising peripheral coverage gates.

### Previous 4.2 result and decision

The owner now confirms concrete named business subjects, no absent-target
placeholder, and simple positive/neutral/negative attitude guidance. Prompt 4.2
tests these meanings without changing the 4.0 input, Schema or projector. The
existing boolean maps overall positive to true and neutral/negative to false;
mentionContext retains the useful distinction. An explicit ternary wire field
remains a later contract decision, not an implicit change to competitor metrics.
The absent-target instruction simply omits the absent subject from JSON while
interpreting other subjects normally. Neutral includes balanced pros/cons with no
clear overall lean, as well as factual background; mixed wording alone is not
neutral when the answer still clearly recommends or discourages the brand.

Freeze a separate six-call batch over the same restaurant, coffee and absent-target
answers twice each, Qwen low/concurrency two. Reuse the reading algorithm, source
and existing adapter; no acquisition, synthesis, retries, in-batch edits or runtime
activation. LOCATE is owner-deprioritized, not retroactively removed from evidence.
This is a developer regression of a Prompt package, not proof of general stability
or separate causal effects. Review raw rows, target state, useful portrayal and
recommendation eligibility before deciding on fresh-source transfer.

At `33b5784`, 48 focused tests, backend typecheck, framework links and diff checks
pass. The frozen runner also proves all three user contexts, original answers and
JSON Schemas equal the previous batch. Automatic safety review rejected execution
before process creation because it requires explicit approval for this exact
three-source/Qwen/private-Langfuse combination. No provider or telemetry request
ran, no credential was injected, and no semantic improvement was claimed. The
owner has now explicitly approved that exact batch and clarified target absence
and neutral attitude. Replace the unexecuted 4.1 Prompt with 4.2 and regenerate the
manifest at the actual execution HEAD; do not reuse the rejected launch token.

The [4.2 result](research/chain-quality-experiment.md#balanced-attitude-and-simple-target-absence)
completes that approved batch at ff0a334: six structures project, target states and
useful portrayals remain, but unnamed inclusion, tail omissions and recommendation
flags still vary. In the restaurant repeat, positive competitor candidates change
from zero to four despite the same five identified merchants. Do not accept this
as stable, infer neutral versus negative from false alone, or add a seventh call.
Next discuss attitude versus competitor eligibility using these actual examples;
the boolean mapping remains unchanged until the owner decides any revised meaning.
No new field/Agent, formal activation or fresh-source sweep follows automatically.

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

The [4.0 design](design.md#previous-package--algorithmic-reading-and-content-interpretation)
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
