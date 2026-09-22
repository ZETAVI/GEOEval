# GEO Optimization internal production pilot delta

## MODIFIED Requirements

### Requirement: The current Writer boundary is deterministic and fail-closed

The backend SHALL keep one provider-neutral Writer Port. Local/test execution
may use the deterministic adapter, production SHALL default to disabled, and an
internal production demonstration MAY select an explicit `demo` mode that uses
the same no-provider adapter without presenting it as a real Writing Agent.

#### Scenario: The internal pilot explicitly enables demo generation

- **WHEN** the production API is configured with Writer mode `demo`
- **THEN** generation uses the existing deterministic adapter through the
  immutable Writer input snapshot, idempotency, retry, replacement and article
  revision contracts
- **AND** it produces one editable draft without a model, Prompt/Skill provider,
  token cost or external network call
- **AND** its runtime and deployment evidence identify it as demonstration
  behavior rather than real-Writer acceptance.

#### Scenario: Production does not explicitly enable the demo

- **WHEN** production uses the default `disabled` mode
- **THEN** no local or external Writer is invoked
- **BUT WHEN** production selects the local/test-only `deterministic` mode or an
  unknown mode
- **THEN** composition fails before serving requests
- **AND** no fallback silently activates demo behavior.
