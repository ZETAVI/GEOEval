# Design

## Control plane

GitHub Issues own coordination and status. OpenSpec owns proposed behavior and
design. Pull requests own concrete implementation and evidence. Current specs,
code, schemas, and tests own accepted truth. GitHub Actions provides required,
reproducible framework and deterministic-project checks before merge.

## Workspace migration

The root checkout returns to main. Unique prompt, industry-catalog, and writing-
research state is committed and pushed to Issue-linked recovery branches before
local removal. Empty or fully merged worktrees and branches are removed only
after dirtiness, ancestry, remote recovery, and process checks. S6 remains the
only active feature worktree and is migrated separately through Issue #4.

## Delivery policy

One primary product-delivery parent Issue and one non-conflicting research or
maintenance Issue may be active. A Backlog Issue has no branch. Each continuing
write begins from current main using `codex/issue-<number>-<slug>` and exits
through a pull request, reconciliation, and explicit worktree disposition.

## CI boundary

The lightweight framework job validates governance structure. The deterministic
project job installs the locked workspace, starts the project-named PostgreSQL
and Redis services, generates the ignored Prisma client before type checking,
applies migrations, checks formatting and types, runs backend and Web tests,
builds generated and application artifacts, and rejects tracked generation
drift. It uses no production credentials or paid providers.
