# Decision Brief: S4 Overall Synthesis and Current Report

## Outcome

Let a non-expert small-business customer move from completed sampling to one
simple, evidence-backed current report without exposing AI or queue internals,
while retaining structured guidance for the later article workflow.

## Scope

- In: typed per-sample semantic interpretation, deterministic aggregates,
  deterministic overall-synthesis fixtures, immutable current-report
  persistence, authenticated report contracts, and a functionally complete
  current-report page.
- Out: real synthesis providers, evaluation-history navigation, customer retry
  action, notifications, article generation, final visual polish, production
  activation, and external AI cost or capacity claims.

## Decisions

| Decision                     | Choice                                                                                                                                                                                                                                                                                                                                                                  | Rationale                                                                                                                                                                                | Owner                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| S4 stopping point            | Complete one current report end to end; defer history, retry interaction, and notification to S5                                                                                                                                                                                                                                                                        | Proves customer meaning and report ownership rather than accepting a backend-only result, without mixing evaluation management into synthesis                                            | Product owner and architecture owner |
| Metric ownership             | Program code calculates mention, coverage, recommendation index, position, and evidence counts; the synthesizer cannot revise them                                                                                                                                                                                                                                      | Keeps auditable facts deterministic and prevents narrative generation from becoming a competing measurement engine                                                                       | Product owner and architecture owner |
| Typical appearance position  | Use the median raw position of mentioned valid open-question samples; keep average normalized position only inside the recommendation-index formula                                                                                                                                                                                                                     | Makes the opening description resistant to isolated outliers without changing the accepted score                                                                                         | Product owner                        |
| Visual boundary              | Deliver complete report behavior and information hierarchy in S4; defer final design-language refinement                                                                                                                                                                                                                                                                | Allows business and interaction verification while preserving the dedicated frontend-design workstream                                                                                   | Product owner                        |
| Semantic-analysis layers     | Per-sample parsing extracts high-value entities, positions, descriptions, characteristics, card interpretation, and evidence anchors; deterministic aggregation calculates statistics; overall synthesis organizes cross-sample meaning and guidance                                                                                                                    | Uses language-model judgment where semantic interpretation is needed without trusting it as a calculator or letting it rewrite evidence                                                  | Product owner and architecture owner |
| Evidence and formatting      | Agents return evidence references and highlight intent; GEO validates references and derives counts, while presentation code sanitizes and annotates a separate projection of the immutable original                                                                                                                                                                    | Preserves truthful evidence and safe formatting while still enabling readable cards and visual emphasis                                                                                  | Architecture owner                   |
| Competitor presentation      | Derive a restrained list of no more than five frequently recommended other brands from valid open questions, without competitor star ratings or full market analysis                                                                                                                                                                                                    | Uses already required semantic evidence to make the customer's missed recommendation opportunities concrete without turning the lightweight report into an enterprise competitor product | Product owner                        |
| Parser instruction profiles  | Keep one shared parser policy and discriminated output contract with brand-directed and open-discovery task profiles; pass the three open-question intents rather than maintaining three more prompts                                                                                                                                                                   | Preserves common evidence semantics while letting each question family extract its distinct product value without prompt drift                                                           | Product owner and architecture owner |
| Prompt ownership             | GEO Intelligence owns versioned parser and synthesis instruction assets and acceptance schemas; AI Execution snapshots and executes the resolved request without redefining its meaning                                                                                                                                                                                 | Keeps Prompt behavior aligned with product evidence semantics and independent from any provider adapter                                                                                  | Architecture owner                   |
| Interpretation storage       | Keep only target mention and open-question position as relational metric facts; store all other accepted semantics once in a versioned discriminated payload and retire legacy semantic columns without dual-writing                                                                                                                                                    | Preserves efficient deterministic calculation while avoiding two editable representations of descriptions, themes, and evidence                                                          | Architecture owner                   |
| Proportional traceability    | Store one semantic contract version on the accepted interpretation; keep the exact resolved Prompt and JSON Schema only in its linked AI attempt rather than duplicating content hashes in the business row                                                                                                                                                             | The accepted-attempt link already provides exact execution evidence, while one contract version is sufficient to select the compatible GEO reader                                        | Product owner and architecture owner |
| Synthesis-input traceability | Do not add an aggregate, Prompt, schema, or synthesis-input hash or a duplicate input table; identify immutable business inputs through owner links and policy versions, and retain the exact resolved synthesis input once in its linked attempt request                                                                                                               | Existing immutable records plus the exact attempt snapshot already support replay and diagnosis; another digest currently changes no recovery or compatibility action                    | Product owner and architecture owner |
| Report ownership             | Keep accepted synthesis as internal normalized evidence and grouping provenance, then atomically materialize one immutable public report document as the sole customer-facing owner; keep comprehensive guidance in a separate protected relation                                                                                                                       | Preserves exactly what the customer was entitled to see without rebuilding history differently or leaking private synthesis data, while avoiding two editable semantic sources           | Architecture owner                   |
| Accuracy boundary            | Use the brand snapshot for identity and context only; do not grade sampled answers for factual accuracy or conflict in the first release                                                                                                                                                                                                                                | Customer input is intentionally limited and cannot support a responsible fact-checking promise                                                                                           | Product owner                        |
| Other-brand resolution       | Let the overall synthesizer create practical reporting groups around the consumer-recognizable brand: merge aliases, translations, store formats, and obvious subordinate brand lines such as Starbucks Reserve under Starbucks; keep a distinctly independent sub-brand separate; use public search when context alone is insufficient and retain the basis internally | The report should match ordinary customer understanding without becoming a master-data project, while GEO can still reproduce all counts from accepted mention-to-group mappings         | Product owner and architecture owner |
| Resolution degradation       | Search unavailability or an inconclusive relationship leaves the affected names separate and never blocks an otherwise valid report                                                                                                                                                                                                                                     | Brand normalization improves readability but is not more important than delivering truthful retained evidence                                                                            | Product owner and architecture owner |
| Direct-answer order          | Retain contextual order only when a brand-directed answer genuinely compares multiple brands; never treat a forced brand mention or that order as open recommendation performance                                                                                                                                                                                       | Preserves useful evidence without inflating the main recommendation story                                                                                                                | Product owner                        |
| Synthesis attempt scope      | Add a dedicated cycle-scoped AI synthesis-attempt relation and reuse only the stable execution result/failure port; do not create a fake sample or weaken the existing sample-attempt foreign keys                                                                                                                                                                      | Overall synthesis and one platform sample have different lifecycle identities even though their execution envelopes are similar                                                          | Architecture owner                   |
| Completion and exhaustion    | Report acceptance, public completion, and protected guidance commit atomically; bounded synthesis exhaustion enters Please retry while retaining S3 evidence; S4 creates no completion event without a real consumer                                                                                                                                                    | Prevents partial reports, repeated sampling, stale internal stages, and permanently pending Outbox work                                                                                  | Product owner and architecture owner |

