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

- [x] Add validated deterministic/real Worker configuration and fail-fast route
      readiness without exposing credentials.
- [x] Separate the deterministic fixture from the production route catalog,
      provider router, HTTP transport, failure taxonomy, and five sampling
      adapters while retaining the existing inward-facing execution port.
- [x] Version the persisted attempt envelope so normalized output and protected
      provider evidence survive duplicate delivery and terminal replay without a
      second attempt store.
- [x] Make one started attempt own at most one outbound request; handle concurrent
      redelivery, stale ambiguity, and late results without duplicate business
      evidence.
- [x] Propagate an in-progress attempt as a deferred work result; use BullMQ's
      delayed-job mechanism without completing the Outbox event or consuming a
      purpose or queue-failure retry.
- [x] Replace the internal boolean search flag with the truthful three-state
      observation and rehearse the local migration.
- [x] Reconcile the E0 runner so controlled validation exercises production
      route definitions or otherwise cannot become a competing executable
      mapping.
- [x] Verify all five adapters offline with recorded provider fixtures covering
      complete answers, returned identities, sources, reasoning evidence, usage,
      no-search ambiguity, malformed responses, timeouts, rate limits, and
      provider errors.

## S6b Real Interpretation and Overall Analysis

- [x] Configure the per-sample route sequence as Alibaba Model Studio Qwen3.8
      Flash primary, one same-route retry, and TokenHub Hy3 fallback; use
      `medium` reasoning effort and keep search disabled.
- [x] Make reconciliation derive the next attempt from the purpose-owned route
      sequence rather than the existing shared two-attempt cap.
- [x] Configure the same Qwen3.8-primary and Hy3-fallback sequence for overall
      analysis; keep deterministic metrics and report acceptance unchanged.
- [x] Send compact versioned model-output contracts through provider-specific
      strict structured-output mappings, project them deterministically into the
      canonical domain contracts, and run strict semantic validation after every
      response.
- [x] Verify representative parser and synthesis fixtures through primary
      success, primary semantic rejection, fallback success, and terminal
      exhaustion before any complete evaluation.

## S6c Observability and Controlled Acceptance

- [x] Add the reviewed project-local Langfuse/OpenTelemetry dependencies and a
      best-effort masked telemetry adapter; retain a no-op adapter when disabled.
- [x] Verify telemetry correlation, usage bucket normalization, exporter failure
      isolation, and graceful Worker shutdown without exporting protected
      customer content.
- [x] Record and obtain confirmation for the exact paid-call manifests, maximum
      calls, retry ceilings, fictional fixtures, and stop conditions.
      Executable plans are recorded as `sampling-smoke` (five calls,
      confirmation `2964e3f7...18fae69d`) and `semantic-probe` (nine calls,
      current confirmation `cb1e141c...ec9a8387`). The product owner authorized
      real calls and both bounded plans were exercised without transport retry.
- [x] Execute the five-route production-adapter smoke plus representative
      Qwen3.8-primary and Hy3-fallback parser/synthesis evidence with protected,
      resumable local evidence.
- [x] Execute one complete fictional 4-by-5 evaluation through the real Worker
      and inspect the authenticated customer report.
- [x] Reconcile retained native usage, latency, search/source retention,
      retry/fallback evidence, Outbox completion, and the customer-visible
      browser report without claiming production capacity from one run.
- [ ] Reconcile provider-console billed cost before commercial pricing or
      production-capacity claims. The product owner placed no local validation
      budget cap, but native usage is not the provider's final invoice.

## Verification, Reconciliation, and Exit

- [x] Pass deterministic regression, focused provider contracts, migration
      replay, generated contracts, type checks, tests, builds, framework checks,
      and `git diff --check`.
- [x] Run final architecture review over ownership, dependency direction,
      sensitive data, cost, recovery, and removal of duplicate route truth.
- [x] Restore deterministic local review data after fixing the integration-test
      configuration inheritance defect, and verify an authenticated 20/20
      customer report through a separate fictional real-run database; integration
      cleanup never uses the default development database.
- [x] Promote accepted behavior into current evaluation-evidence and
      evaluation-report specs plus the architecture overview; retain later
      release gates explicitly.
- [x] Add one product-owner review entry that separates the customer-visible S6
      outcome, architecture-owner evidence, deferred visual work, and commercial
      release gates; do not require review of raw provider or persistence
      internals.
- [x] Execute the provider-related part of the product-definition evolution
      marker by moving activated behavior to owner-local specs and leaving only
      index-level product meaning and links; do not split unrelated capabilities.
- [ ] Rebuild the S6 commits on the protected GitHub `main` baseline and publish
      a Draft PR linked to Issues #4 and #6-#9 for bounded review.
- [ ] Record final product-owner acceptance of the observed S6 result, create a
      verified integration checkpoint, and keep merge, production activation,
      customer-data use, and deployment as separate actions.

## Ordered continuation

1. Product owner reviews only the bounded items in
   [`decision-brief.md`](decision-brief.md#product-owner-review-entry).
2. Record the product-owner decision and create the verified branch checkpoint.
3. Request a separate integration decision; integration does not authorize
   customer data, production activation, push, or deployment.
4. After integration, start the AI question generator as a separate change;
   deterministic generation remains its baseline and rollback path.
