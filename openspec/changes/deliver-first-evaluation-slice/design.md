# Design: First Evaluation Slice

## S1 Boundary

Identity and Access owns account role, mobile challenge, and revocable session.
Brand Knowledge owns brand profiles, evaluation readiness and fingerprint, and
the account's current-brand selection. The Web consumes generated REST/OpenAPI
types and never imports backend or Prisma types.

## Identity Design

- Public entry uses request-challenge and complete-challenge use cases behind a
  challenge-delivery port.
- The first implementation supplies a deterministic local/test adapter only.
  Configuration rejects that adapter in a production environment; selecting and
  validating a real SMS provider remains a later external-integration change.
- Mobile numbers are normalized before uniqueness checks. One public mobile
  entry can create only a terminal-customer account.
- Challenge values are stored as a keyed digest, expire, are single-use, and
  stop after a bounded number of failed attempts.
- Sessions use random opaque bearer material stored only as a digest. The browser
  receives it in an HttpOnly, SameSite cookie; logout revokes the durable session.

## Brand Design

- Brand records use additive optional fields so incomplete drafts can be saved.
- Evaluation readiness is owner-derived from the complete required basic field
  set. The evaluation fingerprint includes normalized company/store name,
  industry, two characteristics, and region; contact-only edits do not change it.
- Current-brand selection is a Brand Knowledge record keyed by account, not an
  account-role field. Creating the first brand and selecting another brand are
  Brand Knowledge transactions.
- Every command and query is scoped by the authenticated account. Database
  foreign keys support ownership but do not replace application authorization.

## Web Design

- `/` becomes the simple public product entry and the F0 browser page moves to
  an explicitly non-product route.
- `/enter` owns the passwordless entry flow, including the optional first-brand
  handoff.
- `/brands` is the initial terminal-customer service home with the agreed left
  navigation, current-brand utility area, real brand cards, and honest capability
  previews for not-yet-implemented modules.
- Layout is responsive and keyboard-operable. Exact final illustration, motion,
  and full design-system extraction remain outside S1.
- Customer-facing copy uses concise Chinese except for established product terms
  such as GEO and AI. The current interface fixes the journey and information
  structure only; final visual language, typography, motion, and detailed polish
  belong to a later independently reviewed frontend-design task and must not
  silently change accepted product behavior.

## Migration, Failure, and Rollback

- The migration is additive: new account, challenge, session, brand, and current
  selection tables. Existing F0 tables and records remain untouched.
- Invalid or expired challenges return a concise correction outcome. Missing or
  foreign sessions and brand IDs return authorization-safe outcomes without
  exposing account existence.
- Application rollback can stop using the new routes while retaining additive
  tables. A later destructive removal requires a separately reviewed migration.

## Evolution Markers

- The validation-harness objectivity profile is not touched in S1. Its move into
  GEO Intelligence is triggered by S2, when the first production evaluation
  owner exists.
- The deterministic challenge adapter must be replaced or disabled before any
  production release; this trigger is owned by the future authentication
  integration change.

## S2 Boundary

GEO Intelligence owns evaluation definitions, frozen input revisions, question
sets, runs, and the twenty business sample identities. Brand Knowledge exposes
one evaluation-purpose view; it remains the only owner of editable brand facts
and the normalized fingerprint. S2 does not call a model provider or interpret
an answer.

### Definition preparation

- Preparing a definition requires one active, account-owned, evaluation-ready
  brand. GEO Intelligence receives only the evaluation-purpose fields and their
  Brand Knowledge fingerprint.
- Preparation is idempotent by brand and fingerprint. The first preparation
  stores one immutable brand-fact snapshot, one generated four-question set,
  the fixed five-platform policy, question-generator identity, and shared
  objectivity-profile identity. Reopening the same revision returns that record;
  there is no refresh operation.
- The deterministic generator is an S2 adapter for contract development. It
  produces one brand-directed question, one industry-recommendation question,
  and two characteristic questions. Replacing it with approved AI execution is
  a later integration seam and cannot change definition ownership.

### Official start

- Start is one GEO-owned PostgreSQL transaction. It rechecks account ownership,
  active brand state, fingerprint currency, definition identity, one active run
  per brand, and the unchanged revision's opportunity.
- The transaction creates one run, four-by-five sample identities, and one
  product outbox fact. It performs no provider or queue call. A duplicate start
  of the same definition returns the existing active run; a different revision
  cannot start while that brand has an active run.
- One definition has at most one run. Later retry work opens an internal cycle on
  that run rather than creating another official evaluation. Completion and
  please-retry transitions remain S3-S5 work, but the S2 model protects their
  identity and history rules now.

### Customer interaction

- `/diagnosis` uses the current-brand context. No brand or incomplete basic
  information leads to a concise correction route; a ready brand shows the four
  read-only questions and one explicit start action.
- Starting changes the page to the evaluating state and exposes the fixed
  twenty-position scope without fabricating progress. Switching the global
  current brand does not mutate the started run.

### Objectivity policy ownership

S2 moves the confirmed objectivity profile from the provider-validation harness
into GEO Intelligence's production-owned source. The harness and current
product documents link to that same file; no second policy copy remains.

## Confirmed S3 Boundary

S3 makes acquisition and per-sample interpretation resumable without calling a
real provider. It starts from the twenty sample identities created in S2 and
ends when the run either has at least seventeen accepted sample interpretations
and is ready for overall synthesis, or cannot reach that threshold after the
bounded deterministic attempts and becomes `PLEASE_RETRY`.

S3 does not produce the overall synthesis, recommendation index, report,
optimization guidance, notification, or customer retry command. Those remain
S4-S5 work. Real five-platform adapters, production pacing, and paid external
calls remain S6.

### Ownership and collaboration

- GEO Intelligence owns the run stage, execution-cycle identity, expected
  sample state, canonical format-preserving answer, returned source metadata,
  accepted model identity, per-sample interpretation, exhausted failure, and
  the seventeen-of-twenty readiness decision.
- AI Execution owns append-only purpose-specific attempt evidence: request and
  route identity, attempt relationship, deterministic response envelope or
  failure, latency, and available usage fields. It cannot create a sample,
  accept business evidence, or change a run.
- Background Work owns product-outbox relay and BullMQ delivery mechanics. A
  GEO-owned evaluation process coordinator reads durable owner state and asks
  the two owners to perform their operations; it does not become a generic
  workflow engine or a second business-state owner.
- The existing Foundation worker and its F0 tables remain isolated probes. S3
  may reuse the proven delivery pattern but does not turn Foundation records or
  services into product APIs.

### Persistent process and evidence

- Handling `evaluation.run.started` idempotently establishes the run's initial
  execution cycle. A pure GEO-owned planner derives only currently valid small
  work intents: acquire one sample, interpret one accepted answer, or evaluate
  readiness.
- Every owner transition that requires later work appends its next product
  Outbox fact in the same PostgreSQL transaction. The relay maps that fact to a
  BullMQ job whose technical identity is derived from the Outbox event; a
  handler registry dispatches the small intent without embedding lifecycle
  decisions in the queue adapter.
- Each sample tracks acquisition and interpretation separately so a parser
  retry never becomes a second platform sample and an accepted answer is not
  requested again merely because interpretation failed.
- One sample can have at most one accepted canonical evidence record and one
  accepted interpretation. Both reference the exact accepted AI attempt, while
  earlier failed or ambiguous attempts remain append-only diagnostics.
- The canonical answer and returned sources are stored by GEO Intelligence in
  business persistence rather than reconstructed from BullMQ, logs, Langfuse,
  or the AI Execution response history.
- Queue redelivery or worker restart reloads owner state and skips accepted
  stages. A crash after an adapter returns but before acceptance may require a
  new recorded attempt, but uniqueness and owner acceptance still prevent a
  second canonical answer or interpretation.
- Queue retry handles delivery and worker infrastructure failure. AI Execution
  records purpose-specific attempts and classifies transient, rate-limited,
  permanent, ambiguous, structural, and semantic failures; queue attempt counts
  never silently become provider-attempt budgets.
- A BullMQ Job Scheduler drives a periodic reconciliation scan that finds
  unfinished GEO-owned work and reasserts missing delivery without mutating
  evaluation state. BullMQ Flow state is not the evaluation lifecycle authority.
- After all positions are terminal for S3, seventeen to twenty accepted
  interpretations advance the run to an internal `READY_FOR_SYNTHESIS` stage;
  zero to sixteen advance the public run status to `PLEASE_RETRY`. A valid
  no-mention interpretation counts as accepted evidence.

### Deterministic execution

- Deterministic acquisition fixtures preserve representative Markdown answers,
  source metadata, search-used posture, model identity, and controlled failures
  without external access.
- Deterministic interpretation fixtures cover list, table, heading, paragraph,
  mention, no-mention, and relative-position structures and are validated by
  GEO-owned schemas and semantic invariants before acceptance.
- Failure fixtures can exhaust up to three positions while retaining a run that
  is ready for synthesis, exhaust four positions to produce `PLEASE_RETRY`, and
  interrupt processing between accepted stages to prove restart recovery.
- No deterministic adapter is allowed in a production environment.

### Operational reliability

- BullMQ workers use bounded concurrency, exponential backoff with jitter,
  retained failed-job evidence, explicit error handlers, stalled-job recovery,
  and graceful shutdown. Queue payloads carry stable identifiers only.
- Production Redis requires an approved persistence and high-availability plan,
  `noeviction`, reconnect behavior, memory and retention sizing, transport
  security, backup, and recovery evidence. Local Compose does not approve this
  production gate.
- Metrics include Outbox backlog and oldest age, queue waiting, active, stalled,
  and failed counts, run-stage duration, sample coverage, classified attempt
  failures, and reconciliation recoveries. Telemetry failure never changes
  business acceptance.
