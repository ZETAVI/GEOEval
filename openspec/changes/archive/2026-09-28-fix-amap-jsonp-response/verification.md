# Accepted verification — 2026-09-28

Issue: [#171](https://github.com/ZETAVI/GEOEval/issues/171).
Implementation: [PR #172](https://github.com/ZETAVI/GEOEval/pull/172), merged as
`eaf6c0f068c8f9bf57c5bbea18b3d7627cf9d063`.

## Intent and engineering

- Original implementation: the added regression set failed 10 cases, including JSONP MIME.
- Fixed implementation: all 12 proxy cases and all 255 Web tests passed.
  Cases cover valid dotted callbacks, plain JSON, invalid/empty/duplicate callbacks,
  wrong wrappers, non-JSON/extra JavaScript, and existing credential/path boundaries.
- Web typecheck, targeted Prettier and project framework validation passed.
- Fixed-diff review: ready. Existing search is restored, the owner/path/credential
  boundary is preserved, executable callback content is validated, and the current
  Brand Knowledge spec is reconciled. No material finding or touched Evolution marker.
- Required CI passed: [full verification](https://github.com/ZETAVI/GEOEval/actions/runs/36372187272)
  and [framework verification](https://github.com/ZETAVI/GEOEval/actions/runs/36372187285).
- Linux x64 / Node 24.12.0 / pnpm 11.9.0 public Web build passed outside production.
  Build revision `d64092c0e013470d8890f44b4fa9c2d9208a31c1` and merged revision
  have the same Git tree, `4430f827c4ae8c8eca3e1ed457b7f267c8e28950`.
  Web artifact SHA-256: `5bbd83c117a9e464ee4f96691b4cd5cf1a4f0200242a28d5eaca8ccefe458cba`.

## Production acceptance

- Published at 2026-09-28 11:16:31 CST to
  `/opt/geoeval/releases/geoeval-eaf6c0f068c8`; the current pointer selects it.
  `RELEASE_MANIFEST.json` records build/merge revisions and artifact hashes.
- Shared-host and GEO deploy locks held. Only Web restarted; API, acquisition
  worker, recharge worker/callback, Nginx, PostgreSQL and Redis PIDs stayed unchanged.
  Backend compiled output was reused after hash equality verification.
- Homepage and API live/ready probes returned 200; no new Web warning or OOM
  appeared in the deployment window. Old source/inodes were verified unchanged.
- Real Chrome brand-form search for public landmark `北京 天安门` displayed ten
  candidates. Network showed Script 200, MIME `text/javascript`, `nosniff` retained.
  Selecting 天安门 produced Fetch 201 at `/api/brand-location-verifications` and
  visible `已复核门店`, Beijing/Dongcheng address and automatically determined area.
  No brand was saved; the diagnostic tab was closed and the user's original form
  was left untouched.
- Previous release `/opt/geoeval/releases/geoeval-fe16def` is retained. Rollback
  means atomically restoring the current symlink under the same two locks and
  restarting Web only. The deployment script has this failure rollback path;
  a live rollback was not needed or exercised after passing acceptance.

## Separate authorized model capability probe

Exactly six requests used installed production adapters without business
persistence. DeepSeek/Hunyuan/Doubao/Qwen/Ernie acquisitions all completed with
nonempty, non-echoed assistant answers and triggered web search (9.1–29.3 s).
One captured answer passed DeepSeek interpretation and the current semantic
contract (2.95 s). This bounded probe is not a long-term stability claim.
Protected evidence: task report `/private/tmp/geoeval-171-delivery.md` and
`/tmp/geoeval-provider-health-171-results.json` on the host. Credentials are absent.

## Reconciliation and workspace exit

Accepted behavior lives in the current Brand Knowledge spec and proxy/tests.
The standard change is archived; no new ADR, durable module, data migration or
handoff is needed. The independent browser-sampler tunnel and recharge-worker
memory pressure remain outside this authorized Amap repair; no related runtime
was changed, and #169/PR #170 remain independently owned.

Workspace `/Users/lucien/.config/codex/worktrees/amap-jsonp/GEOEval`, branch
`codex/issue-171-amap-jsonp`, owner this conversation, direct-to-main topology.
Exit: `remove-after-merge` for the final acceptance PR. After final CI/merge,
verify a clean checkout and integrated tree, delete the redundant owned remote
branch, then archive the managed worktree with a recoverable snapshot. No unique
unmerged state or running process may be discarded. Record actual exit in the
Issue before explicitly moving Project to Done.
