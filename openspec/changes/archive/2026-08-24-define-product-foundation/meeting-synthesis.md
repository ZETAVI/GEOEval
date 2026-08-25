# Working Synthesis of Product-Definition Meetings

- Status: Working research synthesis
- Approval: Only conclusions explicitly labelled confirmed are approved; all
  other material remains research input
- Decision owner: Product owner
- Scope: Product meaning, users, outcomes, journeys, boundaries, and evaluation
  semantics; not implementation design

## Sources and speaker identity

- [M1 product and requirements discussion](../../../../docs/product/research/meeting-transcripts/GEO-Eval-M1-需求讨论.txt):
  the user is Speaker 3.
- [M2 product and requirements discussion](../../../../docs/product/research/meeting-transcripts/GEO-Eval-M2-需求讨论.txt):
  the user is Speaker 3.
- [M2 product and requirements discussion, part 2](../../../../docs/product/research/meeting-transcripts/GEO-Eval-M2-需求讨论-part2.txt):
  the user is Speaker 3. This record continues the same product discussion.
- [M3 initial development-plan discussion](../../../../docs/product/research/meeting-transcripts/GEO-Eval-M3-开发计划初步讨论.txt):
  the user is Speaker 2.

This document compresses decisions and contradictions; it is not a transcript or
a replacement PRD. Unstable ideas remain here until product discussion either
approves, rejects, or reframes them.

## Reconciliation through 2026-08-24

Subsequent product-owner discussion has resolved most tensions raised in the
meetings. Current product truth remains in `docs/product/vision.md`, the glossary,
and the active product-definition specification; this research synthesis records
the following supersessions so historical exploration is not mistaken for an
open requirement:

- the terminal customer is primary, while operations, administrators, and agents
  all have complete supporting journeys in the first commercial release;
- each unchanged evaluation-input revision receives one completed free official
  evaluation; a relevant profile change creates a new revision, while automatic,
  scheduled, or continuous monitoring remains outside the first release;
- one brand-directed question supports description only, while three open
  questions across five fixed platforms supply recommendation-index evidence;
- the recommendation-index formula, valid-sample threshold, parser roles,
  cross-provider fallback, report contents, and customer presentation are now
  defined in the product vision;
- article generation and customer editing are free, publishing alone consumes
  points, and random and precise publishing are peer purchase choices;
- the service promises content preparation, real media publication, and visible
  delivery evidence, never a guaranteed AI mention, score, or ranking change;
- seven calendar days is an expected period from paid submission, with delay and
  manual exception handling rather than an unconditional guarantee;
- recharge, point origins, invoices, agent attribution, commission, withdrawal,
  operations fulfilment, media-library administration, and customer-visible
  order lifecycles have since received explicit product rules;
- administrators maintain media, packages, and prices; operations fulfils orders;
  paid snapshots and historical delivery cannot be rewritten by live-catalog
  maintenance;
- frontend visual and interaction quality is part of commercial acceptance, not
  a post-launch cosmetic task.

The remaining frontier is therefore no longer the original module outline. The
paid pilot, differentiated promise, and agent entry are now resolved. Product
discussion remains only for a small number of profile and lifecycle details,
followed by launch-owned operating values, real-provider/payment/writing
validation, role-based information architecture, and later architecture review.

## Current product hypothesis

GEOEval is currently defined as a lightweight, fast evaluation-to-action web
service for small and medium businesses that lack GEO expertise. It helps a user:

1. describe a brand, operating context, and differentiating characteristics;
2. see evidence of how selected generative-answer platforms currently represent
   or discover that brand in relevant question scenarios;
3. understand a small number of meaningful gaps without needing GEO vocabulary;
4. choose a bounded optimization or publishing service;
5. receive visible delivery evidence and, when methodologically valid, later
   evaluation evidence.

This is stronger than describing the product as either a scoring dashboard or an
article-publishing storefront. Its differentiated value is the efficient closed
loop between observed answer evidence, understandable guidance, a customer-
confirmed article, company-managed publication resources, performed work, and
visible proof. Whether that loop produces repeatable model-level improvement is
not part of the first-release promise.

