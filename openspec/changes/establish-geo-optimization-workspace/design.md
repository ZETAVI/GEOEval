# Design: GEO 优化内容工作区与核心文章基础

## Review contract

This design activates a GEO Optimization owner only for the deterministic local
journey approved in Issue #57. It must establish a stable Future Order handoff
without implementing real writing, material parsing or commerce.

## Ownership and dependency direction

| Owner                      | Owns                                                                                                      | Does not own                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Brand Knowledge            | Current Brand, characteristic structure, Article Information, readiness, revision and purpose projections | Article body, Evaluation guidance, Writer execution or orders |
| Evaluation Report          | Immutable reports and latest successful protected/customer guidance reads                                 | Current Brand facts or article state                          |
| GEO Optimization           | WriterInputSnapshot, generation execution, current Core Article and customer workspace                    | Brand copies, real Provider policy, materials or commerce     |
| Writer Port                | Provider-neutral Request/Result behavior                                                                  | Repositories, business state, retries or customer UI          |
| Future Brand Materials     | Upload, preparation and optional prepared Markdown                                                        | Current Brand fields or article lifecycle                     |
| Future Publishing Commerce | Package/point/order transaction and immutable purchase snapshot                                           | Editable current article or generation                        |

Dependency direction is:

```text
Web/API → GEO Optimization
              ├─ Brand purpose read/write
              ├─ Evaluation guidance read
              └─ Writer Port → deterministic local Adapter

Future Order → confirmed-article read boundary
```

Writer never calls back into Brand, Evaluation or Materials. GEO Optimization
resolves upstream values before invocation.

## Brand aggregate

`BrandProfile` gains:

- `revision Int @default(1)` for all update CAS;
- `writingContextFingerprint Char(64)` derived from the normalized Writer
  projection;
- structured characteristics JSON items `{id,title,detail?}`;
- strict optional `articleInformation` JSON value object.

The Article Information domain shape is closed rather than an extension bag:

```ts
type ArticleInformation = {
  price:
    | null
    | { mode: "RANGE"; minimum: number; maximum: number }
    | { mode: "NEGOTIABLE" };
  suitableAudienceContexts: string[];
  supplementalBackground?: string;
  desiredPositioning: string[];
};
```

Unknown keys fail validation. Draft storage accepts incomplete required writing
values; a present characteristic detail is 2–1000 normalized characters,
supplemental background is at most 2000 normalized characters, and desired
positioning contains at most five distinct 2–80-character items.
`articleInformationReadiness` derives missing actions and is never persisted.

All Brand mutations use `expectedRevision`. The repository compares and updates
the revision inside the same transaction. A normalized no-op may return current
state without manufacturing a semantic fingerprint change; exact no-op revision
behavior remains owner-local as long as stale expected revisions never overwrite
data.

The existing `brand-evaluation-input@3` projection continues to consume only
canonical characteristic titles. The migration must assert that title-preserving
rows retain their pre-migration Evaluation fingerprint. A new versioned Writer
projection includes only Writer-used Brand values and excludes contacts.

## Persistence model

### WriterInputSnapshot

One immutable snapshot stores:

- account/Brand ownership;
- source Brand revision and writing fingerprint;
- one frozen Brand Writer-purpose value;
- immutable Evaluation guidance reference;
- generation-policy identity/version/hash;
- optional prepared-material reference, which is absent in #57;
- Writer Request contract version and creation time.

No separate BrandWritingSnapshot or general content-addressed snapshot layer is
introduced. Core Article, generation and retry reference the one snapshot rather
than storing their own business-input copies.

### ArticleGeneration

One generation record stores brand/account ownership, idempotency key,
WriterInputSnapshot reference, expected article revision/replacement intent,
technical status, safe failure/not-applied class and timestamps. Suggested first
statuses are `RUNNING`, `SUCCEEDED`, `FAILED` and `NOT_APPLIED`; they are not
article business states.

At most one active generation exists per Brand. The same Brand/idempotency key
returns the original record. A different key while one generation is active does
not invoke Writer again.

### CoreArticle

One current row per Brand stores title, Markdown body, `DRAFT | CONFIRMED`,
revision, accepted source-generation reference and confirmation time. It does not
store candidates or a second copy of Writer input.

## Generation transaction boundary

1. A short preparation transaction locks current Brand/article state, validates
   readiness, idempotency, active-generation uniqueness and explicit replacement
   authorization, then persists Snapshot and `RUNNING` generation.
2. The deterministic Writer call runs outside the transaction.
3. A short completion transaction locks the generation and current article.
4. If replacement expected revision still matches, success creates or replaces
   the current article as `DRAFT`, increments its revision and completes the
   generation.
5. If the article revision changed, the generation becomes `NOT_APPLIED`; the
   current article remains unchanged and the generated result is not exposed as
   a candidate.
6. Writer failure marks only the generation `FAILED`; the current article stays
   intact.

Brand/guidance/material freshness does not participate in the article write CAS.
A successful result remains bound to its frozen Snapshot and may become a draft
with a derived freshness notice. This is deliberately softer than article
revision integrity because customers review and confirm content before purchase.

## Explicit-save interaction

