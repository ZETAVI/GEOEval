# Design: Controlled Evaluation Report Analysis

## Scope and owner

GEO Intelligence owns accepted evaluation facts, deterministic metrics and
report assembly. AI Execution owns model attempts and immutable request/result
evidence. Background Work owns reliable delivery and resumption but never the
business lifecycle. The controlled candidate is migration input: formal runtime
code adopts its semantics in the existing owners and never imports it as a
parallel implementation.

## Flow

```text
20 platform answers
        │
        ├─ one parser call per answer
        │     └─ ordered brand records + sample card
        │
        ├─ exact-name aggregation in program
        │     └─ one name-resolution call
        │           └─ readable brand groups / ignored names
        │
        ├─ source-record restoration and deterministic statistics
        │
        └─ one composition call
              └─ performance + perception + themes + article directions
```

The parser and acquisition run in a shared concurrency pool of five. Resolution
waits for accepted parses; composition waits for accepted resolution. A batch
may compose with at least `17` valid samples, while completeness still reports
whether all `20` are valid.

## Complete-answer preparation

Canonical sampled answers remain unchanged. `buildM4ReadingText` creates one
derived model-reading string by parsing Markdown and removing only recognized
strong/emphasis delimiters. It preserves headings, list order, table syntax,
links, code, line endings and all business content. The parser never receives
artificial line numbers or a JSON decomposition of the answer.

## Evidence and presentation boundary

The immutable original answer is the canonical customer evidence. Parser
content points retain the answer's meaning and useful details for cards, themes
and writing directions, but they are not required to repeat the source byte for
byte or carry line numbers, occurrences or character offsets.

The former exact-anchor contract served two purposes: rejecting unsupported
mention/position claims and locating visual highlights in the original answer.
It also coupled semantic acceptance to Markdown presentation and made harmless
punctuation, emphasis or summarization differences fail an entire sample. The
runtime replacement separates those concerns:

- the parser owns source-grounded subject, order, attitude and content meaning;
- the program owns accepted-output shape, focus leakage, reference completeness
  and deterministic statistics;
- the report always retains the complete original answer;
- presentation may map a content point back to source text when reliable, but
  otherwise returns the existing unannotated-answer fallback without changing
  sample validity.

Consequently a missing exact highlight never triggers resampling or parser
retry. Unsupported focus attribution, contradictory brand records, invalid
references or an incomplete name-resolution partition still reject the owning
analysis stage.

## First-layer parsing

Open-question input contains only `focusBrand`, `question` and cleaned `content`.
The Agent first identifies concrete brands actually introduced, compared or
evaluated, then determines whether each identified subject is the focus brand.
The focus name is a matching reference, not evidence that the answer contains
that brand.

Each distinct brand is one ordered record. Order is the first occurrence in the
answer; later mentions add content without moving or duplicating the record.
Every record contains:

- a consumer-readable brand subject name;
- whether it is the focus brand;
- overall positive, neutral or negative attitude;
- source-grounded content points with their polarity.

The card is a short customer-facing interpretation of how that answer presents
the focus brand. Directed questions use the same record shape but can return at
most one focus record and do not contribute competitor positions.

## Name-level resolution

Before resolution, the program aggregates exact repeated competitor names in
first-seen order and deduplicates their content points. The Agent receives:

```json
{
  "brandNames": [
    {
      "observedName": "北京大成（广州）律师事务所",
      "mentionContext": ["相关介绍"]
    }
  ]
}
```

It returns:

```json
{
  "brandGroups": [
    {
      "displayName": "大成",
      "observedNames": ["北京大成（广州）律师事务所", "大成律师事务所"]
    }
  ],
  "ignoredNames": []
}
```

Internal record IDs and artificial group IDs remain program-only. Every input
name must appear exactly once in one group or `ignoredNames`. Local validation
rejects unknown, missing or repeated names, repeated group display names and a
resolved competitor whose normalized name matches the focus brand.

After validation, exact observed names expand back to every source occurrence.
The program does not infer aliases, split a group or guess a correction. Positive
and neutral occurrences contribute competitor statistics; negative occurrences
remain parsed evidence but do not contribute competitor counts. Each sample
contributes at most once per group using its earliest stored position.

