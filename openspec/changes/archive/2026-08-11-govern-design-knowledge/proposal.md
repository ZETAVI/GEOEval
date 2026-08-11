# Change: Govern Design Knowledge Without Heavy Process

- Status: Implemented and reconciled
- Class: Standard
- Decision owner: Project owner
- Implementation authorized: Yes

## Why

AI coding and iterative product discovery can create multiple design explanations for the same concept. Rules such as “one fact, one home” already exist, but the project does not yet state when a design document is justified, how it relates to executable sources, or what must happen when it becomes outdated.

## Desired outcome

Add a lightweight lifecycle that keeps current design knowledge discoverable and singular while allowing designs to evolve continuously. The workflow should prevent drift without requiring a document platform, central registry, new Skill, or broad semantic linter.

## Scope

- Classify design knowledge by lifecycle and authority.
- Define an admission test before creating a durable design document.
- Define update, move, supersede, delete, and reconciliation rules.
- Add one flexible current-design contract template.
- Strengthen existing change, review, verification, PR, and agent guidance.
- Add only cheap deterministic checks with low false-positive risk.

## Non-goals

- Requiring a document for every component, module, or task
- Installing OpenSpec, a documentation platform, a prose linter, or another dependency
- Adding document IDs, a registry, scheduled review ceremonies, or freshness metrics
- Attempting to detect semantic duplication automatically
- Creating a new document-management Skill
- Applying this pilot change back to the portable framework repository before real use

## Impact

This change updates project governance and existing Skills. It does not alter the GEOEval product definition or authorize application architecture and implementation.
