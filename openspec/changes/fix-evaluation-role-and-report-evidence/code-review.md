# Code Review: Query-role Parsing and Sample-level Provenance

- Review base: `origin/main@a522e8d4e9d53cd52b8b8c01eff8b335192f5bf1`
- Review target: working diff on `codex/issue-112-evaluation-role-evidence`
- Owning Issue: [#112](https://github.com/ZETAVI/GEOEval/issues/112)
- Current verdict: `ready with follow-up`

## Intent

The implementation matches the approved #112 boundary:

- open parsing adds one query-use distinction only for non-focus brands;
- identity grouping remains in Brand-name Resolver;
- candidate eligibility and position are deterministic projections rather than
  sentiment aliases;
- composition themes return sample references rather than sample/point pairs;
- original answers, public API and historical stored contracts remain intact;
- corrective retry, Worker locks and target-index semantics remain outside the
  diff.

No scope divergence was found.

## Engineering

The change uses the existing compact model-contract seams and introduces no new
module, table, API or lifecycle owner. Parser model contract `@7` projects query
roles into the existing canonical brand roles. Composition model contract `@3`
lets the program validate sample membership and choose one same-polarity
representative observation for the unchanged accepted synthesis shape. Stable
question/platform sorting removes database result order from the model contract.

Prompt, Schema and program responsibilities are aligned:

- Prompt defines the semantic distinction and examples;
- Zod requires the compact fields and bounds reference counts;
- program owns candidate order, canonical roles, provenance restoration and
  statistics;
- stored semantic/report versions remain the history authority.

No material engineering finding remains. The representative observation is a
compatibility link for the current synthesis contract; customer and Writer
consumers continue to aggregate provenance at sample level and never present it
as an exact quote.

## Evidence and continuity

Passed evidence currently includes focused parser/metric/composition tests,
20-case evaluation-process integration on an isolated database/Redis namespace,
backend typecheck/build, 864 enabled backend tests, formatting, diff check and
project-framework validation.

The authorized real-provider replay confirmed the query-role semantics and the
sample-level composition boundary, while also exposing a provider-format issue:
DeepSeek returned lowercase polarity values and `mixed` despite the advertised
Schema enum. The diff normalizes only these lexical forms and retains strict
rejection for unknown values. The corrected boundary then passed all three
post-fix real query-role cases.

One isolated fresh evaluation subsequently completed all `42/42` real calls,
`20/20` accepted sample parses, name resolution and report composition without
retry or fallback. Its report excluded contextual and inapplicable mentions from
eligible competitors, contained no focus-brand leakage and exposed no internal
references. The current Evaluation Report spec and Product Glossary now own the
accepted behavior; the active Change retains execution evidence only.

## Verdict

`ready with follow-up`. No material finding remains in the approved #112 diff.
Create separate follow-up ownership for stage-aware corrective retry and BullMQ
lock renewal; neither should expand or block this PR.
