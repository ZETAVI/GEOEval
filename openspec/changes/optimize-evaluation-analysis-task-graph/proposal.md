# Change: Optimize Evaluation Analysis Task Graph

- Status: Formal runtime verified; ready for integration reconciliation
- Class: Architectural
- Owning Issue: [#42](https://github.com/ZETAVI/GEOEval/issues/42)
- Parent: [#39](https://github.com/ZETAVI/GEOEval/issues/39)
- Pull requests: [#62](https://github.com/ZETAVI/GEOEval/pull/62), accepted
  Partial; [#90](https://github.com/ZETAVI/GEOEval/pull/90), formal runtime

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

The formal runtime Prompt versions are parser common/open `3.0.0`, parser
directed `3.1.0`, name resolution `2.2.0` and composition `1.7.0`.

## Accepted Partial

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

The formal Worker subsequently completed a fixed-version fresh 4-by-5 path in
`206.227s`: 20/20 acquisition, 20/20 parsing, one accepted name resolution and
one accepted composition, with no retry or model fallback. A preceding rejected
run also verified that customer retry reuses all 20 accepted platform answers
and resumes only the five failed parses before aggregate analysis.

## Approved runtime integration

The next #42 slice replaces the current formal analysis path in place. It does
not import the controlled-validation module as a second runtime. The existing
GEO Intelligence owners will adopt the accepted parser, name-resolution,
deterministic-statistics and composition semantics while AI Execution continues
to own immutable model attempts and Background Work continues to own delivery
and resumption only.

The runtime slice also establishes the durable facts needed by #43:

- per-platform expected, acquired, analyzed and unavailable counts;
- one customer-safe phase derived from persisted evaluation state;
- accepted parser and name-resolution results that later-stage recovery can
  reuse without repeating platform acquisition;
- report acceptance as the only condition for terminal completion and 100%.

The complete original platform answer remains immutable and customer-readable.
Parser content points are source-grounded semantic extracts, not line-number or
character-offset records. Exact highlight mapping is a best-effort presentation
enhancement: inability to map one extract must not reject an otherwise valid
sample or cause another Provider call.

## Non-goals

This Partial does not activate the formal Worker, replace the current sample or
overall-synthesis contracts, migrate stored reports, change retry/progress
orchestration, modify the frontend, deploy to production or close Issue #42.
It does not introduce a Critic Agent, brand master, workflow platform or model
matrix.

## Remaining decisions

The relationship between a parent brand and separately named premium line, such
as 点都德 and 毕德寮, remains a product counting decision. It does not block the
runtime slice unless a reachable report changes because of that ambiguity.
Production activation, customer-data transfer and deployment remain separate
release gates.
