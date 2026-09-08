# Change: Optimize Evaluation Analysis Task Graph

- Status: Validate owner-approved first-appearance ordering and explicit target absence; runtime unchanged
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

Current decision: the owner explicitly simplifies ordering to first appearance of
distinct brands, irrespective of categories, numbered headings or co-listing.
Repeated mentions do not consume another position. This supersedes shared-item
ties in the previous candidate; it is a meaning change, not solely a bug fix.
Keep the existing nullable targetDescription slot: actual target mention receives
points/summary; absence yields null and no target row. Both forms discussed by
the owner are feasible; this keeps the current schema and projector unchanged.

Freeze eight calls, four retained real answers twice, unchanged Qwen3.8 Flash / low
and concurrency two. Only instruction/version changes from rows 1.1.0 to 1.2.0;
input/schema/program stay fixed. Evaluate using the new first-appearance rubric,
not old shared ranks. No sampling, synthesis, search, retries or activation.
Formal reconciliation must cover product-definition/glossary, Parser and reporting
position consumers before the new meaning can enter an official run; historical
evaluations remain on their accepted interpretation.

Previous: the [concise brand-subject package](research/chain-quality-experiment.md#concise-brand-subject-rows--better-coverage-with-position-and-absence-residuals)
at `0f11208` completes all eight frozen calls. Main-list repetition handling and
co-listed brand coverage are correct in both repeats. One source-order output
mispositions two other brands; one absent-target output invents a target row
while leaving its description null and is rejected. Seven projections pass,
not a 7/8 semantic success rate. Retain experimental rows 1.1.0 as a candidate;
customer-summary baseline 1.4.0 and formal Parser remain unchanged. This batch
is ended; its proposed distinct-versus-shared clarification is superseded by the
owner's first-appearance decision above, keeping model/input/schema fixed. No new
route comparison, automatic repair or larger acquisition matrix is justified yet.

Previous: the [eight-call located-row package](research/chain-quality-experiment.md#source-located-brand-rows--partial-improvement-with-repeatability-residuals)
at `329cc48` improves the source-order case in both repetitions and recovers two
co-listed brands once. The shared-item repetition still omits them; two calls also
repeat existing brands when reading summaries/tables and are rejected. Six old-
shape projections pass, not six semantic approvals. Retain this owner-local
single-call candidate without changing experimental customer-summary 1.4.0 or downstream input.

The owner's latest decision supersedes the alternate-route proposal: keep
Qwen3.8 Flash / low and test a concise, consistent Prompt. Remove the independent
sourceItemLine output, whose necessity was not established. Keep evidence line
ranges for excerpt restoration. Extract one row per recognizable brand subject
and retain its first appearance position; subsequent passages/tables/summaries
only supplement that brand. Input remains the full raw answer, question and
target context, never pre-extracted brand or position answers.

The new eight-call package was frozen before execution (the same four real cases
twice, concurrency two). This changes instruction and one experimental field together;
it is not a Prompt-only causal test. Reuse historical results as qualitative
references, not a speed/stability rate. No sampling, synthesis, retry, search,
route change or activation. This package is finished; all raw results are retained.
Direct malformed text, formal recovery and complete-report timing remain open.

Previous: the [ten-call Parser/direction package](research/chain-quality-experiment.md#parser-coverage-and-article-directions--reject-parser-package-retain-direction-scope)
at `7b3ba0d` retains narrative 1.2.0, but rejects Parser 1.5.0 and restores the
existing 1.4.0 asset. All ten structural checks pass; actual coverage/position
errors persist and one candidate repeats an unnamed entity eight times. This is
not a reason to lengthen Prompt prohibitions or feed full raw answers to synthesis.
The owner's confirmed boundary remains parsed records, summaries and necessary
excerpts into synthesis, with one or two useful article topics for the writing
consumer. Direct-question overview ranking language remains a known residual,
not a reason to reopen every narrative wording or design a new critic.

Next address single-Parser output representation of brand identity, source items
and positions at the existing experimental seam before freezing another small
comparison. No new Agent, selected runtime Schema, model switch, deformatting or
extra call is approved by this result itself. Direct malformed text and formal
component recovery remain unverified; no 3–5-minute report claim follows.

Previous checkpoint: the [six-call fixed-slot package](research/chain-quality-experiment.md#fixed-slot-assignment--structural-reliability-with-bounded-semantic-residuals)
at `548d4d2` completes without a structural report blocker. Four assignment calls
cover both retained merchant handoffs twice; the second merchant's 72 values are
identical across repetitions. Keep fixed-slot assignment as the next candidate,
not a general semantic-stability or runtime-delivery claim. One unnamed record
is still guessed into a named brand in one first-merchant reply. Two separately
tested narrative replies now address publicity content; one remains overly
specific and includes a problematic promotion example. The next package targets
the observed Parser omissions/positions/visible name and brief GEO directions,
with deformatting kept as an independent source-preserving hypothesis.

The owner approves retaining acquisition and successful analysis while retrying
only failed analysis. The implementation must follow selected boundaries and
dependent-result invalidation; no automatic retries are added to completed
experiments. Partial-report presentation is not newly approved, and incomplete
work must not be labeled a completed report. No runtime table or added Agent is
inferred from this decision. Earlier stages below are evidence history, not a
list of comparisons to reopen.

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

The owner subsequently confirms that the two target names in the local review
represent one consumer brand. Withdraw the prior false-positive conclusion;
reasonable aliases, store formats and brand series are acceptable, without
legal-entity or exact-wording verification. That correction does not approve
grouping unrelated brands by restaurant category.

The historical coffee shared-item case stays a retained observation/regression,
not a reason to keep tuning indefinitely. The new matrix provides higher-priority
reachable failures: unnamed entities entering
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

The seven-call Prompt package stops after five calls because both synthesis arms
reference nonexistent records. Its broader Parser instruction is not adopted.
The separately frozen four-call repair restores the prior Parser instruction
with optional owner context and enumerates existing references in the synthesis
Schema. Both identical-input synthesis calls pass reference checks in 38.821 and
48.156 seconds, but still select mismatched brand members. This verifies reference
validity, not semantic grouping or a causal/full-evaluation speedup; the second
call also uses cached input. No further calls are appended to either batch.

The approved lossless layout-only comparison stops after its first pair: the
baseline duplicates membership, while flat input puts all 45 records in one
group. Do not adopt that layout as the fix. A separately frozen final two-call
diagnostic supplies the same brand records/excerpts but asks only for grouping,
without target narrative/context. Both avoid the owner-confirmed wrong target
grouping; one returns seven broadly reasonable groups, while the other still
misassigns a store-qualified record and leaves some duplicates separate.
The focused calls take 38.226/42.651 seconds, not full-report time. Task, context
and output scope change together; the result supports another bounded experiment,
not proof of a layout root cause, stable quality or a selected two-Agent runtime.

The four-call minimal composition package at `d17f01a` produces one useful
complete preview in 71.255 seconds, using 24,833 tokens. Its repeated grouping
then returns overlapping members and category groups; that component is rejected
and no second report is assembled. Both target narratives pass references and
meet the practical reading bar apart from preserved upstream ambiguities.
The entire batch uses 49,236 tokens in 132.901 seconds. This is retained-input
analysis, not a new full evaluation or evidence of a reliable runtime speedup.
See the [composition result](research/chain-quality-experiment.md#minimal-report-composition--one-preview-repetition-rejected).

The owner's thinking-level comparison is now complete: six unchanged-task
grouping calls, two each at low/medium/xhigh. Medium's two member partitions
agree and take 41.812–54.230 seconds. Low is not faster here and has an omitted
member or uncertain unnamed grouping; xhigh takes 155.727–158.858 seconds without
better practical quality. Keep medium for the next controlled candidate.
No analysis search is enabled; no external facts correct the retained answers.
Natural acquisition and the current spec's optional-search capability remain
unchanged. See the [effort result](research/chain-quality-experiment.md#grouping-effort-comparison--retain-medium-without-contract-expansion).

The second merchant's full matrix at `9c78932` now completes all 42 calls and
20 Parser structures in 292.527 seconds, but grouping duplicates/mixes members
and is rejected. No complete preview exists, so this is not a successful
three-to-five-minute report. Actual sampling/Parser time is 219.361 seconds and
parallel synthesis takes 72.828 seconds; no throughput change is the current
priority. See the [second-matrix result](research/chain-quality-experiment.md#second-merchant-matrix--grouping-failure-reproduced).

This cross-merchant result makes single-assignment grouping the next priority
experiment on the two retained handoffs. Keep a single Parser and add only
the observed coverage/position and visible malformed-name cases to its focused
regressions. Retain the readable narrative but clarify its GEO information/content
purpose rather than general business-operation advice. Reuse actual input;
do not resample, sweep effort, add a critic or trim failed groups. A changed
expression cannot certify identity by structure alone. No runtime activation or
formal report acceptance follows until these failures have an explicit disposition.
Do not add queues/tables or preselect independent
retry components merely because the diagnostic has two responsibilities. Keep
the existing single-call Parser. The owner-confirmed alias remains accepted;
another relation inferred only by the model is an observation, not a newly
confirmed fact or a reason for a master identity system. Keep full source,
ordinary recommendation tolerance and broad practical directions. Do not add
alias databases, critics, workflow tables or word-for-word proof gates. Further
merchant matrices are not the next step after this demonstrated report failure.
#41 retains final synthesis/customer-report ownership.

Langfuse contains actual model input/output and operational metadata only;
each completed batch's private observations have been read back against the wire. Independent review
and the raw readable preview remain local. Actual UI/database/recovery, runtime
activation and formal 17/20 report acceptance remain unverified. Trace logging
does not complete #49 Prompt Management mirroring.

## Impact and exit

Application execution does not import experimental assets. No database or public
API changes are included. Reverting this Partial removes preparation only.
Keep this Change active and PR #62 Draft while probes, runtime selection and
implementation remain outstanding. Parent #39 stays open.