- Provider selection remains a versioned route-policy plus adapter registry.
  This earns a strategy/factory seam for later route replacement without
  requiring runtime code hot-swapping or speculative lazy loading in S3.

### Customer and contract boundary

The authenticated diagnosis purpose view may expose only the durable public run
status and concise processed, valid, and unavailable counts needed to show real
progress. It does not expose attempt counts, internal error codes, source lists,
queue state, prompts, trace identifiers, or deterministic-fixture controls.
Until S4, `READY_FOR_SYNTHESIS` remains customer-visible as evaluating and no
score or report is fabricated.

### S3 acceptance boundary

S3 is acceptable only when duplicate delivery, concurrent worker handling,
partial failure, telemetry failure, and process restart cannot duplicate an
accepted sample or lose retained evidence; a clean migration replay succeeds;
and deterministic 20/20, 17/20, and 16/20 runs reach the expected durable
boundary. Capacity, cost, and real-provider behavior are not claimed from these
fixtures.

## Confirmed S4 Boundary

S4 turns one `READY_FOR_SYNTHESIS` run into one immutable current evaluation
report and renders that report through the authenticated diagnosis journey. It
includes deterministic aggregates, deterministic overall-synthesis fixtures,
report persistence, authenticated contracts, and a functionally complete Web
report whose final visual refinement remains a separate frontend-design pass.

Evaluation history navigation, the customer retry command, notifications, real
provider routes, production activation, and final visual polish remain outside
S4. S4 must nevertheless retain the state and evidence needed for those later
capabilities without adding their customer workflows now.

### Responsibility split

- GEO Intelligence owns the immutable report, report lifecycle, deterministic
  aggregates, recommendation index, typical appearance position, evidence
  linkage, customer-visible synthesis, internal optimization guidance, parser
  and synthesis instruction profiles, and the schemas that accept their output.
- AI Execution owns append-oriented sample-interpretation and overall-synthesis
  attempts, route translation, and returned execution envelopes. It receives
  resolved GEO-owned instructions and returns proposed structured semantic
  results; provider adapters cannot redefine prompt meaning. AI Execution cannot
  calculate or revise cross-sample metrics, accept a report, or change
  evaluation state.
- Background Work reuses the S3 durable delivery and reconciliation boundary to
  request synthesis and report finalization. It does not own report content or
  completion.
- The Web renders the authenticated report contract and preserves the original
  answer structure. It does not recompute business metrics or infer missing
  report content.

### Confirmed metric meaning

The recommendation index continues to use the average normalized position
score in its confirmed formula. The separate customer-facing typical appearance
position uses the median raw relative rank among mentioned valid open-question
samples. An even set with different middle ranks is displayed as a range; zero
open-question mentions has no typical position.

### S4 analysis pipeline

1. The retained platform answer remains immutable, including its original
   Markdown structure and internal returned-source evidence.
2. A per-sample semantic parser interprets the complete answer and proposes the
   current-brand mention and relative position, all other explicitly mentioned
   brands and their relative positions, target-brand descriptions and
   characteristics, a concise card interpretation, and exact evidence anchors
   for later annotation. It does not calculate cross-sample rates, counts,
   scores, or competitor rankings.
3. GEO Intelligence validates and accepts that semantic record. Deterministic
   aggregation derives mention rate, recommendation index, typical position,
   valid coverage, per-platform comparisons, brand-occurrence counts, and every
   other numeric report fact from accepted records.
4. An overall synthesizer receives the frozen brand context, accepted semantic
   records, and deterministic aggregates. It proposes the high-level assessment,
   evidence-linked broad themes, concise customer directions, and comprehensive
   internal writing guidance without changing a metric or counting evidence.
5. GEO Intelligence validates referenced evidence, derives theme counts and
   involved platforms, and atomically accepts one immutable report. The Web
   renders its public projection and never receives internal writing guidance.
6. Highlighting is non-destructive: the semantic parser identifies what evidence
   matters, while deterministic presentation code sanitizes the original format
   and applies only verifiable annotations to a separate display projection.

The S3 generic `structuredEvidence` fixture is an execution proof rather than
the final semantic contract. S4 replaces that loose boundary with typed,
versioned interpretation data before implementing report synthesis.

### Confirmed parser instruction profiles

S4 should retain one sample-interpretation capability, one shared evidence and
objectivity policy, and one versioned discriminated output contract. It should
select one of two task profiles from the immutable question kind:

- `brand-directed`: emphasizes what the answer states, associates, qualifies,
  or leaves uncertain about the named brand. It extracts other brands when they
  appear but does not treat the forced brand mention as discovery or
  recommendation performance, and it does not treat the limited brand snapshot
  as a fact-checking baseline.
- `open-discovery`: emphasizes whether the current brand enters the answer's
  recommendation set, its relative position and role, other recommended brands,
  recommendation reasons, conditions, and query fit. The industry and two
  characteristic questions share this profile and pass their exact question
  kind and intent rather than creating three drifting prompts.

Both profiles must identify explicit brands, current-brand descriptions and
characteristics, semantic answer structure, concise card interpretation,
uncertainty, exact evidence anchors, and highlight intent. Neither profile
calculates cross-sample statistics or emits rewritten display content. The two
profiles may version independently while remaining behind the same parser port
and GEO-owned schema.

### Confirmed typed per-sample contract

The shared record should contain only reusable semantic evidence:

- schema and instruction-profile identity;
- immutable question kind and semantic answer-structure kind;
- the current brand's mention state, displayed forms, relevant descriptions,
  characteristics, and evidence references;
- every other explicit brand mention's stable record identity, displayed name,
  relative position and recommendation role when meaningful, and evidence
  references; the per-sample record does not decide cross-sample identity;
- concise objective card interpretation and any interpretation limitations;
- exact evidence anchors and semantic highlight intents, without generated HTML
  or a rewritten answer.

The `brand-directed` detail should organize stated brand identity, positioning,
offerings, audiences, associated characteristics, limitations, and uncertainty.
It may retain a separate contextual order only when the answer actually forms an
ordered multi-brand comparison; a forced mention never becomes recommendation
position evidence.
The `open-discovery` detail should organize recommendation inclusion, meaningful
relative position, recommendation role, reasons, conditions, query fit, and
other recommended brands. Absence of the current brand remains an observed
non-mention and never gains an invented reason.

GEO-owned validation must reject unresolved evidence references, cross-sample
statistics, impossible target-brand position combinations, generated display
markup, and a question-specific detail that does not match the immutable
question family.

### Confirmed overall-synthesis contract

The search-enabled overall synthesizer should return semantic organization, not
statistics:

- `brandEntityGroups`: a complete mapping from original other-brand mention
  identities into reporting groups. Each group keeps one customer-readable
  parent display name plus its original member labels and classifies each member
  as the same name, translation or abbreviation, store format, or obvious
  subordinate brand line. A distinctly independently positioned sub-brand
  remains its own group;
- `brandResolutionBasis`: answer-context evidence and, only when needed, public
  search references that explain non-obvious group decisions; an obvious name
  relationship does not require a search merely to satisfy the contract;
- `recommendationAssessment`: an evidence-linked explanation of open-question
  discovery and recommendation performance that accepts deterministic metrics
  as immutable input;
- `brandPerception`: an evidence-linked account of how direct and open answers
  describe the current brand without factual-accuracy grading;
- `themes`: no more than five positive and five negative broad semantic groups,
  each referencing accepted sample observations rather than supplying counts;
- `customerDirections`: no more than three problem, direction, evidence, and
  non-guaranteed intended-improvement records;
- `internalGuidance`: the comprehensive evidence-aware context later consumed
  by promotional writing but excluded from customer contracts.

GEO Intelligence validates every mention, observation, theme, direction, group
member, and source reference, then deterministically derives group counts,
involved platforms, typical competitor positions, and theme counts. Resolution
metadata and original member labels remain internal. Search unavailability,
inconclusive identity, or a rejected mapping leaves the affected names separate
and does not block an otherwise valid report. This is intentionally a practical
reporting normalization rather than a complete corporate-brand hierarchy: for
example, **Starbucks Reserve** is grouped under **Starbucks**, unless a future
case has a clearly independent consumer identity and positioning.

### S4 proportional module architecture card

#### Outcome and responsibility boundary

S4 completes one ready run as one immutable current report. GEO Intelligence
owns accepted semantic interpretations, deterministic calculations, frozen
synthesis-input assembly, accepted synthesis, the public report, protected internal
optimization guidance, and the final run transition. AI Execution owns
append-oriented run-scoped synthesis attempts behind the same purpose-execution
port used by sample work, but an overall synthesis is never represented as a
fake sample. Background Work delivers stable run identifiers and reasserts
unfinished work; it never owns report state or content. The Web renders only the
authenticated public projection and performs no business calculation.

#### Contract and persistence shape

- The accepted interpretation keeps `mentioned` and open-question `position` as
  its only relational semantic facts because deterministic metrics query them
  directly. One schema-versioned, discriminated `semanticPayload` is the sole
  accepted owner of displayed brand forms, other-brand mention records,
  descriptions, characteristics, card interpretation, limitations, evidence
  anchors, highlight intents, and question-family detail. It does not repeat
  the two relational facts.
- The accepted interpretation stores one `semanticContractVersion` beside its
  discriminated payload. The payload profile identifies the question family;
  the accepted AI attempt retains the exact resolved instruction and output
  schema. The complete unaccepted structured model response remains AI
  Execution attempt evidence rather than a second GEO-owned semantic record.
