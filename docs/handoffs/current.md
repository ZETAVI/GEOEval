# Handoff: Adopt the AI-Native Framework in GEOEval

## Status

The project framework is implemented and locally validated. The initial GEOEval baseline is committed on `main` but has not been pushed. Product application code has not started.

## Goal and scope

- Goal: Make GEOEval ready for structured product discovery and later evidence-backed delivery.
- In scope: Project governance, documentation map, OpenSpec workspace, six project Skills, GitHub templates, validation, and the first product-definition change.
- Out of scope: Product decisions, application architecture, stack selection, implementation, deployment, and remote repository creation.

## Delivered artifacts

- `AGENTS.md` and `docs/process/`
- `.agents/skills/` and `.agents/skill-catalog.yaml`
- `docs/product/vision.md`, `glossary.md`, and `discovery-plan.md`
- `openspec/changes/define-product-foundation/`
- `.github/` templates and validation workflow
- `scripts/validate_project_framework.py`

## Decisions and assumptions

- Decision: GEOEval owns a project-scoped snapshot of framework commit `95dcda3`.
- Decision: `.agents/skills/` is the repository Skill source for Codex discovery.
- Decision: GitHub is the initial execution surface; no duplicate tracker is introduced.
- Decision: Product definition precedes architecture and implementation.
- Assumption: The existing `GEO-Eval-Prompts.md` is historical input, not approved product truth.

## Verification

- Passed: `python3 scripts/validate_project_framework.py`
- Passed: YAML parsing for project and Skill metadata
- Passed: Local Markdown link validation through the project validator
- Limited: The bundled `quick_validate.py` could not start because PyYAML is not installed; no global dependency was added. Equivalent required frontmatter, naming, UI metadata, invocation policy, line-length, and catalog checks are enforced by the project validator.

## Risks and open items

- Product identity, target user, core problem, evaluation semantics, and MVP scope remain unapproved by design.
- No GitHub remote or Issue exists yet.
- Application commands cannot be defined until the stack is approved and verified.

## Next actions

1. Begin Stage 1 with `$requirement-grill`: product identity, primary user, core problem, and first valuable outcome.
2. Reconcile each approved decision into the active change, vision, and glossary.
3. Complete the product-definition delta and obtain product-owner approval.
4. Create a separate architectural change before selecting the implementation stack.

## Promoted knowledge

- `docs/process/framework-adoption.md`
- `docs/process/how-we-work.md`
- `docs/product/discovery-plan.md`
- `openspec/changes/define-product-foundation/`
