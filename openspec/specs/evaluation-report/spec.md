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

#### Scenario: Overall synthesis succeeds

- **WHEN** at least seventeen accepted sample interpretations and one valid
  overall-synthesis result belong to the same eligible run and execution cycle
- **THEN** one transaction accepts the synthesis, materializes the public report,
  stores protected optimization guidance, completes the cycle, and changes the
  run to `COMPLETED/REPORT_ACCEPTED`
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
- **THEN** one new execution cycle starts ready for synthesis and schedules only
  synthesis attempt one
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
- **AND** overall synthesis may organize evidence and wording but cannot revise a
  metric or count evidence
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
- **AND** invalid parser output uses the bounded Qwen3.8 primary retry and Hy3
  fallback before the position becomes unavailable
- **AND** invalid overall synthesis uses the same bounded route order before the
  run becomes `PLEASE_RETRY/SYNTHESIS_EXHAUSTED`

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

## Current environment boundary

The report remains reproducible with deterministic parser and synthesis
adapters. One complete fictional real 4-by-5 Worker journey produced and exposed
an authenticated 20/20 report through the Qwen3.8-primary/Hy3-fallback semantic
routes. Its first overall synthesis was semantically rejected, its second timed
out, and Hy3 produced the accepted report; this verifies bounded recovery but
does not establish production capacity, reconciled external cost, or commercial
deployment readiness. Final visual-language refinement remains a separate
frontend-design workstream over these accepted semantics.
