# Design: Controlled Evaluation Report Analysis

## Scope and owner

GEO Intelligence owns accepted evaluation facts, deterministic metrics and
report assembly. AI Execution owns model attempts and immutable request/result
evidence. This change supplies an owner-local controlled candidate; application
startup and formal runtime contracts do not import it yet.

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

If only a later analysis stage fails in the future runtime, accepted acquisition
and parser evidence should remain reusable. This design does not yet prescribe
the persistence schema or Worker transition needed to implement that behavior.

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

This Partial adds only controlled-validation code and assets. No application
module imports the candidate, so merge rollback is removal of these files and
dependencies; there is no data migration or production state to recover.

Runtime adoption requires a later reviewed slice that maps these semantics onto
current parser, synthesis, report, Worker and progress owners, plus integration
and browser evidence. Experimental success alone does not authorize activation.
