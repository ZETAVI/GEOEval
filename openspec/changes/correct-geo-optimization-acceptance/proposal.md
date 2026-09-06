# Change: 修复 GEO 优化原验收缺口

- Owner: [Issue #57](https://github.com/ZETAVI/GEOEval/issues/57)
- Class: Architectural security correction; restores already approved behavior
- Baseline: `main@5157521`
- Authorization: existing #57 implementation/merge authorization and the owner's
  request to review this session and continue delivery

## Why and scope

Review of the merged workspace reproduced an unsafe request-body spread that
overrides authenticated account and route identities. Refresh also clears a
dirty Brand form and can overwrite a dirty article, while the report's
optimization entry remains disabled. These fail original #57 acceptance.

Restore server-owned command identity with strict request parsing, protect
independent local buffers and their saved revisions during reads/writes, recover
interrupted generation without duplicate execution, and connect the report to
its own Brand's optimization context. Reuse Brand fields for complete in-page
profile editing. No persistence migration, Provider or Commerce implementation.

## Control

Use the existing worktree on `codex/issue-57-workspace-corrections`, target main.
Verify with isolated local test resources, request-boundary attacks and state
transition regressions. Reconcile the current GEO Optimization spec and archive
this correction after evidence. The earlier archived Change remains history.
