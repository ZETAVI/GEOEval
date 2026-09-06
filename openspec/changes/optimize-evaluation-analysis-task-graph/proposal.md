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

The owner redirects the next step to a real analysis chain, not further
name-replacement hypotheses. Use Interaction Pie's three accepted open questions
from the archived #26 real-query review, acquire fresh natural answers, parse
each with unchanged experiment 1.2.0, and synthesize the actual parses and source
excerpts into one readable preview. No manual correction or synthetic replacement
enters these calls. The bounded package contains seven calls on the existing Qwen
routes, with at most two in flight and no retries or fallback.

The current Parser is an experiment, not a canonical report adapter. It retains
target points/position/evidence and a target summary, while other brands have
one subject name, source position, recommendation eligibility and evidence.
Original names remain in source excerpts; absence display follows the model's
null decision. The owner confirms ordinary drawbacks do not disqualify an
overall-positive recommendation. Keep the customer-level quality bar and do not
revive fine condition/role or minor wording gates.

Previous real tests show useful structural simplification but no stable quality
or efficiency advantage. Shared-item eligibility/position errors remain, and
Schema/source acceptance alone does not establish customer usefulness. Those
findings now inform review of the real final result; they do not justify another
round of hypothetical Prompt changes. All immutable manifests, historical
results and limits remain in the [experiment record](research/chain-quality-experiment.md).

The experiment-only synthesis handoff preserves actual parsed facts and restored
excerpts, assigns short local reference IDs, and leaves counts with code. A
single synthesis generates overview, themes, proposed brand groups and practical
directions. It does not invent legacy Parser roles or satisfy the formal report
contract. #41 retains final synthesis/customer-report ownership.

Langfuse contains actual model input/output and operational metadata only.
Independent semantic review and the readable preview remain local. This package
covers three open questions on one platform, not a brand-directed question,
4×5 readiness, actual UI/database/recovery or production activation. Review the
visible result first, then choose the smallest evidence-backed next improvement.

The seven-call chain is now complete at `a75a5be`, including an unedited readable
preview. Local review finds the Parser-to-synthesis handoff intact and the final
result useful for discussion, but action guidance still crosses from platform
descriptions into insufficiently supported business assertions. Next calibrate
that synthesis boundary using the same retained real evidence, under #41's final
semantic ownership. The batch takes 227.304 seconds wall time; natural sampling
dominates its duration and tokens. This is measured evidence for this package,
not a universal performance conclusion or an accepted runtime.

## Impact and exit

Application execution does not import experimental assets. No database or public
API changes are included. Reverting this Partial removes preparation only.
Keep this Change active and PR #62 Draft while probes, runtime selection and
implementation remain outstanding. Parent #39 stays open.