- The additive S4 migration backfills the deterministic S3 interpretation rows,
  makes the legacy description, characteristic, summary, and generic-evidence
  columns compatibility-only and nullable, and stops all new writes to them.
  They are not read when `semanticPayload` is present and can be removed only in
  a separately reviewed cleanup after every reader has migrated. S4 never
  dual-writes two semantic sources of truth.
- Stable mention and evidence-anchor identities inside the validated payload let
  the overall synthesizer reference exact observations without inventing a
  generic entity framework. Generated HTML, counts, rates, and cross-sample
  conclusions are invalid at this boundary.
- S4 does not add a synthesis-input hash or a second input-snapshot table. The
  immutable definition, accepted interpretation identities and versions, and
  deterministic aggregate-policy version identify the business inputs, while
  the exact resolved input is retained once in the linked attempt request. S4
  adds a dedicated AI-owned `AiSynthesisAttempt` relation
  scoped by execution cycle and attempt number. It records request, response or
  classified failure, route identity, latency, and usage without making the
  existing sample-scoped attempt nullable, polymorphic, or weakly referenced.
  Both attempt kinds reuse the execution result and failure taxonomy through a
  small application port rather than one compromised database table.
- One run has at most one GEO-owned accepted `EvaluationSynthesis` and one
  `EvaluationReport`. The accepted synthesis links the exact successful attempt
  and stores evidence-linked semantic organization and brand-group mappings.
  The report stores a versioned public document, materialized deterministic
  metrics, and the policy identities needed to reproduce them from linked
  accepted interpretations. Complete original answers remain in their S3
  evidence owner and are linked, not copied into an editable report blob.
- Comprehensive article guidance is stored one-to-one behind a protected
  `EvaluationOptimizationGuidance` query boundary. The public report DTO is
  assembled from an explicit customer projection and cannot obtain source
  metadata, prompts, attempt evidence, resolution sources, or internal guidance
  by omission-prone field filtering.

This shape deliberately uses PostgreSQL constraints, Prisma, Zod schemas, the
existing Outbox and BullMQ delivery boundary, and pure calculation functions. It
does not add a workflow engine, vector store, brand-master hierarchy, runtime
prompt hot-swap system, or a new queue. A maintained Markdown sanitizer and the
smallest suitable annotation mechanism must be selected from current primary
sources before Web implementation; exact dependency choice is not approved by
this card.

#### Lifecycle and consistency

1. The same GEO transaction that first moves a cycle and run to
   `READY_FOR_SYNTHESIS` appends one `evaluation.run.synthesize.requested` Outbox
   work fact. Reconciliation scans ready runs without an accepted report or
   terminal synthesis exhaustion and reasserts a missing fact. An in-flight
   attempt records execution without creating a customer-visible business stage.
2. GEO assembles the frozen synthesis input from immutable owner records and
   asks AI Execution for the next bounded synthesis attempt. AI Execution
   snapshots that exact request once. Delivery retry and synthesis-attempt
   policy remain separate, and a duplicate delivery first reloads durable owner
   state.
3. A successful structured response is validated against its exact input:
   every sample, mention, observation, group member, theme, direction, and
   evidence reference must resolve; deterministic values supplied by the Agent
   are rejected rather than reconciled.
4. One PostgreSQL transaction recomputes deterministic aggregates with pure
   versioned policies, accepts the synthesis and reporting groups, creates the
   immutable public report and protected internal guidance, changes the run to
   `COMPLETED`, and changes its internal stage to `REPORT_ACCEPTED`. No unconsumed
   report-completion Outbox fact is created in S4; S5 adds a notification fact
   only with its actual consumer and delivery contract. A uniqueness constraint
   makes repeated completion return the accepted report.
5. A structural or reference failure retains the exact successful transport
   response in its attempt but does not accept it as GEO synthesis. While the
   bounded synthesis policy has another entry, the GEO failure-decision
   transaction appends the next work fact without sampling or per-sample parsing
   again. When the policy is exhausted, GEO changes the run
   to public `PLEASE_RETRY`, changes its internal stage to
   `SYNTHESIS_EXHAUSTED`, and issues no partial report. The S5 customer retry
   command can later open a synthesis-only execution cycle over the retained
   evidence.

Brand resolution is an optional quality step inside synthesis, not a completion
dependency. Obvious consumer-brand relationships can be grouped from retained
names and context; uncertain relationships can use search; unavailable or
inconclusive search leaves names separate. Real search-provider routing and
fallback behavior remain S6 gates even though S4 fixtures must exercise their
contract outcomes.

#### Security, operations, and evolution

- Every report query is authorized by the authenticated account and immutable
  brand/run ownership. Agent or administrator access remains a later
  role-specific query contract rather than an S4 shortcut around ownership.
- Markdown is treated as untrusted input. Sanitization precedes deterministic
  annotation, unsupported anchors fail closed to an unhighlighted original
  projection, and neither path changes retained answer evidence.
- Metrics distinguish synthesis delivery, attempt failure, validation failure,
  report-acceptance latency, and reconciliation recovery. Telemetry is never an
  acceptance dependency.
- Exact resolved parser and synthesis instructions remain in linked AI attempts;
  accepted semantic and report records carry only the versions that select
  their compatible readers and deterministic policies. Together these links
  prevent later aggregation, Prompt, report-document, or highlight improvements
  from rewriting historical reports without duplicating execution snapshots.
  Prompt wording is a GEO-owned executable asset reviewed with its output
  contract, not a provider-specific product fork or an independent
  prompt-research workstream. New fields evolve additively; a breaking
  interpretation meaning requires a separately reviewed migration.
- The bounded workload remains seventeen to twenty accepted interpretations and
  one overall synthesis per run. Evidence does not justify a second queue or
  distributed workflow layer at this scale; those are reconsidered only if
  measured load or materially longer orchestration introduces a new failure
  boundary.

#### Verification boundary

S4 verification must cover both parser profiles; list, table, heading, and
paragraph answers; mention and zero-mention cases; median and recommendation
index calculations; **Starbucks**, **STARBUCKS**, and **Starbucks Reserve** in
one reporting group; a distinctly independent sub-brand left separate; search
unavailable with non-blocking degradation; duplicate synthesis delivery;
restart before and after attempt persistence; invalid and cross-run evidence
references; 20/20 and 17/20 completion; exhausted synthesis to `PLEASE_RETRY`;
atomic report acceptance; authorization and private-field exclusion; immutable
original Markdown; and safe no-highlight fallback. Deterministic fixtures prove
these contracts, not real-provider quality, capacity, cost, or production
readiness.

The semantic contracts are confirmed and the architecture card is stable enough
for one explicit approval before S4 implementation. Exact customer copy and
final visual composition remain later interaction refinement over this accepted
meaning.

## Proposed S4a Implementation Preflight

S4a activates only the per-sample semantic boundary. It does not add accepted
overall synthesis, report, optimization-guidance, or customer-report tables, and
it does not call a real model. Its stopping point is that every newly accepted
interpretation is represented by one versioned two-profile contract that S4b can
consume without reading AI Execution internals or legacy semantic columns.

### Exact persistence delta

`EvaluationSampleInterpretation` remains the GEO-owned aggregate and retains its
existing unique sample and accepted-attempt relationships. S4a adds only these
required columns after a compatibility backfill:

| Field                     | Database shape | Meaning and owner                                                                                                             |
| ------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `semanticContractVersion` | `varchar(40)`  | Selects the GEO-owned stored-payload reader and semantic meaning; migrated S3 fixtures use the explicit compatibility version |
| `semanticPayload`         | `jsonb`        | The single accepted owner of every non-metric semantic field                                                                  |

`mentioned` and `position` remain required scalar columns. `position` is the
open-question recommendation position only; it is never reused for a
brand-directed contextual comparison. The migration adds database checks that
`position` is null or positive and that a non-mentioned target cannot have a
position. The stronger question-family combinations remain GEO application
invariants because the immutable question kind is owned through the related
sample rather than duplicated into this table.

| Invariant                                                                             | Enforcement                                                                                   |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| One accepted interpretation per sample                                                | Existing unique `sample_id`                                                                   |
| One interpretation accepts one exact attempt                                          | Existing unique `accepted_attempt_id` plus composite foreign key to `(attempt_id, sample_id)` |
| Position is null or positive                                                          | Named PostgreSQL `evaluation_sample_interpretations_position_positive_check`                  |
| A non-mentioned target has no position                                                | Named PostgreSQL `evaluation_interpretations_nonmention_position_check`                       |
| Direct/open combinations, contract/profile match, evidence references, and exact text | GEO structural and semantic acceptance before the repository transaction                      |

The existing `relevantDescription`, `characteristics`, `objectiveSummary`, and
`structuredEvidence` columns become nullable migration-compatibility columns.
After backfill, new acceptance writes only `mentioned`, `position`,
`semanticContractVersion`, and `semanticPayload`. No new index is added: unique
`sampleId`, unique `acceptedAttemptId`, and their existing composite attempt
foreign key already serve the S4a access and integrity paths.

### Compatibility migration

The migration is data-preserving and executes in this order:

1. Add the two new columns as nullable.
2. Backfill existing deterministic S3 interpretations with the repository-owned
   compatibility contract version. Build a typed
   `S3_COMPATIBILITY` payload from the legacy description, characteristics,
   summary, and generic evidence without claiming evidence anchors that S3 never
   produced.
3. Make both new columns required after verifying the backfill count equals
   the interpretation count; make the four legacy semantic columns nullable.
4. Add the positive-position and non-mention-position PostgreSQL checks after
   the compatibility rows have been preserved.
5. Change application reads to require the new contract version and use only
   `semanticPayload`. Compatibility payloads remain readable for local
   pre-S4 evidence but use the safe unhighlighted presentation path.
