# Change: Integrate the Independent Browser Sampler Control Plane

- Status: Active
- Class: Architectural integration
- Owning Issue: [#169](https://github.com/ZETAVI/GEOEval/issues/169)

## Why

GEOEval currently acquires all twenty evaluation answers through model-provider
APIs. The accepted product direction now requires consumer Web/App sampling,
but browser identity, login, verification, page automation and node routing are
already owned by an independent browser-sampler control plane. Copying those
concerns into GEOEval would create a second identity and scheduling authority.

GEOEval therefore needs one durable HTTP integration seam: submit four
questions as one platform batch, preserve the returned task identity, resume
polling after process restarts, and project each verified assistant answer into
the existing sample evidence and analysis chain. A failed platform or item must
remain visible as partial evidence rather than causing successful platforms to
be replayed.

## Outcome

When explicitly enabled, one evaluation submits five independent platform
batches in parallel through the external control-plane protocol. GEOEval owns
business progress, attempts, canonical answers, interpretations and report
readiness; the control plane owns browser execution. The current provider-API
route remains the default and rollback path.

## Scope

- add a provider-neutral browser-sampling gateway port and validated HTTP
  adapter for submit, status and result;
- persist one recoverable external batch identity per run, cycle and platform;
- derive and retain a stable per-cycle idempotency key before the first remote
  request;
- accept verified captured and captured-late items into the existing
  attempt/evidence chain and exhaust only failed items;
- schedule polling through deferred durable work rather than blocking a Worker;
- expose only customer-safe acquired/analyzed/unavailable progress through the
  existing evaluation view;
- add contract, partial-success, interruption and redaction tests;
- validate a controlled two-platform/one-question slice before the full
  five-platform/four-question gate.

## Non-goals

- browser automation, Cookie/Profile storage, login, MFA, Live View, account
  pools, node routing or anti-detection logic inside GEOEval;
- changing parser, name-resolution, composition or report semantics;
- auto-replaying an uncertain browser submission with a new identity;
- production deployment, paid-resource activation or control-plane account
  maintenance;
- claiming the current control-plane experiment is production-ready or that its
  latest real run completed twenty of twenty samples.

## Compatibility

The Worker defaults to the existing provider acquisition path. Enabling the
browser control plane is an explicit startup setting. Existing runs, attempts,
evidence and reports remain readable. Rollback disables the new mode; persisted
batch records remain audit history and do not alter accepted evidence.

The stable internal platform key and Provider-API route remain `hunyuan` for
stored identity compatibility. New evaluation snapshots use the current
customer label `腾讯元宝`, while the browser gateway translates that internal
key to the control plane's `yuanbao` protocol key. Existing snapshots keep
their stored labels and are not rewritten.

## Control State

- Documentation: `evaluation-evidence` remains the canonical behavior owner.
  The Product Definition evolution marker remains valid because detailed
  sampling behavior is already extracted to that capability spec.
- Workspace: `codex/issue-169-sampling-gateway` in an isolated worktree, based
  on `origin/main@fe16def`, owned by this task, merging to protected `main` only
  through a reviewed PR. The first PR is `Part of #169` and does not close the
  Issue unless the five-by-four gate and documentation reconciliation complete.
