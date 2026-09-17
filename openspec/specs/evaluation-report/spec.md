# Evaluation Report Specification

## Purpose

Define the accepted S4 behavior that turns sufficient immutable evaluation
evidence into one customer-visible report and protected optimization guidance.
This specification owns report acceptance, calculation, projection, current-
report meaning, immutable report history, and synthesis-only retry. It does not
own evidence-stage retry, notifications, or final visual polish. S6 extends its
semantic execution boundary without transferring report authority to a model or
provider.

## Requirements

### Requirement: Atomic report acceptance

GEO Intelligence SHALL accept at most one immutable report for an official run
and SHALL keep partial synthesis from becoming an official customer result.

#### Scenario: Staged report analysis succeeds

- **WHEN** at least seventeen accepted sample interpretations, one accepted
  brand-name resolution and one valid report-composition result belong to the
  same eligible run and execution cycle
- **THEN** one transaction accepts the composed synthesis, materializes the
  public report, stores protected optimization guidance, completes the cycle,
  and changes the run to `COMPLETED/REPORT_ACCEPTED`
- **AND** duplicate delivery returns the already accepted result rather than
  creating another report or guidance record

#### Scenario: Overall synthesis is exhausted

- **WHEN** the bounded synthesis policy has no valid result remaining
- **THEN** the completed sample evidence and interpretations remain retained
- **AND** no partial report or guidance is accepted
- **AND** the run becomes `PLEASE_RETRY/SYNTHESIS_EXHAUSTED`

#### Scenario: The customer retries exhausted synthesis

- **WHEN** the account owner retries a run in
  `PLEASE_RETRY/SYNTHESIS_EXHAUSTED`
- **THEN** one new execution cycle starts ready for analysis and reuses an
  accepted brand-name resolution when one exists
- **AND** it schedules only the earliest incomplete aggregate stage
- **AND** every accepted answer and interpretation remains unchanged
- **AND** no acquisition or per-sample interpretation work is repeated
- **AND** concurrent or repeated retry commands return the same active retry

### Requirement: Deterministic report facts

Program logic SHALL own every customer-visible count, rate, score, position, and
coverage value.

#### Scenario: The report is calculated

- **WHEN** accepted sample interpretations are aggregated
- **THEN** program logic calculates mention rate, the five-star recommendation
  index, typical appearance position, valid coverage, platform comparisons,
  theme counts, and other-brand occurrence facts
- **AND** report composition may organize evidence and wording but cannot revise
  a metric or count evidence
- **AND** accepted report values can be reproduced from the linked immutable
  evidence, interpretation, and policy versions

### Requirement: Model output does not become report truth

GEO Intelligence SHALL accept real parser and overall-synthesis output only
after deterministic projection into its canonical semantic contracts.

#### Scenario: A provider returns strict structured output

- **WHEN** a compact versioned model-output schema succeeds
- **THEN** program logic assigns internal identifiers, resolves owner-local
  references, preserves unmatched other-brand mentions, and rejects unsupported
  domain meaning before acceptance
- **AND** the model never owns internal identifiers, foreign keys, aggregate
  counts, scores, positions already fixed by a sample parse, or final report
  metrics
- **AND** parser, brand-resolution, and composition output each use their own
  bounded purpose attempts before the owning stage becomes unavailable
- **AND** the selected analysis route uses Model Studio
  `deepseek-v4-flash-0731` with thinking disabled and no automatic model fallback

#### Scenario: Open parsing distinguishes query use from sentiment

- **WHEN** an open-answer parser identifies concrete brands in one complete
  sampled answer
- **THEN** it preserves each brand in first-appearance order and separately
  records the answer's sentiment and how each non-current brand is used for the
  current query
- **AND** a candidate is one the answer offers as a choice even when ordinary
  conditions or drawbacks are present
- **AND** a comparison, example, historical or background reference remains
  parsed but does not become an eligible competitor occurrence
- **AND** a brand explicitly described as failing an important query constraint
  remains parsed but does not become an eligible competitor occurrence
- **AND** the parser judges only the supplied question and answer and performs no
  external fact or branch verification
- **AND** deterministic program logic assigns competitor eligibility and
  recommendation positions from the accepted role rather than from sentiment

#### Scenario: Name resolution groups observed competitor subjects

- **WHEN** accepted open-question interpretations contain other-brand names
- **THEN** one name-resolution result accounts for every observed name exactly
  once in either one readable brand group or the ignored-name collection
- **AND** it may group ordinary aliases, translations, abbreviations, branch
  formats, or clear brand-subject variants from answer context while leaving an
  uncertain name independent
- **AND** the model receives no internal record identifiers and performs no
  external web-backed entity research
- **AND** program logic restores exact source records, removes ignored names from
  competitor statistics, and rejects unknown, missing, repeated, or focus-brand
  group members

#### Scenario: Report composition expresses deterministic facts

- **WHEN** an accepted name resolution and deterministic report metrics are
  ready
- **THEN** report composition receives only current-brand content points,
  deterministic performance facts, and resolved leading-competitor statistics
- **AND** it produces the overall assessment, brand-perception summary, positive
  and negative themes, and no more than two GEO promotional-content directions
- **AND** customer prose contains natural question or need descriptions rather
  than internal question, sample, or content-point identifiers
- **AND** it neither changes a metric nor infers verified real-world positioning
  from differences among sampled answers
- **AND** positive and negative themes and GEO directions identify their
  supporting samples without asking the model to reconstruct content-point
  identifiers
