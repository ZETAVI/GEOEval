# Product Definition Delta

## ADDED Requirements

### Requirement: Store-scoped evaluation questions remain relevant

The initial evaluation SHALL use complete, valid store context to keep open
questions relevant to the customer's actual recommendation situation while
retaining the accepted four-question roles.

#### Scenario: A store prepares a new evaluation context

- **WHEN** the customer prepares a new evaluation-ready store brand
- **THEN** its Brand-owned frozen projection contains the validated store-
  location meaning used for Query locality
- **AND** contains one customer-understandable main product or service
- **AND** contains the customer's ordered characteristics, with two inputs shown
  by default and additional inputs allowed under the approved Brand boundary
- **AND** changing any of these evaluation meanings creates a new semantic
  fingerprint
- **AND** activating the representation does not rewrite an earlier snapshot or
  create an evaluation opportunity from representation-only conversion.

#### Scenario: The Query Agent prepares the four questions

- **WHEN** the current store projection is used to generate one Definition
- **THEN** the Definition still contains one brand-directed question, one
  industry-recommendation question and two characteristic-oriented questions
- **AND** all three open questions use the chosen store locality and main
  product or service as their common recommendation context
- **AND** the two characteristic questions add materially different customer
  need angles rather than mechanically appending one field at a time
- **AND** when more than two characteristics exist, the Agent selects or
  combines them without adding another official question
- **AND** the customer still receives one immutable read-only question set for
  the unchanged fingerprint.
