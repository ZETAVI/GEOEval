# Change: Fix Evaluation Query Roles and Report Evidence

- Status: Verified; awaiting integration
- Class: Architectural bug fix
- Owning Issue: [#112](https://github.com/ZETAVI/GEOEval/issues/112)

## Why

Real customer evaluations exposed two failures in the accepted staged analysis
chain. First, the compact parser model output records a mentioned brand and its
sentiment but not whether the answer actually offers that brand for the current
open query. Program projection therefore turns neutral mentions into conditional
recommendations, even when the answer explicitly says that the brand does not
satisfy the requested location. Second, report composition asks the model to
reconstruct sample/content-point pairs although the report and Writer consumers
only use sample-level provenance. One completed 20-sample evaluation exhausted
composition on nonexistent point pairs.

## Outcome

Open-answer parsing preserves concrete brand mentions while separately
classifying each non-focus brand as a candidate, contextual reference or
explicitly inapplicable subject. Deterministic statistics count only candidates.
Report composition retains sample-level provenance without returning content-
point identifiers. Original platform answers remain the canonical evidence.

## Scope

- update the open parser Prompt and compact model contract;
- project query role into the current canonical other-brand roles and positions;
- update the composition Prompt, model contract and local reference validation;
- order model-facing samples deterministically;
- add focused compatibility and behavioral tests;
- replay the retained customer failures and run one authorized real evaluation;
- reconcile accepted behavior into the evaluation-report spec and glossary.

## Non-goals

- external branch, POI or factual verification;
- target-brand mention/index semantic changes;
- a new Agent, model route, score or model matrix;
- corrective retry redesign or BullMQ lock renewal;
- mandatory exact quote, line, occurrence or character anchors;
- rewriting existing reports or stored interpretations.

## Compatibility

`queryRole` and theme `sampleRefs` are model-facing fields only. Program logic
projects them into the current sample semantic and accepted synthesis contracts.
No database migration or historical payload rewrite is required. Model contract
versions and Prompt versions advance so attempts remain attributable.