## Product anatomy implied by the meetings

| Layer | Candidate responsibility | Product role |
| --- | --- | --- |
| Demonstration | Show a simple static example of input and output before signup | Explain value and reduce adoption friction |
| Guided profile | Collect only the brand information required to form meaningful question scenarios and content | Prevent non-expert users from needing to design GEO strategy |
| Evaluation | Obtain and preserve platform answer evidence for selected question scenarios | Create transparency and diagnostic value |
| Interpretation | Summarize evidence into a few understandable findings, limitations, and next actions | Turn raw answers into a decision |
| Optimization service | Generate or adapt content and arrange selected publication work | Convert diagnosis into action and revenue |
| Fulfilment evidence | Show order status, published content, destinations, and links | Make paid work visible and auditable |
| Later outcome evidence | Re-evaluate comparable scenarios when enough time and methodological control exist | Test improvement without overstating causality |
| Channel | Attribute referred customers and support an agent-assisted sales path | Support distribution without redefining the core customer outcome |
| Operations | Let internal staff accept work, fulfil it, and return evidence | Make the customer promise operationally deliverable |

This table describes product capabilities and responsibilities. It does not imply
specific pages, services, databases, applications, or system topology.

## Actors and jobs

### Confirmed primary-product direction

The primary product experience serves terminal customers. The main product
journey should help a terminal customer understand and act on that customer's
own GEO situation.

Agents or resellers, system administrators, and internal operations staff remain
required supporting actors. Their acquisition, governance, fulfilment, and
feedback work must connect coherently to the terminal-customer journey, but does
not replace it as the organizing principle for the product.

The typical primary user is a small-business owner or storefront manager with
little or no professional GEO knowledge. The product should provide simple,
direct evaluation and guidance rather than enterprise-grade analytical depth.

Medium and large enterprises, professional GEO teams, and customers that require
deep customized evaluation are outside the target market. The first release
proceeds directly into real paid use across supported small and medium customers
without imposing an industry or geographic pilot restriction. Industry and
media coverage remain maintained service inputs rather than market-boundary
definitions.

### Supporting actors

- **Agent or reseller:** acquires or assists customers and may need referral,
  account, commission, and service visibility.
- **Internal operations or customer service:** fulfils publishing work, records
  status and links, handles exceptions, and may manually support invoicing.
- **System administrator:** governs accounts and roles, media and commercial
  configuration, authorized point changes, exceptional intervention, and key
  operating records.

The payer, daily operator, beneficiary, and acquisition channel may still be
different people. Later discussion must clarify their relationships without
weakening the agreed terminal-customer focus.

## Stable signals across the three meetings

### Confirmed customer motivation

Homepage examples can create initial curiosity and lead a small-business owner or
storefront manager to evaluate the owner's own business. The customer wants a
simple view of approximate performance across different AI platforms and
ultimately wants relevant AI answers to mention the business more readily.

Because this customer generally lacks GEO expertise, evaluation alone is not the
whole journey. The product should connect the evaluation to professional
promotional-content and publishing services, make the delivered work visible,
and later show comparable evidence of any observable change. The desired
model-level outcome remains distinct from a guaranteed service result until the
causal claim is validated.

### Confirmed multi-brand and information model

A terminal user may manage several brand profiles for different businesses or
stores. One profile is set as the current brand, and profile completion,
diagnosis, evaluation, optimization, article generation, orders, and publication
management use that context consistently. This is terminal-user brand management
and does not imply an agent relationship.

Information is completed progressively. Basic evaluation requires primary and
secondary industry, two brand-characteristic text fields, company or store name,
province-city-district or town region, contact person, and an editable mobile
number initially copied from registration. More complete information is optional
until article generation, when company and brand introductions, business
districts, industry position, core strengths, flagship products, product
characteristics, price, suitable audiences, and optional existing materials or
images are completed. This information is saved with the current brand and can
remain a draft.

