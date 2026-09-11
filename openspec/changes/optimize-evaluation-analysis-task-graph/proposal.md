# Change: Optimize Evaluation Analysis Task Graph

- Status: Controlled full chain accepted; runtime integration decision pending
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

Prompt2.1 adds only general simplified/traditional and full-/half-width identity
wording. The retained Taotaoju regression fixes 東園/东园2/2 without regressing
White Swan or Bingsheng. A fresh42-call Taotaoju chain then completes with20/20
acquisitions,20/20 parses, one valid name resolution and one valid composition,
no retries. Open target mention is13/15 and every present/absent result agrees
with literal source-name presence. Resolution converts106 source competitor rows
through51 names into39 groups with no target leakage. Total time238.644s is
inside the accepted3–5 minute range. Customer summary/perception lengths are126/
154 characters, with3 positive themes,3 negative themes,2 article directions
and no internal IDs in prose. This is the first complete fresh acceptance for
the selected controlled chain. Runtime integration, current-spec reconciliation
and frontend adaptation remain separate work.

The owner now selects a name-level resolution interface instead of either
record-ID candidate. Exact repeated `displayName` values are aggregated with
their contexts; the Agent returns readable `observedNames` grouped under one
brand subject, or in `ignoredNames`. The program retains name-to-source-record
mapping and validates exact, exclusive name coverage before restoring sample
statistics. It does not expose internal IDs or ask the Agent to invent group
IDs. Focused tests18/18, backend typecheck and build pass. The three retained
inputs reduce285 records to170 unique names. After exact transfer confirmation,
all six DS0731-off calls pass strict name coverage. Fangsuo and Taotaoju produce
identical memberships twice; Taizuidiao preserves every core identity and varies
only on whether three vague descriptions are ignored. Mean call latency is
9.945s and mean total tokens8,814. Private Langfuse contains seven expected
observations and all six actual inputs, outputs, settings and usage match local
evidence. Select this experimental resolution interface; runtime and full-chain
acceptance remain separate decisions.

