# Architecture Review: Evaluation Analysis Experiments

- Baseline: `main@ddadf77`; supersedes the review at `537895b`
- Result: `ready with follow-up` for experimental preparation;
  `not ready` for runtime topology selection or activation

## Corrected findings

1. **Must-fix / evidence:** a failed Prompt was treated as proof against one-call
   topology. Alternatives now remain candidates until matched evidence exists.
2. **Must-fix / context:** #48 compression drops source spans and adjacent
   brand context. Test adequate evidence before judging task capacity.
3. **Must-fix / delivery:** detached semantic probes cannot close #41 before
   the new contracts are connected to the actual report path.
4. **Should-fix / progress:** terminal unavailability differs from successful analysis.
5. **Should-fix / continuity:** parent status, compatibility and characteristic
   ordering must follow merged child decisions.

## Preserved boundaries and pending evidence

Sampling remains natural measurement. GEO owns accepted evidence and metrics.
Experimental code is not wired to application startup and writes no business
records. Real calls require a frozen request manifest and bounded authority.
Raw generation quality and post-projection usability are reviewed separately.

Runtime tables, queues, concurrency, retries and migrations remain conditional.
No new workflow platform or critic is justified. Offline checks cannot establish
model quality; real comparison, holdouts, integration and browser acceptance
remain pending. This review is not approval for a runtime merge.
