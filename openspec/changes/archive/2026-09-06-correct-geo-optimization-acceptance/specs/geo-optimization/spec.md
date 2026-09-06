# GEO Optimization correction delta

## MODIFIED Requirements

### Requirement: Customer API exposes the current optimization workspace

Customer input SHALL never replace Principal account or route resource identity.

#### Scenario: A body includes protected identity or malformed fields

- **WHEN** a command contains unknown keys, wrong types or invalid route IDs
- **THEN** the API rejects it before any service mutation or Writer invocation
- **AND** the authenticated customer cannot act as another account.

### Requirement: One responsive page preserves explicit customer control

#### Scenario: A refresh or independent save completes during local editing

- **WHEN** Brand or article content is dirty
- **THEN** observing newer server data retains that buffer and its base revision
- **AND** saving another resource cannot overwrite the dirty buffer
- **AND** an explicit reload explains discarded local edits before proceeding.

#### Scenario: Generation transport is uncertain or execution is interrupted

- **WHEN** a generation response is lost or a RUNNING record is revisited
- **THEN** the customer can re-observe/retry the existing action without
  automatically starting a new generation or silently changing its input.

#### Scenario: A customer follows optimization from a report

- **WHEN** that report belongs to a different Brand from the current context
- **THEN** the page identifies the report Brand and offers an explicit switch
- **AND** it never generates for the wrong Brand because a link lost context.
