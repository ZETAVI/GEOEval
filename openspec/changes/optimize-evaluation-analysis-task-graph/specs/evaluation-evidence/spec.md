# Evaluation Evidence Delta

## MODIFIED Requirements

### Requirement: Attempt and delivery separation

AI Execution SHALL own attempt evidence, Background Work SHALL deliver stable
identifiers, and GEO Intelligence SHALL own accepted business facts.

#### Scenario: A candidate is evaluated before runtime selection

- **WHEN** Prompt, context or topology is compared
- **THEN** inputs, routes, schemas and candidate identities are frozen
- **AND** raw output quality is assessed separately from projection recovery
- **AND** experimental output never becomes an official sample or report
- **AND** one candidate's failure does not imply another candidate is accepted.

#### Scenario: A topology enters implementation

- **WHEN** evidence and architecture approval select a candidate
- **THEN** its attempt, retry, partial-success and assembly policies are explicit
- **AND** component persistence is introduced only if that candidate needs it.

#### Scenario: The owner simplifies experimental open-answer positions

- **WHEN** the first-appearance Parser candidate interprets a retained raw answer
- **THEN** it records one row per actually mentioned recognizable brand subject
- **AND** records represent the answer's merchant/product/service subjects,
  understood in the consumer-question context rather than a proper-name inventory
- **AND** positions follow distinct subjects' first appearances as 1,2,3,...,
  including separate positions for brands co-listed inside one sentence/item
- **AND** later aliases or repeated mentions reuse the first brand record
- **AND** recommendation eligibility is independent of appearance order
- **AND** target absence produces a null target description and no target row
- **AND** historical shared-item ranks remain evaluated under their old meaning
- **AND** current product/spec/report consumers are reconciled before formal
  activation; this probe does not rewrite accepted samples or report history.

#### Scenario: The Parser interprets business portrayal rather than collecting names

- **WHEN** the owner-approved experimental Parser selects other-brand records
- **THEN** it identifies the business subjects actually introduced, compared or
  evaluated in the answer and explains the target's portrayal
- **AND** it preserves the answer's commercial choices rather than reselecting
  fine categories or treating every proper name as a business subject
- **AND** evidence-backed target mention, subject identity and recommendation
  eligibility remain distinct judgments
- **AND** target mention is still assessed from the full original answer
- **AND** first-appearance order and positive recommendation eligibility keep
  their separate meanings; source history and formal runtime are not rewritten.

#### Scenario: Output sequence owns experimental positions

- **WHEN** the ordered-brand candidate interprets an open answer
- **THEN** the wire output lists target and other identified business subjects
  together in first-appearance order without a position field
- **AND** program projection derives index + 1 before separating target/others
  and filtering positive recommendations
- **AND** it does not sort, invent, deduplicate or correct the model's brand list
- **AND** a mentioned target has its points and summary in that same brand row;
  other rows have a null targetDescription and there is no separate target flag
  or root-level description
- **AND** absence has no described target row; legal null values and continuous
  indices cannot themselves prove correct target recognition
- **AND** raw order and completeness require semantic review independently of
  valid structure and mechanically continuous indices
- **AND** legacy numeric outputs and formal report history are not rewritten.

### Requirement: Whole-answer controlled Parser input

The controlled Parser SHALL receive one complete originalAnswer string rather
than an array of numbered source-line objects, without changing the current
target-aware task or activating a formal Parser/runtime contract.

#### Scenario: A whole original answer is interpreted

- **WHEN** the experimental task is prepared from an authorized source
- **THEN** its question, original Markdown, whitespace and line endings are retained
- **AND** neither answerLines nor artificial source line numbers enter model input
- **AND** model evidence uses source quotations rather than inferred line numbers
- **AND** program lookup adapts valid quotations to the existing internal evidence
  representation without fuzzy repair or semantic brand/order decisions
- **AND** actual model output remains distinct from expanded source-line evidence
- **AND** synthesis still receives parsed records and excerpts, not the full answer.

### Requirement: Concise customer progress

The diagnosis view SHALL project truthful durable progress.

#### Scenario: A platform has an unavailable position

- **WHEN** a position terminates without an accepted interpretation
- **THEN** it remains distinguishable from successful analysis
- **AND** timers cannot fabricate completion or expose internal retries.