The semantic identity criteria include ordinary abbreviations, translations,
simplified/traditional and full-/half-width forms, store/branch formats and
brand names with location, team, product or category qualifiers. Similarity of
location, category or features alone is insufficient.

## Composition

Composition receives:

- the focus brand;
- deterministic mention counts, rates and positions by question/platform;
- the five leading resolved competitor statistics;
- target content points, attitude and position for each valid sample.

It does not receive complete raw answers, competitor descriptions, card copies,
content hashes, Prompt versions or internal execution metadata. It produces:

- `recommendationAssessment`: overall sampled performance;
- `brandPerception`: how the sampled AI answers understand the brand;
- positive and negative themes with content-point references;
- zero to two article/media directions with sample references.

The program validates all references and derives per-theme sample/platform
support. Customer prose must use natural scenario descriptions and must not
surface internal question, sample or content-point IDs.

## Schema presentation

The executable Zod schemas remain the local validation authority. Parser calls
may receive the full shape. Name resolution uses the Prompt's explicit field
description without appending the full generated JSON Schema. Composition uses
a compact skeleton derived from the same schema, including the distinction
between content-point and sample references. This avoids the redundant Schema
payload observed in diagnostic traces without weakening local validation.

## Failure and recovery boundary

Malformed or semantically contradictory stage output is rejected; it is never
silently projected as absence. The controlled candidate records a maximum of
one acquisition attempt and two analysis attempts, but the accepted full-chain
evidence used no retry. Formal retry, resumability, progress and component
persistence remain runtime work under Issue #42.

Formal runtime persists one accepted result at each business boundary: original
sample evidence, sample interpretation, name resolution and report composition.
Each accepted result is immutable for the run. A later-stage retry starts from
the nearest accepted predecessor: name-resolution failure reuses all accepted
sample interpretations; composition failure reuses the accepted resolution;
neither repeats platform acquisition.

The existing run and execution cycle remain the lifecycle authority. The
aggregate-analysis attempt store is extended with an explicit purpose rather
than creating another attempt store. Name-resolution and composition events use
purpose-qualified idempotency keys, so repeated delivery cannot send concurrent
duplicates or accept two results for the same stage.

## Customer-safe progress

The public projection is derived from the current run, samples and accepted
aggregate results. For each fixed platform it exposes:

- `expected`: the four logical sample positions;
- `acquired`: positions with an accepted original platform answer;
- `analyzed`: positions with an accepted parser result;
- `unavailable`: positions whose acquisition or parsing ended without a usable
  result after internal policy was exhausted.

One public phase is derived monotonically from those facts:

1. `PREPARING_QUESTIONS` before a startable Definition exists;
2. `ACQUIRING_ANSWERS` while any non-unavailable position lacks evidence;
3. `ANALYZING_CONTENT` after acquisition is terminal and parsing is unfinished;
4. `RESOLVING_BRANDS` while accepted parses await name resolution;
5. `COMPOSING_REPORT` after resolution and before report acceptance;
6. `COMPLETED` only after the report is durably accepted;
7. `ACTION_REQUIRED` only for the existing terminal please-retry outcome.

Internal retry, route, Provider, model, queue and failure details are not part of
this interface. #43 may ease a visual percentage only inside the interval for
the current phase; persisted facts, not elapsed time, select the interval and
100% is reserved for `COMPLETED`.

## Known boundary

Repeated identical observed names are treated as one identity decision within
an evaluation. The resolver cannot split two unrelated entities with exactly
the same parsed name, nor can it repair an upstream row that combines different
brands. Neither failure occurred in the accepted run.

Whether a separately named premium line belongs to its parent brand for
competitor counting is intentionally unresolved. The current Agent may group or
separate it based on context; product meaning must be decided before formal
runtime activation if this distinction affects customer statistics.

## Rollout and rollback

PR #62 added only controlled-validation code and assets. The runtime slice uses
an additive migration and new contract versions so completed historical reports
remain readable and immutable. Rollback stops creating new-version attempts and
returns routing to the former runtime; it does not rewrite accepted historical
answers or reports. Deployment and production activation remain outside #42.