6. Stop all new writes to legacy semantic columns. Their later physical removal
   is a separately reviewed cleanup after current code, tests, and local
   migration evidence no longer depend on them.

This compatibility discriminator is not a third parser prompt. Only migrated S3
fixture rows may use it, and no new interpretation may be accepted with that
kind.

The compatibility payload has one intentionally small shape:

```ts
type S3CompatibilitySemantic = {
  profile: "S3_COMPATIBILITY";
  migratedDescription: string | null;
  migratedCharacteristics: unknown;
  migratedSummary: string;
  migratedStructuredEvidence: unknown;
  highlightUnavailable: true;
};
```

It preserves the old values without presenting them as modern evidence anchors
or other-brand records. The stored-payload reader accepts this migration kind,
while the parser-output contract below never does. Because S4a is a local,
single-version deterministic deployment, API and Worker processes are stopped
while the reviewed migration applies; any future rolling production migration
must reopen the expand-and-contract deployment sequence.

### Accepted output contract

The parser output envelope contains the metric facts so GEO can validate and
decompose the result, while the persisted `semanticPayload` deliberately omits
them:

```ts
type SampleParserOutput =
  | {
      family: "BRAND_DIRECTED";
      mentioned: boolean;
      position: null;
      semantic: SharedSemantic & BrandDirectedSemantic;
    }
  | {
      family: "OPEN_DISCOVERY";
      questionKind:
        "INDUSTRY_RECOMMENDATION" | "CHARACTERISTIC_ONE" | "CHARACTERISTIC_TWO";
      mentioned: boolean;
      position: number | null;
      semantic: SharedSemantic & OpenDiscoverySemantic;
    };

type SharedSemantic = {
  profile: "BRAND_DIRECTED" | "OPEN_DISCOVERY";
  answerStructure:
    | "ORDERED_LIST"
    | "UNORDERED_LIST"
    | "TABLE"
    | "HEADINGS"
    | "PARAGRAPHS"
    | "MIXED";
  targetDisplayedForms: string[];
  targetObservations: SemanticObservation[];
  otherBrands: OtherBrandRecord[];
  evidenceAnchors: EvidenceAnchor[];
  cardInterpretation: string;
  limitations: string[];
};

type SemanticObservation = {
  observationId: string;
  label: string;
  detail: string;
  polarity: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED" | "UNCERTAIN";
  evidenceAnchorIds: string[];
};

type OtherBrandRecord = {
  brandMentionId: string;
  displayName: string;
  observedForms: string[];
  role:
    | "RECOMMENDED"
    | "CONDITIONALLY_RECOMMENDED"
    | "COMPARED"
    | "ALTERNATIVE"
    | "EXAMPLE"
    | "EXCLUDED"
    | "MENTIONED_ONLY";
  relativePosition: number | null;
  positionKind: "RECOMMENDATION" | "CONTEXTUAL" | null;
  evidenceAnchorIds: string[];
};

type EvidenceAnchor = {
  anchorId: string;
  exactText: string;
  occurrence: number;
  purposes: Array<
    | "TARGET_MENTION"
    | "TARGET_POSITION"
    | "OTHER_BRAND"
    | "DESCRIPTION"
    | "CHARACTERISTIC"
    | "LIMITATION"
  >;
};

type BrandDirectedSemantic = {
  profile: "BRAND_DIRECTED";
  statedIdentity: SemanticObservation[];
  positioning: SemanticObservation[];
  offerings: SemanticObservation[];
  audiences: SemanticObservation[];
  contextualTargetPosition: number | null;
  contextualPositionEvidenceAnchorIds: string[];
};

type OpenDiscoverySemantic = {
  profile: "OPEN_DISCOVERY";
  targetRole:
    | "RECOMMENDED"
    | "CONDITIONALLY_RECOMMENDED"
    | "COMPARED"
    | "EXCLUDED"
    | "MENTIONED_ONLY"
    | "NOT_MENTIONED";
  recommendationReasons: SemanticObservation[];
  conditions: SemanticObservation[];
  queryFit: SemanticObservation[];
};
```

The executable contract uses one JSON-representable structural Zod schema and a
separate semantic refinement function. GEO generates JSON Schema from the
structural schema with unsupported-type conversion set to fail. The exact
resolved JSON Schema travels in the append-only AI attempt request, while the
accepted interpretation stores only the semantic contract version needed for
future reads. Cross-field refinements are not presented as if they were
expressed to the model. This boundary is supported by the [S4a schema-tooling
source brief](research/s4a-schema-tooling-source-brief.md).

Both structural branches use strict objects plus bounded strings and arrays.
After structural parsing, the semantic validator enforces these cross-field
invariants:

- the output family and open-question kind must match the immutable question;
- brand-directed `position` is always null; contextual order lives only in its
  profile detail and requires a genuine ordered comparison anchor;
- an open mention requires a positive position, while a non-mention requires a
  null position and `NOT_MENTIONED` role;
- a mention requires at least one displayed target form and target-mention
  anchor, while a non-mention retains neither;
- every local ID is unique within the interpretation and every referenced
  anchor ID resolves;
- every `exactText` plus occurrence resolves against the immutable original
  answer; failure rejects the interpretation rather than weakening evidence;
- a current-brand form cannot also remain in `otherBrands`, and one perceived
  other brand is represented once per sample with all observed forms retained;
- each observation and brand record has evidence, while absence does not gain an
  invented cause;
- unknown keys, HTML, cross-sample counts, rates, scores, group identities, and
  rewritten answer content are rejected.

The final numeric and length bounds are implementation constants beside the
Zod schema, selected to contain one complete answer without accepting unbounded
model output. Changing those bounds is a local validation-policy change, not a
product-schema version change unless accepted meaning changes.

### Prompt assets and assembly

GEO Intelligence owns three project assets under one parser directory:

- `apps/backend/geo-intelligence/sample-parser/common.json`;
- `apps/backend/geo-intelligence/sample-parser/brand-directed.json`;
- `apps/backend/geo-intelligence/sample-parser/open-discovery.json`.

Each asset has an ID, semantic version, and non-empty Chinese instruction
content. The loader validates them at process start and composes exactly one
shared plus one profile instruction. The AI attempt request snapshots the exact
resolved content and output schema; the interpretation does not duplicate that
execution evidence.

Prompt assembly has three explicit layers:

1. **System instruction:** shared evidence, objectivity, exact-anchor,
   uncertainty, no-statistics, no-HTML, and schema-only rules followed by the
   selected question-family emphasis.
2. **User context:** only the frozen company/store name, industry, region, two
   characteristics, exact question kind and text, and immutable original answer.
   Contact information and provider-source metadata are excluded.
3. **Output contract:** GEO-generated structural JSON Schema plus the semantic
   contract version; AI Execution may translate supported
   structured-output transport but cannot change its fields or meaning. GEO
   still applies the separate semantic-rule set after the result returns.

The per-sample parser does not browse the web, verify the answer against the
limited brand profile, calculate statistics, or use provider-specific product
wording. Model route, parameters, production fallback, and Langfuse integration
remain S6 decisions.

### Module call and dependency path

The existing AI attempt request becomes a purpose-discriminated TypeScript
contract rather than an untyped `Record<string, unknown>` input:

```text
GEO immutable sample context
  -> GEO parser-profile resolver and Prompt assembler
  -> AI Execution structured-task port
  -> deterministic S4a adapter and append-only sample attempt
  -> GEO Zod plus semantic validation
  -> GEO interpretation acceptance transaction
```

For `EVALUATION_INTERPRETATION`, the structured task carries the resolved system
instruction, a typed user-context value, and the output-contract identity and
canonical JSON Schema. Acquisition keeps its existing discriminated input. AI
Execution persists and executes this resolved envelope but imports neither GEO
repositories nor GEO Zod validators; GEO never queries the private attempt store
and accepts only the returned attempt identity and proposed output.

S4a extends the current evaluation coordinator locally instead of introducing a
second parser coordinator, generic Agent framework, prompt registry, or workflow
engine. S4b may reuse the stable structured-task envelope for synthesis only
after its distinct run-scoped attempt identity is implemented.

### S4a focused verification matrix

| Claim                                              | Required evidence before S4a acceptance                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Migration preserves current S3 evidence            | Existing-row backfill test plus clean empty-database replay and interpretation-count equality                                        |
| One semantic source of truth                       | Repository test proves new rows leave legacy columns null and every read uses `semanticPayload`                                      |
| Profiles cannot drift across question families     | Zod tests reject direct/open mismatches and incorrect position combinations                                                          |
| Evidence anchors are real                          | Focused tests cover repeated text, missing text, unresolved IDs, lists, tables, headings, and paragraphs                             |
| Current and other brands remain distinct           | Tests cover same-name target recognition, unfamiliar alias non-mention, multiple displayed forms, and explicit other brands          |
| Attempts remain append-only and accepted correctly | Integration tests retain exact successful-attempt linkage under duplicate delivery and parser retry                                  |
| S3 recovery is unchanged                           | Existing 20/20, 17/20, 16/20, duplicate-delivery, restart, and telemetry-isolation tests remain green                                |
| No internal data enters customer contracts         | Generated OpenAPI diff contains no Prompt, semantic contract, anchors, attempt, source, or trace fields in the S4a progress response |

S4a does not require a report page, browser visual review, Markdown rendering
dependency, real-provider call, prompt-quality benchmark, load test, or S6 cost
claim. Those checks cannot change this increment's acceptance decision.

## Proposed S4b Implementation Preflight

S4b begins only after the per-sample semantic boundary is stable. It turns one
eligible `READY_FOR_SYNTHESIS` cycle into either one atomically accepted current
report or one explicit synthesis exhaustion. It does not expose the report API,
render the Web report, activate a real model or public search route, add a
customer retry action, or emit a notification without a consumer.

