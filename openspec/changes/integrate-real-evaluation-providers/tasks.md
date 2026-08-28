# Tasks

## S6 Activation and Architecture

- [x] Confirm the staged S6 outcome, scope, non-goals, and local implementation
      authorization with the product owner.
- [x] Fast-forward the accepted S1-S5 checkpoint to local `main` without
      touching the dirty provider-validation worktree, then create the isolated
      `codex/integrate-real-evaluation-providers` branch.
- [x] Complete the current primary-source brief and reuse assessment for route,
      search, structured-output, transport, and Langfuse behavior.
- [x] Complete the module architecture card covering route ownership, one-call
      attempt identity, response normalization, ambiguity recovery, failure
      classification, telemetry isolation, capacity, and rollback.
- [x] Run architecture review and resolve every must-fix boundary finding before
      implementation.

## S6a Real Sampling Boundary

- [ ] Add validated deterministic/real Worker configuration and fail-fast route
      readiness without exposing credentials.
- [ ] Separate the deterministic fixture from the production route catalog,
      provider router, HTTP transport, failure taxonomy, and five sampling
      adapters while retaining the existing inward-facing execution port.
- [ ] Version the persisted attempt envelope so normalized output and protected
      provider evidence survive duplicate delivery and terminal replay without a
      second attempt store.
- [ ] Make one started attempt own at most one outbound request; handle concurrent
      redelivery, stale ambiguity, and late results without duplicate business
      evidence.
- [ ] Propagate an in-progress attempt as a deferred work result; use BullMQ's
      delayed-job mechanism without completing the Outbox event or consuming a
      purpose or queue-failure retry.
- [ ] Replace the internal boolean search flag with the truthful three-state
      observation and rehearse the local migration.
- [ ] Reconcile the E0 runner so controlled validation exercises production
      route definitions or otherwise cannot become a competing executable
      mapping.
- [ ] Verify all five adapters offline with recorded provider fixtures covering
      complete answers, returned identities, sources, reasoning evidence, usage,
      no-search ambiguity, malformed responses, timeouts, rate limits, and
      provider errors.

## S6b Real Interpretation and Overall Analysis

- [ ] Configure the per-sample route sequence as Hy3 primary, one Hy3 retry, and
      Alibaba Model Studio DeepSeek V4 Flash fallback; keep search disabled.
- [ ] Make reconciliation derive the next attempt from the purpose-owned route
      sequence rather than the existing shared two-attempt cap.
- [ ] Configure the same primary-retry-fallback sequence for overall analysis;
      keep deterministic metrics and report acceptance unchanged.
- [ ] Send the existing versioned system instructions and JSON Schemas through
      the provider-specific structured-output mappings with strict local schema
      and semantic validation after every response.
- [ ] Verify representative parser and synthesis fixtures through primary
      success, primary semantic rejection, fallback success, and terminal
      exhaustion before any complete evaluation.

## S6c Observability and Controlled Acceptance

- [ ] Add the reviewed project-local Langfuse/OpenTelemetry dependencies and a
      best-effort masked telemetry adapter; retain a no-op adapter when disabled.
- [ ] Verify telemetry correlation, usage bucket normalization, exporter failure
      isolation, and graceful Worker shutdown without exporting protected
      customer content.
- [ ] Record and obtain confirmation for the exact paid-call manifests, maximum
      calls, retry ceilings, fictional fixtures, and stop conditions.
- [ ] Execute the smallest production-adapter smoke and interpretation evidence,
      then one complete fictional 4-by-5 evaluation through the real Worker.
- [ ] Reconcile provider-console or billed cost, native usage, latency,
      search/source retention, retry/fallback evidence, and the customer-visible
      browser report without claiming production capacity from one run.

## Verification, Reconciliation, and Exit

- [ ] Pass deterministic regression, focused provider contracts, migration
      replay, generated contracts, type checks, tests, builds, framework checks,
      and `git diff --check`.
- [ ] Run final architecture review over ownership, dependency direction,
      sensitive data, cost, recovery, and removal of duplicate route truth.
- [ ] Promote accepted behavior into current evaluation-evidence and
      evaluation-report specs plus the architecture overview; retain later
      release gates explicitly.
- [ ] Execute the provider-related part of the product-definition evolution
      marker by moving activated behavior to owner-local specs and leaving only
      index-level product meaning and links; do not split unrelated capabilities.
- [ ] Record product-owner review, create a verified branch checkpoint, and keep
      merge, push, production activation, and deployment as separate actions.
