# Change: Simplify Sample Parser Projection

- Status: Approved implementation from real-run defect evidence
- Class: Standard Bug fix
- Owning Issue: [#32](https://github.com/ZETAVI/GEOEval/issues/32)
- Base: `f1b1a2c` from PR #28
- Merge dependency: PR #28 must reach `main` before #32 integration

## Why

Two authorized real four-by-five runs acquired all forty platform answers but
required seventy-seven interpretation attempts. The first report ended 17/20;
the second first ended 16/20 and required a customer retry to reach 18/20.
Protected-output replay shows that optional detail inconsistencies are currently
treated like metric-critical evidence failures, causing expensive retries and
long waits without improving report truth.

## Desired outcome

The existing model-to-domain projector accepts a useful interpretation whenever
the original answer still proves the target mention and any reported open-query
position. Optional observations, other-brand details, and contextual positions
that cannot be grounded are removed or normalized instead of invalidating the
whole sample. The parser asks for a smaller, higher-value output and uses a
lower Qwen reasoning effort suited to bounded extraction.

## Scope

- Filter evidence spans against the original answer before domain validation.
- Recover target-mention anchors only from target forms that literally occur in
  the original answer.
- Normalize incomplete optional position pairs to no position.
- Drop optional observations and other-brand records that lose their evidence,
  deduplicate other brands, and enforce existing category/anchor bounds during
  projection.
- Tighten the direct/open parser instructions around high-value facts and
  smaller arrays.
- Change only the Qwen interpretation route from `medium` to `low` reasoning.
- Replay retained protected outputs before any new real call.

## Non-goals

- Relax target-mention truth, invent aliases, infer an open-query rank without
  a positive model position, or fuzzy-match evidence.
- Change acquisition, Query generation, overall synthesis, scoring, the 17/20
  readiness boundary, customer progress, or Provider retry count.
- Add a Critic Agent, another queue, manual review, or unbounded retries.
- Reprocess accepted historical interpretations in place.

## Impact

- GEO Intelligence remains the owner of parser meaning and deterministic
  projection.
- AI Execution retains the same routes and attempt lifecycle; one route option
  changes from medium to low reasoning.
- The canonical stored interpretation contract remains `1.0.0`; only the
  provider-facing model contract and Prompt versions advance.
- No migration or public API change is required.

## Workspace and exit

- Worktree: `/private/tmp/GEOEval-issue-32-parser`
- Branch: `codex/issue-32-parser-projection`
- Merge destination: protected `main` after PR #28
- Exit: verify protected-output replay, tests, current-spec reconciliation, PR
  checks, merge authorization, and Worktree cleanup.