### Canonical ownership and proportional traceability

S4b uses three durable semantic identities, each because it selects a different
reader or calculation action:

| Identity                         | Stored owner       | Action selected                                                            |
| -------------------------------- | ------------------ | -------------------------------------------------------------------------- |
| `evaluation.overall-synthesis@1` | Accepted synthesis | Validates and reads the normalized cross-sample semantic payload           |
| `evaluation.report-metrics@1`    | Accepted report    | Reproduces deterministic report calculations from accepted interpretations |
| `evaluation.report-document@1`   | Accepted report    | Validates and serves the immutable customer document in S4c                |

They are semantic versions, not content hashes. The accepted synthesis links
the exact successful attempt, and that AI-owned attempt already stores the
resolved Prompt, output schema, business input, route, and returned envelope.
Therefore S4b adds no Prompt hash, schema hash, aggregate hash, synthesis-input
hash, duplicate input table, or report copy of original answers. A later hash is
appropriate whenever it is the clearest and most efficient identity,
deduplication, comparison, or integrity mechanism and changes a real system
action. It is omitted here because immutable links and one exact request
snapshot are currently more direct, not because hashes are categorically
disallowed.

In Chinese product and project communication, this capability is called
**整体归纳生成**, and one persisted execution is described as an **整体归纳执行记录**.
The internal code name `AiSynthesisAttempt` remains a precise storage-level term
and is not customer-facing wording.

The records form one directed chain rather than competing sources:

```text
immutable definition, answers, and accepted interpretations
  -> exact AI synthesis attempt request and response
  -> accepted normalized synthesis and protected guidance
  -> immutable customer report document
```

`EvaluationSynthesis` is the accepted internal semantic evidence and grouping
record. `EvaluationReport.publicDocument` is the sole customer-report document
and is never reconstructed differently on each read. The public document is a
one-way immutable projection, not a second editable semantic owner. Complete
answers, question text, and platform identity remain linked through the run and
are joined by the S4c authorized query rather than copied into the report JSON.

### Deterministic calculation contract

One pure GEO policy consumes only accepted interpretations plus their immutable
sample, question, and platform identities. It has no database, clock, provider,
Prompt, or telemetry dependency. Its pre-synthesis output contains the numeric
facts the synthesizer may explain but may not replace:

- total and valid coverage, including missing sample identities;
- open-question valid count, mention count, and mention rate;
- average normalized position among mentioned valid open-question samples;
- raw recommendation index, one-decimal display value, and nearest-half-star
  value;
- median raw typical position, represented as none, one position, or the two
  different middle positions;
- the same mention and position facts grouped by platform; and
- eligible other-brand occurrences for later grouping, without deciding that
  two names are the same brand.

The exact index policy remains:

```text
5 × mentionRate × (0.70 + 0.30 × averageNormalizedPositionScore)
```

Only the three open-question families participate. Position normalization is
first `1.0`, second `0.8`, third `0.6`, fourth or fifth `0.4`, and sixth or later
`0.2`. A zero-mention result is `0.0`, has no average position component and no
typical position. The customer number rounds to one decimal; the star graphic
rounds independently to the nearest half star. Missing or exhausted samples do
not enter either numerator or denominator.

After synthesis validation, the same policy materializes grouped facts without
trusting Agent-supplied counts:

- a competitor occurrence counts at most once per sample and only for an open
  `RECOMMENDED`, `CONDITIONALLY_RECOMMENDED`, or `ALTERNATIVE` record;
- involved platforms are distinct platform identities, and a competitor's
  typical position uses only recommendation-position evidence;
- competitor groups sort by sample occurrence count, platform count, typical
  position, then stable display name, and the public document keeps at most
  five;
- each positive or negative theme count is the number of distinct accepted
  observation references assigned to it, with involved platforms derived from
  those samples; and
- every public count can be reproduced from the accepted mention-to-group or
  observation-to-theme mappings.

An overall synthesizer may omit a low-value theme or direction within the
confirmed display limits, but it has no schema field through which to submit or
override a metric. Public numeric facts are materialized only from deterministic
aggregates. The instruction also tells the synthesizer not to recalculate or
state competing cross-sample totals in narrative; prose quality remains an S6
validation concern rather than being approximated by a brittle digit filter.

### Overall-synthesis contract and Prompt boundary

GEO owns one versioned overall-synthesis instruction asset and its strict output
schema. The resolved request contains the frozen non-contact brand context,
four immutable questions, each valid sample's platform identity and accepted
semantic payload including its already validated exact-text evidence anchors,
and the deterministic pre-synthesis facts. Provider source metadata, contact
details, and complete original answers are excluded. Re-sending the full
answers would duplicate the per-sample parser's responsibility and introduce an
unbounded context path without changing the accepted evidence available to the
overall task. The retained original remains the immutable display and audit
source and can be reached by GEO validation when a referenced anchor must be
checked; vector retrieval or a second summarization stage is not needed.

The accepted structured output has this conceptual shape:

```ts
type OverallSynthesisOutput = {
  brandEntityGroups: Array<{
    groupId: string;
    displayName: string;
    members: Array<{
      sampleId: string;
      brandMentionId: string;
      relationship:
        | "SAME_NAME"
        | "TRANSLATION_OR_ABBREVIATION"
        | "STORE_FORMAT"
        | "SUBORDINATE_BRAND_LINE";
    }>;
    resolutionBasis: Array<{
      kind: "ANSWER_CONTEXT" | "PUBLIC_SEARCH";
      explanation: string;
      sourceUrl?: string;
    }>;
  }>;
  recommendationAssessment: EvidenceLinkedNarrative;
  brandPerception: EvidenceLinkedNarrative;
  themes: {
    positive: ThemeProposal[]; // maximum five
    negative: ThemeProposal[]; // maximum five
  };
  customerDirections: CustomerDirectionProposal[]; // maximum three
  internalGuidance: {
    summary: string;
    priorities: EvidenceLinkedGuidance[];
    writingAngles: EvidenceLinkedGuidance[];
    cautions: string[];
  };
  limitations: string[];
};
```

Narratives, themes, directions, and guidance reference accepted observations by
`sampleId` plus `observationId`; group members reference `sampleId` plus
`brandMentionId`. Every other-brand mention in every current-contract accepted
interpretation appears in exactly one group. The validator rejects missing,
duplicate, cross-run, cross-sample, or wrong-kind references, unknown fields
including Agent-supplied metric fields, HTML, rewritten answers, and more than
the confirmed display limits. Obvious subordinate lines can be grouped from
name and answer context; inconclusive or unavailable public search leaves names
separate and does not reject an otherwise valid output.

The Agent proposes the comprehensive internal guidance in the same bounded
semantic response so it can use the same evidence. Acceptance decomposes it
into the protected guidance relation; neither the public document builder nor
the later report DTO accepts that field in its input type.

S4b implements deterministic successful, structurally invalid, unresolved-
reference, grouped-name, independent-sub-brand, and search-unavailable fixtures.
The exact real model, search tool, fallback route, system instruction tuning,
capacity, and cost remain S6 gates.

### Exact persistence delta

S4b extends `EvaluationRunStage` with `REPORT_ACCEPTED` and
`SYNTHESIS_EXHAUSTED`, and extends `EvaluationExecutionCycleStatus` with
`COMPLETED`. It deliberately adds no transient `SYNTHESIZING` state: an
in-flight technical attempt is already visible in its AI-owned row, while the
business stage remains ready until one terminal GEO decision commits.

| Owner and model                        | Required fields and constraints                                                                                                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI Execution — `AiSynthesisAttempt`    | `runId`, `cycleId`, positive `attemptNumber`, status, route/model identities, exact request, response or classified failure, retryability, latency, usage, correlation, and timestamps; unique `(cycleId, attemptNumber)` and `(id, runId)` |
| GEO — `EvaluationSynthesis`            | unique `runId`, unique `acceptedAttemptId`, `semanticContractVersion`, normalized `semanticPayload`, and acceptance time; composite accepted-attempt reference proves the attempt belongs to the same run                                   |
| GEO — `EvaluationReport`               | unique `runId`, unique `synthesisId`, `metricPolicyVersion`, `documentContractVersion`, immutable `publicDocument`, and acceptance time                                                                                                     |
| GEO — `EvaluationOptimizationGuidance` | unique `runId`, unique `synthesisId`, protected `guidancePayload`, and acceptance time; it inherits semantic meaning from the linked synthesis rather than duplicating another version                                                      |
| GEO — `EvaluationSynthesisExhaustion`  | unique `cycleId`, unique `lastAttemptId`, `runId`, failure class, reason, and creation time; later synthesis-only cycles may retain their own exhaustion without overwriting prior evidence                                                 |

`EvaluationExecutionCycle` gains a composite unique `(id, runId)` solely so
`AiSynthesisAttempt(cycleId, runId)` and exhaustion records cannot connect a
cycle from one run to another. `EvaluationSynthesis(acceptedAttemptId, runId)`
references the matching attempt composite, and report and guidance composites
similarly prove that their synthesis belongs to the same run. All owner links
use restricted deletion. One application transaction owns the remaining
cross-table lifecycle invariant; adding triggers or a generic aggregate table
would not change a reachable S4 recovery action.

The report document contains the accepted customer overview, recommendation
index and coverage, platform comparison values, grouped positive and negative
themes, restrained competitor list, and three-or-fewer optimization directions.
It contains no full answer copy, provider source, resolution basis, Prompt,
attempt data, trace identity, queue state, or internal guidance. The exact
answer cards are joined from immutable S3 owners in S4c.

