# Design: AI Evaluation Query Generator
<!-- Archived after 2026-09-04 reconciliation; integration remains PR #28. -->

## Design position

Query generation belongs to GEO Intelligence because it creates the immutable question definition used by an official evaluation. Brand Knowledge supplies one frozen Snapshot v3 and remains the owner of editable facts and fingerprint meaning. AI Execution translates a recorded structured-output request to a Provider. Background Work delivers and reconciles work. No new workflow engine or generic Agent framework is introduced.

The change deepens the existing Query seam rather than retaining the synchronous `EvaluationQuestionGenerator.generate(...)` call. One preparation record owns recovery, one successful attempt may be accepted, and only the final four questions enter business truth.

## Module Architecture Card: Query preparation

### Outcome and Boundary

- Owner and observable outcome: GEO Intelligence owns one resumable preparation and one immutable accepted four-question definition per Brand evaluation fingerprint.
- In: Snapshot v3 Query projection, versioned Prompt, structured model contract, deterministic projection, preparation state, accepted Definition, and explicit retry after exhaustion.
- Out: editable Brand facts, Store Location verification, industry catalog maintenance, Provider protocol, BullMQ mechanics, evaluation sampling, parsing, synthesis, report presentation, and factual brand investigation.
- Upstream prerequisites and downstream consumers: Brand Knowledge supplies the fingerprint and frozen Snapshot v3; AI Execution supplies recorded technical outcomes; Background Work delivers intents; official evaluation start consumes only an accepted Definition.

### Lifecycle and Data

```text
PREPARING -> READY
          -> PLEASE_RETRY

PLEASE_RETRY --explicit retry/new sequence--> PREPARING
READY is terminal for one Brand fingerprint.
```

- `EvaluationQuestionPreparation` is unique by Brand and fingerprint. It freezes the Brand snapshot, Prompt identity/content, output-contract identity/schema, current sequence, correlation identity, status, and accepted Definition relationship.
- `AiQuestionGenerationAttempt` is append-oriented and unique by preparation, sequence, and attempt number. It records route, request, protected response envelope, failure, usage, and timing evidence.
- `EvaluationDefinition` plus its four `EvaluationQuestion` rows remain the only accepted business question set. Candidate questions and selection explanations no longer exist.
- Initial preparation, Prompt snapshot, and one Outbox fact commit in one transaction.
- Successful projection creates the Definition, links the successful attempt, and marks the preparation ready in one transaction.
- A changed Brand evaluation fingerprint creates a separate preparation. Existing accepted snapshots and definitions remain immutable.
- Duplicate HTTP requests, duplicate Outbox delivery, and concurrent retries return or advance one durable identity rather than sending unbounded Provider requests.

### Contracts and Dependencies

Public application behavior remains:

- observe current Definition/preparation without creating work;
- idempotently ensure preparation;
- retry only a `PLEASE_RETRY` preparation;
- start an official evaluation only from an accepted, current Definition.

Dependency direction:

```text
Web -> generated HTTP client -> GEO Intelligence
Brand Knowledge -> frozen Snapshot v3 -> GEO Query projection
Background Work -> Query preparation coordinator
GEO coordinator -> AI Execution structured-output attempt
AI Execution -> Provider adapters and attempt persistence
```

Query never reads Brand tables, Amap contracts, coordinates, detailed addresses, Provider provenance, or live reference data. AI Execution never decides the four business roles or question quality.

Existing seams are sufficient:

- Product Outbox and BullMQ for durable delivery;
- existing AI attempt adapter and real-route catalog for Provider variation;
- Zod JSON Schema for model output shape;
- a small deterministic projector for business invariants;
- the existing preparation state machine for retry and reconciliation.

No factory hierarchy, hot replacement, generic workflow engine, Critic/Judge, or second Query owner is added.

## Snapshot v3 Query projection

`evaluationBrandQueryContext(snapshot)` is the only Prompt input projection:

```ts
{
  companyName: string;
  recommendationSubject: string;
  location: {
    cityLabel: string;
    terminalRegionLabel: string;
    locality: {
      kind: "BUSINESS_AREA" | "ADDRESS_LOCALITY";
      label: string;
    };
  };
  flagshipProductOrService: string;
  characteristics: string[];
}
```

The city and terminal-region labels already exist in the frozen Snapshot; exposing them to Query does not change the Brand fingerprint or call the location Provider again. `BUSINESS_AREA` may be expressed as a business area or nearby location. `ADDRESS_LOCALITY` may only be expressed as the verified locality or nearby place and must not be relabelled as a business area.

`flagshipProductOrService` is the primary topic for all three open questions. `recommendationSubject` supplies a broader, maintained industry phrase only when needed to name the merchant or service type naturally. The Agent may make grammatical changes while retaining the flagship offer's core category and distinguishing meaning.

`characteristics` contains two through six canonical peer values. Order is not priority. The Agent considers the complete collection and creates two complementary user-need scenarios. Each question may use one or combine related characteristics; complete coverage is neither required nor scored.

## Prompt design

The repository remains the runtime Prompt source. The instruction snapshot freezes ID, version, content hash, and content on the preparation. Issue #49 may later mirror stable Prompt versions to Langfuse, but runtime does not fetch `latest` or another mutable external Prompt.

The Prompt uses progressive, positive instruction:

