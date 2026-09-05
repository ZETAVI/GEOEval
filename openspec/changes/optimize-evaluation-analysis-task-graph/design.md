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

This is a review frame, not a new accepted interface. Inspect whether role/position
and short card prose belong in the same model task as identity extraction, and
whether source-span selection can reduce quote-copying errors. Role/position are
currently consumed by evaluation-report.policy.ts for eligible competitor
occurrences; changing their producer requires an explicit compatible design.
Do not implement a split, another critic, a new span contract or a suffix stripper
without a discriminating result. Full context remains only a frozen control, not
a prescription to give every downstream Agent all nine fields.