Generated evaluation questions are reviewable but not directly editable. An
unsuitable question is corrected by updating the current brand information and
regenerating the question set. The exact industry catalog, region-specific
business-district source, material formats, field naming, and module layout remain
later inputs or decisions.

### Simplicity is a product constraint

- The customer should understand the value from a concrete example.
- Signup and the first useful result should have low friction.
- Users should not need to write expert queries or read a dense report.
- A small number of guided inputs, visible evidence, and clear actions are
  preferred over exhaustive configuration.

### Evidence must remain visible

- M1 asks to show the actual platform outputs rather than only an opaque score.
- M3 retains both an accessible original answer and a concise summary.
- Delivery is not complete when an internal operator publishes something; the
  customer must see status, destinations, content, and links.

### Confirmed first-evaluation story

The first evaluation is intentionally concise and visual:

1. one brand-directed question receives a simple objective summary, followed by
   a concise overall-evaluation summary;
2. three profile-derived open questions are evaluated across selected AI
   platforms;
3. their direct findings include mention rate, appearance position, and positive
   and negative associated characteristics or keywords with occurrence counts;
4. a five-star AI recommendation index helps non-expert customers understand the
   combined open-question result; the brand-directed question does not
   contribute to this index;
5. every question, platform, and sample retains its complete output in an
   evidence card without a separate per-output summary;
6. one shallow optimization-direction section shows where improvement is
   possible and can later provide context for promotional-content generation.

Bars, charts, and other simple visual forms may organize the story. The intended
urgency comes from clearly showing real observed gaps and available improvement,
not from manufacturing fear or overstating the evidence.

### The intended journey connects evaluation and execution

Evaluation creates understanding and demand. Publishing or optimization creates
an action and likely revenue. Fulfilment feedback closes the service loop. The
meetings do not support treating these as unrelated modules.

The approved commercial boundary is now clearer. The basic evaluation is free
and each unchanged evaluation-input revision can form one completed official
report; automatic, scheduled, or continuous monitoring is not part of the
current product. A customer pays for the subsequent GEO optimization and
publishing service: a GEO promotional-article agent generates content from the
profile and evaluation context, the customer may edit and confirms the article,
and only then selects a publishing choice and submits a point-funded order. Company
fulfilment first produces multiple differently angled and polished variants of
that confirmed core article. Operations can publish suitable variants directly
or adjust them further while maintaining the main subject matter. Publication
results are shown back to the customer. This service evidences real
media-publication work but does not guarantee improved AI mentions, index, or
ranking.

Two peer publishing choices are approved. A random publishing package declares
a quantity and total point price while the platform assigns eligible media; the
media library remains visible but non-selectable and the interface communicates
random allocation. Precise publishing exposes maintained media prices and lets
the customer choose platforms and quantities. The library both demonstrates
real resource coverage and powers these choices. Points are the publishing
settlement balance, fixed at ten points per renminbi and obtained only through
customer recharge or administrator allocation. Package examples discussed so
far are illustrative rather than approved catalog entries.

A package quantity counts completed media publications, not identical copies or
separately confirmed core articles. Random publishing promises the purchased
quantity within the stated media scope and allows operations to replace an
unavailable placement with another eligible one. Precise platform and quantity
selections form the order commitment; an unavailable selection is replaced only
with the customer's choice or returned as corresponding points.

Each successful publication is returned as a simple card with media platform,
article title, accessible link, publication time, and status; the specific
publishing account is not exposed. Random orders automatically complete at the
purchased valid-result count. Precise orders automatically complete after every
selection succeeds or is resolved through customer-chosen replacement or point
return. No separate customer acceptance is required. Links must work at delivery
and completion, but permanent third-party availability is not promised; a short
post-delivery exception period is handled by operations and still needs an exact
operating duration.

### Early operation may be partly manual