The approved12-call resolution-contract comparison now answers the structural
question. Both a root record-to-name map and groupId record map cover every ID
exclusively6/6. groupId is more membership-repeatable on two of three datasets,
but67% larger,53% slower and still splits White Swan venues once. The simpler
root map repairs historical Taizuidiao core grouping and has only peripheral or
one BingSheng semantic variation. Do not adopt artificial group IDs. See the
[contract checkpoint](research/chain-quality-experiment.md#resolution-output-contract-comparison--2026-09-11).
This historical result rejects artificial group IDs, but its root-map proposal
is superseded by the owner-selected name-level candidate above.

Fresh Guangzhou Taotaoju acceptance does not pass end to end. All20 acquisitions
succeed and19/20 parses are valid; one parser duplicates 陶陶居 and 陶陶居社区店.
Grouped1.2 covers all100 records but assigns one 白天鹅 record to both 银灯 and
白天鹅, so composition is not called. Time to rejection is251.257s, not a
successful report time. See the [fresh candidate checkpoint](research/chain-quality-experiment.md#taotaoju-current-candidate-full-chain-evaluation--2026-09-11).
Do not add retries or another self-check sentence. The subsequent comparison
rejects groupId indirection in favor of the simpler root assignment map. Runtime
integration remains out of scope.

Owner selects DeepSeek0731 nonthinking and closes further model selection.
Open Prompt1.4 repairs the two known Gram&Gram focus misses4/4 while retaining
the unnamed-shop negative2/2. An end-check-only grouped1.1 still misses the same
Fangsuo record twice; grouped1.2 changes the single-call workflow to assign each
ID before merging and then passes the exact95-record input2/2 with identical
complete groups. Jinpeng control remains valid. This supports the owner-requested
workflow check without retry-first design. See the [selected-candidate Prompt
checkpoint](research/chain-quality-experiment.md#selected-deepseek-prompt14-and-grouped-workflow12--2026-09-11).
At that checkpoint the next decision was a normal20-sample chain. The current
checkpoint above now supplies that acceptance; no runtime/default switch yet.

The owner reopens a bounded DS-off/Hy3-off selection comparison on the Qwen
failure/control inputs. Offline-corrected results: both parsers17/17; DeepSeek
groups2/3 and composes3/3, Hy3 groups1/3 and composes0/3 because of corrupted
JSON keys. Hy3 recognizes two gram aliases that DeepSeek misses. Therefore
DeepSeek remains the better single-model candidate; a Hy3-parser/DeepSeek-
downstream combination is only a next validation candidate, not an activated
choice. See the [selection checkpoint](research/chain-quality-experiment.md#deepseek-off--hy3-off-selection-replay--2026-09-11).

Composition1.6 now includes the approved task-only brand-promotion/GEO article
direction refinement, without new examples. The all-Qwen-off replay finishes130
calls across gram/Jinpeng/Fangsuo, twice each. First-layer107/120, grouped4/6 and
composition4/4 pass local contracts. Four partial-sample previews take67–104s,
none has20 valid parses. Thirteen raw array-shaped replies omit the required
wrapper/card; two group outputs repeat IDs, with one exposing compound brands
already merged upstream. Article framing improves, but some specifics remain
unsupported. All130 private trace contents/settings/usage match readback after
accounting for existing JSON serialization normalization. No default/runtime
switch. See the [current whole-analysis checkpoint](research/chain-quality-experiment.md#qwen-off-whole-analysis-replay-with-composition16--2026-09-11).
Next prioritize output-shape and one-brand-per-record handoff, not another broad
model matrix or additional article-writing prohibitions.

Current Qwen-off composition1.5 is now tested on two20-sample contexts twice.
All4 calls pass schema/references, preserve grouped statistics and match private
trace readback. Customer prose has no internal IDs and3/4 outputs meet the soft
length targets. Both Jinpeng directions still drift into service-product design,
so content acceptance is partial. This reuses DS-off first-layer parses and Qwen
groups, not an all-Qwen full-chain run. See the
[current composition checkpoint](research/chain-quality-experiment.md#qwen-composition15-verification--2026-09-11).

Owner-requested DS-low/Qwen-off targeted comparison is complete. Qwen off repairs
gram focus in2/2 and covers both group sets in4/4; all8 Qwen local checks pass.
Three DS-low group outputs truncate under8192; a separate16384 Jinpeng check
completes twice, but takes98–104s. The owner stops further DS testing. Prioritize
Qwen off for subsequent first-layer/grouping validation, not an automatic default
switch. That comparison did not test composition; the subsequent current-version
result above now supersedes the prior evidence gap. Historical1.1 small-context
reports remain reference only. See the [model-option checkpoint](research/chain-quality-experiment.md#ds-low--qwen-off-targeted-comparison--2026-09-11).

Owner treats the remaining scenario wording as nonblocking. After exact-scope
authorization, broader fixed-candidate replay completes128 actual calls:120 parses,
6 resolutions and2 compositions; four dependent compositions are skipped after
rejected resolution. Only Thai produces both complete reports; gram has repeated
inconsistent focus/competitor identity, and Jinpeng omits one grouped member in
both runs. All128 actual IO records match private trace readback. See the
[broader checkpoint](research/chain-quality-experiment.md#broader-frozen-chain-stability--2026-09-11).

The owner also requests a new brand and delegates choice. Guangzhou 方所 adds20
fresh sources and20 valid parses, but its95-record resolution omits two records,
so composition is not called.41 actual calls,233.991s to failure, not successful
full-report time; all41 private trace records match. Full-chain stability remains
unmet despite healthy provider responses. Preserve frozen findings and prioritize
group coverage and identity handoff, not another prose sweep. See the
[new-brand checkpoint](research/chain-quality-experiment.md#fangsuo-new-brand-full-chain-attempt--2026-09-11).

Latest composition1.5 only adjusts two expression instructions per owner
feedback: exact customer-prose/reference separation and measured wording.
Task scope, input, Schema and other stages stay unchanged. The subsequently
approved four-call1.5 batch passes all existing local checks and private trace
readback. No internal IDs appear in customer prose and the prior definite
positioning assertion does not recur. One Jinpeng summary still attributes an
open appearance to the directed scenario. Retain1.5 as a controlled wording
candidate, not full semantic/runtime approval. See the
[wording checkpoint](research/chain-quality-experiment.md#composition15-wording-validation--2026-09-11).

Composition1.4 is now a separately versioned controlled prose refinement;
open/direct/resolution1.3 remain unchanged. Four exact-context real calls pass
local contracts and private trace readback. Perception is about20% shorter on
average, but only one of four outputs meets both soft length goals. Some text
still overstates "actual" positioning, exposes internal question IDs or loosely
mixes open/directed findings. Retain the bounded improvement, not a full semantic
stability claim. No new model matrix, sampling, webpage or runtime activation.
The [prose checkpoint](research/chain-quality-experiment.md#composition-prose-refinement--2026-09-11)
owns concrete outputs and remaining acceptance observations.

After explicit real-call authorization, the unchanged 24-call grouping/Schema
manifest executed completely. All16 resolutions passed local checks. Grouped
outputs preserved the inspected Thai brand memberships in all four runs; the
assignment interface still split 大头虾 in all four. Composition passed4/4 with
full Schema but only1/4 with bare omission: an extra root field once, point IDs
used as sample IDs twice. No demonstrated latency benefit from omission. See
the [measured comparison](research/chain-quality-experiment.md#schema-and-grouping-cross-comparison--2026-09-10).

The next bounded candidate uses explicit groups for identity and a compact
composition output skeleton with distinct point/sample reference instructions.
Local contracts remain authoritative; no silent output repair or re-grouping by
display name. Eighteen focused tests pass. After exact-batch authorization, all
six follow-up calls passed: four fixed-context and two grouped integration
outputs. Compact input averages17% fewer tokens than full Schema, not a measured
speedup. References and grouping statistics hold; some narratives contradict
their own mention count and remain verbose. Preserve these as visible follow-up
findings, not broad stability claims. No new sampling, webpage, runtime activation
or production changes. Current selected Prompt1.3/default route stays unchanged.

Prompt1.3 unseen-brand validation for 广州泰咀刁 completed all64 calls with no
technical failures/retries: twenty fresh sources and two full parsing/report
passes. First full pipeline213.333s; same-source replay56.664s. Target recognition
is consistent (the contextually matched 泰嘴刁 spelling contributes1/15 at
position7; five directed answers retain target content). Competitor resolution
still splits 大头虾6 into3+3 and 泰爱里5 into4+1, changing the top list. One
named restaurant is filtered in the first pass and retained in the second.
Keep the selected model/Prompt; pause new-brand expansion and inspect the
resolver on one frozen input rather than continue broad sampling or claim
comprehensive stability. See the
[Taizuidiao checkpoint](research/chain-quality-experiment.md#taizuidiao-unseen-brand-full-chain--2026-09-10).

The owner-approved Prompt 1.3 refinement is complete with ten successful real
calls. Both parses split distinct co-listed brands while preserving aliases;
both fixed-input resolutions unify 大成 and 盈科 branches; both downstream
seam passes retain recovered names and correct counts. No new acquisitions or
automatic retries were used. Nineteen previous parses are reused per seam pass,
so this is bounded repair evidence, not a full twenty-sample new-version test.
Retain the candidate and stop tuning the same examples; next is the proposed
广州泰咀刁 full-chain coverage, without reopening a model matrix. See the
[current repair checkpoint](research/chain-quality-experiment.md#co-listed-subject-repair--2026-09-10).

The Jinpeng cross-industry batch has completed 64 real calls without technical
failure/retry: twenty sources, two complete parsing/report passes. First full
pipeline is 216.202 seconds; same-source replay is 63.782 seconds. Both preserve
the observed 2/15 open mentions at positions 7 and 1, consistent with inspected
source presence. All 64 private Langfuse IO/settings/usage records match readback.
Target stability and time passed in that 1.2 batch, not full semantic acceptance:
both passes combine distinct co-listed firms into one row that resolution drops,
and kept 大成/盈科 head-office and branch labels in separate groups. The bounded
repair above addresses those two findings; old outputs remain unchanged.
See the
[Jinpeng checkpoint](research/chain-quality-experiment.md#jinpeng-cross-industry-full-chain--2026-09-10).

Prompt 1.2.0 targeted replay is now complete: eight first-layer calls and two
exact-input 44-record resolution calls. Unsupported gram attribution did not
recur, positive focus/order cases remained intact, and all five 乐凯撒 records
received one name in both outputs. The owner accepts two retained unnamed-shop
records as a non-blocking observation. One output still splits The Pizza Factory
solely by whitespace. That surface-only comparison issue is now corrected
locally and verified against both retained outputs before the Jinpeng batch.
Raw assignments are unchanged; semantic alias grouping still belongs to the LLM.
See the [current targeted design](design.md#current-targeted-identity-repair)
and [measured checkpoint](research/chain-quality-experiment.md#targeted-identity-repair--2026-09-10).

The owner has selected DeepSeek V4 Flash 0731 / thinking off as the main
candidate, with Qwen off as an unactivated backup. Broad model comparison is
closed for this package. The next scope is the
[selected-candidate scale acceptance](design.md#selected-candidate-scale-acceptance),
with executable settings in
[candidate configuration](../../../apps/backend/geo-intelligence/experiments/m4-report-candidate.json).
The four-question/five-platform gram plan, same-source replay and composition-only
recovery simulation are frozen locally. The first launch was rejected before
process creation with zero calls. The owner subsequently explicitly confirmed
the named sampling services, raw/derived replay to Alibaba, private Langfuse
actual IO export and bounded cost scope. The unchanged frozen manifest was
approved and launched as `m4-candidate-scale-uETbW8`; no rerouting or bypass was
used. Runtime activation is still out.
The batch has now finished: 65 real calls with no technical failure; twenty
samples parsed in each pass, baseline pipeline 245.290 seconds, replay 49.242
seconds and composition-only simulated recovery 14.719 seconds. All 65 private
Langfuse generation records match the actual IO/settings/usage readback.
Semantic acceptance is not granted: one source without gram is attributed to
the focus brand in both passes, and competitor canonical names split during
replay. The next action remains a bounded correction within the selected
candidate, not a new model sweep or frontend activation. See the
[scale result](research/chain-quality-experiment.md#selected-candidate-scale-run--2026-09-10).

The owner's latest review accepts approximate platform wording and reasonable
rank-based comparisons as non-blocking observations, not a new semantic gate.
The current bounded package clarifies data-instance output instructions and
shortens report labels/perception with Prompt guidance rather than tighter
rejection thresholds. It adds three-brand coverage: 头家顺/头家夜粥, 互动派,
and owner-confirmed 广州公园前 gram 酸种披萨. The local report will foreground
poor parsing examples and direct model comparisons, with raw JSON secondary.
The eight-call old/new output-suffix comparison has run; it does not demonstrate
a reliable repair. Nine-query coverage uses five retained real answers and four
new acquisitions, then six profiles (54 parses and up to 36 matched second-layer
calls). General output errors do not stop other planned cells. Existing samples
and program contracts are not rewritten to manufacture successful results.
All 102 calls, including the diagnostic, have now executed. The
[three-brand checkpoint](research/chain-quality-experiment.md#three-brand-refinement-and-problem-first-review--2026-09-10)
owns measured results, recoverable-container versus content distinctions,
remaining grouping differences, soft length misses and telemetry gaps.

The owner approves the report-oriented pipeline documented in
[the active design](design.md#approved-report-oriented-experiment):
open/direct single-call content parsing with sample cards and polarity points,
brand resolution with explicit null filtering, program statistics, then full
report composition. Performance assessment and brand perception are separate;
themes retain point references and are counted by distinct sample. No raw
acquisition text, redundant card summaries or full competitor descriptions enter
composition. This is a new experiment contract, not a runtime activation.

The current experiment assets are
[task prompts](../../../apps/backend/geo-intelligence/experiments/m4-report-pipeline.json),
[model settings](../../../apps/backend/geo-intelligence/experiments/m4-model-comparison.json)
and [query matrix](../../../apps/backend/geo-intelligence/experiments/m4-report-matrix.json).
Existing brand-row and chain-synthesis assets remain historical replay paths;
the previously unexecuted 44-call plan is superseded, not resumed.

The bounded matrix includes 陶陶居 and 飞书, each with direct, open recommendation
and needs-based questions. Qwen3.7 and Doubao each sample all six queries once.
Six profiles (Qwen3.8 Flash, DeepSeek 0731 and Hy3, each off/low) parse identical
sources. The original plan allowed up to 108 calls, with valid own-profile
handoffs carried through resolution and composition; the owner-approved
completion below supersedes its early-stop policy and call ceiling.
Analysis uses JSON Object with explicit Schema and temperature 0.6 in all arms;
Qwen3.8 thinking has a documented 0.6 floor. Prompts freeze before sampling and
source review before parsing. No business data or old rejected payloads are used.
Actual IO/settings/usage go to private Langfuse; independent review stays local.

Forty-one focused tests, backend typecheck and build pass. The initial batch
completed 12 acquisitions, 61 parses and 12 second-layer calls. The owner then
explicitly corrected the stopping policy: finish all bounded model cells and
retain invalid outputs as results. A new frozen continuation completed eleven
never-attempted Hy3 parses and twenty matched second-layer calls; four exact
DS-off controls were reused. Cumulative actual calls are 116, without rerunning earlier
requests. Matched components use one fixed DS-off handoff, independently of the
tested profile's first-layer failures; do not claim they are full end-to-end
successes. Failed upstream results never become absence or repaired valid data.
Alibaba DeepSeek is pinned to `deepseek-v4-flash-0731`; Tencent acquisition,
official report eligibility, metric rules and immutable history remain unchanged.

All six profiles now have twelve first-layer attempts and two matched attempts
per second-layer component. First-layer structural acceptance is 12/12 for both
Qwen profiles and DS-off, 8/12 DS-low, 10/12 Hy3-off and 6/12 Hy3-low. Matched
composition accepts both brands for Qwen/DS off/low and neither for Hy3 off/low.
These are not semantic-quality rates or repeatability evidence. Six own-profile
sequential previews are retained separately. The next bounded uncertainty is
Schema-versus-data output instruction and synthesis fidelity, not another broad
matrix or runtime activation. See the [measured checkpoint](research/chain-quality-experiment.md#report-oriented-six-profile-matrix--completed-2026-09-10)
for detailed scope, limitations and incomplete Langfuse reconciliation.

Previous capacity reconciliation remains valid: removing the current-format
eight-point cap accepted 68/72 retained raw outputs offline, restoring ten
count-only rejections without truncation; four Hy3-on shape failures remained.
This was contract reconciliation, not a semantic-quality improvement.

### Previous fresh six-query matrix

The owner authorizes a broader real-query/model/configuration matrix. Six new
queries span dining, coffee, robot vacuums, hotels, collaboration software and
marketing services; assigned Qwen3.7/Doubao samplers produce three answers each.
Prompt 6.3 is frozen before sampling and source expectations before parsing.
All three parsers then use identical whole cleaned inputs and JSON Object mode:
off/0.4 versus on/0.6, twice each. Native on effort is low for Qwen/Hy3, high for
DeepSeek because this model maps low to high. Six acquisitions and 72 parses
finish without retry, resampling, repair, provider failure or profile suspension.

Keep DeepSeek-off/0.4 and Hy3-off/0.4 as the two next candidates; do not select a
unique winner from small latency differences. Their medians are 7.150 and 8.016
seconds with consistent core subject/focus handling in this bounded review.
Qwen-off has a coffee omission and one focus-model-content gap; Qwen-on has
coffee order/omission and generic-provider miscounts. Hy3-on returns non-array
brands in four calls. On profiles are slower, without a uniform quality gain.

Schema acceptance is 58/72: four wrong shapes and ten excerpt-count rejections.
Most count rejections contain useful source content. JSON Object did not send
the maxItems:8 restriction, while the Prompt asks for complete excerpts. Reconcile
that contract/task mismatch before another Prompt rewrite or formal selection;
do not silently truncate useful output or call all rejected results hallucinated.
No Schema change or runtime activation is performed in this batch.

All six sources, 72 actual parser wires/raw JSON values and 80 private Langfuse
observations (7 acquisition + 73 parsing) are verified. Only six independent
sources were tested, not 72 independent examples. Secondary mentions/subbrand
granularity remain separate observations. See the
[fresh matrix evidence](research/chain-quality-experiment.md#fresh-six-query-model-and-configuration-matrix).

### Previous retained-source cross-model comparison

The owner additionally requests the same Prompt on Hy3 through Tencent TokenHub
and DeepSeek V4 Flash through Alibaba. Both use thinking off/temperature 0.4,
provider-native switches and common JSON Object mode. Official Alibaba guidance
lists DeepSeek for JSON Object, not JSON Schema. Actual system/user messages
remain identical; the same local Schema checks results. Prior Qwen JSON Schema
runs therefore remain references, not strictly matched model-only controls.

Twelve calls (three retained sources twice/model) show expected core subjects,
order, focus and substantive source content in both models, with no prior major
failure reproduced. Hy3 averages 5.969 seconds and usually separates excerpts
into points; DeepSeek averages 4.460 seconds but both restaurant outputs keep
multiple ideas in one long array item. DeepSeek once retains a branch suffix.
All twelve wire/identity/Schema/acceptance checks and thirteen private Langfuse
observations match. No retries, fresh sampling, repair or extra calls.

Do not infer that Qwen is intrinsically the cause: its off/0.4 core results were
also usable and format constraints differ. If model attribution is the next
decision, align Qwen to the same JSON Object task before changing Prompt again.
That comparison is not executed here. No runtime switch or second-layer handoff.
See [cross-model evidence](research/chain-quality-experiment.md#63-cross-model-replay-hy3-and-deepseek-v4-flash).

### Previous same-model thinking comparison

The owner replaces the unexecuted 0.5/0.3 temperature plan with two profiles:
thinking low + temperature 0.6, and thinking off + temperature 0.4 (omit
reasoning_effort). Prompt 6.3, Schema, whole cleaned inputs and model are fixed.
Twelve real calls compare three retained sources twice per profile, concurrency
two, without resampling/retry/repair. The two settings are a combined-profile
comparison, not an isolated temperature or thinking causal test.

Both profiles retain the expected subjects/order/focus and useful source content
in all six outputs in this bounded review. Off/0.4 averages 6.811 seconds versus
13.993 seconds for low/0.6; every paired call is faster. Reported total tokens
are 21,365 versus 23,495. Off/0.4 has two extra colon-only list items in one output
that otherwise contains full excerpts, and a branch suffix in another. These
are residual formatting/normalization issues, not missing all content or invented
focus. No prior major subject/content failure recurs in this batch.

Prefer off/0.4 for the next bounded transfer validation, not formal adoption.
Only three retained sources and one focus-present source were tested. There is
no contemporaneous default-temperature control, so the earlier failures' cause
is still unproven. All 12 actual wires and raw outputs are checked; all 13 private
Langfuse observations match IO/settings/usage. No production adapter/route change,
runtime activation or second-layer handoff. See the
[profile comparison](research/chain-quality-experiment.md#63-thinking-profile-comparison-low06-versus-off04).

### Previous 6.3 replay with temperature omitted

The owner requests a small Prompt clarification: brands usually have related
description/evaluation; search their surrounding and later context. focusBrand
controls detail, not whether a brand receives excerpts. Do not turn that normal
expectation into invented content. 6.3 modifies only this task explanation and
removes the focus paragraph's emphasis on empty arrays; Schema still permits
genuine name-only cases. No field/model/guard/retry change or LOCATE-specific rule.

Stop using the ambiguous coffee/LOCATE and child-hotpot cases in this round.
Freeze six calls: two repeats of the original local-q2 punctuation-only failure,
plus retained q3-doubao restaurant content and s2 marketing-company content.
The latter two are not in current Prompt examples. These are retained real
answers, not fresh sampling or a blind benchmark. Existing Qwen Flash low,
concurrency two, actual IO to private Langfuse; no retries/repair/seventh call.
Judge substantive excerpts, source fidelity, focus identity, included-brand
order and obvious category/location miscounts separately.

The six-call batch is now measured: 81.473 seconds and 26,863 reported tokens.
All six wire/basic-schema checks pass, five existing acceptance checks pass,
but this is not semantic acceptance. Both restaurant repeats preserve two named
subjects and substantive content. The original local-q2 second repeat invents
focus rows and duplicates records (rejected by the existing multiple-focus
guard); the company second repeat expands three firms to eleven subjects,
including background places/platforms, and inserts a non-source image URL and
invented descriptions. Both failures are present in raw provider JSON, not
introduced by cleanup/projection. No colon-only excerpt recurs; that does not
establish a net quality improvement. No paired baseline ran, so the Prompt
change is not a proven cause of either improvement or failure.

All seven private Langfuse observations match actual IO/settings/usage. Local
review and exact inputs/outputs are retained in
`m4-brand-unit-replay-4opqh6/input-output-review.md`. Hold formal adoption and
second-layer handoff; no further calls, repair, lexical guard or model change
in this batch. See the [6.3 evidence](research/chain-quality-experiment.md#63-every-brand-receives-source-content-real-replay).

### Previous measured candidate

The [6.2 eight-call regression](research/chain-quality-experiment.md#62-complete-section-worked-example-real-replay)
runs in 154.589 seconds with 43,475 reported tokens. Both group-hotpot outputs
place Aoi fourth and do not create a shopping-centre row, but this source is
example-development material. Child-hotpot still miscounts a category once;
one local sample returns four brands whose mentionContext values are only [":"],
confirmed in raw provider JSON, whereas its repeat contains useful excerpts.
Coffee focus content remains useful, with a combined peripheral brand label
retained as an observation. No blanket stability or example-specific causal
claim. Eight actual wire contents match the existing reading cleanup; thirteen
focused tests/framework checks pass. All nine private Langfuse observations
match actual IO despite a shutdown warning. No extra calls or repairs.

Keep the full-section standard example, but do not activate the candidate or
adapt the second layer around invalid content. The next narrow priority is
actual excerpt completeness and category/subject interpretation, not more
format-normalization experiments, blanket word bans or a new model/Schema.

### Tested example and scope

The owner requests complete source/output formatting for the Aoi example.
Candidate 6.2 preserves the 6.1 task and first two examples, replacing only its
short contrast with the entire original section 3, standard brands JSON and a
separate explanation. The example parses only the section: focusBrand remains
the original 海底捞, absent from this excerpt but present in the full answer.
Expected output is authored from the excerpt, not a provider result.

Replay the same four previously authorized retained sources, twice each, at
most eight Qwen Flash low calls/concurrency two with actual IO to existing
private Langfuse. Input cleaning/Schema/runtime remain unchanged. No acquisition,
retry, repair, ninth call or extra Markdown experiment. 6.1 was not measured;
6.2 is an absolute regression screen, not a causal comparison. The Aoi source
now overlaps example development and cannot demonstrate held-out generalization.

### Previous task refinement and priorities

The owner narrows this iteration to Prompt refinement: no Markdown input
normalization experiment or s-specific filter. Candidate 6.1 keeps the same
Schema, input constructor, AST cleanup, model, focus/attitude instructions and
the two worked examples. Refine only subject/context-role distinction,
first-appearance order that stays fixed while gathering later excerpts, and
plain excerpt strings without layout prefixes. Add a short real Aoi/location
contrast after the examples; food-specific category illustrations stay there,
not in the industry-neutral main rule. No new provider calls in this turn.

Owner-calibrated priority: category/location miscounts and reordered included
brands are the focus. Supplemental brand omissions and the discussed neutral
attitude variation remain observations, not independent blocking thresholds.
Do not turn this tolerance into an instruction to omit all supplemental brands
or change the existing competitor inclusion calculation. Thirteen focused tests
pass; 6.1 behavior still needs live evidence before an acceptance claim.

### Latest measured candidate

The [6.0 real replay](research/chain-quality-experiment.md#60-unified-source-excerpts-real-replay)
completes all eight calls in 127.328 seconds, 36,560 reported tokens. All eight
actual wire contents equal the existing AST-cleaned reading text; raw sources
remain unchanged. Structured acceptance is 8/8, not semantic acceptance.
Focus identity is preserved in six present-source calls and correctly absent in
two calls. Coffee retains useful positive and negative source excerpts. However,
both hotpot-q2 outputs omit the two named representatives (one keeps only the
focus, one stores names under a category row); both hotpot-q1 outputs misorder
Aoi. The first additionally counts a shopping centre and neutralizes an explicit
avoid recommendation. One local-q2 output adds stray s prefixes absent from the
input. Do not accept the current package as stable or a synthesis-ready input.

Retain uniform excerpt arrays experimentally, keep frozen failures for targeted
identity/order verification, and do not add spelling-specific filters or restart
architecture/model changes from these eight calls. No further calls in this
batch, no old-shape conversion, no #41 runtime or frontend integration. Detailed
actual inputs/outputs and diagnostics remain local; telemetry readback is tracked
in the research record.

### Tested scope and authority

The owner approves uniform per-brand mentionContext bullet excerpts, richer
source content for focusBrand, no separate targetDescription, no brandContext,
and source-faithful extraction rather than invented elaboration. Candidate 6.0
implements the current experiment with focusBrand/question/cleaned content and
displayName/isFocusBrand/attitude/mentionContext[]. Existing AST-based reading
cleanup is unchanged; original sampling bytes remain intact. No quote offsets
or exact-substring gate is added. Empty mentions are allowed for name-only rows.

Architecture boundary: keep the new BRAND_MENTIONS result in the existing
controlled-validation owner. Legacy inspectors remain only for historical data;
the new output cannot be parsed by the old synthesis handoff and is never
silently converted into summary/targetDescription. Program-derived first order,
focus index and competitors are local diagnostics. No #41 runtime integration,
database/queue/frontend/current-spec change. Rollback is the previous experiment
revision; no data migration. Later synthesis adaptation remains a separate step.

Freeze four retained real sources, two repeats each, at most eight Qwen Flash
low calls with concurrency two. No acquisition, synthesis, retry, repair or
within-batch changes. Provider/wire/basic-schema failure stops the batch;
semantic/acceptance errors remain visible results. Only actual IO/settings/usage
goes to existing private Langfuse. This is an absolute candidate screen, not
an improvement claim against a concurrently measured baseline.

The execution launch was rejected by automatic safety review before process
creation because this four-source payload/destination scope needs explicit
confirmation. Zero provider calls or uploads occurred; no alternate path was
used. Ask the owner to authorize these four retained contents to the existing
DashScope endpoint and actual IO logging to private Langfuse before retrying.
40 focused tests/typecheck and framework validation pass. This is local
preparation only, not semantic or synthesis acceptance.
The owner then explicitly replies "可以放心做真实的测试" to the payload-gate
explanation. Resume only the same four-source, eight-call Qwen/private-Langfuse
scope after regenerating its frozen plan; do not broaden it.

### Previous task-first preparation

The owner requests a brand-identification assistant with an explicit task order:
recognize brand-level subjects, merge all mentions in first-appearance order,
summarize every brand and preserve more complete detail for the focus brand if
present. Candidate 5.8 implements this wording and replaces fictional examples
with traceable excerpts from two retained natural samples. Worked outputs are
authored expectations, not provider results. Input keys, output structure,
validation limits, model and projection remain unchanged; Schema descriptions
align all-brand summaries and focus-brand detail. No new real calls in this turn.
40 focused tests/typecheck pass; this verifies preparation, not semantic quality.
The two example sources are development material, not held-out validation.
Review the task and examples before measuring 5.8; do not attribute 5.7 outcomes
to it or treat Prompt wording as the proven root cause.

### Latest measured candidate

The [5.4/5.6/5.7 comparison](research/chain-quality-experiment.md#57-neutral-input-and-schema-descriptions-comparison)
completed twelve calls: category core correctness is 1/2, 0/2, 2/2 respectively;
four real merchants with no extra placeholders in the absent-target source is
2/2, 2/2, 1/2. The 5.7 repeat preserves the four merchants and does not invent
target exposure, but adds two generic placeholders as neutral competitors.
Retain the concise task/content naming as an experimental direction, not a stable
Parser. Preserve this concrete failure for focused subject-identity work without
adding name-specific filters or changing unrelated attitude/field structure.
41 focused tests/typecheck pass; thirteen private Langfuse observations match
actual IO/usage. 199.793 seconds is comparison time, not whole-evaluation latency.
No synthesis, fresh sampling, frontend, activation or self-competitor fix.

### Tested configuration and scope

The owner requests a concise identification/parsing task without evaluator role
framing or unnecessary interference across the whole Prompt. Candidate 5.6
consolidates instructions into input, subject identification and output meaning;
reduces three overlapping examples to two covering identity/order/target content
and categories/attitude/absence. Input, Schema, model and program remain unchanged.
This supersedes the unmeasured opening-only 5.5 preparation. The owner also permits
Schema adjustment: 5.7 keeps the concise task and changes owner-local field
descriptions (subject name, content, overall attitude, target points), removing
internal marker wording. The owner further requests neutral input naming:
rename answerText to content in the task constructor, instructions and examples;
the whole reading text and other context remain identical. Output fields,
validation limits, enums and projection are unchanged. The third arm measures
the input-name/Schema-description package, not either one's isolated effect.
Freeze 5.4/5.6/5.7 on two retained sources, two repeats each,
twelve calls maximum at concurrency two, without resampling or automatic retry.
Provider/wire/basic-schema failure stops the batch; semantic/acceptance errors
remain reported comparison outcomes. Results are reported above by source, not
pooled into a general stability rate.
Do not infer that evaluator framing caused the observed hallucinations.

The [single-example 5.4 comparison](research/chain-quality-experiment.md#54-single-example-comparison-partial-benefit)
preserves all 5.2 instructions and the full Schema/input/model, changing only one
appended worked example. Four repetitions per arm/source show local absence
benefit: candidate 4/4 retains real subjects without target placeholders, baseline
1/4 does. Category core correctness is still 1/4 in each arm; candidate includes
both category miscount and outright other-brand omission. Do not pool these into
a misleading overall success rate or count omission as correction.

Keep 5.4 as the last measured partial candidate, not a formal-ready Parser. Stop
editing the observed absence handling for now; category interpretation still
requires separate evidence before downstream acceptance. 31 focused tests and
typecheck pass, 17 private Langfuse observations match actual IO/usage. No fresh
sampling, synthesis, frontend, parameter or production changes in this comparison;
the known self-competitor program gap remains unfixed.

### Previous combined prompting package

The [5.3 combined prompting comparison](research/chain-quality-experiment.md#53-instruction-package-comparison-rejected)
did not show benefit: both candidate category outputs remain wrong, whereas the
baseline gets one of two correct; both versions avoid the old duplicate/absence
failure in the other source. Eight calls are structurally accepted, not
semantically successful. Clearer text and field descriptions are not proof of
better behavior. The task-owned 5.3 changes have been restored to the unchanged
5.2 baseline; the exact tested configuration remains in captured evidence.

5.2 is still a failed full-chain diagnostic baseline, not ready for activation.
Next isolate one prompting constituent with the same source and baseline before
further downstream work, rather than simultaneously expanding instructions,
examples and Schema descriptions. No new model/Agent/field structure or frontend
change. The self-competitor program gap remains unfixed. Local IO is complete;
two Langfuse call observations were not found in bounded readback.

### Previous full-chain failure

The [5.2 fresh-answer attempt](research/chain-quality-experiment.md#52-fresh-answer-chain-stopped-before-synthesis)
stopped after 12 Provider-successful calls: the eighth parse contained duplicate
brand rows and was rejected. Category names, unnamed placeholders and an absent-
target status record also recur. All four planned synthesis calls are NOT RUN;
there is no successful full-chain result or report. 265.297 seconds is the failed
batch duration. Raw JSON reproduces the duplicate rejection offline; no program
repair or additional model call was used to bypass the frozen stop condition.

Hold 5.2 as a diagnostic baseline, not formal-ready. First isolate output-unit
guidance and the target-matching step on the exact retained failures, then resume
downstream validation from saved sampling rather than repeat broad acquisition.
These next adjustments are hypotheses, not implemented fixes. No new model,
Schema field structure, Agent, frontend or runtime activation; the separate
target-as-competitor program gap remains unfixed and unexercised this batch.

### Previous same-source comparison

The [5.1/5.2 Prompt comparison](research/chain-quality-experiment.md#category-name-and-absent-target-prompt-comparison)
completed eight identical-input calls. Both 5.1 category outputs contain generic
types; both 5.2 outputs retain only concrete named subjects, correct target order
and useful content. Both versions omit the absent target in both repeats, so the
historical placeholder is not proven eliminated. The candidate changes only the
subject/target instructions and existing example; inputs, Schema, model and
downstream code stay fixed. Thirty focused tests and backend typecheck pass.

Keep 5.2 for one bounded full-chain validation instead of more same-source rules.
No new Agent, model, Schema, frontend or runtime activation. The known downstream
target-as-competitor code path remains unfixed and must not be credited to this
source-level improvement. This developer comparison does not prove general
stability or formal report acceptance.

### Previous fresh 5.1 result

The [fresh 5.1 chain](research/chain-quality-experiment.md#fresh-branch-and-absent-target-chain)
completed 16 calls at 0339de8 in 240.261 seconds. Naturally absent targets and
brand-plus-branch answers were covered without source edits; all present target
positions and null target states agree. No separate branch rows occurred, but
category names still reach one report's competitors and an absent-target repeat
adds a neutral target placeholder to competitor candidates. Structure success is
not full semantic acceptance. Both narratives generate usable broad conclusions;
17 private Langfuse observations match actual model IO and usage.

Keep 5.1 frozen as the baseline. Next limit the Prompt-example comparison to
concrete names within category-headed answers and absent-target omission; no new
model, Schema, Agent, resampling loop or frontend activation. Do not reframe
exposure absence as negative product/service facts. The existing target-as-
competitor program path remains an integration gap, not repaired by these calls.

### Previous branch-unit replay

The owner confirms branches should not become separate brand records. The
[5.1 Prompt-only replay](research/chain-quality-experiment.md#brand-level-branch-replay)
now passes six retained-source calls: all four restaurant parses omit extra
branch/mall rows while preserving independent merchants; appliance identities,
target positions and useful content remain. Keep this bounded candidate, not a
claim of general stability or downstream repair. Same input/Schema/model; no
sampling, synthesis, automatic retry or frontend activation. Thirty focused tests
and backend typecheck pass. Next validate the subject boundary on small fresh
coverage and then the complete call chain; the known target-returning-to-competitors
code path remains an explicit integration gap if bad records recur.

### Previous full-call-chain result

The owner clarified the next gate as full real API calls, not frontend/runtime
integration. The [frozen current-candidate test](research/chain-quality-experiment.md#current-candidate-full-call-chain-check)
has completed at 596a1f5: 16 successful calls, two brands, four new open-question
answers, eight parses and two composed previews, 272.709 seconds. Target identity
and position agree in repeats and appliance grouping works. Restaurant first-pass
parsing wrongly adds location-background malls and a target branch; the branch is
correctly renamed to the target but still counted as a competitor. This semantic
failure blocks calling the whole candidate stable, despite successful structures.
Next isolate subject-unit interpretation and the target/competitor handoff gap,
without blacklist rules, extra Agents or frontend activation. Log readback remains
incomplete after an observation-count mismatch and two connection timeouts. This
small single-platform batch is not 4×5, formal report or recovery acceptance.

### Guidance refinement entering that test

The owner considers current interpretation broadly usable and requests only a light
refinement: one or two flexible article/media directions can highlight strengths,
address concerns or improve GEO information around weaknesses. Do not impose a
single customer-choice framework or turn minor topic preferences into repeated
repair gates. Narrative 1.3.1 changes only that paragraph and its existing example;
first layer, handoff, Schema, model and task structure remain unchanged. This small
wording change received local example/contract verification, not another standalone
paid comparison. It was included in the bounded overall-report validation above;
that run is not isolated causal evidence of wording improvement and does not change
formal acceptance requirements.

### Previous second-layer comparison

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
