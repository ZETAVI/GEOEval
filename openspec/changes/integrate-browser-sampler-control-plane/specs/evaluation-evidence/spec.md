## ADDED Requirements

### Requirement: Independent browser sampling preserves GEO ownership

GEO Intelligence SHALL be able to acquire the twenty immutable sample answers
through an independent browser-sampler control plane without importing browser
identity or execution ownership into GEOEval.

#### Scenario: Browser sampling is explicitly enabled

- **WHEN** an official evaluation run enters background processing with the
  browser-control-plane mode enabled
- **THEN** GEO Intelligence creates one durable batch for each configured
  platform and sends the four ordered questions as one external task
- **AND** the stable idempotency key and returned external task identity are
  sufficient to resume after duplicate delivery or process restart
- **AND** the current provider-API path remains the default when browser mode is
  not enabled
- **AND** browser credentials, Cookies, Profile identities, login sessions,
  Live View links, node routes and automation implementation remain outside
  GEOEval.

#### Scenario: An external platform batch completes partially

- **WHEN** the control plane returns captured, captured-late and failed items
  for one platform batch
- **THEN** GEO Intelligence matches each item to its existing logical sample by
  ordered question index
- **AND** every captured non-empty assistant answer that is not a query echo
  becomes one successful acquisition attempt and one canonical answer
- **AND** captured-late remains valid evidence while its late count remains
  observable internally
- **AND** each failed or missing item becomes unavailable through the existing
  acquisition-exhaustion lifecycle
- **AND** successful siblings and other platforms are not replayed.

#### Scenario: An external task is still running

- **WHEN** status is not terminal
- **THEN** Background Work defers the same durable platform work until a later
  poll without holding a Worker for the collection window
- **AND** reconciliation can reassert the same work from PostgreSQL after Redis
  or process interruption
- **AND** elapsed time alone never advances customer progress.

#### Scenario: External submission has an uncertain outcome

- **WHEN** the submit response is lost or the control plane is temporarily
  unavailable
- **THEN** GEOEval retries only with the already persisted idempotency key
- **AND** it never creates a new task identity for the uncertain submission
- **AND** authentication and verification failures remain human-recovery states
  owned by the control plane rather than hidden automated retries.

## MODIFIED Requirements

### Requirement: Versioned neutral sampling context

Every customer-visible sampling route SHALL preserve the same immutable,
neutral question meaning while recording the execution context the route
actually received.

#### Scenario: A provider-API sample is requested

- **WHEN** one of the current model-provider routes prepares a sampling request
- **THEN** it uses the current
  [evaluation-objectivity profile](../../../../../apps/backend/geo-intelligence/evaluation-objectivity.json)
- **AND** the durable attempt evidence snapshots the profile identity, version,
  content hash and question used for that request
- **AND** search support and automatic triggering remain route configuration,
  not separate product meaning or provider-authored policy.

#### Scenario: A consumer Web/App sample is requested

- **WHEN** the independent browser control plane submits an immutable generated
  question through a normal platform conversation
- **THEN** it sends the question without inventing a hidden system instruction
  that the consumer surface did not receive
- **AND** the durable attempt records the question identity, external task
  reference, result index, platform and sampling mode
- **AND** GEOEval does not claim that its internal objectivity profile was sent
  to the consumer surface
- **AND** the original generated question and complete captured answer remain
  the canonical business evidence.
