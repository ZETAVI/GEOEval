# Project Governance Delta

## Added Requirements

### Requirement: Concurrent Worktree tests own isolated resources

Every Worktree that may run integration tests concurrently SHALL use explicit,
distinct PostgreSQL and Redis targets, and test composition SHALL keep cleanup
inside those targets.

#### Scenario: A Worktree supplies integration-test resources

- **WHEN** an integration-test command supplies `DATABASE_URL` and `REDIS_URL`
- **THEN** every test database client, Worker runtime, and queue-cleanup path
  uses those exact targets
- **AND** supplying only one target fails before database or queue cleanup begins
- **AND** local defaults are used only when no explicit target is supplied
- **AND** test composition does not inherit real-provider, telemetry, credential,
  or production-mode environment values
- **AND** verification proves the isolated resources were exercised and the
  shared defaults remained unchanged.
