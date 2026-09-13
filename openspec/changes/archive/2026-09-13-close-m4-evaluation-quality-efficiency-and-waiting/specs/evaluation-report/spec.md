# Evaluation Report Delta

## ADDED Requirements

### Requirement: Customer narratives remain product-safe

Every customer-visible parser or overall-synthesis narrative SHALL be concise,
formal and free of model-contract or implementation residue before report
acceptance.

#### Scenario: An Agent proposes customer copy

- **WHEN** the sample parser or overall synthesizer returns a narrative field
- **THEN** its versioned Prompt and structured-output description require
  customer-readable wording grounded in accepted evidence
- **AND** the accepted public projection cannot contain JSON/structure fragments,
  internal question-family enums, target-role enums, UUID or observation/sample
  references, field names, Prompt/model/Provider/attempt/queue/trace detail, or
  other implementation instructions
- **AND** deterministic protection rejects or narrowly replaces only proven
  reachable invalid copy without changing mention, position, evidence or metric
  facts
- **AND** the Web does not become the sole place that hides an invalid stored
  narrative.

### Requirement: Obvious brand-name variants are grouped without invented facts

The overall synthesizer SHALL organize other-brand names for ordinary customer
understanding while deterministic program logic preserves evidence and counts.

#### Scenario: Accepted samples contain related brand names

- **WHEN** answer context supports that a short name, translation, store format
  or obvious subordinate brand line represents the same customer-understandable
  brand
- **THEN** the synthesizer may propose one evidence-linked reporting group
- **AND** program logic validates member references and calculates occurrence,
  platform and position facts from accepted sample records
- **AND** an uncertain or independently positioned name remains separate
- **AND** failure to resolve one relationship does not prevent an otherwise
  valid report
- **AND** the first release does not create a global brand master, knowledge
  graph or default public-web investigation.
