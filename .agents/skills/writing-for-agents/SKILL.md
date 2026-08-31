---
name: writing-for-agents
description: Reviews and improves instructions, Skills, prompts, specs, and tracker templates that agents consume. Use when creating or pruning agent-facing text so it routes reliably, discloses context progressively, and has checkable completion criteria.
---

# Writing for Agents

Write instructions that change agent behavior without duplicating the system
they describe.

## Review model

- **Pointer:** always-loaded text names the material and the exact trigger for
  reading it.
- **Progressive disclosure:** keep steps needed by every run inline; place
  branch-specific detail in one-level references.
- **Completion criterion:** every workflow step has a checkable end state.
- **Single owner:** one fact is maintained once; other artifacts link to it.
- **Pruning:** delete stale, duplicated, explanatory, or default-behavior text
  that does not change the next action.

For each document, identify its reader, trigger, branches, required action,
authority, and stopping condition. Prefer positive target behavior over long
lists of prohibitions. Treat environment files, schemas, commands, and
repository layout as sources that should not be copied into prose when they are
cheap to inspect.

Return a proposed patch or review findings. Do not create a new document when an
existing pointer, Skill, template, executable guard, or canonical owner can be
improved instead.