The migration is additive. It adds enum values, the cycle composite identity,
and the five new tables and reviewed foreign keys. It has no semantic backfill:
S3 compatibility interpretations remain preserved evidence but are not silently
promoted into a modern S4 report. Reconciliation may enqueue only a ready cycle
whose complete valid set uses the current semantic contract.

### Call path, retries, and consistency

S4b keeps the current sample execution path intact and adds one cohesive
run-level coordinator plus repository port. AI Execution adds a dedicated
synthesis-attempt repository and service. Both sample and synthesis services
reuse the stable structured-task adapter request, result envelope, and failure
taxonomy; they do not share a nullable or polymorphic persistence table and do
not introduce a generic Agent framework.

```text
readiness transaction
  -> evaluation.run.synthesize.requested Outbox fact
  -> GEO run-level synthesis coordinator
  -> AI Execution dedicated synthesis attempt
  -> GEO contract and reference validation
  -> one report-acceptance transaction or bounded retry/exhaustion
```

The readiness transaction appends the first work fact only when the cycle and
run durably enter `READY_FOR_SYNTHESIS`. Its business key includes run, cycle,
and synthesis attempt number. Duplicate queue delivery reloads current state;
it never increments the attempt. A retryable execution or semantic-contract
failure appends the next attempt fact in the same GEO failure-decision
transaction. The deterministic S4b policy contains three ordered slots—initial
primary attempt, primary retry, and one fallback attempt—matching the confirmed
bounded lifecycle without activating Hy3 or Alibaba Cloud Model Studio. Exact
provider and model identities remain replaceable by the later S6 route policy.

Acceptance performs these steps in one PostgreSQL transaction:

1. Reload the eligible run, ready cycle, accepted interpretations, immutable
   sample identities, and exact successful synthesis attempt.
2. Recompute deterministic metrics and revalidate every synthesis reference.
3. Create the accepted synthesis, protected guidance, and immutable public
   report.
4. Change the cycle from `READY_FOR_SYNTHESIS` to `COMPLETED` and the run from
   `EVALUATING/READY_FOR_SYNTHESIS` to `COMPLETED/REPORT_ACCEPTED`.

Unique constraints make duplicate completion return the already accepted
report. If any create or state transition fails, none of the synthesis, report,
guidance, or completion writes commit. No report-completed Outbox event is
created in S4.

When a non-retryable failure occurs or the final policy slot is rejected, one GEO
transaction creates `EvaluationSynthesisExhaustion`, changes the cycle to
`EXHAUSTED`, and changes the run to
`PLEASE_RETRY/SYNTHESIS_EXHAUSTED`. It retains all accepted samples and issues no
partial report. Delivery reconciliation scans current-contract ready cycles
without an accepted report or current-cycle exhaustion and reasserts only their
missing synthesis work fact; it does not resample, reinterpret, or infer a
customer retry command.

### S4b focused verification matrix

| Claim                                   | Required evidence before S4b acceptance                                                                                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metrics are deterministic               | Pure tests cover every position bucket, zero mention, one-decimal and half-star rounding, odd/even median, platform grouping, and missing-sample denominators                                   |
| Agent cannot become a calculator        | Contract tests reject metric fields, unresolved observation or brand IDs, incomplete or duplicate grouping, cross-run references, unknown keys, and excessive themes or directions              |
| Practical grouping remains reproducible | Fixtures merge Starbucks casing and Starbucks Reserve, retain one distinct independently positioned sub-brand, count a group once per sample, and degrade safely when search is unavailable     |
| Attempt ownership is sound              | Migration inspection proves cycle/run and attempt/run composite foreign keys, positive attempt numbers, restricted deletion, and cycle-scoped uniqueness                                        |
| Work is resumable and idempotent        | Integration tests cover missing initial Outbox recovery, duplicate delivery, restart with a started or succeeded attempt, semantic rejection retry, and no duplicate report                     |
| Completion is atomic                    | Forced failure at each acceptance boundary leaves no partial synthesis, guidance, report, completed cycle, or completed run; success commits all five decisions together                        |
| Exhaustion is truthful                  | Final fallback rejection or non-retryable failure retains S3 evidence, records one current-cycle exhaustion, enters `PLEASE_RETRY/SYNTHESIS_EXHAUSTED`, and emits no report or completion event |
| S3 remains intact                       | Existing 20/20, 17/20, 16/20, sample retry, parser contract, duplicate-delivery, and telemetry-isolation tests remain green                                                                     |
| The migration is compatible             | Clean replay plus current-schema upgrade succeeds; representative compatibility rows remain unchanged and ineligible for silent S4 promotion                                                    |

S4b needs no browser review, Markdown dependency, real provider or search call,
load test, workflow engine, vector store, new queue, report-history interface, or
notification delivery. Those checks cannot discriminate acceptance of this
backend persistence and recovery boundary.

## Proposed S4c Implementation Preflight

S4c activates the customer-facing read path over the accepted S4b report. Its
stopping point is one authenticated, functionally complete current-report page.
It does not add report history, notification delivery, customer retry actions,
real synthesis providers, article generation, or final visual-language polish.

### Public query ownership and authorization

GEO Intelligence adds one current-report query port and service. The service
first asks Brand Knowledge for an account-authorized report-purpose view
containing only brand identity and the current evaluation fingerprint, then asks
the GEO repository for that brand's newest started run. A current report exists
only when that newest run is `COMPLETED/REPORT_ACCEPTED` and has its immutable
report. A newer evaluating or exhausted run means the preceding report is
history and the current-report query returns no report. A newer unstarted
definition does not displace the preceding completed report.

`GET /brands/:brandId/evaluation-report` returns a nullable report envelope so
the Web can distinguish an authorized brand with no current report from an
unknown brand without using transport errors as ordinary page state. The report
contains:

- report, run, definition, brand-snapshot, and completion identities and times;
- a `brandInformationChanged` comparison against the current profile fingerprint;
- the strict immutable public report document already owned by S4b;
- the four immutable questions in ordinal order and all five sample positions
  for each question in snapshotted platform order; and
- for each sample, only availability, mention, relative position, concise card
  interpretation, immutable original Markdown when retained, and bounded public
  highlight ranges.

The DTO has no internal guidance, source metadata, search-use detail, route or
model identity, Prompt, attempt, trace, queue, brand-resolution source, or raw
semantic payload. Authorization is expressed in the repository query itself
through `(accountId, brandId)` and is covered by cross-account HTTP tests.

### Evidence projection and fail-closed highlighting

The original `EvaluationSampleEvidence.answerContent` remains the only complete
answer owner. The report query never writes a rendered or annotated copy.
For current-contract interpretations, GEO derives a small projection of approved
source ranges from already validated anchors:

- target mention or target-position evidence becomes a target range;
- anchors used by positive or negative observations become corresponding
  evidence ranges;
- exact duplicate ranges merge by deterministic priority; and
- malformed, unresolved, overlapping, compatibility, or structurally unsupported
  evidence produces `highlightUnavailable: true` and no ranges.

Each range contains the immutable source start and end offsets, exact text, and
one display kind. Anchor IDs, observation IDs, full semantic groups, and
polarity internals remain private. A missing parser can still expose its retained
raw answer as `NOT_INCLUDED` without metrics or highlights; a missing acquisition
shows the sample position with no original answer.

The Web uses the dependency decision recorded in
`research/s4c-markdown-rendering-source-brief.md`:

```text
untrusted Markdown
  -> react-markdown / remark-gfm parse
  -> rehype-sanitize
  -> trusted exact-range annotation plugin
  -> React elements
```

Raw HTML parsing and `dangerouslySetInnerHTML` are prohibited. The annotation
plugin first proves that every supplied source range maps to the exact expected
text within one sanitized text node. It mutates nothing unless all ranges for the
card resolve without overlap. Its only output is a fixed `mark` node with an
approved display kind. Failure preserves the sanitized, formatted, unhighlighted
answer. Remote images render as inert labelled placeholders rather than network
requests; links retain the renderer's safe URL transform and open with bounded
browser attributes.

### Diagnosis-page state and information hierarchy

The existing diagnosis route remains one page rather than gaining a separate
report route. Its mutually exclusive states are no brand, incomplete brand,
question preparation, evaluating, please retry, and current report. Completion
polling fetches the current report once the run becomes completed. A completed
report remains primary after later brand edits and shows one concise information-
changed notice without being rewritten.

The report follows the confirmed non-expert reading order:

1. brand and evaluation context plus the concise opening assessment;
2. overall five-star recommendation index, total mention rate, typical position,
   and quiet valid-coverage indicator;
3. five-platform mention bars and separate position labels;
4. parallel positive and negative brand-perception themes;
5. restrained frequently recommended other-brand context;
6. four question groups containing five collapsed sample cards each, with the
   complete safe Markdown answer expandable in place; and
7. no more than three optimization-direction cards plus the later optimization
   entry as the report's final action section.

The customer-facing page uses each actual question rather than exposing the
internal brand-directed and open-discovery families. Titles are clear and formal;
copy is restrained and omits implementation explanations, grouping rules, and
display-limit commentary that do not help the customer act. Accepted brand-
perception themes must produce visible content; when evidence is genuinely
insufficient, the page presents one concise empty state instead of a visually
blank region.

S4c uses CSS and semantic HTML for its current simple stars, bars, counts, and
rank labels rather than pre-emptively adding a charting dependency. A separate
frontend-design pass may strengthen useful data visualization, comparison,
motion, and interaction after selecting components against the actual report
semantics. That pass must not replace evidence with decoration or move metric
calculation into the Web. The later optimization entry remains non-operational
until its owning module is implemented.

### Focused verification matrix

