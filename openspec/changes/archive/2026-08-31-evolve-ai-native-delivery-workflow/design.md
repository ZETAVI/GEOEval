# Design

## Artifact model

The change keeps six context layers: stable governance, current truth, change
coordination, execution workspace, evidence, and history/learning. The Issue is
the coordination contract; current specs remain current authority; the PR is the
change transaction; commits bind implementation checkpoints; handoffs remain
temporary recovery state.

Candidate decisions remain conversational until confirmed. Confirmed
change-local decisions enter the Issue. Accepted behavior enters current owners
during reconciliation. A short decision record is reserved for cross-change,
surprising rationale.

## Skill architecture

The catalog adds a workflow group independent of functional category:

```text
route → shape → deliver → maintain → learn
```

`project-router` is the Ask-Matt-style entry and installed-Skill pre-filter. It
does not discover external capabilities. Existing `source-research` already
absorbs the research workflow. Existing `requirement-grill` remains the bounded
decision interview. New Skills fill distinct gaps and keep state-changing
orchestrators explicit.

## Migration topology

One governance commit is authored from `main`. `main` receives it first. The
real-provider branch then merges that exact commit after its current dirty S6
reconciliation is safely checkpointed by its owner. The migration never edits
the root provider-validation checkout or copies governance files by hand between
branches.

The completed first-evaluation change and its frontend follow-up are reviewed as
a separate reconciliation task; they are not rewritten inside this governance
commit.
