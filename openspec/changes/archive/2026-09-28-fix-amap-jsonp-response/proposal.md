# Fix Amap JSONP response execution

Issue: [#171](https://github.com/ZETAVI/GEOEval/issues/171). Class: Standard Bug.

The Amap search upstream returns valid JSONP as `application/json`. The public
Nginx `nosniff` policy rejects that response as a script, so customers cannot
select a Store Location. Production browser/network evidence reproduced this
with a public landmark; server detail and reverse geocoding succeeded.

Restore the existing search behavior by validating callback and response JSONP,
then returning JavaScript MIME. Preserve JSON responses, the current path
allowlist, server-only security code, timeout and `nosniff`. No persistence,
provider, product, identity or payment contract changes.

The human owner approved implementation, production deployment and a separate
at-most-six-request public-sample model verification in this conversation.
The model verification is diagnostic evidence, not part of this Bug's code.

Documentation impact: update the existing Brand Knowledge search scenario and
owning proxy/tests; no new durable design or ADR. No touched Evolution marker.

Workspace: `codex/issue-171-amap-jsonp`, base `fe16def`, owner Codex/current
conversation, direct merge to protected `main`. Owned files are the Amap route,
its tests and owner-local requirement delta. Keep the worktree for release
verification, then account for merge/clean status and archive it if no longer
needed. Other Issue worktrees remain independently owned.
