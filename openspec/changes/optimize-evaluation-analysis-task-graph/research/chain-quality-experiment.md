# M4 Chain Quality Experiment

## Question and authority

Does a clearer semantic task and sufficient evidence context improve raw
generation enough to justify a runtime change? The owner's 2026-09-05 feedback
approves preparing this comparison, not accepting a topology in advance.
The owner authorized the first batch in the task; its current execution blocker
and zero-request preflight are recorded in the [owning Gate checkpoint](https://github.com/ZETAVI/GEOEval/issues/42#issuecomment-5550245255).
Subsequent synthesis batches require their own frozen scope.

## First package: Parser instruction only

- P0: current main Parser instruction/profile 2.2.0 and model contract @5.
- P1: [experimental instruction](../../../../apps/backend/geo-intelligence/experiments/m4-parser-instruction.json),
  experiment version 1.0.0; production assets are untouched.
- Inputs: existing fictional P01/P03/P05/P07 fixtures from the S6 manifest.
- Each fixture receives P0/P1 once, with order counterbalanced across fixtures.
- Maximum eight Qwen3.8 Flash calls, interpretation route @2, low reasoning,
  same input and strict output Schema, no fallback, sampling or automatic retry.
- First transport, identity, structure or semantic failure stops the batch.
  Review before any resumption; unused calls are not permission for another batch.
- No customer data, business database writes or telemetry export.
- No customer SLA or fixed currency ceiling is claimed. Preserve actual usage;
  route/request-count limits are explicit, and timeout/request scope stays frozen.

The [builder](../../../../apps/backend/src/ai-execution/controlled-validation/m4-parser-comparison.ts)
reuses existing fixtures and the existing stop-on-failure/private-evidence
executor. Confirmation hashes actual instructions, inputs, schemas and route
definitions, rather than version labels alone. No application startup imports it.
Use a real adapter with telemetry disabled only after authorization; plan mode
requires no credentials, database or network.

From repository root, the credential-free plan is:

```bash
pnpm --filter @geoeval/backend exec node --import tsx --input-type=module -e 'import {m4ParserComparisonPlan} from "./src/ai-execution/controlled-validation/m4-parser-comparison.ts"; console.log(JSON.stringify(m4ParserComparisonPlan(), null, 2))'
```

Freeze the reviewed commit and confirmation together. Runtime execution is an
explicit call to the exported executor using this exact confirmation. Store
evidence under an ignored, task-owned directory, directories 0700/files 0600;
retain through decision/review and record the later cleanup owner. Raw evidence
does not belong in an Issue or PR. Save the exact plan alongside the results.

## Outcome review

| Dimension | Observe | Changed action |
| --- | --- | --- |
| Raw structure | Model Schema validity before projection | Output description/Schema candidate, not more recovery |
| Raw semantics | Correct subject, mention, original order, attribution, negation and qualifying facts | Diagnose the precise input/task ambiguity |
| Useful evidence | Key supported observations and competitor candidates retained; exact excerpts support meaning | Revise extraction/context if facts are missing or distorted |
| Customer reading | Faithful, complete enough, focused and readable prose | Change task/examples if generation itself is poor |
| Projection | Accepted/rejected, discarded facts, position normalization and card fallback | Report recovery separately; do not credit it as model quality |
| Efficiency | Wall time, usage and number of calls, with failure reason | Compare only matched conditions; no production percentile claim |

The existing validator checks selected fixture facts, not all prose. Machine
ACCEPTED is provisional until raw human-readable results are inspected. Preserve
P0/P1 failures equally. Do not feed observed holdout answers into Prompt examples.
Four fixtures cannot establish broad stability; select one later small holdout
that could disprove the proposed mechanism before activation.

## Following packages, not yet executable

1. Diagnose any missing Parser context using frozen v3 data and an explicit
   subject-identification projection. Do not indiscriminately include customer
   claims or change quote representation without a failing example.
2. Compare current-main and improved one-call synthesis packages. Reuse #41
   compact references, but preserve task-relevant source excerpts and name
   context; label joint Prompt/context changes as package comparisons.
3. Compare adequate-context one-call and split tasks on the exact same accepted
   interpretations. Review consistency between grouping and prose. Only test a
   sequential alternative if a real dependency or grounding gap changes the choice.
4. Use matched replay to separate architecture effects from changed upstream
   Query/Parser output. After selection, perform one integrated downstream check
   and later the representative #39 4x5 under separate sampling authorization.

Freeze contracts and budgets for each later package before real calls. Do not
convert the historical twelve-minute run or old Parser recovery count into
current-version evidence. Actual report-path acceptance precedes #41 closure.
