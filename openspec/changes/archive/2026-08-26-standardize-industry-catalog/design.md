# Design: GEOEval Industry Catalog Standard

## Design boundary

This change defines product semantics and a future-facing catalog contract. It
does not select a database representation, API schema, frontend component, or
seed mechanism. Those implementation choices belong to the first product slice
that activates brand-context and question-generation ownership.

## Ownership

| Concern | Current owner | Responsibility |
| --- | --- | --- |
| Exact industry tree and category boundaries | `docs/product/industry-catalog.md` | Approved IDs, names, inclusion/exclusion rules, recommendation subjects, and maintenance policy |
| Basic brand-information meaning | `docs/product/vision.md` and product glossary | Explain why the customer selects an industry and how it fits the brand profile |
| Observable product behavior | `openspec/specs/product-definition/spec.md` | Selection readiness, fallback, question use, and immutable evaluation meaning |
| Future current selection write | Brand-context owner | Persist one current selection and the optional `Other` phrase with the editable brand profile |
| Future question consumption | GEO Intelligence | Convert the frozen selection and profile facts into natural controlled questions without redefining catalog semantics |
| Future evaluation history | Evaluation owner | Snapshot the exact catalog and question context used by a run |
| Qualification and compliance | Separate future policy and product controls | User notice, agreement, license, credential, and regulated-industry decisions |

The exact directory must not be copied into the vision, glossary, API prose,
prompt, or change design. Consumers refer to stable identifiers and the one
canonical product catalog. Before executable ownership exists, the product
document owns the exact nodes. The first approved implementation that persists,
serves, or consumes them must move that data once into its stable executable or
generated owner and convert the product document to a generated reference or
index-level contract.

## Classification rule

The root question is:

> What product or service do you most want customers to find and recommend you
> for?

A mixed business chooses the current evaluation focus, not every activity it is
licensed or statistically classified to perform. The deciding factor is the
intended consumer, procurement, or recommendation scenario:

- product-brand and retail recommendation;
- local service or storefront recommendation;
- professional-service recommendation;
- software or digital-product recommendation;
- industrial procurement, manufacturing, or supply recommendation; or
- destination, health, education, finance, agriculture, media, or other
  maintained domain recommendation.

## Catalog contract

Every catalog node has a stable identifier and may have maintained metadata:

- `id` and `parent_id`;
- `display_name_zh_cn`;
- one-sentence boundary;
- inclusion and exclusion examples;
- `search_aliases` used only to find candidates;
- `recommendation_subject` used as a controlled input to question generation;
- `status`, replacement reference when applicable, and catalog version history;
- optional many-to-many crosswalks to external standards.

`Other` uses the stable secondary suffix `99` under each primary and requires a
customer-provided product-or-service phrase. The phrase is brand data, not a new
catalog node.

## Version and compatibility

The initial contract version is `industry-catalog@1.0.0`.

- Patch: wording, alias, example, or ordering changes that do not change a
  category boundary.
- Minor: additive categories, deprecation, availability change, or crosswalk
  extension that preserves every existing identifier's meaning.
- Major: a semantic boundary change that could reinterpret an existing
  selection. Existing identifiers still are not reused; migration and history
  handling require a separately approved implementation change.

A catalog version change alone does not create a new evaluation-input revision,
question set, or evaluation opportunity for an unchanged brand. Existing saved
selections are not silently remapped. A future major semantic change must either
preserve the earlier selection meaning or require a customer-confirmed profile
change under a separately approved migration design.

An official evaluation snapshot fixes the category IDs, display labels, catalog
version, `Other` phrase when present, and recommendation subject actually used.
This is consistent with the existing immutable evaluation-input and exact-
question snapshot contract.

## External standards

GB/T 4754, ISIC, NAICS, and NACE classify economic activity; CPC and GB/T 36431
classify products within different scopes. They are used to check coverage,
boundaries, and omissions. They do not define the customer-facing catalog, and
their codes are never used as GEOEval stable identifiers. Crosswalks are
informational, versioned, and many-to-many.

Public Dianping and Meituan surfaces are vocabulary evidence only. GEOEval does
not claim access to a complete or current merchant-onboarding taxonomy.

## Alternatives rejected

| Alternative | Decision | Reason |
| --- | --- | --- |
| Use GB/T 4754 directly | Reject | Classifies units by economic activity and is too detailed for non-expert recommendation intent |
| Use CPC or GB/T 36431 directly | Reject | Product-oriented but too detailed or incomplete across services and important regulated consumer products |
| Copy a local-life platform directory | Reject | Overweights storefronts, lacks broad B2B and product coverage, and is not a stable owned contract |
| Make restaurants, beauty, pets, and automobile care primary categories | Reject | Lets local life consume the primary directory and obscures software, manufacturing, professional, and product businesses |
| Let a mixed business select all activities for one evaluation | Reject | Produces incoherent questions and removes the causal link between profile and result |
| Generate questions from display names alone | Reject | Broad UI labels are not always natural search or recommendation subjects |

## Risks and controls

| Risk | Control in this design | Follow-up trigger |
| --- | --- | --- |
| Industrial manufacturing remains broad | Concrete secondary categories plus `Other` phrase | Repeated same-meaning `Other` inputs or failed question generation |
| Smart devices, health products, agriculture, food, and tourism overlap | Boundary and mixed-brand examples use intended recommendation scenario | Repeated customer correction between the same two categories |
| Alias silently misclassifies a customer | Aliases search only and ambiguous matches require selection | UI implementation and usability evidence |
| Catalog maintenance rewrites history | Immutable IDs, explicit versions, evaluation snapshot | First persistence implementation |
| Catalog maintenance bypasses the one-question-set rule | Catalog-only changes do not create an evaluation-input revision; semantic migration requires a confirmed profile change | First catalog-update implementation |
| Regulated category looks like approval | Explicit non-compliance boundary | Separate user-notice and agreement task |

## Rollout and reversal

This documentation-only change has no runtime rollout, migration, external cost,
or destructive action. Reversal is a normal documentation revert until an
implementation stores catalog identifiers. Once persistence is activated,
compatibility, migration, and rollback must be designed by that implementation
change rather than inferred from this document.

## Evolution-marker disposition

The current product-definition marker remains `split-on-activation`. Adding a
stable product catalog does not establish the future brand-context or GEO
Intelligence executable owner. The catalog adds a narrower
`move-on-activation` marker so the first approved implementation moves the exact
nodes into one executable or generated owner instead of copying them. That
implementation change must resolve both applicable markers.
