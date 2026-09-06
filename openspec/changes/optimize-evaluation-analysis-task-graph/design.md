# Design: Evidence-led Evaluation Analysis

## Decision state and owners

Status: experimental alignment, no selected runtime topology. The owner's
2026-09-05 feedback supersedes selection of two tasks before real comparison.
Baseline: `main@ddadf77`; PR #48 at `2905937` is an unaccepted reference.

#39 owns end-to-end acceptance. #41 owns synthesis semantics and customer
quality. #42 owns the bounded comparison needed to choose task boundaries,
then execution, recovery, timing and progress. #32 remains completed; Parser
experiments here do not activate changes. Route a new Parser implementation
to an explicitly owned follow-up; reopen #32 only for failed original acceptance.

## Observed chain and falsifiable hypotheses

| Stage and executable owner                             | Observed seam                                                                                                           | Discriminating check                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Sampling: objectivity profile and acquisition adapters | Natural answers are the measurement                                                                                     | Freeze query, answer and policy; extraction instructions must not contaminate sampling |
| Parser: policy, model contract, process coordinator    | Prompt combines extraction, classification, quote copying and prose; input still uses two compatibility characteristics | Compare positive staged Prompt with identical input and Schema first                   |
| Accepted evidence: projector/canonical contract        | Recovery can discard detail or replace unreadable prose                                                                 | Assess raw output separately from projection, including lost useful evidence           |
| Main synthesis: policy                                 | Full frozen Brand and canonical samples expose irrelevant storage identities and mixed field roles                      | Compare a purpose-specific projection preserving source evidence                       |
| PR #48: model reference projection                     | Findings and observations omit original evidence spans; brand candidates contain names without adjacent source context  | Restore minimal source context before attributing failure to topology                  |

These are code facts and hypotheses, not proof that one field caused a historical
failure. Missing Brand fields do not justify giving extraction every customer
claim: the answer stays the fact source; profile facts identify the subject.

## Prompt and context contract

Each task states role, reader, input authority, decision sequence, output field
purpose, uncertainty behavior and completion criteria. Schema owns structure;
instructions explain semantic work. Examples illustrate proven ambiguities and
never copy a holdout answer. Raw answers/excerpts are data, not task instructions.

Parser extracts supported facts first, then writes a concise reading from those
same facts. It distinguishes what the platform says from verified business truth.
The experiment requests no exposed chain-of-thought, critic or metric change.

Synthesis receives deterministic performance, distinct question/platform scope,
observed claims with short resolvable source excerpts, and brand-name candidates
with context. Generated card prose cannot replace evidence. Compression preserves
negation, attribution, qualifiers and contradictions; token reduction is not a Gate.

## Staged comparison

See [protocol](research/chain-quality-experiment.md) and
[primary-source implications](research/prompt-context-source-brief.md).

1. P0/P1 Parser: same four fixtures, input, Schema, model, effort and acceptance;
   change only instruction. Review raw quality and projection separately.
2. S0/S1 synthesis: current-main versus coherent improved-context one-call
   packages. Explicitly report Prompt/context changes as a package comparison.
3. S1/S2 topology: same accepted evidence and narrative criteria, one-call versus
   relationship/narrative tasks. Test whether prose needs the grouping output.
   If so, evaluate the dependency rather than assume parallel independence.
   Analysis-then-writing remains available for an evidenced grounding failure.

Freeze each batch and its authority. No automatic Cartesian sweep or tuning
until a fixture passes. Examples are not holdouts. Small successes establish a
candidate, not reliability statistics or a production SLA.

## Runtime choice after evidence

| Candidate                                 | Benefit to verify                             | Cost or failure to verify                                    |
| ----------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| One synthesis call with adequate evidence | Lowest call count and integration change      | Coupled semantic failure and full-request retry              |
| Parallel relationship and narrative       | Focus, independent retry, overlapping latency | Two calls, prose/group consistency and component persistence |
| Dependent analysis then writing           | Explicit evidence-to-prose handoff            | Serial latency, information loss and another contract        |

If split wins, task-kind attempts and one GEO-owned component table remain
candidates. Before implementation settle input identity, accepted-result reuse,
duplicate/late delivery, task-local retry, atomic assembly and staged uniqueness
migration. Schema-aware legacy mode is the rollback candidate; an arbitrary old
binary is unsafe after parallel rows exist. If one call wins, add no such tables.