## Acceptance Boundaries

- One ready run produces at most one immutable accepted report linked to its
  frozen definition, evidence, interpretations, and synthesis attempt.
- Deterministic metrics can be reproduced from accepted sample interpretation
  data without reading generated narrative or telemetry.
- The report contains every confirmed customer section and the complete valid
  sample answers, but exposes no provider sources, prompts, attempts, queue
  state, trace identities, or internal guidance.
- Synthesis failure retains all S3 evidence and does not issue a partial official
  report or repeat sampling and per-sample interpretation.
- The semantic model has one accepted owner for every field; compatibility
  columns are never dual-written after the new payload is accepted.

## Assumptions

- Assumption: S4 reuses the accepted S3 Outbox, small-work, persisted-attempt,
  reconciliation, and graceful-shutdown boundaries.
- Assumption: deterministic S4 fixtures exercise brand-group decisions and
  source-reference validation; real search-enabled synthesis remains an S6
  provider-validation gate.

## Confirmation and Next Gate

- Confirmation: S4 stopping point, visual boundary, metric ownership,
  typical-position meaning, semantic-analysis layers, and no-agent-statistics
  boundary, competitor presentation, and non-destructive highlight boundary are
  confirmed. The shared-core plus two-profile parser model and no-fact-checking
  boundary are also confirmed. Practical consumer-brand grouping, the direct
  question position rule, and non-blocking resolution degradation are confirmed.
- Confirmation: the refined architecture direction was approved by the product
  owner on 2026-08-27 to begin the real S4 design and implementation sequence.
  It fixes Prompt ownership,
  canonical semantic storage, run-scoped synthesis-attempt integrity, terminal
  synthesis exhaustion, and the no-orphan-Outbox rule.
- Confirmation: on 2026-08-27 the product owner approved removing parser and
  schema hashes plus duplicate profile/schema identities from the accepted
  interpretation. S4a keeps one `semanticContractVersion`; the linked AI attempt
  owns the exact resolved instruction and output-schema snapshot.
- Confirmation: the exact S4a Prisma delta, constraint map, Zod contract, Prompt
  assembly boundary, compatibility migration, and focused test matrix were
  confirmed before implementation.
- Confirmation: S4a was implemented and locally verified on 2026-08-27 with one
  semantic contract version, two parser profiles, exact attempt-owned execution
  snapshots, compatibility backfill, focused contract and process tests, clean
  migration replay, representative S3-row preservation, and the complete build.
- Confirmation: on 2026-08-27 the product owner approved the S4b direction and
  clarified that hashes remain valid when they are the more direct and
  efficient mechanism; the project rejects defensive overuse, not hashes as a
  category. Human-facing Chinese discussion uses `整体归纳生成` and
  `整体归纳执行记录` instead of ambiguous wording such as `综合尝试`; the internal
  storage name `AiSynthesisAttempt` remains an implementation detail.
- Confirmation: the exact S4b preflight fixes deterministic calculation and
  post-group counting, the overall-synthesis contract, no-extra-hash
  traceability, five-table persistence ownership, cycle/run composite
  integrity, primary/retry/fallback recovery, atomic report acceptance, and
  terminal synthesis exhaustion.
- Confirmation: S4b was implemented and locally verified on 2026-08-27. The
  project-local database accepted the migration, a clean temporary database
  replayed all ten migrations, the reviewed tables and constraints were
  inspected, eleven focused process tests and all fifty-five backend tests
  passed, and the complete project build succeeded. Runtime verification found
  and closed the missing Background Work subscription for the new synthesis
  event.
- Confirmation: the 2026-08-27 product-owner report review accepted the
  functional S4 report and recorded a separate frontend follow-up: hide internal
  question-family terminology, use formal restrained copy, strengthen useful
  visual comparison, place optimization direction last, and provide reviewable
  brand-impression content without changing report metrics or backend ownership.
- Next action: begin the bounded S5 alignment for evaluation retry, history, and
  terminal-customer notifications while the separate frontend workstream owns
  the recorded S4c presentation follow-up.
- Confirmation required before: changing a material product meaning,
  exposing internal guidance or source evidence, or activating real paid
  providers.
