# Change: Optimize Evaluation Analysis Task Graph

- Status: Controlled candidate accepted; runtime integration pending
- Class: Architectural
- Owning Issue: [#42](https://github.com/ZETAVI/GEOEval/issues/42)
- Parent: [#39](https://github.com/ZETAVI/GEOEval/issues/39)
- Pull request: [#62](https://github.com/ZETAVI/GEOEval/pull/62), Partial

## Why

The existing evaluation chain can spend about twelve minutes and still fail at
overall synthesis. Historical model output also omitted brands, assigned content
to an absent target, split aliases and wrote beyond the supplied evidence.
Structural JSON success did not establish customer-report quality.

The product needs the smallest analysis design that is stable enough on real
four-question/five-platform evaluations, keeps deterministic facts in GEO
Intelligence and has an explainable latency budget.

## Accepted controlled candidate

The selected analysis model is `deepseek-v4-flash-0731` with thinking disabled,
temperature `0.6`, `8192` output tokens and shared analysis concurrency `5`.
There is no automatic model fallback.

The analysis path is:

1. Parse each complete, lightly cleaned answer into ordered brand records and a
   customer card.
2. Aggregate repeated observed competitor names and ask one Agent to group
   readable names, without internal record or group IDs.
3. Restore groups to source records and compute occurrences, platforms and
   positions deterministically.
4. Compose overall performance, brand perception, positive/negative themes and
   one or two GEO article directions from parsed target content and statistics.

The current Prompt versions are parser `1.4.0`, name resolution `2.1.0` and
composition `1.6.0`.

## This Partial delivers

- the current controlled Prompt and model configuration;
- complete-text Markdown emphasis cleanup without changing canonical answers;
- the parser, name-resolution, deterministic-statistics and composition seam;
- strict local validation for references, exclusive name coverage and focus
  leakage;
- focused tests and a compact acceptance summary from real calls.

It replaces earlier experimental assets and research diaries. The immutable
history before cleanup is retained by Git tag
`archive/issue-42-analysis-experiments-20260911`; it is not current design.

## Acceptance evidence

A fresh Guangzhou Taotaoju run completed all `42` planned calls with no retry:

- acquisition `20/20`;
- first-layer parsing `20/20`;
- name resolution `1/1`;
- report composition `1/1`;
- total elapsed time `238.644s`, inside the accepted three-to-five-minute range.

All present and absent target results agreed with literal target-name presence
in their source answers. The resolver restored `106` competitor records through
`51` unique names into `39` groups without target leakage. Customer prose
contained no internal IDs. Private Langfuse readback matched all actual inputs,
outputs, settings and usage.

See [validation-summary.md](research/validation-summary.md).

## Non-goals

This Partial does not activate the formal Worker, replace the current sample or
overall-synthesis contracts, migrate stored reports, change retry/progress
orchestration, modify the frontend, deploy to production or close Issue #42.
It does not introduce a Critic Agent, brand master, workflow platform or model
matrix.

## Next decision

Issue #42 remains open for formal runtime, recovery and progress integration.
Before that implementation, reconcile the accepted candidate with the current
sample-parser, overall-synthesis and evaluation-report owners. The relationship
between a parent brand and separately named premium line, such as 点都德 and
毕德寮, remains a product counting decision and does not block this Partial.