- **AND** program logic validates sample membership and theme polarity before
  restoring any owner-local compatibility reference required by stored internal
  guidance
- **AND** exact quote, line, occurrence, character and highlight anchors remain
  optional presentation aids rather than report-success requirements

### Requirement: Explicit public and protected projections

The customer report SHALL expose only the evidence and conclusions needed to
understand the evaluation, while internal execution and writing context remain
protected.

#### Scenario: An account reads its report

- **WHEN** the authenticated account owns the requested brand and report
- **THEN** the response contains the immutable public document, original brand
  and question snapshot, four questions, and all twenty platform positions
- **AND** each available position may contain its complete original Markdown,
  concise interpretation, mention state, relative position, and validated public
  highlight ranges
- **AND** the response excludes provider sources, search details, models,
  prompts, attempts, traces, queue state, raw semantic payloads, brand-resolution
  provenance, and protected optimization guidance
- **AND** internal schema, evidence-reference, capability, metric-preservation,
  retry, or routing explanations are not displayed as report notes
- **AND** another account cannot discover or read the report

### Requirement: Current-report meaning

The diagnosis page SHALL treat the latest started official evaluation as the
owner of current evaluation state without rewriting earlier reports.

#### Scenario: Brand information changes after completion

- **WHEN** the current editable brand profile differs from a completed report's
  frozen input
- **THEN** that report remains current until a newer official evaluation starts
- **AND** the report shows one concise changed-information notice but retains its
  original content and evidence

#### Scenario: A newer run has started

- **WHEN** the brand's newest run is evaluating or requires retry
- **THEN** the prior completed report is no longer returned as the current report
- **AND** it remains immutable in report history

### Requirement: Immutable account-scoped report history

Report history SHALL be a read projection over accepted reports and their
frozen definitions and evidence rather than a copied report store.

#### Scenario: A customer reviews earlier reports

- **WHEN** an authenticated account requests history for an owned brand
- **THEN** completed reports other than the current completed report are listed
  newest first with an opaque bounded cursor
- **AND** each summary contains only report time, frozen brand name, AI
  recommendation index, mention rate, and valid coverage needed for selection
- **AND** opening a summary returns the same safe immutable projection as the
  current-report contract
- **AND** history provides no comparison, trends, renaming, deletion, or edit
  action
- **AND** another account cannot discover the list or a report detail

### Requirement: Evidence-preserving customer presentation

The report SHALL be understandable to a non-expert customer without exposing
internal analysis terminology or replacing evidence with decorative output.

#### Scenario: A customer scans the report

- **WHEN** the report is displayed
- **THEN** it leads with the concise assessment and AI recommendation index,
  followed by visual metric and platform comparisons, brand impressions,
  restrained other-brand context, and the complete sampled-answer evidence
- **AND** optimization direction is the final report section and next-service
  action
- **AND** the page presents actual questions without exposing internal brand-
  directed or open-discovery family labels
- **AND** titles are clear and formal, supporting copy is restrained, and rule or
  implementation explanations not needed by the customer are omitted
- **AND** accepted positive or negative themes produce a visible comparative
  presentation, while genuinely insufficient evidence produces one concise
  empty state
- **AND** the complete original answer remains safely formatted and expandable;
  uncertain highlight mapping falls back to the complete unhighlighted answer

### Requirement: GEO Optimization can read the latest accepted guidance

Evaluation Report SHALL expose one internal account- and Brand-scoped read
service for the latest accepted optimization guidance while keeping protected
guidance outside the Web API.

#### Scenario: GEO Optimization requests available guidance

- **WHEN** the caller supplies an account-owned Brand with at least one accepted
  Evaluation guidance record
- **THEN** the service returns an immutable guidance/report/run reference,
  acceptance time and source Evaluation fingerprint
- **AND** returns the customer-safe directions from the accepted public report
- **AND** returns only the Writer-useful guidance summary, priorities, writing
  angles and cautions
- **AND** excludes sample IDs, evidence references, scores, answers, Provider
  details, Prompts, attempts and traces from the Writer projection
- **AND** no Controller, DTO or OpenAPI route exposes the protected projection.

#### Scenario: Current Brand information or Evaluation state is newer

- **WHEN** the current Brand fingerprint differs or a newer Evaluation is
  running or awaiting retry
- **THEN** the latest successfully accepted guidance remains available
- **AND** the result marks whether its Evaluation input differs from the current
  Brand
- **AND** it does not invalidate content, force another Evaluation or become a
  write-integrity gate.

#### Scenario: No accepted guidance exists or the Brand is not owned

- **WHEN** an owned Brand has no accepted guidance
- **THEN** the service returns `null` without fabricating direction
- **BUT WHEN** the account does not own the Brand
- **THEN** access fails before the guidance repository is queried.

## Current environment boundary

The report remains reproducible with deterministic parser, name-resolution and
composition adapters. The selected DeepSeek candidate completed one authorized
controlled 4-by-5 run with 20/20 valid samples, a complete report, no retry and
238.644 seconds total elapsed time. A separate formal real-route Worker/report
run completed 20/20 acquisition and parsing, name resolution and composition in
206.227 seconds without retry or fallback; an earlier rejected parser field also
proved accepted-answer reuse and analysis-only recovery. A fresh browser-started
real-Provider run then completed the same 20/20 and both aggregate stages on
their first attempts in 177.961 seconds while preserving progress across
leave-and-return. Production capacity, reconciled external cost, commercial
deployment readiness and final visual-language refinement remain separate gates
over these accepted semantics.
