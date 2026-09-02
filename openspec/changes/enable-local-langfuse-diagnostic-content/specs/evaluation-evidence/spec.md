# Evaluation Evidence Delta

## Modified Requirements

### Requirement: Protected and non-blocking execution observability

AI Execution SHALL keep telemetry downstream of durable Attempt evidence and
SHALL require an explicit environment-safe policy before exporting diagnostic
content.

#### Scenario: Metadata-only remains the default

- **WHEN** Langfuse is enabled without an explicit local diagnostic content mode
- **THEN** a Generation may receive correlation, environment, release, purpose,
  route, model, attempt, status, latency, search observation, and usage metadata
- **AND** the Generation receives no Prompt/task input or normalized output
- **AND** the adapter does not pass unreviewed metadata maps to the exporter
- **AND** production rejects local diagnostic content mode at startup

#### Scenario: A controlled local diagnostic is enabled

- **WHEN** a development or test Worker explicitly enables local diagnostic
  content for a controlled evaluation
- **THEN** the Generation input contains a versioned projection of the resolved
  Prompt/task and applicable output contract
- **AND** success output contains only the provider-neutral normalized result
- **AND** failure output contains only the stable failure class and retryability
- **AND** no Provider request/response envelope, source evidence, response
  headers, credential, Authorization value, API key, or reasoning chain enters
  the projection

#### Scenario: Export masking is applied

- **WHEN** Langfuse serializes an observation input, output, or metadata value
  before export
- **THEN** the final mask sanitizes nested serialized JSON as well as supported
  object inputs
- **AND** credentials, raw Provider fields, and reasoning-chain fields are
  removed in every content mode
- **AND** mask failure produces a fully masked value instead of the original
  payload

#### Scenario: Telemetry is unavailable

- **WHEN** observation creation, update, export, flush, or shutdown fails
- **THEN** only a sanitized operational warning may be emitted
- **AND** the business Attempt, retry policy, accepted evidence, and report are
  unchanged
- **AND** PostgreSQL remains sufficient to recover execution state without
  consulting Langfuse
