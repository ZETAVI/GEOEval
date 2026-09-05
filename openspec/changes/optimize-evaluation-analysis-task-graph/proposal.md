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

The [experiment record](research/chain-quality-experiment.md) owns P0–P6 manifests,
results and limits; the proposal does not repeat their chronology. Natural sampling
remains isolated from target/profile injection. Diagnostic messages, metadata,
raw output and program projection are distinct. Minimal input was not adopted.
Source-reference handoff preserves exact text in retained and independent cases,
but does not establish correct brand identity, role, position or derived claims.

The latest frozen four-call package acquired an independent coffee answer that
naturally mentions the target. Both P5 and P6 correctly identify that target and
position 1, but all three Parser observations fail whole-output quality. P6 loses
some explicit subjects, misstates another brand's order and carries unsupported
attribute inference into projection. More explicit holistic instructions have
not demonstrated a sufficient repair; no whole-candidate superiority is established.

Next compare a smaller evidence-extraction task followed by judgment/expression
against the frozen one-call candidate, preserving the same source and final needs.
This is the next experimental question, not an accepted two-call runtime. Keep
individual identity, full local qualifiers and all required target/competitor
outputs visible at the handoff; do not simplify by dropping metric-consumed fields.

## Impact and exit

Application execution does not import experimental assets. No database or public
API changes are included. Reverting this Partial removes preparation only.
Keep this Change active and PR #62 Draft while probes, runtime selection and
implementation remain outstanding. Parent #39 stays open.
