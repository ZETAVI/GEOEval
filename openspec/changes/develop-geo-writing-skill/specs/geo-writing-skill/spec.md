# GEO Writing Skill Delta Specification

## Requirements

### Requirement: Source-bound professional core article

The writing Skill SHALL create one professionally edited core promotional
article from the supplied writing brief without treating missing evidence as
permission to invent content.

#### Scenario: Complete approved context is supplied

- **WHEN** the Skill receives current brand facts, usable optimization guidance,
  optional prepared-material facts, one internal style profile, audience, and
  content objective
- **THEN** it produces exactly one title and one complete article body
- **AND** every material factual claim is supported by the supplied context
- **AND** the article remains a core content source rather than a set of
  platform-specific publication variants

#### Scenario: A requested claim lacks support

- **WHEN** a desired statistic, credential, comparison, quote, outcome, or case
  claim is absent, conflicting, or marked uncertain in the supplied context
- **THEN** the Skill omits, softens, or explicitly flags the claim for review
- **AND** does not fabricate a source or silently convert uncertainty into fact

### Requirement: Distinct but bounded editorial styles

The writing Skill SHALL express one stable factual brief through a small curated
set of meaningfully distinct editorial styles without changing its claims.

#### Scenario: The same brief uses different accepted styles

- **WHEN** the evaluation owner invokes the Skill once per accepted style using
  the same factual input
- **THEN** each result has recognizable differences in opening, structure,
  cadence, evidence placement, and narrative technique
- **AND** all results preserve the same supported facts, product boundary, and
  one-article output
- **AND** surface conventions such as platform hashtags, emoji density, account
  promotion, or media-specific length are not mistaken for core editorial style

### Requirement: Evidence-grounded quality evaluation

The writing Skill SHALL be evaluated against realistic, source-traceable
fixtures rather than judged only by fluency or one model's preference.

#### Scenario: A candidate Skill enters sandbox review

- **WHEN** the candidate runs against the accepted evaluation corpus
- **THEN** hard gates check factual fidelity, provenance, prohibited invention,
  output boundary, and unresolved ambiguity
- **AND** scored review checks reader usefulness, editorial structure,
  specificity, professional polish, style fidelity, GEO clarity, and originality
- **AND** blind human editorial review remains required before pilot promotion

### Requirement: Graceful incomplete input

The writing Skill SHALL expose missing information that prevents a professional
article instead of filling the gap with generic promotional language.

#### Scenario: The brief cannot support a complete article

- **WHEN** core subject, audience, differentiating evidence, or other required
  context is materially incomplete
- **THEN** the Skill returns a concise missing-information result
- **AND** identifies only the smallest information needed to continue
- **AND** does not generate a publishable-looking but unsupported draft