| Claim | Required evidence before S4c acceptance |
| --- | --- |
| Authorization is bounded | Session HTTP tests cover owner access, signed-out denial, and cross-account concealment |
| The public contract is complete and private | OpenAPI and response assertions cover all 20 positions and reject guidance, sources, model, Prompt, attempt, trace, and semantic-payload leakage |
| Current-report meaning is preserved | Tests cover current report after profile edit, changed-information notice, and no current report after a newer active or exhausted run |
| Markdown is safe and structured | Renderer tests cover headings, lists, tables, paragraphs, unsafe HTML/URLs, inert images, and no HTML injection |
| Highlighting is truthful | Tests cover repeated exact text, target and polarity ranges, range mismatch, overlap, cross-node formatting, and whole-card no-highlight fallback |
| Missing samples remain honest | A 17/20 report visibly contains three not-included positions and excludes them from displayed metrics without technical retry details |
| The customer can understand the report | Desktop and narrow-mobile browser review checks hierarchy, expansion, table scrolling, focus, console errors, and the absence of internal or unexplained English labels |

## S5 Evaluation Continuity

S5 completes evaluation continuity around the accepted S3 evidence and S4 report
owners. Its stopping point is one terminal customer who can retry a failed run,
open prior immutable reports, and receive durable evaluation-completed or retry-
required notices after leaving the diagnosis page. It does not activate real
providers or implement notifications for the later commercial roles.
The confirmed material choices are summarized in the
[S5 decision brief](decision-brief-s5.md).

### Retry-cycle ownership repair

The current schema proves the first execution cycle but couples each logical
`EvaluationSample` to that cycle. It also makes attempt numbers and stage
exhaustion unique across the sample rather than across one cycle. A second cycle
therefore cannot safely retain the first cycle's attempts and exhaustion while
starting a bounded retry sequence at attempt one.

Before adding the customer command, S5 changes the ownership shape:

- the run continues to own exactly twenty logical sample positions;
- `EvaluationSample` no longer owns `cycleId` and keeps the latest accepted or
  currently actionable stage state for that logical position;
- `AiExecutionAttempt` and `EvaluationStageExhaustion` identify `runId`,
  `cycleId`, and `sampleId`, with composite foreign keys proving that the cycle
  and sample belong to the same run;
- attempt uniqueness becomes `(cycleId, sampleId, purpose, attemptNumber)` and
  exhaustion uniqueness becomes `(cycleId, sampleId, purpose)` so every cycle
  retains an append-only bounded history;
- one partial unique database rule prevents more than one active or ready cycle
  for a run; the retry command also uses the run state as its compare-and-set
  boundary; and
- the migration backfills `runId` from existing immutable relations before
  replacing the old cycle/sample constraints, preserving all S3 and S4 rows.

A retry transaction is account authorized and idempotent. It requires the run
to be `PLEASE_RETRY`, creates the next sequence cycle, changes the run back to
`EVALUATING`, and appends only the work implied by durable state. A position with
no accepted answer returns to acquisition; a position with an answer but no
accepted interpretation returns only to parsing. Accepted interpretations are
never repeated. `SYNTHESIS_EXHAUSTED` opens a synthesis-ready cycle and appends
only synthesis work. Reconciliation reads the newest non-terminal cycle and the
run-owned logical samples rather than a sample-owned cycle ID.

### Immutable report history

History is a query over existing accepted reports, definitions, and evidence,
not a copied history table. GEO Intelligence exposes an account-and-brand-
authorized newest-first summary query plus an immutable detail query. The
current-report endpoint retains its existing meaning; a newer active or retry-
required run makes every earlier completed report historical. Initial history
has no comparison, trends, export, deletion, custom names, or profile-version
browser.

### Durable notifications and realtime hints

A new Notification capability owns recipient-scoped durable notices and read
state. GEO Intelligence never writes its tables directly. Instead, the same
transaction that accepts a report or commits terminal retry-required state adds
one product Outbox fact containing stable account, brand, run, occurrence, and
result identity. Background Work routes those two explicit event types to the
Notification application handler, which materializes one notification using a
unique source-event identity before the Outbox fact completes.

The notification record stores recipient account, notification kind, concise
title and summary snapshots, owning brand, evaluation-run subject, occurrence
time, and nullable read time. It stores no answers, scores, prompts, sources,
provider failures, queue state, trace IDs, or internal optimization guidance.
S5 exposes a bounded newest-first list, unread count, idempotent mark-one-read,
and mark-all-read commands.

One authenticated app-shell SSE endpoint emits only a refresh hint when durable
notification state changes. On initial connection, reconnect, page focus, or
hint receipt, the Web performs the ordinary notification read. A missed hint
therefore cannot lose a notice. S5 reuses NestJS/RxJS and a bounded database
check, adding no WebSocket, Redis Pub/Sub, Redis Stream, notification framework,
or second queue. Production proxy and connection behavior remains a release-
environment validation gate, as recorded in the linked
[source brief](research/s5-notification-delivery-source-brief.md).

An evaluation notification identifies its brand. Opening it uses the existing
current-brand command before navigating to diagnosis or the immutable historical
report, preserving one global brand context rather than creating a competing
page-local selection.

### S5 focused verification boundary

S5 verification must cover migration preservation, concurrent duplicate retry,
sample-only and synthesis-only retry, accepted-evidence reuse, restart and
reconciliation, current versus historical report selection, account isolation,
notification event duplication, Outbox interruption, durable read after a lost
SSE hint, reconnect, read-one and read-all commands, and cross-brand navigation.
Real providers, notification retention, multi-role event production, production
proxy behavior, load testing, and final frontend visual polish remain outside
the deterministic S5 completion claim.

## S5 Implementation Record

This record translates the confirmed S5 boundary into the smallest coherent
schema, module, transaction, HTTP, and Web change that was implemented and
locally verified. Accepted behavior is reconciled into the current
evaluation-evidence, evaluation-report, notification, and architecture owners;
this section remains the change-specific design and verification rationale.

### Exact persistence delta

S5 changes existing evaluation ownership in place and adds one Notification-
owned record. It does not add another workflow table, copied history table,
delivery ledger, realtime subscription table, or generic entity framework.

| Owner and model | Exact S5 shape | Invariants and reason |
| --- | --- | --- |
| GEO — `EvaluationSample` | Remove `cycleId` and the cycle relation; retain `runId`, definition, question, platform, current actionable status, accepted evidence, and accepted interpretation; add unique `(id, runId)` | One logical question-platform position belongs to the official run and survives every retry cycle |
| GEO — `EvaluationExecutionCycle` | Retain run, positive sequence, lifecycle status, attempts, exhaustion, and synthesis relations; remove the direct sample collection | A cycle represents one bounded execution episode, not ownership of the twenty logical positions |
| AI Execution — `AiExecutionAttempt` | Add required `runId`; reference cycle by `(cycleId, runId)` and sample by `(sampleId, runId)`; replace attempt uniqueness with `(cycleId, sampleId, purpose, attemptNumber)`; retain `(id, sampleId)` for accepted evidence and interpretation; add `(id, cycleId, sampleId, runId)` for exact exhaustion linkage | Attempt numbering restarts inside a new customer retry without weakening run, cycle, sample, or accepted-attempt integrity |
| GEO — `EvaluationStageExhaustion` | Add required `runId`; reference cycle by `(cycleId, runId)`, sample by `(sampleId, runId)`, and last attempt by `(lastAttemptId, cycleId, sampleId, runId)`; replace sample-wide uniqueness with `(cycleId, sampleId, purpose)` | Every cycle retains its own terminal failure while a later cycle can retry the same logical position |
| Notification — `Notification` | UUID identity, recipient account, unique source Outbox-event identity, `kind`, concise title and summary snapshots, typed JSON target, occurrence time, nullable read time, and creation time | Notification owns the durable inbox and read state; its source capability remains the owner of the underlying business result |

`NotificationKind` initially contains only `EVALUATION_COMPLETED` and
`EVALUATION_RETRY_REQUIRED`. The accepted target is a discriminated union rather
than a stored Web URL:

```ts
type NotificationTarget =
  | {
      kind: "EVALUATION_REPORT";
      brandId: string;
      runId: string;
      reportId: string;
    }
  | {
      kind: "EVALUATION_RETRY";
      brandId: string;
      runId: string;
    };
```

The Notification application validates this target on write and read. New
capabilities may add explicit variants later; S5 does not create nullable
evaluation-specific foreign-key columns or accept arbitrary customer-supplied
paths. `sourceEventId` remains a stable idempotency identity rather than a
foreign key whose deletion would control notification lifetime.

The exact Notification persistence shape is:

```prisma
model Notification {
  id                 String           @id @default(uuid()) @db.Uuid
  recipientAccountId String           @map("recipient_account_id") @db.Uuid
  sourceEventId      String           @unique @map("source_event_id") @db.Uuid
  kind               NotificationKind
  title              String           @db.VarChar(120)
  summary            String           @db.VarChar(320)
  target             Json
  occurredAt         DateTime         @map("occurred_at")
  readAt             DateTime?        @map("read_at")
  createdAt          DateTime         @default(now()) @map("created_at")
  recipient          Account          @relation(fields: [recipientAccountId], references: [id], onDelete: Cascade)

  @@index([recipientAccountId, createdAt, id])
  @@index([recipientAccountId, readAt])
  @@map("notifications")
}
```

The account owns the inbox lifetime, so account deletion may cascade these
presentation records; deleting an Outbox row or changing a Web route cannot.

