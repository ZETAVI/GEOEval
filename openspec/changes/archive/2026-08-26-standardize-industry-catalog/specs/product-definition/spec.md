# Product Definition Delta Specification

## ADDED Requirements

### Requirement: Industry selection represents recommendation intent

The product SHALL use one primary and one dependent secondary industry to
represent the product or service for which the current brand most wants to be
found and recommended in the current GEO evaluation.

#### Scenario: A customer operates several business lines

- **WHEN** the current brand manufactures, sells, or services more than one kind
  of product
- **THEN** the customer selects the one product-or-service context that matters
  for the current evaluation
- **AND** the customer does not enumerate its complete licensed business scope
  or every concurrent activity
- **AND** the selection is explained through the question, "What product or
  service do you most want customers to find and recommend you for?"

#### Scenario: A business could fit an activity and a market category

- **WHEN** a brand owner, retailer, manufacturer, agent, and service provider
  could receive different classifications for the same legal entity
- **THEN** the selection follows the intended consumer, procurement, or
  recommendation scenario
- **AND** it does not follow the entity's legal form, statistical principal-
  activity code, or business-license wording merely because that code exists

### Requirement: GEOEval owns one bounded two-level industry catalog

The product SHALL present the approved, versioned GEOEval industry catalog with
13 primary categories, dependent secondary categories, and one `Other`
secondary category under every primary category.

#### Scenario: A customer chooses a listed category

- **WHEN** the customer selects a primary industry
- **THEN** only the active secondary categories owned by that primary industry
  are available for the selection
- **AND** the selected stable primary and secondary identifiers form one
  coherent recommendation context
- **AND** local restaurants, beauty, pets, fitness, and vehicle maintenance
  remain secondary categories under local life and storefront services rather
  than consuming separate primary categories

#### Scenario: No listed secondary category expresses the business

- **WHEN** the customer selects the `Other` secondary category under any primary
- **THEN** the customer must provide a concise, concrete product-or-service
  phrase before the brand is evaluation-ready
- **AND** the generic word `Other` alone is not valid question-generation
  context
- **AND** that phrase participates in question generation and the evaluation
  input snapshot

### Requirement: Catalog identity remains stable across maintenance

Industry catalog maintenance SHALL preserve the meaning of saved selections and
completed evaluation evidence while allowing labels, aliases, examples, and
future categories to evolve.

#### Scenario: The catalog is renamed or extended

- **WHEN** a display name, search alias, example, ordering, or category
  availability changes
- **THEN** an existing stable identifier is not renumbered, reassigned, or
  reused for a different meaning
- **AND** search aliases help discovery but do not create additional stored
  categories or silently choose among ambiguous categories
- **AND** the catalog change receives the version change required by the
  maintained catalog contract
- **AND** catalog maintenance alone does not create a new evaluation-input
  revision, question set, or evaluation opportunity for an unchanged brand
- **AND** an existing saved selection is not silently remapped to another
  category

#### Scenario: A future boundary change would reinterpret a saved selection

- **WHEN** a proposed catalog change would alter the semantic meaning of an
  existing category or its recommendation subject
- **THEN** the change requires a separately approved compatibility and migration
  decision
- **AND** it either preserves the earlier meaning for the saved selection or
  asks the customer to confirm a new profile selection
- **AND** a customer-confirmed selection change follows the ordinary
  evaluation-input revision rule

#### Scenario: An evaluation starts

- **WHEN** the customer confirms the generated questions and starts an official
  evaluation
- **THEN** the evaluation fixes the selected primary and secondary identifiers,
  their displayed labels, the catalog version, the `Other` phrase when present,
  and the recommendation subject actually used for question generation
- **AND** later catalog maintenance cannot reinterpret that run or its report

### Requirement: Industry selection guides questions without asserting compliance

The industry selection SHALL guide recommendation-question generation and SHALL
NOT act as evidence of regulatory status or permission to operate.

#### Scenario: A regulated product or service selects a category

- **WHEN** a medical, health, financial, educational, or other regulated
  business selects a matching category
- **THEN** the selection supplies product and recommendation context only
- **AND** it does not verify licenses, credentials, product registration,
  eligibility, or legal compliance
- **AND** any future user-notice or agreement control remains separately owned
  from the industry catalog

### Requirement: Question generation uses catalog semantics rather than labels alone

The open industry-recommendation question SHALL use the selected secondary
category's maintained recommendation subject together with the current brand's
region, concrete product or service, and other relevant profile facts.

#### Scenario: A broad display category is selected

- **WHEN** a category display name would produce an unnatural or overly broad
  query if copied verbatim
- **THEN** the question generator uses the maintained recommendation subject and
  the customer's concrete profile context
- **AND** a display label such as `Industrial manufacturing and supply chain` is
  not itself treated as a natural customer query
