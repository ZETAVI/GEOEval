# GEOEval Industry Catalog

- Status: Active
- Decision owner: Product owner
- Catalog: `industry-catalog@1.0.0`
- Approved on: 2026-08-26
- Executable owner:
  [`industry-catalog.json`](../../apps/backend/src/brand/reference-data/industry-catalog.json)
- Complete generated reference:
  [`industry-catalog.md`](../generated/industry-catalog.md)
- Decision history:
  [`standardize-industry-catalog`](../../openspec/changes/archive/2026-08-26-standardize-industry-catalog/proposal.md)

The Brand Knowledge executable source is the only maintained copy of the exact
13 primary and 199 secondary nodes, stable identifiers, display labels,
recommendation subjects, and `Other` flags. The generated reference contains
the full reviewable list and must not be edited by hand.

## Purpose and responsibility

The catalog helps a non-expert business owner answer:

> 你最希望客户因为什么产品或服务找到并推荐你？

It owns one coherent industry selection used to generate a realistic
industry-recommendation question. It does not:

- list the complete licensed business scope of an entity;
- determine a statistical principal activity or enterprise size;
- prove a license, credential, product registration, or regulatory status;
- replace the flagship product-or-service information used for article
  generation; or
- exhaustively represent every economic activity.

## Selection contract

1. A brand selects exactly one primary and one dependent secondary category for
   its current evaluation-relevant profile.
2. A mixed business selects the product or service that matters for the current
   consumer, procurement, or recommendation scenario, not every activity it can
   perform.
3. A listed category is chosen by expected recommendation context. Legal form,
   production method, sales channel, or a statistical code does not override
   that context.
4. Every primary contains one `Other` secondary. Selecting it requires a
   concrete customer-entered product-or-service phrase of 2-60 normalized
   characters. Exact generic values `其他` and `其它` are invalid.
5. Category selection guides questions only. Regulated-industry eligibility and
   user-agreement controls remain separately owned.

## Identifier and field contract

- Primary IDs are `IND-01` through `IND-13`.
- Secondary IDs append a two-digit suffix, for example `IND-01-01`.
- `99` is reserved for the `Other` secondary under each primary.
- Published IDs are immutable and are never renumbered, reassigned, or reused
  for a different meaning.
- A display label is customer-facing presentation, not persisted free text.
- A recommendation subject is controlled question-generation context, not a
  complete question. For `Other`, the normalized customer phrase becomes the
  actual recommendation subject.
- Search aliases may help find candidate categories. They are not stored as
  categories and never silently resolve an ambiguous match.

## Mixed-business routing examples

| Business | Selection by intended recommendation context |
| --- | --- |
| Cosmetics brand / beauty salon / cosmetics factory | `IND-02-02` / `IND-01-03` / `IND-09-11` |
| Consumer-electronics brand / component factory / software company | matching `IND-03` child / `IND-09-03` / matching `IND-07` child |
| Restaurant / packaged-food brand / food manufacturer | `IND-01-01` / `IND-02-01` / `IND-09-10` |
| Law firm / legal software / legal training | `IND-06-01` / `IND-07-11` / `IND-05-14` |
| Furniture brand / renovation company / furniture factory | `IND-02-10` / `IND-08-06` / `IND-09-13` |
| Automobile brand / repair storefront / parts factory | `IND-02-11` / `IND-01-07` / `IND-09-02` |
| Hotel or homestay / scenic site / standalone restaurant | `IND-12-01` or `IND-12-02` / `IND-12-04` / `IND-01-01` |

## Initial alias guidance

Aliases remain product guidance rather than a second executable list:

| Search alias | Candidate category |
| --- | --- |
| 美业、皮肤管理 | `IND-01-03` |
| 汽修、汽车保养、爱车 | `IND-01-07` |
| SaaS、ERP、CRM | Search relevant `IND-07` candidates; do not auto-select one |
| OEM、ODM、贴牌、代工 | Search matching manufacturing nodes under `IND-09` |
| 货代、三方物流、3PL | `IND-09-16` |
| 律所、律师团队 | `IND-06-01` |
| 医美 | `IND-04-05` for medical service; ordinary beauty remains `IND-01-03` |
| 民宿、客栈 | `IND-12-02` |

## Versioning and maintenance

- **Patch:** wording, aliases, examples, or ordering without changing category
  meaning.
- **Minor:** add or deprecate a category, change availability, or add a
  crosswalk while preserving published identifier meaning.
- **Major:** change a semantic boundary in a way that could reinterpret a saved
  selection. Existing IDs remain immutable and a separately approved migration
  and history plan is required.

Catalog maintenance alone does not create a new evaluation-input revision,
question set, or free-evaluation opportunity for an unchanged Brand. Existing
selections are never silently moved. A future semantic change either preserves
the earlier selection meaning or asks the customer to confirm a new selection;
that confirmed profile change follows the normal evaluation-input revision
rule.

Useful refresh signals include repeated equivalent `Other` phrases, repeated
correction between the same categories, an approved new target-customer group,
or unnatural generated industry questions. An official evaluation snapshot
retains the selected IDs, frozen labels, catalog version, applicable `Other`
phrase, and actual recommendation subject.

## External-classification relationship

GB/T 4754, ISIC, NAICS, and NACE are activity-classification coverage checks;
CPC and GB/T 36431 are product-classification coverage checks. Crosswalks are
informational and may be many-to-many. They are not customer-facing nodes and
their codes are not GEOEval identifiers. The source evidence and rejected
crosswalk boundary remain in the archived
[research brief](../../openspec/changes/archive/2026-08-26-standardize-industry-catalog/research/industry-classification-source-brief.md).