The database adds a partial unique index over `EvaluationExecutionCycle.runId`
for `ACTIVE` and `READY_FOR_SYNTHESIS` statuses. Together with the run-status
compare-and-set in the retry transaction, this prevents two non-terminal cycles
for one run. Notification reads use `(recipientAccountId, createdAt, id)` for
newest-first pagination and `(recipientAccountId, readAt)` for unread queries.

### Migration sequence and rollback boundary

The deterministic local API and Worker stop while the reviewed migration runs:

1. Add nullable `run_id` to sample attempts and stage exhaustion, then backfill
   it from each row's existing logical sample; abort if any row is unresolved or
   its current sample and cycle belong to different runs.
2. Add `(id, run_id)` on samples and the new attempt composite identity. Add the
   new run-consistent cycle, sample, and last-attempt foreign keys before
   removing the former `(sample_id, cycle_id)` ownership links.
3. Replace attempt and exhaustion uniqueness with their cycle-scoped forms,
   make both new `run_id` columns required, remove `EvaluationSample.cycleId`,
   and add the one-non-terminal-cycle partial unique index.
4. Create the Notification enum, table, recipient/read indexes, unique source-
   event identity, and account relation.
5. Regenerate Prisma and apply the application change only after the upgraded
   schema proves that every existing run still has twenty logical positions and
   every accepted evidence, interpretation, synthesis, and report link resolves.

Because no external or production database exists, S5 uses one reviewed
transform migration rather than carrying a dual-written compatibility column.
Clean replay and upgrade of the current S4 database are mandatory. After a
second cycle exists, rollback to the former sample-owned-cycle schema is not
representable; rollback therefore means restoring the pre-migration local
database snapshot or applying a reviewed forward correction. A future rolling
production deployment must reopen an expand-and-contract plan rather than reuse
this local stop-the-world assumption.

### Retry command and state transitions

`POST /evaluation-runs/:runId/retries` is the only customer retry command. It is
account authorized and returns the existing non-terminal cycle outcome when the
same request is repeated. One transaction:

1. loads the account-owned run and newest cycle;
2. accepts only `PLEASE_RETRY` with either `PROCESSING_EVIDENCE` or
   `SYNTHESIS_EXHAUSTED` internal stage;
3. compare-and-sets that run back to `EVALUATING`, so only one concurrent caller
   may create the next positive sequence;
4. creates the new cycle and appends work implied by retained owner state; and
5. returns the public run projection without performing an external call.

For evidence-stage recovery, every `ACQUISITION_EXHAUSTED` sample returns to
`PENDING` and receives acquisition attempt one in the new cycle. Every
`INTERPRETATION_EXHAUSTED` sample must already have canonical evidence, returns
to `EVIDENCE_ACCEPTED`, and receives interpretation attempt one. Accepted
interpretations remain unchanged. Readiness continues to wait until all twenty
run-owned samples are terminal, then applies the unchanged seventeen-sample
threshold.

For `SYNTHESIS_EXHAUSTED`, the new cycle starts as `READY_FOR_SYNTHESIS` and
receives only synthesis attempt one over the retained interpretations. It never
reopens a sample. Reconciliation discovers the newest non-terminal cycle from
the run and schedules only a currently actionable sample or synthesis stage;
it no longer infers the cycle from the logical sample.

The retry path adds `runId` to the sample-attempt execution request and
persistence port so AI Execution can enforce the new composite relations. It
does not change acquisition, parser, synthesis, scoring, or provider semantics.

### Completion facts and notification materialization

GEO appends exactly one business fact in the same transaction that makes the
customer result durable:

| Event | Business key | Minimal payload |
| --- | --- | --- |
| `evaluation.report.accepted` | `evaluation-run:<runId>:report-accepted` | account, brand, brand-name snapshot, run, and report |
| `evaluation.retry.required` | `evaluation-run:<runId>:cycle:<cycleId>:retry-required` | account, brand, brand-name snapshot, run, cycle, and evidence-or-synthesis stage |

The report fact is appended only after the immutable report identity exists.
The retry-required fact is appended only when the run transition to
`PLEASE_RETRY` succeeds. Duplicate work cannot create another fact because the
business key is unique.

The event envelope's existing `createdAt` is the notification occurrence time
and its existing `correlationId` remains operational context. Neither is copied
into the payload or exposed by the notification contract.

Background Work keeps its one Outbox authority and adds a small explicit router:
evaluation execution events continue to `EvaluationProcessCoordinator`; the two
result facts go to `NotificationEventHandler`. No dynamic subscriber registry or
generic in-process event bus is introduced for two stable consumers. The
Notification handler validates the event, maps its approved Chinese title,
summary, and target, and inserts one row by unique `sourceEventId`. It does not
query or mutate GEO tables. Only after that durable insert succeeds does the
Outbox event become completed.

### Notification module and public contracts

One backend `notification` capability contains its repository port, application
service, event handler, stored-target parser, and PostgreSQL adapter. A
controller-free application module is imported by both API and Worker graphs;
notification controllers remain in the API graph. Notification depends on
account identity for recipient ownership but does not depend on Brand Knowledge
or GEO internals.

The authenticated REST/OpenAPI surface is:

- `GET /notifications?limit=<1..20>&cursor=<opaque>` returns newest-first items,
  unread count, and an opaque next cursor;
- `PUT /notifications/:notificationId/read` idempotently marks one owned notice
  read and returns it;
- `PUT /notifications/read-all` idempotently marks the caller's current unread
  notices read and returns the resulting unread count; and
- `GET /notifications/events` returns an SSE stream of `refresh` hints only.

An item exposes ID, kind, title, summary, typed target, occurrence time, and
read state. It exposes no source-event identity, queue status, correlation,
answers, score payload, provider failure, source, prompt, attempt, trace, or
internal guidance. Cursor decoding is validated and malformed cursors are a
concise client error rather than an unbounded query.

The SSE route uses the existing authenticated session and a single RxJS stream
per rendered customer shell. Every two seconds it reads only the caller's
latest notification identity and unread count, emits when that revision changes,
and terminates through `ReadinessState.shutdown$`. It never carries the notice
body or read command. The browser creates `EventSource` with credentials, closes
it on unmount or logout, and performs the normal list read on connection, hint,
reconnect, and window focus. Reconnection or hint loss therefore changes only
latency, not retained data.

### Report-history contracts

GEO extends the existing account-authorized report repository rather than
creating a history owner:

- `GET /brands/:brandId/evaluation-reports?limit=<1..20>&cursor=<opaque>` returns
  immutable completed-report summaries newest first; and
- `GET /brands/:brandId/evaluation-reports/:reportId` returns the same explicit
  safe report projection already used by the current-report endpoint.

Each summary contains report and run identity, evaluation time, brand-name
snapshot, AI recommendation index, total mention rate, valid coverage, and the
concise prior-information marker. The query never loads attempts, prompts,
sources, raw synthesis, internal guidance, or queue records. Current report
selection remains unchanged: when the newest started run is active or needs
retry, every completed report appears in history; when it is completed, that
report is current and earlier completed reports are history.

### Bounded Web integration

The Web adds one reusable `CustomerNotificationCenter` to the existing customer
shell/sidebar composition rather than refactoring all page ownership. It owns
the one EventSource, unread badge, compact top-right result prompt, list panel,
read-one/read-all interactions, focus refresh, and unread document-title marker.

The diagnosis journey adds a secondary history entry and read-only detail route.
Current state or current report stays primary. Opening a completion notification
selects its active owning brand through the existing current-brand command and
then opens the stable report-detail target; opening a retry notice selects the
brand and opens current diagnosis. S5 does not introduce a second page-local
brand context. Future archived-brand navigation is deferred with the existing
archive capability and does not broaden S5.

The functional S5 UI follows the accepted Chinese, concise, role-appropriate
message boundary. Final report and notification visual language remains the
separate frontend-design workstream.

### Exact verification and completion gate

| Claim | Smallest discriminating evidence |
| --- | --- |
| Existing truth survives migration | Upgrade a representative S4 database, replay every migration into a clean temporary database, inspect the new foreign keys and partial unique index, and compare runs, twenty-position counts, attempts, exhaustion, accepted evidence, interpretations, synthesis, reports, and guidance before and after |
| Retry is one new cycle, not a new evaluation | Integration tests cover 16/20 acquisition exhaustion, interpretation-only recovery, concurrent duplicate commands, attempt numbering reset per cycle, preserved prior attempts/exhaustion, and no second run or logical sample |
| Synthesis retry reuses all evidence | Exhaust synthesis, retry, and assert one new synthesis cycle/attempt with zero new acquisition or interpretation attempts |
| Recovery remains durable | Interrupt before and after retry Outbox creation and notification materialization; reconciliation resumes only implied work and duplicates produce no extra cycle, report, or notification |
| History is immutable and authorized | HTTP tests cover current completed, newer evaluating, newer retry-required, newest completed, cursor order, full historical evidence, signed-out denial, cross-account concealment, and private-field exclusion |
| Notification is durable and private | Process completion and retry-required facts twice, assert one recipient record, unread/read transitions, bounded DTOs, account isolation, and durable list recovery after a skipped SSE hint |
| SSE is only a hint | Controller/Observable tests cover credentialed authorization, initial revision, distinct change, reconnect read, shutdown completion, and absence of notification bodies; browser review covers one connection, focus catch-up, title indicator, and no console error |
| Web behavior follows product meaning | Browser review covers current state priority, history navigation, completion and retry notifications for another active brand, global brand selection, read state, desktop and narrow-mobile layout, and no exposed execution terminology |

After focused tests, S5 must pass the complete backend test suite, Web tests,
type checks, generated Prisma/OpenAPI client reconciliation, production build,
formatting, project-framework validation, and `git diff --check`. Real provider,
production proxy, notification retention, load, and commercial-role checks are
reported as not run rather than treated as passes.
