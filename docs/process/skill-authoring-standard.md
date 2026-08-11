# Skill Authoring Standard

## Admission test

Create a skill only when a workflow is repeatable and at least one is true:

- agents repeatedly need non-obvious project or domain knowledge;
- the same prompt or correction is being reused;
- deterministic scripts improve reliability;
- a fragile procedure needs guardrails;
- a reusable template materially improves output consistency.

Do not create a skill for generic knowledge the model already has, a one-time task, or a policy that belongs in `AGENTS.md`.

## Required design

1. Start from two or three concrete use cases.
2. Assign one primary taxonomy category.
3. Write a description that includes what the skill does, when it triggers, and important exclusions.
4. Keep the main workflow in `SKILL.md` under 500 lines.
5. Put detailed knowledge in one-level `references/` files.
6. Put deterministic or repeatedly generated code in `scripts/`.
7. Put output templates and boilerplate in `assets/`.
8. Add Gotchas only from credible failure modes; grow them through real use.
9. Keep external documentation as links or targeted notes; do not mirror a vendor manual.
10. Do not add README, installation, quick-reference, or changelog files inside a skill.

## Freedom level

- High freedom: research, critique, design heuristics.
- Medium freedom: preferred workflow with contextual choices.
- Low freedom: migrations, destructive operations, exact formatting, or fragile commands.

Use the lowest freedom necessary for safety, not the lowest freedom possible.

## Trigger quality

The description is a routing contract. Front-load the task and trigger terms. Avoid generic descriptions such as “helps with development.” Use explicit exclusions when nearby skills overlap.

Before promotion, test:

- obvious prompts that should trigger;
- paraphrased prompts that should trigger;
- neighboring prompts that should not trigger;
- one realistic end-to-end task;
- missing setup or failure behavior.

## Composition

Prefer explicit orchestrators that invoke focused disciplines conceptually. Do not build one mega-skill containing requirements, design, implementation, review, deployment, and reporting.

Skill dependencies are not assumed to be automatically resolved. Record them in the catalog and make missing prerequisites visible to the user.

## Lifecycle

```text
candidate → sandbox → pilot → stable → deprecated → removed
```

Promotion requires a clear owner, valid structure, trigger tests, a real use case, reviewed license, and no duplicate canonical workflow.

Deprecation requires a replacement or migration note in the catalog. Do not maintain a changelog inside each skill; Git history and framework release notes carry that history.