Reuse Product Outbox and current delivery initially. Prior global concurrency
five, low/medium split, 90/120-second timeouts and four-call cycle ceiling are not
selected policies. Quota and Hy3 entitlement require current evidence. The
twelve-minute historical run is not a matched control for new queries or models.
The existing BullMQ source brief informs later design, not an instruction to split.

## Delivery and truthful progress

Offline contracts and model probes can precede integration; they do not close
#41. #41 and #42 deliver compatible slices through main, or a true linear stack
if needed. Close customer quality only after the selected contracts reach the
actual report path. No reverse native blockers or extra Performance Issue.

#43 consumes a stable server-owned projection. Accepted answers, successful
analyses and terminally unavailable positions remain distinguishable. A failed
position cannot imply successful analysis. Exact names remain a later contract
decision. Metrics, 17/20, immutable v3 history and Notification ownership stay fixed.

## Evidence-first Parser experiment after the P0/P1 failure

Both frozen instructions returned readable prose but empty extraction fields on
P01. Prompt-only revision has not demonstrated a repair. The next candidate is
an experimental model contract, not a production change or reopening of #32.

The [candidate](../../../apps/backend/src/ai-execution/controlled-validation/m4-parser-evidence-first.ts)
represents an unmentioned target as null, and a mentioned target as one object
containing displayed forms, nonempty mention/position evidence, position, role
and observations. Customer prose follows the records. This removes the specific
representable combination of mentioned=true/position=2 with empty proof, while
preserving valid no-mention behavior. It cannot prevent false absence, omitted
competitors or fabricated quote content by structure alone.

The experiment reuses current field semantics and maps only names and known
constants into current model @5, then invokes the unchanged projector/domain
acceptance. No program-supplied quote, rank, new runtime guard, migration or
application import is introduced. Unknown exact evidence still fails. Coverage
is intentionally limited to open questions; no direct-question support is claimed.

This is a Prompt plus interface package comparison, not proof of a schema-only
effect. The real route accepted the nested contract with target=null in the
first natural-answer package; its nonempty target branch remains unverified by
real calls. Unit tests exercise both branches, absent proof, invented proof and
current fixture fidelity.

The owner-authorized real-chain package started from the exact public-business
Query accepted in #26, obtained one new natural Qwen answer, and compared current
P0 with this evidence-first candidate against that identical immutable answer.
Keep the acquisition response, parser task, raw parser output and projection
linked by content hashes. This is not a new Brand/Query verification or a full
4x5 run. The maximum is one acquisition and two Parser requests; no other platform,
business database or synthesis call. Transport/auth failures stop the package;
semantic rejection is reviewed per arm without automatic retries.