M3 accepts manual customer-service handling for low-volume invoicing and focuses
on proving the main customer journey. This suggests automation depth is not the
same as product completeness: a manual operational step may be acceptable if the
customer promise remains coherent and observable.

### Fast validation matters more than broad automation

The repeated goal is to put a usable journey in front of real customers quickly
and learn whether the product is valuable. This is not evidence that the full
scope can or should be built in three to four weeks. Calendar estimates and team
shape remain planning hypotheses until the MVP boundary is approved.

## Evaluation semantics that must be separated

The meetings use several kinds of questions as though they measured the same
thing. They do not.

| Question family | Example intent | What it may reveal | What it cannot prove alone |
| --- | --- | --- | --- |
| Brand-directed | What is Brand X like? | Known information, description, sentiment, or reputation about a named entity | Competitive discoverability, because the question supplies the brand |
| Category discovery | Which providers in a category or area are recommended? | Whether a brand appears without being named and which alternatives appear | Stable market share from one generated answer |
| Need or attribute | Which provider is good at a specific need or characteristic? | Association between a brand and a desired capability | General brand health without broader scenario coverage |

M2 explicitly identifies that a brand-directed question naturally causes the
answer to discuss the named brand and can make a diagnosis look artificially
strong. The meeting briefly considered removing that question altogether. The
subsequent approved direction supersedes that exploration: retain it for the
opening description and overall summary, but exclude it from the five-star AI
recommendation index. Only open-question evidence contributes to that index.

A defensible evaluation result will need to distinguish:

- **evaluation object:** brand or entity, question scenario, platform, time, and
  sampling conditions;
- **observed evidence:** the original answer, citations or sources when present,
  and extraction trace;
- **finding:** mention, non-mention, position, competitor appearance, attributed
  characteristic, or recommendation stance;
- **inference:** any aggregate judgment or score calculated from findings;
- **recommendation:** an action proposed because of one or more findings;
- **confidence and limitation:** what one sample, one platform, or a generated
  answer cannot establish.

The product direction now includes a simple five-star AI recommendation index
for open-question performance. It is one overall star rating, familiar in form
to a consumer-review star display, and describes how readily the selected AI
platforms think of and surface the business in the current evaluation's actual
sampled results. Mention rate and appearance position are its only inputs, with
entering the recommendation set taking priority over position after a mention.
Platform sections show concrete differences rather than additional star indices.
Positive or negative characteristics are explanatory analysis available when
the customer is mentioned and do not change the index. Subsequent discussion
fixes the formula as `5 × mention rate × (70% + 30% × average normalized
position score)` over valid open-question samples, together with the agreed
position scale, one-decimal value, and nearest-half-star display. The index must
not be presented as a permanent business rating or universal scientific GEO
score, and its inputs must remain traceable to observed evidence.

## Additional hypotheses from the M2 continuation

These points expand the product picture but are not approved behavior:

- Citation-source analysis was considered and set aside because it would add
  professional depth that the target customer may not need and could distract
  from the simple evaluation story.
- Internal operations may record publication results and links manually in an
  early release, provided the customer can see the resulting delivery evidence.

The content-approval boundary is now a simple customer-facing authorization:
after confirming the core article, the customer is informed that content
operations may make further adjustments to improve publication success and
effect while maintaining its main subject matter. Subsequent discussion has
defined the product rules for online recharge, points, agent commission, and
manually paid withdrawal; exact external payment channels and platform-specific
implementation remain later validation and architecture work.

The approved post-submission experience tells the customer that media
distribution is underway, expects completion within seven calendar days from
successful paid order submission, and provides status, completed quantity, and
published links. Exceeding the period marks delay without automatically
completing, failing, or refunding the order.

## The three different meanings of success

These must not be merged into one promise:

1. **Service delivery:** agreed content was prepared, accepted, published, and
   returned with usable links. This is substantially under operational control.
2. **Intermediate discoverability:** the published material became accessible,
   indexable, retrieved, or cited by a target system. This depends partly on
   external systems and needs validation.
