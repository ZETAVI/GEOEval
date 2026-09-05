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
selecting topology. Earlier failures reject those candidates, not all one-call
designs. Projection recovery is a safety boundary, not the quality being optimized.

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

The authorized first batch used the owner-approved generic endpoint only in
isolation. P0 failed; after owner-requested continuation P1 failed on the same
fixture too. Across two stages, 2/8 cases were executed. Both returned valid JSON
but omitted evidence and competitors. An evidence-first open-question contract
is now prepared for isolated comparison; current runtime remains unchanged.
The next authorized package executed one natural Qwen acquisition and P0/P2
parsing of its unchanged answer. Both passed code acceptance but failed agent
semantic review: P0 misattributed non-target observations; P2 still produced
unsupported prose and a structure error. All three generations and the separate
review were read back from Langfuse. No candidate superiority is established.
See the
[experiment protocol](research/chain-quality-experiment.md).

## Impact and exit

Application execution does not import experimental assets. No database or public
API changes are included. Reverting this Partial removes preparation only.
Keep this Change active and PR #62 Draft while probes, runtime selection and
implementation remain outstanding. Parent #39 stays open.