The [recorded result](research/chain-quality-experiment.md#natural-answer-chain-and-langfuse-readback--2026-09-05)
rejects both outputs for quality despite code acceptance. An exact quote alone
does not establish its subject or a candidate's role. P0's non-target reasons
survive into synthesis-consumable observations; P2's null target avoids that
combination but does not ground free-text explanation. Next acceptance must
cover these relationships before adding rules or selecting topology. Keep the
provider answer as the observation, brand context as identity information, and
the parser's interpretation as a derived claim; do not promote one to another.

## Subject-grounded instruction comparison

The owner approved continued source-level iteration on the retained real failure.
P3 changes only the instruction of the frozen P2 model contract: identify the
subject and entity role before recording an observation, preserve source scope,
and write the card from the target record. No new relation schema, program
blacklist or runtime guard is added. Existing evidence-first construction and
projection remain the only experiment interface; current Parser stays untouched.

Compare this small reversible change before a richer entity/relation interface:
the former tests whether clearer field responsibility suffices; the latter adds
contract and projection complexity and remains conditional on a demonstrated gap.
The named provider API, route and strict Schema are unchanged, so reuse the
current source brief and actual route evidence rather than re-audit the SDK.

Freeze P3 before new sampling. First run P3 once on the retained natural answer;
reuse the P2 result as a non-contemporaneous quality baseline, not a latency
benchmark. If source attribution, candidate role or customer prose still fails,
stop and review without editing the Prompt in the same batch. Only if that case
passes, acquire one independent public coffee-recommendation answer, then run
P2/P3 once each on it. Maximum four calls, Qwen only, low parsing, no fallback or
automatic retry. A new open test question is not approved product Query output;
no Brand/Amap/Query-generation or customer report claim follows from it. If the
answer does not mention the preselected target, preserve absence and report the
positive branch unverified instead of resampling until it does.

Review before execution: ready for this isolated Prompt-only experiment; not
ready for runtime activation. Main runtime, specs, migration, source ownership,
telemetry defaults and #49 mirror publishing are outside the write boundary.
Holdout output is not a Prompt example. No success-rate or topology claim follows
from one retained case and one independent answer.

## Input ablation and diagnostic-view slice

The owner approved proceeding with the input audit's separated plan. Keep this
slice in #42's controlled experiment, not the production telemetry projection or
#49 mirror. Present the already captured sanitized Chat Completions body rather
than maintain another request builder: messages become the generation input;
request controls/Schema and hashes become metadata. Generation output is the
model output; a separate span records the current program projection. Mask each
serialized message independently, omit content by default, and isolate view/
export failure from Provider and semantic results. Do not rewrite old traces.

For context testing, full and minimal variants share P3 instruction, P2 Schema,
answer, question and target name. Minimal retains companyName, questionKind,
question and originalAnswer, removing the five industry/region/characteristic
fields. This is a diagnostic ablation, not an accepted new runtime input.
An independently scheduled two-call pair on the retained public answer gives a
contemporaneous baseline; one call per arm, no acquisition, retry, fallback or
Prompt/Schema change. Transport/identity/structure failure stops; both planned
semantic observations are reviewed without treating known P3 defects as fixed.

Readiness: ready for the bounded display/input experiment. The test seam proves
view-to-transmitted-body equality, input isolation and masking. A single absent-
target answer cannot establish alias disambiguation or broad minimal-context
adequacy; preserve those gates before adopting input reduction. A richer generic
logging layer or global metadata migration is not justified by this slice.

## Confirmed brand-subject direction and P4 scope

The owner confirmed task-relevant context per Agent layer and brand-subject
extraction in the first Parser: no invented unnamed teams, and a concise brand
instead of a branch-decorated display name. This does not make either prior full
or minimal context universally correct. Keep full input fixed for the next
comparison to isolate the new output package; revisit context by task acceptance,
not by a smallest-field-count rule.

P4 separates short displayName from original observedForms and full source
evidence. Clearly separable branch/store decoration may leave the display name,
but the original scope remains in quotes. Intrinsic name words, uncertain names
and independent brands are not mechanically stripped or merged. A team with a
clear brand yields that brand; no-name teams/places/categories yield no invented
entity. Named parent/partner brands remain scoped mentions unless themselves
recommended. This is per-answer cleanup, not cross-answer entity research or
#41's final grouping decision.

Current competitor metrics consume other-brand role and recommendation position
in evaluation-report.policy.ts, so keep these fields and verify that affiliation-
only mentions do not become recommendations. P4 changes instruction and generated
field descriptions together; it is a coherent package, not a schema-only causal
test. All fields, constraints, target proof rules, metrics and the final projector
remain unchanged. No program suffix stripper, fabricated quote or runtime route
is introduced. Unit examples verify representability, not LLM quality.

Pre-execution review: ready for a maximum-three-call controlled package. First run P4 on
the retained public answer; if semantic review fails, stop. If it passes, acquire
one independently frozen public coffee-recommendation answer and parse it once
with frozen P4. Preserve no-mention if it occurs; do not resample for a preferred
outcome. Use the actual-message Langfuse view and separate projection/review.
No #32 reopening, #41 implementation, #49 publishing or production activation.

### Current result and next responsibility review

P4 stopped at its first false-target rejection. The separately frozen explicit-null
control restored target absence and short brand labels in one observation but
still failed semantic quality. Neither package is ready for runtime. See the
[results](research/chain-quality-experiment.md#brand-subject-results--2026-09-05).

The next decision is about responsibility, not additional organization-name rules:

| Layer | Relevant context and work | Boundary to retain |
| --- | --- | --- |
| Natural acquisition | Frozen customer question and objectivity policy | Do not inject target/profile facts to steer the measured answer |
| Single-answer Parser | Original answer, question scope, necessary target identity; recognizable brand subjects with exact local evidence | No invented unnamed teams, external company enrichment or cross-answer grouping |
| GEO program | Source text, derived records and current metric policy | Resolve exact citations, protect accepted facts and compute metrics; never fabricate semantic evidence |
| Synthesis, owned by #41 | Accepted records, resolvable supporting context and deterministic metrics | Cross-answer identity/relationship decisions and faithful customer expression; not a substitute for missing source evidence |

This is a review frame, not a new accepted runtime interface. The consumer audit
below selects an isolated evidence-handoff probe before moving role/position or
prose to another Agent. Full context remains only a frozen control, not a
prescription to give every downstream Agent all nine fields.

## Output-first responsibility audit and selected next probe

The owner approved deriving task boundaries from final required content. Current
consumers at `57d5c54` establish the following constraints; `main@975f2d2` has the
same Parser, metric, synthesis-input and report-projection behavior.

| Final need | Current source and consumer | Consequence for task design |
| --- | --- | --- |
| Target mention, index and typical position | [metric policy](../../../apps/backend/src/geo-intelligence/domain/evaluation-report.policy.ts) consumes mentioned and the open sample's top-level position, not targetRole | Keep local target identity/order judgment distinct from other-brand recommendation eligibility; do not change the formula |
| Other-brand names, frequency and position | Same policy filters roles; [report document](../../../apps/backend/src/geo-intelligence/domain/evaluation-report.document.ts) aggregates grouped mentions | A brand's existence, recommendation role and source order are different facts; source line IDs never become candidate ranks |
| Brand impressions, conditions and broad guidance | [synthesis input](../../../apps/backend/src/geo-intelligence/overall-synthesis.policy.ts) consumes classified observations and exact anchors | Keep source-supported subject/claim/qualifier together; derived card prose must not replace that evidence |
| Sample card and original-answer highlights | [public projection](../../../apps/backend/src/geo-intelligence/presentation/evaluation.dto.ts) uses cardInterpretation directly; [highlight projection](../../../apps/backend/src/geo-intelligence/domain/evaluation-report.projection.ts) uses anchors/polarity | Prose has a real customer consumer and cannot simply be dropped; quoting is a separate deterministic handoff need |
| Cross-answer brand grouping | Synthesis consumes all otherBrands, including mention-only records, and observedForms | First layer supplies recognizable subjects and source forms; #41 groups across answers without company-master research |

The [synthesis repository](../../../apps/backend/src/geo-intelligence/infrastructure/postgres-evaluation-synthesis.repository.ts)
currently hands over semantic records, not the complete original answer. A lost
qualifier cannot reliably be recovered downstream. Conversely, feeding the whole
raw answer and every stored field to every task is not yet justified. Keep one
owner of immutable source text and pass only sufficient, resolvable context.

Three candidate changes were considered: (a) retain current quote-copying with
more wording, (b) let the model select source ranges and the program restore exact
text, (c) split identity, judgment and prose into additional calls. The observed
Markdown-copying failures make (b) the smallest discriminating probe. It changes
one responsibility—mechanical source reproduction—without transferring brand
meaning, role, position or prose, selecting a runtime topology or adding a call.

P5 reuses P4 1.1.0 and its constraints. The full answer is represented once as
ordered text lines; every evidence span becomes startLine/endLine. Program-owned
offsets resolve those references against the immutable answer, preserving interior
whitespace, Markdown and line endings. Existing edge whitespace normalization,
quote lengths, counts and final canonical acceptance remain in effect. Invalid,
reversed, empty, oversized or unresolvable ranges reject instead of fuzzy recovery.
No program-selected semantic range, name, role, rank or customer sentence is added.

Readiness for this isolated probe: no datastore, public contract, Queue/Worker or
new external interface; same Qwen strict route and existing diagnostic exporter.
It is invoked only from a frozen local experiment, has no retry/fallback, and
cannot accept business records. Rollback removes only experimental files. Source
reference identity remains sample-local and is not a cross-sample evidence ID.
The current spec and accepted history stay unchanged; runtime adoption would
require an explicit Parser owner, compatibility/integration evidence and approval.

### Result and remaining semantic decisions

P5's one real call resolved all seven selected source ranges, but is not approved
as a complete Parser. Shared prose-valued observedForms made the current name
deduplicator collapse WPP/宏盟. Changing only those two forms to their individual
literal names restores both in an offline replay; source selection did not need
to change. All roles remain COMPARED, so eligible competitor occurrences remain
zero. The response's uniform role fails to distinguish conditional choice from
affiliation-only mention even though the corresponding source context is intact.

The next bounded design must distinguish an individual source name from a
relationship-bearing evidence span, and an offered choice from incidental or
excluded mention. The raw word "compare" is not by itself an eligibility policy.
Use the existing final-product and metric owners to define that work; do not
silently count every COMPARED item, rewrite accepted history, or use a suffix
filter as entity resolution. Whether separate calls improve these judgments
remains unselected. Retain source-reference handoff as a candidate and add
independent/positive-target real evidence only in a newly frozen package.

## Identity and recommendation meaning — P6 bounded package

The owner approved continued task/meaning refinement and real testing. Retain P5
source selection, its full input, structural constraints and final projector.
P6 changes only the instruction/field-description package: name forms identify
one brand, while source ranges retain relationship context; roles describe whether
the answer offers that brand as a choice, not whether a literal verb appears.
The current metric policy and its eligible-role set stay unchanged.

A recommendation can be phrased as a suggestion to compare or consider a provider.
An additional material precondition belongs to conditional recommendation; a name
used only as a benchmark, illustration, exclusion or affiliation is distinguished
from an offered choice. This aligns existing fields to their consumers rather than
promoting every comparison into a recommendation. Unknown real-world affiliation
or name identity is not investigated. Source names and evidence are different units.

No new entity/role enum, alias database, classification guard, new Agent or runtime
interface is warranted yet. P6 is composed at the existing experimental task seam;
removing it leaves P5 and application startup unchanged. The source bridge still
only restores evidence and cannot repair wrong names, roles, ranks or prose.
Existing same-route/strict-Schema source evidence is reusable; no new SDK/API or
Provider capability is assumed.

The next manifest is a four-call coverage package, not continuation of a stopped
batch: P6 on the retained marketing answer; one new natural answer to the already
frozen Shanghai Jing'an coffee question; then P5 and P6 on that identical new
answer. Freeze all instructions before acquisition. Meaning failures are recorded
per planned arm without tuning; transport, identity, structure/reference or code-
acceptance failure stops remaining calls. Never resample to force target presence.
This finally tests transfer beyond the retained answer without presuming success
there or estimating a production success rate. No runtime activation follows.

### Transfer result and next task-load question

The four-call package completed, including an independent natural answer with
target presence. All requests passed code acceptance, but all three Parser
outputs failed independent semantic review. P6 did not establish whole-output
superiority: the retained failure persists; on the new answer it removes a false
target-store competitor but omits another explicit brand, changes an evidenced
position and infers coffee quality from an office-use recommendation.

This rejects P6 as a sufficient holistic Prompt/description repair, not all
one-call solutions. The next bounded comparison should test task load at the
existing experimental seam: first identify complete independent subjects and
source-supported statements/qualifiers, then use that evidence for role/position
judgment and target expression, versus a frozen one-call baseline. Both stages
must still jointly provide the entire final Parser outcome; no metric field is
silently removed, and a first-stage omission cannot be concealed by final prose.

Freeze the next interfaces and call ceiling before execution. Use both retained
answers so absent and present targets remain visible. Test loss at the handoff,
unsupported additions, end-to-end quality, total cost/latency and failure recovery;
do not assume splitting reduces either errors or latency. No new runtime table,
queue, dependency, critic, public contract or accepted topology is selected here.

## P7 source-inventory and judgment experiment

The owner approved the next bounded task-load comparison. The first task sees
the complete answer lines plus question and target identity. It returns structure,
target name/evidence or absence, and independent other-brand names/evidence; it
does not assign roles, positions, observations or customer prose. The second task
receives that proposal and only the selected original lines, with original line
numbers. It produces the complete existing P6 output, including all metric facts
and target expression. Original text, not the first proposal, remains the source.

Two handoffs were considered: full answer plus inventory, or selected evidence
plus inventory. The former preserves context but largely repeats the full task;
the latter actually tests narrower responsibility and context, at the risk of
losing qualifiers/order/subjects. Choose the latter for this experiment and score
first-stage coverage separately. A final improvement cannot erase a first-stage
failure, and the consumer must not invent unavailable context or claim a full
source reread. No requirement is removed merely to make the split pass.

Reuse P6 names, per-span constraints and other-brand capacity. Target inventory
is context for later observations, not merely mention proof: its range count is
bounded by the existing target-observation capacity so it can carry scattered
positive/negative conditions. Program restores source exactly, validates only
structure/references/literal name grounding, and passes source text once. It never
infers names, roles or positions. Consumer evidence outside the lines it saw fails
before the unchanged final projector. Mechanically valid inventories are still
unaccepted model proposals; semantic omissions and misattribution remain reviewed.

The isolated module has no runtime import, persistence, business write, public
contract, scheduler or automatic retry. Invalid extraction skips its dependent
judgment, while the other frozen case remains independently useful. Transport or
model-identity failure stops the batch. Rollback removes only experiment assets.
Existing strict-Qwen and diagnostic-source evidence remains applicable; changing
model/endpoint/mode would require a new check. Runtime topology stays unselected.

Pre-call review exposed a visibility leak: checking raw line references alone
still allowed the existing full-source projector to recover a name from an unseen
line. The experimental wrapper now requires names grounded in their visible
evidence before projection and checks final anchors against the exact supplied
text/occurrence pairs, including final name grounding. This rejects hidden-source
recovery rather than changing runtime recovery or silently repairing the proposal.
The reproduced failure and a hidden target-name augmentation case are regression
tests; no Provider call preceded this correction.

### Observed boundary and offline correction

The frozen batch completed five calls; its sixth judgment was skipped. The
negative split has a complete result but fails role/condition fidelity despite
those qualifiers being visible, at higher total token cost. The positive
inventory covers the target and all five other brands, but the original guard
mistakenly requires every alias in that record's own ranges. `Manner大店` is absent
from its own record but present in line 69 selected by another record. All tasks
consume the same selected-line union, so record association is not a visibility
boundary. The corrected guard requires every form in the visible union and at
least one own name in each record's evidence. Exact final anchor whitelisting and
hidden-source rejection remain unchanged. Literal visibility does not prove
alias identity or semantic entailment.

Offline replay now constructs 45/69 visible lines, but the omitted negative
condition at line 34 and table headers at 59–60 remain real context losses. The
original rejection is immutable and no dependent model call ran after correction.
The [experiment record](research/chain-quality-experiment.md) owns exact results.

Next isolate two uncertainties: which structural/conditional context a consumer
needs, and whether a narrow judgment task handles relationships correctly when
that context is complete. A selected quote is not necessarily a complete semantic
unit. This directs the next protocol; it does not yet justify another abstraction,
Agent, model switch, runtime topology or extension of the ended batch.

### Full-source control — current experiment boundary

The 2026-09-06 owner confirmation supersedes building a more elaborate clipping
handoff. Reuse the existing experimental module: both final tasks receive full
answerLines, companyName, question and questionKind. They have identical Prompt,
Schema and final source-reference projector; the split arm alone adds the raw
inventory proposal from the existing first task. This is a P6-derived aligned
baseline, not the byte-identical historical P6 request. Profile fields are absent
from both arms. One short shared instruction permits faithful explanatory
paraphrase while keeping program-restored citations exact.

Inventory shape, range validity and capacity are checked, but its name spelling
and coverage are semantic review inputs, not additional rejection gates. Unlike
the prior clipped task, the consumer sees every source line and can correct the
proposal. Both final arms use the same existing projector, including its recovery;
raw quality and any recovery/loss are recorded separately. The old clipped
experiment and its regression tests are preserved, not silently reinterpreted.

Readiness: owner-local reversible experiment, no new dependency, public contract,
runtime import, persistence or retry. Existing external-route evidence remains
valid because model, endpoint, strict mode and adapter are unchanged. The smallest
checks are arm equality except inventory, full source retention, no lexical
inventory gate, valid range enforcement and existing projection regressions.

All six planned calls completed. Full source did not make the inventory/judgment
split useful: the negative output substitutes line numbers for recommendation
positions, and the positive output drops four brands already present in inventory
and source. Costs and serial time are higher in both cases. Stop advancing this
split; single-call remains the simpler working baseline but is not quality-accepted.
This result supersedes further context-clipping design, not the unchanged runtime.
The [experiment record](research/chain-quality-experiment.md) owns the evidence.

### Single-call worked examples — current probe

Stay at the existing full-source task seam. Replace only instructions with a
short task sequence and two complete fictional outputs on the same small answer,
once with the target absent and once present. This concretely demonstrates brand
assignment, conditional choice, partner mentions and candidate position distinct
from line coordinates. Neither retained real answer nor the new probe's names
appear in the demonstrations. Explanation may paraphrase; program citations and
the complete final Schema remain unchanged. No new guard, clipping or Agent.

The isolated builder is owner-local and reversible. Existing route/adapter and
privacy evidence apply. Tests check unchanged input/Schema, valid complete examples
and their final projection; independent review focuses on example consistency and
test contamination. Model success still needs actual source/meaning review.

Five calls complete this probe. The candidate improves some conditional roles
and prose but is not accepted: false target attribution, punctuation-only name
arrays and blank-line references remain. The same name anomaly appears on a
new answer not used in the examples. Direct raw-response replay excludes local
JSON decoding/projection as its origin; the Prompt/model/structured-output cause
remains unresolved. Stop rewriting semantic instructions until a minimal output
reproduction distinguishes it. No additional guard or mode switch is adopted.
