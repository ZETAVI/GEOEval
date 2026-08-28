# Evaluation Evidence Delta

## Added Requirements

### Requirement: Explicit real execution mode

The Worker SHALL select deterministic or real AI execution through validated
runtime configuration and SHALL refuse an incomplete or unsafe real route set.

#### Scenario: Real execution is enabled

- **WHEN** the Worker starts in real execution mode
- **THEN** every accepted route has an explicit logical policy, provider service
  class, base URL, requested model, credential reference, timeout, and supported
  purpose
- **AND** missing credentials, unsupported model aliases, official-direct
  DeepSeek routes, or mismatched purpose and protocol fail readiness before
  evaluation work is consumed
- **AND** secrets never enter request snapshots, logs, traces, errors, or Git

### Requirement: One outbound call per durable attempt

AI Execution SHALL make at most one outbound provider request for one persisted
attempt identity.

#### Scenario: Work is duplicated or a Worker is interrupted

- **WHEN** concurrent delivery encounters a live started attempt
- **THEN** it observes in-progress work and sends no second provider request
- **AND** when a started attempt exceeds the reviewed ambiguity deadline it is
  atomically recorded as a retryable ambiguous failure before a later numbered
  attempt may run
- **AND** a late response cannot overwrite that failure or accepted evidence

### Requirement: Complete provider evidence with truthful normalization

AI Execution SHALL preserve protected provider evidence while returning one
provider-neutral output to GEO Intelligence.

#### Scenario: A sampling route succeeds

- **WHEN** a real platform returns a complete answer
- **THEN** the normalized output contains the answer, format, exact returned
  model, all returned source metadata, and search observation
- **AND** search observation is `TRIGGERED`, `NOT_TRIGGERED`, or `UNKNOWN`
  according to explicit provider evidence rather than absence guessing
- **AND** the attempt envelope retains the protected provider response, request
  identity, finish reason, reasoning evidence when actually returned, native
  usage, search usage, and normalization version without exposing it publicly

### Requirement: Provider failures respect purpose retry policy

Transport and provider failures SHALL be classified before GEO Intelligence
decides the next purpose attempt.

#### Scenario: A provider call fails

- **WHEN** the route times out, cannot connect, rate-limits, rejects a request,
  rejects content, returns malformed data, or reports a server error
- **THEN** AI Execution records a stable technical failure class, retryability,
  latency, and a sanitized protected failure envelope
- **AND** no SDK, HTTP client, queue delivery counter, or telemetry exporter
  performs a hidden model retry
- **AND** acquisition retries the same platform while interpretation and overall
  analysis use Model Studio Qwen3.8 Flash for attempts one and two and TokenHub
  Hy3 for attempt three

### Requirement: Model output does not become the domain contract

GEO Intelligence SHALL accept semantic model output only after deterministic
projection into its canonical parser or synthesis contract.

#### Scenario: A real parser or synthesizer returns strict structured output

- **WHEN** a provider response passes its compact versioned model-output schema
- **THEN** program logic assigns internal identifiers, resolves evidence
  references, preserves unmatched brand mentions, and constructs the canonical
  owner record
- **AND** the projected record must still pass the existing strict domain schema
  and semantic checks before it can affect accepted evidence, calculations, or
  a report
- **AND** the model never owns internal identifiers, foreign keys, aggregate
  counts, scores, or final report metrics

### Requirement: Telemetry is an optional follower

AI attempt observability SHALL remain downstream of durable business evidence.

#### Scenario: Langfuse is enabled or unavailable

- **WHEN** an attempt starts or finishes
- **THEN** a best-effort trace may receive masked correlation, purpose, route,
  model, status, timing, usage, and reconciled cost fields
- **AND** raw customer prompts, answers, provider envelopes, credentials, and
  internal protected guidance are not exported by default
- **AND** exporter failure or shutdown delay cannot reject, repeat, or change the
  business attempt
