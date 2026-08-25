# Question Patterns

Use these patterns selectively. Ask about the decision, not every field.

## Outcome

- Which user or operator behavior should be different after this change?
- What evidence makes this problem worth solving now?
- If we deliver only one observable outcome, which one matters most?

## Scope

- Which case must work in the first iteration, and which case is explicitly deferred?
- Is this a new capability, a replacement, or a compatibility layer?
- Which existing behavior must remain unchanged?

## Acceptance

- What would a user observe when the feature succeeds or fails?
- Which edge case would make the result unacceptable?
- Which environment or data boundary must the acceptance cover?

## Tradeoffs and Ownership

- Are we optimizing first for delivery speed, reversibility, cost, reliability, or extensibility?
- Who owns the decision if these goals conflict?
- What would make us revisit the chosen tradeoff?

## Integrations and Data

- Which system owns the source data and which system may mutate it?
- What happens when the dependency is slow, unavailable, duplicated, or partially succeeds?
- Are account scope, consent, retention, audit, or regional constraints material?

## Decision Dependencies

- Which prerequisite decision or fact must be stable before this can be answered?
- Which ready decision would invalidate the most downstream work if answered differently?
- Which dependent question should wait rather than force a premature assumption?

## Recommendation Discipline

- Which facts can the agent verify before asking the user?
- What evidence supports the recommendation, and what is its main tradeoff?
- If the evidence is insufficient, what must be learned before recommending responsibly?