3. **Business or model outcome:** the brand is mentioned, recommended, or ranked
   more favourably in relevant user scenarios. This is the most consequential
   result and the least controllable.

M1 contains both a refusal to guarantee ranking outcomes and assertions that a
published article will produce a result with certainty. M3 again questions
whether the feedback has actually been validated. No product guarantee should be
approved until these claims are tested and their evidence boundary is explicit.

## Remaining gates after subsequent discussion

Brand retirement, profile-input semantics, the first commercial journey, role
authority, and role-level information hierarchy have now been resolved as
product meaning. The remaining work is separated by its actual owner rather than
kept as an unlimited product-question list.

| Gate | Stable prerequisite | Remaining work |
| --- | --- | --- |
| Product-foundation approval | Product identity, journeys, evaluation meaning, commercial scope, role boundaries, and non-goals are reconciled | Review one short decision brief and explicitly confirm or reopen only a material product inconsistency |
| Launch operating inputs | Lifecycles and ownership are fixed | Supply exact media catalog and prices, industry and regional choices, support contact, commission rate, withdrawal minimum and bank template, invoice-process validation, writer Skills, and post-delivery link-feedback period |
| Controlled validation | Provider, parser, payment, writing, and pilot claims have defined boundaries | Prove the named capabilities with current official evidence, controlled account tests, and real paid-customer observation |
| Product and interaction design | Role navigation, information ownership, responsive scope, and frontend-quality goal are fixed | Define the visual language, accessibility and motion rules, and reusable interaction patterns without changing product meaning |
| Architecture entry | Product approval is explicit | Define module and data ownership, lifecycles, permissions, errors, notifications, observability, security, and integrations in a separate reviewed change |

## Important risks exposed by the discussions

- A biased question design could manufacture a high-looking result rather than
  measure meaningful discoverability.
- A simplified score could appear objective while being based on one unstable
  answer.
- Publishing the same low-quality generated article to several destinations may
  prove activity without proving user value.
- Allowing post-approval content changes without clear responsibility and
  boundaries may create trust and dispute risk.
- Hiding the commercial relationship between agent and customer may conflict
  with billing, support, branding, or accountability expectations.
- The first commercial boundary now includes agent, payment, points, commission,
  withdrawal, and invoice paths; building all of them without staged real-customer
  validation remains a delivery and learning risk even though their product
  semantics are required.
- Treating a short target schedule as approved scope could force unresolved
  product assumptions into implementation.

## Discussion that should be deferred from product definition

The following topics may matter later, but the meetings do not provide an
approved product reason to settle their implementation now:

- invitation codes, tagged registration links, URL length, or multiple domains;
- phone-verification mechanics and exact account-upgrade operations;
- application count, front-end/back-end topology, and parallel modules;
- model, API, parser, library, or content-generation implementation;
- payment interface, points-ledger mechanics, tax integration, and automatic
  withdrawal workflow;
- exact industry-classification source and field-control widgets;
- detailed media inventory ordering and page layout;
- team composition and a detailed development estimate.

The core product questions are now reconciled. Remaining operating values,
controlled evidence, detailed interaction rules, and technical mechanics stay
at their later gates and are not reasons to keep product discovery indefinitely
open.

## Recommended product-discussion order

Detailed pending decisions and their current status are maintained in the
[Product Foundation Decision Backlog](decision-backlog.md).

1. **Product-foundation approval:** review the reconciled product definition as
   one bounded decision brief and explicitly confirm it or reopen only a material
   inconsistency.
2. **Launch inputs:** obtain maintained industry, media, pricing, support,
   finance, banking, invoice, and link-feedback values from their owners.
3. **Controlled validation:** prove provider/search/parser behavior, writing-Skill
   integration, payment readiness, and a real-customer pilot without overstating
   causality.
4. **Product design and architecture entry:** define shared visual and interaction
   standards, then separately approve module ownership, lifecycle, security,
   error, notification, ledger, observability, and integration designs.

Only after these decisions are approved should the project estimate a technical
architecture or detailed implementation plan.
