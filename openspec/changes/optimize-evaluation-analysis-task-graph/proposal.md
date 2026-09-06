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
acquisition, and a new matched baseline/candidate pair. Runtime and current
semantics stay unchanged; this is not a production stability claim.

## Impact and exit

Application execution does not import experimental assets. No database or public
API changes are included. Reverting this Partial removes preparation only.
Keep this Change active and PR #62 Draft while probes, runtime selection and
implementation remain outstanding. Parent #39 stays open.