- Brand/Article Information and Core Article have visible Save actions.
- Local dirty state is not server truth and is never auto-saved.
- Generate is unavailable while Brand form changes are unsaved.
- During active generation, repeat Generate is disabled; Brand Save remains
  available and shows a concise notice if it makes the active input older.
- Regeneration keeps the existing article visible. To avoid invisible loss of a
  local buffer, the article editor must not replace its local dirty content when
  completion polling observes a new server revision; it presents the normal
  revision conflict/reload choice.
- Confirmation requires the exact saved article revision and no unsaved local
  edits.

## Writer Request/Result seam

The stable top-level Request groups are system-derived Brand context,
customer-provided content, desired positioning, Evaluation guidance, optional
prepared Markdown and generation policy. In #57 the prepared value is always
`null`. Evaluation Report projects only the accepted guidance summary,
priorities, writing angles and cautions for Writer use; evidence references,
sample IDs, scores, answers and execution internals do not enter the Request.

The deterministic Adapter must return one title and one Markdown body from the
same Request for repeatable tests. It may use simple program logic and fixtures;
it must not masquerade as production-quality writing or call AI Execution.

Writer Result validation rejects missing/blank title or body before article
mutation. Exact editorial quality, claim strength, Provider envelope and real
attempt records belong to the later writing-agent Change.

## Future Order handoff

The handoff is a read, not an order side effect:

```ts
type ConfirmedCoreArticleReference = {
  accountId: string;
  brandId: string;
  articleId: string;
  revision: number;
};
```

Future Commerce must re-authorize ownership and confirmation and freeze title/body
for that exact revision in its own transaction. Freshness notices remain advisory.
Order cannot read GEO Optimization tables directly or treat a later current
article edit as a purchased-content mutation.

## Successor capability map

The product journey remains one customer path but activates through separate
owners and Issues:

```text
#57 GEO Optimization
  confirmed article reference
        ↓
Publishing Commerce
  package/precise choice + quote + points + immutable order
        ↓
Publication Delivery
  claim + variants + publication work + returned results

Real Writer Adapter ───────→ existing Writer Port
Brand Materials ──────────→ optional prepared Markdown input
```

- **Publishing Commerce** is the next independently valuable Issue. It owns the
  atomic customer purchase transaction and consumes only the confirmed-article
  read boundary plus Media Supply public quote facts.
- **Publication Delivery** starts from an immutable paid order and owns internal
  operations work and returned publication results; it does not edit the
  customer's current article.
- **Real Writer integration** replaces the deterministic Adapter behind the same
  Port after its quality, Provider, cost and failure policy is accepted.
- **Brand Materials** supplies the optional Markdown input after upload and
  parsing have their own lifecycle. It cannot change the Writer Port or article
  state machine.

These successors may be planned as Backlog records, but they do not share #57's
branch, Change, implementation authorization or acceptance claim.

## Alternatives rejected

- **Independent Article Information entity:** no independent identity,
  permission or lifecycle exists.
- **Second writing revision counter:** Brand revision plus purpose fingerprints
  already separate concurrency and semantic change.
- **Auto-save:** makes generation input and revision conflicts invisible.
- **Lock the whole page during generation:** future Writer latency would become
  customer lock time.
- **Reject results when any source is newer:** over-strict freshness would block
  a customer-reviewed draft and later purchase without protecting article CAS.
- **Always overwrite after regeneration:** loses later customer edits.
- **Retain a generated candidate after conflict:** creates the version/candidate
  product explicitly excluded from the first release.
- **Implement mock materials:** would fabricate a capability and add no evidence
  for the optimization-to-confirmation path.

## Migration and rollback

- Rehearse a one-time forward migration that assigns stable IDs to current
  characteristic strings and initializes Brand revision/writing fingerprint and
  empty Article Information.
- Prove every existing Brand retains the same canonical titles and Evaluation
  fingerprint; historical Evaluation snapshots are never rewritten.
- New GEO Optimization tables start empty and add no synthetic customer article.
- The project currently has development data only. Before migration, take a
  named database backup and verify restoration. Do not keep runtime dual-write or
  legacy characteristic arrays.
- Application rollback is safe before the migration. After representation
  cutover, recovery is forward repair or verified database restore plus the old
  application; an old binary must not read the new JSON shape accidentally.

## Documentation reconciliation

Brand Knowledge, Evaluation guidance reads and the accepted GEO Optimization
backend lifecycle are reconciled into their current specs. Product Definition's
activation marker now links the owner-local GEO Optimization contract, while the
outdated Article Information/material and Writer-Skill assumptions have been
removed from Product Definition, Vision and Glossary. The active delta now owns
only the unfinished terminal-customer API and Web journey. Archive this Change
only after that journey, final evidence and Issue state agree.

## Verification strategy

- migration rehearsal and invariant query over characteristics/fingerprints;
- Brand domain/CAS/fingerprint/readiness unit and integration tests;
- guidance access and cross-account denial tests;
- Writer Request/Result contract and deterministic Adapter tests;
- generation idempotency, failure, not-applied and article-preservation tests;
- article save/confirm/re-edit/regenerate revision tests;
- OpenAPI/client generation, typecheck, tests and build;
- browser checks for no-brand/no-guidance/incomplete, generating/failure,
  draft/confirmed, explicit save, dirty state, freshness, conflict and responsive
  layout;
- framework validation, current-spec reconciliation and workspace exit review.