1. define the purpose and reader: simulate a real potential customer or demander, not a brand copywriter;
2. explain the semantic role of each input field;
3. ask the model to understand the complete store context;
4. select one natural target-brand name;
5. internally plan four complementary roles;
6. output only the final structured result;
7. provide a small restaurant and enterprise-service example to demonstrate information fidelity and role differences, not fixed sentence templates.

Only boundaries that change evaluation meaning are explicit prohibitions: no web search or invented brand facts, and no target brand in open questions. The instruction does not accumulate a blacklist for every previously observed awkward phrase. It requests no chain-of-thought, candidate list, score, or explanation.

## Model output and deterministic projection

Model contract `evaluation.question-generation-model@2` contains only:

```json
{
  "queryTargetName": "互动派",
  "brandDirected": "...？",
  "industryRecommendation": "...？",
  "characteristicAngleOne": "...？",
  "characteristicAngleTwo": "...？"
}
```

JSON Schema owns required fields, strict additional-property rejection, trimmed non-empty strings, and persistence bounds. Program projection owns only:

- `queryTargetName` is the full normalized `companyName` or a normalized continuous substring;
- the brand-directed question contains `queryTargetName`;
- the three open questions contain neither `queryTargetName` nor full `companyName`;
- the four fields map to the existing fixed kinds and ordinals.

The Prompt owns naturalness, location use, flagship fidelity, characteristic selection, complementary intent, and ordinary-user wording. Program code does not add keyword coverage, sentence-style scoring, alias invention, category classification, or a hidden template fallback.

## Failure and Recovery

| Failure | Classification | Retry or recovery owner | Evidence |
| --- | --- | --- | --- |
| Duplicate prepare HTTP request | Concurrent duplicate | GEO repository | Unique Brand plus fingerprint preparation |
| Duplicate Outbox/BullMQ delivery | Delivery duplicate | Background Work and AI Execution | Stable business key and attempt identity |
| Provider timeout/transient failure | Transient or ambiguous | AI Execution records; GEO advances route | Append-only attempt, ambiguity deadline, delayed retry |
| Invalid JSON or model contract | Structural rejection | GEO coordinator | Failed attempt retained; no Definition created |
| Brand-name boundary violation | Semantic rejection | GEO coordinator | Contract version recorded; bounded next attempt |
| All attempts exhausted | Terminal technical failure | GEO marks `PLEASE_RETRY`; customer may retry | New sequence, same fingerprint, no evaluation consumed |
| Earlier sequence succeeds late | Stale result | GEO repository | Sequence/status conditional acceptance rejects it |
| Process stops after response | Ambiguous interruption | AI Execution and reconciliation | Expired attempt becomes recorded failure before new attempt |
| Telemetry export fails | Non-business side effect | Telemetry owner | Attempt and Definition state remain authoritative |

The first implementation reuses the existing three-attempt posture: Qwen3.8 Flash primary, one same-route retry, then Hy3 fallback. The catalog, credentials, cost, entitlement, and current model identifiers must be rechecked before any authorized real call. Deterministic output remains a test adapter only and is not a customer recovery path.

## Migration and compatibility

- Add preparation and Query-attempt tables plus optional accepted-attempt links to existing definitions.
- Rename the unmerged migration after the current main migration sequence before validation.
- Existing deterministic Definitions remain readable and are returned for the same fingerprint without creating Agent work.
- Snapshot v3 activation already required an explicitly authorized empty development database; #26 does not recreate a v1/v2 snapshot decoder or claim production-data migration.
- A clean database must replay every current migration, and a second deploy must report no pending migration.
- Rolling back new Agent preparation stops creation of new preparations while preserving already accepted Definitions and append-only attempt evidence.

## Cross-Issue ownership

- #32 owns direct-question parser projection tolerance. Its PR is currently stacked on #26 and must be rebased after #26 publishes a stable head.
- #41 owns overall synthesis language and brand grouping. The old #26 synthesis commit is deliberately not replayed.
- #42 owns evaluation task-graph latency and cost budgeting after Parser/Synthesis contracts stabilize.
- #49 owns repository-to-Langfuse Prompt mirroring, not runtime Prompt content.
- #39 owns the final representative-store 4×5 Integration Gate.

## Operational and verification boundary

- Credentials never enter Prompt assets, tests, Issue/PR text, logs, or Git.
- Customer-visible state remains `PREPARING`, `READY`, or `PLEASE_RETRY`; Provider, route, attempt, trace, queue, Prompt, and internal failures stay protected.
- Focused contract tests prove the v3 projection, model schema, deterministic brand-name boundary, and fixed four-question mapping.
- Integration tests prove duplicate preparation, duplicate delivery, retry/fallback, exhaustion, explicit retry, late result rejection, and existing Definition reuse.
- Migration verification proves clean replay and no pending migration.
- Browser verification proves preparation, leave/return, final four questions, start, and retry presentation without internal leakage.
- Query-only real review uses a small set of representative stores and stops on material quality failure. It does not claim production capability.
- A final 4×5 run requires separate authorization and belongs to #39.

## Reconciliation

Before #26 can close:

- update the current evaluation-definition spec and architecture overview with accepted behavior;
- remove the deterministic customer-path wording while preserving test-fixture ownership;
- update or remove every touched Evolution marker;
- regenerate OpenAPI and the API client from source;
- archive this Change only after accepted behavior and evidence are reconciled;
- record PR evidence and the branch/worktree exit state.
