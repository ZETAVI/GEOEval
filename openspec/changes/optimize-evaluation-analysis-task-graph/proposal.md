# Change: Optimize Evaluation Analysis Task Graph

- Status: Experimental alignment; runtime topology unselected
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
Source evidence still preserves branch scope and conditional meaning. Earlier
failures reject those candidates, not all one-call designs. Projection recovery
is a safety boundary, not the quality being optimized.

## Outcome and scope

Compare Prompt, evidence context and task structure reproducibly. Start with a
Parser Prompt-only control, then compare synthesis input and topology without
changing all variables together. Preserve raw output, projected output, useful
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

The owner's latest annotated review supersedes the preceding prospective
condition-handoff work: single-call target points with sentiment and a sample
summary; other brands need identity, source position and positive-recommendation
eligibility, not detailed opinions or conditional-role analysis. Retain useful
source excerpts through the existing line restorer. Ordinary paraphrases and
minor component wording do not independently fail customer-quality acceptance.
PR #48 remains historical reference, not the required synthesis design.

Prepare one smaller Prompt/model-contract package with no legacy category/role
obligations hidden behind it. Its output is a diagnostic view, not an adapter
that fabricates missing legacy semantics or modifies the report metric policy.
Evaluate retained robot/coffee/absent-target answers under the same recalibrated
customer rubric as the retained baselines. Existing raw evidence stays immutable.
Mixed positive recommendations with ordinary drawbacks have one open owner
question; provisional experimental interpretation follows overall recommendation,
and formal statistical acceptance waits for that decision.

All three frozen calls are complete at `0f99bc3`. Aggregate tokens are 9,024
versus 16,890 in the retained non-contemporaneous baselines; recorded elapsed call
time is 40.708 versus 81.992 seconds. This supports continuing the smaller task
as an experimental working baseline, not a reliability or production claim.
One raw internal target-name field remains malformed despite schema/source
validity. Resolve that representation and the open eligibility decision before
canonical integration. Separate semantic-review upload was blocked by automated
safety review; detailed review stays local pending explicit authority, without
substituting another external publication route.

The following chronology explains earlier experiments, not additional current
quality requirements. Conditions/part-wording findings must not silently regain
blocking status after this recalibration.

The [experiment record](research/chain-quality-experiment.md) owns all frozen manifests,
results and limits; the proposal does not repeat their chronology. Natural sampling
remains isolated from target/profile injection. Diagnostic messages, metadata,
raw output and program projection are distinct. Minimal input was not adopted.
Source-reference handoff preserves exact text in retained and independent cases,
but does not establish correct brand identity, role, position or derived claims.

The owner confirmed on 2026-09-06 that task-relevant context does not mean minimal
source text, and faithful explanation need not copy source wording. The completed
six-call comparison supplies full answers to matched final tasks, differing only
by a preceding inventory. Both use the same necessary identity/question context,
Prompt, Schema and projector; no lexical inventory gate or clipping algorithm.

The split costs more tokens/time in both cases and does not improve overall
quality. Its negative final task turns source lines into recommendation positions;
its positive task drops four brands present in both inventory and full source.
Single-call output has useful coverage but still misstates material conditions.
Stop advancing this inventory/judgment split; keep a full-source single-call
working baseline, not an accepted runtime Prompt.

The next Prompt-only worked-example probe completed five calls, including a new
natural answer and matched baseline/candidate. Some roles and prose improve, but
the candidate produces punctuation-only name arrays in two cases, misattributes
an absent target, and cites an empty source line. Raw model JSON already contains
the anomalies; local decoding and display did not introduce them. Do not activate
this candidate or keep adding semantic wording.

The subsequent name/mode diagnosis reproduces intermittent punctuation on an
identical full strict request, while both minimal modes can form names. JSON
Object avoids that symptom in two observations but violates the complete output
contract. All four full low calls reach the documented 4,096 thinking-token budget.
A separately frozen two-call medium counterfactual forms names but retains
condition/evidence errors and takes 90.4/178.6 seconds. Neither mode relaxation
nor a blanket effort increase is an accepted solution; the unique upstream cause
is still unproven. End this parameter exploration. The owner asks for efficient
execution of one small verified change. Existing consumers justify retaining the
current fields; the next isolated candidate instead places other-brand evidence
before role/position in the Schema and examples, with a positive evidence-first
instruction. Four matched retained shoe/coffee calls at unchanged low, strict
output and full context are complete. Coffee now preserves meaningful paragraph
conditions; shoe still omits shared discount conditions and loses FILA. Both
candidate observations cost more tokens/time. Keep the sample-level evidence,
do not promote the package or keep tuning field order. The next small test case
exercises several brands sharing an upper-level qualifier, not new fields or
Agent layers. Its complete fictional example replaces only the absent-target
demonstration, leaving two examples and the baseline field order. Freeze four
calls: retained shoe candidate (reuse prior baseline), independent robot-vacuum
acquisition, and a new matched baseline/candidate pair. All completed: some shoe
roles improve, but shared evidence is still missing; the new candidate changes a
main-unit fact to a base-station fact and costs 24% more tokens without net gain.
Stop adding similar demonstrations. A zero-call replay separately proves raw
selection omission and the existing per-span name filter's loss of a detached
qualifier; a complete contiguous context passes. Next bound identity anchoring
and qualifying-context handoff at this concrete seam, not a larger Agent design.
Runtime and current semantics stay unchanged; this is not production acceptance.

## Impact and exit

Application execution does not import experimental assets. No database or public
API changes are included. Reverting this Partial removes preparation only.
Keep this Change active and PR #62 Draft while probes, runtime selection and
implementation remain outstanding. Parent #39 stays open.
