---
name: task-handoff
description: Creates a compact, continuation-ready handoff for work crossing an agent, session, branch, or owner boundary. Use when pausing, delegating, switching contexts, or ending work with unresolved state. Capture facts, decisions, artifacts, evidence, risks, and exact next actions without transcripts or hidden reasoning.
---

# Task Handoff

Preserve enough verified state for the next contributor to continue safely without replaying the conversation. A handoff is current control information, not permanent product documentation.

## When to Persist a Handoff

Create a durable handoff when work crosses an agent, session, branch, worktree, or owner boundary and cannot be reconstructed quickly from the issue and PR. For a completed, merged task, the PR summary and release note may already be sufficient.

## Workflow

### 1. Inspect Actual State

Read the issue or change record, repository status, current diff, branch or worktree, relevant outputs, and verification results. Do not rely on recollection when the state can be checked.

Record the exact checkout path, branch, revision, dirty state, merge destination,
and whether any other worktree or branch owns related unmerged work.

### 2. Separate Status Precisely

Distinguish:

- planned but not started;
- implemented but not verified;
- locally verified;
- merged;
- deployed or enabled in a named environment.

Never collapse these into “done.”

### 3. Write the Handoff

Use [the handoff asset](assets/handoff.md). Keep it to one screen when possible and include:

- goal and non-goals;
- current status and exact scope;
- changed artifacts and links;
- decisions and explicit assumptions;
- verification evidence and limitations;
- unresolved risks or blockers;
- ordered next actions with exact starting points;
- durable knowledge already promoted to specs, ADRs, contracts, or component docs.
- workspace exit state from the
  [branch and worktree lifecycle](../../../docs/process/human-agent-collaboration.md#branch-and-worktree-lifecycle).

### 4. Promote Long-Lived Knowledge

If a decision will outlive the task, move it to its durable home and link it from the handoff. Do not leave architecture, component contracts, business vocabulary, or stable behavior only in a handoff.

### 5. Validate Continuability

Ask: could a new contributor locate the checkout, understand what changed, reproduce the evidence, and execute the next action without guessing? If not, add the missing fact—not the full history.

If cleanup is proposed, confirm clean status, ancestry or merge state, ownership,
and recovery value first. A stale-looking name is not proof that a branch or
worktree is safe to delete.

## Guardrails

- Do not include full transcripts, hidden reasoning, credentials, or irrelevant exploration.
- Do not duplicate the repository, issue, or change record.
- Do not overwrite a shared handoff without preserving the current authoritative state.
- Do not create permanent handoff files for every completed microtask.
