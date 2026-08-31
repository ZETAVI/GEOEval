---
name: domain-modeling
description: Sharpens GEOEval business language, capability ownership, lifecycle, and durable boundaries. Use when terms conflict, ownership is unclear, or a change introduces or revises a domain concept. Do not turn implementation detail into glossary content or write current truth before confirmation.
---

# Domain Modeling

Use the project's product glossary, current specs, code names, and concrete
scenarios to make domain boundaries precise.

## Workflow

1. Read `docs/product/glossary.md`, the affected current spec, owning code, and
   relevant decision records.
2. Identify conflicting synonyms, overloaded terms, missing owners, unclear
   lifecycle states, or statements that disagree with executable behavior.
3. Test the proposed language with representative normal, boundary, failure,
   history, and permission scenarios.
4. Classify the result:
   - change-local decision: promote to the Issue or active change;
   - accepted current language or behavior: update the canonical owner during
     reconciliation;
   - cross-change, surprising rationale: propose a short ADR;
   - reversible implementation detail: leave with code and tests.
5. Return the smallest vocabulary or ownership change and the affected owner.

Candidate decisions remain in discussion until confirmed. Do not maintain a
second glossary, copy schemas into prose, or create an ADR for every choice.
