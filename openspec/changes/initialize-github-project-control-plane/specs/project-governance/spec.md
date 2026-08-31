# Project Governance Delta

## Added requirements

### Requirement: Live GitHub control plane

Standard and architectural writes SHALL have an owning Issue, an Issue-named
branch from current main, a pull request, and required framework and project
checks before integration.

### Requirement: Bounded work in progress

The project SHALL permit one primary product-delivery parent Issue and one
non-conflicting research or maintenance Issue in progress, with verified urgent
Bugs allowed to preempt.

### Requirement: Recover before cleanup

Unique local discussion state SHALL be checkpointed, pushed, and linked to its
Issue before local branches or worktrees are removed.
