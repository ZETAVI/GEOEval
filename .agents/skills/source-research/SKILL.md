---
name: source-research
description: Researches external libraries, APIs, platforms, standards, and tools from current primary sources before design or implementation. Use when an external dependency, interface, version, capability, license, or operational constraint may affect a decision. Do not treat search summaries or community articles as interface evidence.
---

# Source Research

Produce decision-grade evidence for an external dependency without turning the repository into a copy of vendor documentation.

## Workflow

### 1. Frame the Decision

Write the exact question the research must answer, the affected change, and what would make a candidate unacceptable. Search is a means of discovery, not the deliverable.

Search existing source briefs, ADRs, lockfiles, generated contracts, and
controlled evidence first. Reuse them when their version, account, route,
configuration, and decision boundary remain applicable. Record the drift trigger
instead of refreshing evidence by habit.

### 2. Use a Source Ladder

Prefer sources in this order:

1. official API reference, schema, standard, or product documentation;
2. official repository, release notes, examples, and license;
3. controlled runtime evidence from the actual account or environment;
4. maintainer discussions and issue trackers;
5. reputable community material for discovery and operational experience.

Follow [the source-quality reference](references/source-quality.md). Fetch the primary page behind search results before relying on a claim. Record version and access date when behavior may drift.

### 3. Extract Decision-Critical Facts

For an API or platform, inspect as applicable:

- supported capability and exact version;
- authentication, scopes, tenancy, and regional constraints;
- request and response schemas;
- pagination, rate limits, timeouts, and quotas;
- error model, retries, idempotency, and webhook behavior;
- sandbox or test facilities;
- pricing, license, maintenance, and deprecation status;
- data handling, telemetry, security, and operational constraints.

For a library, also check compatibility, release activity, transitive risk, migration cost, and exit strategy.

### 4. Validate the Uncertain Boundary

When documentation cannot prove account-specific or runtime behavior, define the smallest controlled validation. Distinguish documented capability, configured access, and observed behavior. Never present a successful HTTP status or search summary as protocol proof.

Before adding a source or probe, name the unresolved fact, the reachable design
or runtime failure, and the choice that its result would change. Stop when the
decision's disqualifiers and required interface boundary are established; leave
optional comparison or confidence-building outside the main brief.

### 5. Return a Source Brief

Use [the source brief asset](assets/source-brief.md). Include:

- decision and recommendation;
- facts with direct URLs;
- conflicts or uncertain claims;
- constraints that affect design;
- rejected options and why;
- follow-up validation, if any.
- evidence-reuse boundary and the event that requires refresh.

Promote stable architectural consequences to the change design or ADR. Do not preserve copied manuals or long quotations.

## Guardrails

- Do not guess library or API behavior from memory.
- Do not let provider rankings substitute for source quality.
- Do not include secrets, tokens, or private account data in research artifacts.
- Do not install, enable, or purchase a candidate unless the user authorized that action.
- Do not repeat a controlled call or source audit when the relevant version,
  account, route, configuration, and decision have not changed.
