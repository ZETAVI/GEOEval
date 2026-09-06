# Architecture Review: GEO 优化内容工作区与核心文章基础

- Review base: `main@975f2d2e761578494f3450513f09b225d064103f`
- Reviewed Change payload SHA-256:
  `2288559f1243c716a52063bf9e7c7cbe5e582bc9c28416ea3abbd9a6b3c38313`
- Scope: proposal, decision brief, design, tasks and four delta specifications;
  this review file is excluded from the payload hash
- Review type: pre-implementation `Propose → Approve` gate

## Review contract

The Change must activate only the deterministic customer path owned by Issue
#57: one current Brand's writing information, latest successful guidance, Mock
generation, explicit article save/confirmation and a narrow confirmed-revision
handoff. It must not implement real Writer quality, material parsing, package,
points, purchase, order, fulfilment, deployment or Provider activity.

## Findings resolved in the draft

1. **Scope drift into future materials.** Earlier Issue discussion described
   source references, hashes, limitations and material-set persistence that do
   not change #57's Mock evidence. The Change now implements no material records
   or UI; it retains only nullable prepared Markdown in the Writer Request.
2. **Freshness confused with write integrity.** A first draft risked rejecting
   every result whose Brand or guidance became newer. The design now hard-blocks
   only stale article-revision replacement; source freshness is advisory and
   cannot block customer confirmation or future purchase.
3. **Invisible save semantics.** The design now requires explicit Brand and
   article Save actions, keeps local dirty state outside server truth and
   prevents generation from silently using unsaved input.
4. **Unbounded customer text.** Characteristic detail, supplemental background
   and desired-positioning entries now have first-release domain bounds without
   creating new taxonomies or fields.
5. **Incorrect delta-owner names.** Product Definition delta headings now match
   the current requirement owners `Progressive brand-profile completion` and
   `Customer-confirmed optimization and publishing service`.

## Product intent review

`ready for product-owner approval`.

- The workspace continues the same current Brand rather than asking a customer
  to re-enter or synchronize data.
- Confirmed Article Information reflects the Issue decisions on characteristics,
  background, suitable customers/contexts, integer RMB range/negotiation and
  desired positioning.
- Old guidance or source input produces a concise notice, not a validity or
  commercial block. Exact article revision remains the customer's content
  confirmation authority.
- The delivered Writer and material states are honest: deterministic local
  generation is test evidence only and prepared material is always absent.
- Future Order receives only an exact confirmed article reference; no purchase
  or publication is represented as delivered.

## Architecture and data review

`ready for architecture-owner approval`.

- Brand Knowledge remains the only editable Brand owner. The strict
  `articleInformation` value object has no independent entity or lifecycle, and
  one aggregate revision owns all mutation CAS.
- Evaluation and Writer input changes use separate normalized purpose
  fingerprints; a writing-only change cannot manufacture an Evaluation
  opportunity, and a representation-only characteristic migration must preserve
  the v3 fingerprint.
- GEO Optimization owns exactly the state it needs: immutable Writer input,
  generation execution and current article. Writer depends on resolved values,
  not repositories.
- Writer execution occurs outside database transactions. Preparation and
  completion use short owner-local transactions, durable idempotency and current
  article revision protection.
- The confirmed-article handoff is a narrow synchronous read. Future Commerce
  must re-authorize and snapshot the exact article revision in its own
  transaction rather than reading GEO tables.
- The migration has one representation cutover, backup/restore evidence and no
  runtime dual-write or historical-snapshot rewrite.

No ADR is warranted at Propose: the decisions are owned by the new capability's
spec and Brand/Evaluation owner-local contracts, and no cross-change platform
policy is introduced.

## Evidence and continuity review

`ready for OpenSpec review`.

- Live Issue #57 is open, assigned, P1 and `Review / Decision`.
- The branch is clean before this Change and based on current
  `origin/main@975f2d2`.
- `python3 scripts/validate_project_framework.py` passes with all cataloged
  Skills and local Markdown links.
- `git diff --check` passes.
- Delta requirement headings were compared against current owner names.
- No runtime test, migration, build, browser flow, real Writer, material parse,
  purchase or Provider call was run; none is claimed by this documentation-only
  proposal.

## Residual risks and gates

- Issue #39 remains the live P0 `In Progress` primary delivery. Approval of this
  Change does not silently move #57 to implementation or consume another primary
  WIP slot; the Project owner must schedule that transition.
- No open Issue currently owns the package/points/purchase/Publishing Order
  increment. Create or identify that independently valuable outcome before
  claiming the optimization-to-order chain is implemented.
- The first-release field bounds are reversible implementation constraints and
  may need evidence-led adjustment after real customer input.
- A `NOT_APPLIED` execution may retain protected technical result evidence but
  must never become a customer candidate history; exact retention remains an
  implementation/operations detail inside the approved scope.
- Real Writer quality, input policy, cost, cancellation and Provider behavior
  remain outside this review and require their own current evidence and approval.

## Result

Overall result: `ready for product and architecture approval`.

No unresolved `must-fix` or `should-fix` finding remains in the proposed Mock
boundary. Implementation, migration, PR integration, Provider use, materials,
commerce and deployment remain unapproved.

## Product-owner disposition

The product owner approved the #57 OpenSpec boundary on 2026-09-05, confirmed
the Mock optimization-to-confirmed-article route, and retained Publishing
Commerce, Publication Delivery, real Writer integration and Brand Materials as
separately owned successor outcomes.

Disposition: `approved for Project scheduling`. Move Issue #57 from
`Review / Decision` to `Ready`; do not start implementation or migration while
the current P0 primary delivery remains in progress unless the Project owner
explicitly reprioritizes WIP. This approval does not authorize Provider calls,
materials, commerce, deployment, PR integration or merge.
