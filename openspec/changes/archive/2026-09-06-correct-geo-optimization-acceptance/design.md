# Accepted correction design

## Architecture readiness

HTTP presentation owns request validation: strict allowlisted bodies and UUID
route identifiers are parsed before service invocation; Principal/route identity
is assigned explicitly and never sourced from a body. Reuse the installed Zod
validation pattern. Service/repository account checks continue unchanged.

The Web owns local edit buffers, never server business truth. A small owner-local
state reducer tracks each buffer against its own saved Brand/article revision;
background observations may advance server data but cannot silently rebase a
dirty buffer. Mutation responses apply only to their resource and ignore older
responses. A read that discovers another current Brand is offered explicitly
while local edits remain; no local content is moved to a different Brand.

One generation command retains its idempotency key across uncertain transport.
FAILED retry reuses its generation; a RUNNING execution may be explicitly
re-observed/recovered through the existing bounded backend retry contract.
Replacement authorization captures the article ID/revision shown to the user.

Existing shared Brand field components remain owners of industry and location
interaction. Optimization edits the same aggregate with one explicit Save.
Report navigation carries Brand ID; selecting that context requires an explicit
customer action if another Brand is current.

No new entities, generic state framework, or external dependency. Rollout is an
application correction; reverting it would restore known authorization defects
and is not an acceptable recovery choice. Use forward repair instead.

## Review and evidence

Must-fix: body identity override; dirty-buffer loss/rebase; incomplete report
handoff. Tests must fail on the merged code and pass after correction. Verify
cross-account denial over real HTTP and exercise delayed responses independently
of the deterministic Writer's speed. No claim based only on static markup.
