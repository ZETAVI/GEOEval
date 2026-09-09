# Product Vision

- Status: Approved
- Decision owner: Product owner
- Approved change: [`define-product-foundation`](../../openspec/changes/archive/2026-08-24-define-product-foundation/proposal.md)

This document is the approved product direction. The product owner confirmed the
[product-foundation decision brief](../../openspec/changes/archive/2026-08-24-define-product-foundation/decision-brief.md)
on 2026-08-24. Later product-design or architecture work may elaborate how this
direction is delivered but must not silently redefine its meaning or boundary.

## Problem

Small-business owners and storefront managers may become interested after seeing
examples of how other businesses appear in generative-answer platforms. They
then want to know, in a simple way, how their own business is represented across
different AI platforms and whether those platforms mention it in relevant
answers.

These users generally lack the GEO and content-distribution knowledge needed to
interpret the situation or improve it themselves. They need the product to
connect a simple evaluation with professional promotional-content and publishing
services, then make the work and any observable change visible.

## Product position and differentiation

GEOEval is a lightweight, fast GEO-optimization tool for small and medium
customers. Its primary differentiation is not an isolated score, generic AI
writing, or a media storefront. It combines the company's operational and media-
publication resources into one efficient path that starts from the customer's
current observed problem: real multi-platform answer evidence, an understandable
evaluation, evidence-grounded optimization guidance, a customer-confirmed core
article, managed publication, and visible delivery results.

The market promise is therefore to help a non-expert customer move efficiently
from seeing the current problem to completing one real, reviewable GEO
optimization and publication action. The promise remains bounded to work and
evidence under the company's control and does not become a guaranteed AI-model
outcome.

## Target users

The primary users are small-business owners and storefront managers who use the
product for their own businesses. They are not expected to have professional GEO
knowledge. The main journey, product language, evaluation, and guidance should
therefore remain simple, direct, and easy to act on.

Medium and large enterprises, professional GEO teams, and customers that require
deep enterprise-grade evaluation or highly customized analysis are not target
customers for the product.

Agents or resellers, system administrators, and internal operations staff are
required supporting actors rather than optional afterthoughts:

- internal operations staff own day-to-day paid-service fulfilment. Paid orders
  become available in a shared publishing pool so that one of multiple operations
  users can claim the entire order. One order has only one current responsible
  operator in the initial product. The responsible operator uses the
  confirmed article and relevant brand information, prepares or adjusts
  publication variants, arranges eligible media, updates progress and exceptions,
  and returns publication results. Initial customer-service work, including
  contacting a customer to resolve a publication exception, can remain part of
  this operations role rather than becoming a separate first-product role.
- system administrators govern the platform rather than routinely fulfil
  publications. They manage accounts, roles and permissions, perform authorized
  point additions, deductions or returns, maintain the media library, media
  availability, packages, prices and global business rules, assign or intervene
  in exceptional orders, and inspect the key operating records needed for
  governance.
- agents or resellers support customer acquisition and assisted service. They may
  follow the progress of customers attributed to them and help those customers
  understand an evaluation, complete information, and choose a service, but this
  relationship does not make them the owner of customer data or commercial
  decisions. Attribution belongs to the terminal-user account rather than an
  individual brand, so all brands under that account use the same agent
  relationship. The relationship is normally established through the agent's
  acquisition channel; an administrator may bind a previously unattributed
  account or change an incorrect relationship. A later change affects new orders
  only and does not rewrite the agent attached to historical orders or commission.

Each account has exactly one role in the initial product: terminal customer,
operations user, system administrator, or agent. The signed-in product therefore
does not expose a role switcher or combine the authority of several roles on one
account. If one person needs to work in more than one capacity, that person uses
separate role-specific accounts. Agent attribution remains a channel relationship
recorded on a terminal-customer account and never grants that customer the agent
role.

An agent does not self-activate through public registration. After the company
confirms the commercial relationship, an administrator creates or activates a
dedicated agent-role account. A customer entering through the public channel
registers as an unattributed terminal customer. A customer entering through an
approved agent acquisition channel completes the same terminal-customer
registration flow without entering a visible invitation code, and that account
receives the agent attribution without changing its role. Administrators retain
the approved binding and correction authority; agents cannot claim existing
accounts. Agent commission and internal attribution calculations are not shown
to customers.

Their capabilities should support the terminal-customer journey rather than
replace it as the product's primary organizing principle. Operations cannot
manage roles, directly change customer points, or redefine global business rules.
Administrators are not the default content or media fulfilment role. Agents
cannot spend customer points, confirm an article, submit a paid order, or obtain
profile-editing authority merely because a customer is attributed to them. The
terminal customer remains the owner of brand information, points, article
confirmation, and order decisions. Any later delegated-operation capability
would require explicit customer authorization, an auditable responsibility
boundary, and a separate product decision; it is not implied by the initial
agent role.

While the account remains attributed to an agent, that agent may open every
brand under the account and read its complete current and historical evaluation
reports so the agent can explain the observed result and help the customer decide
what to do next. This read-only scope includes the customer-visible index,
mention and position findings, platform results, broad optimization directions,
and original sampled answers. It excludes internal search-source evidence,
prompts, model traces, logs, customer point balances, and unrelated sensitive
account or financial information. Report visibility does not let the agent edit
brand information or questions, start or retry an evaluation, generate or
confirm an article, spend points, choose media, submit an order, or alter or
export a report. A current attribution is the access basis: after the customer is
reattributed, the former agent loses customer and report access but retains the
historical performance-order and commission records that belong to that agent.

The basic evaluation is free and is intended to let the customer see a real
current problem before deciding whether to buy help. The product does not charge
for that evaluation itself. Whether the result creates enough trust and urgency
to convert customers into paid optimization is now tested through real paid use:
the company considers its internal validation sufficient to proceed directly to
a paid pilot rather than imposing a preceding free, industry-limited, or region-
limited pilot phase.

## Desired outcomes

The intended customer journey is:

1. examples create interest in evaluating the customer's own business;
2. the customer sees a simple overview of the business's approximate performance
   across selected AI platforms;
3. the customer understands that professional help is available without needing
   to learn GEO technology;
4. the customer can obtain a GEO optimization and publishing service;
5. the customer can see the article the customer approved, the state of the
   publishing order, and the returned publication results.

The customer's ultimate desired outcome is for relevant AI answers to mention
the business more readily. That is a desired external outcome, not yet an
approved guarantee that a publishing service will necessarily cause a mention.
Bounded customer-initiated re-evaluation is part of the current product, while
continuous or scheduled monitoring remains outside the first-release boundary.

## Entry into the first evaluation

The initial homepage remains a simple product entry. A richer public case
showcase, including its content depth and presentation, is deferred until the
core evaluation, optimization, publishing, and fulfilment experiences are more
complete. Visitors can view the simple homepage without an account. A terminal-
customer registration first establishes the account and offers the required
basic brand-information form. The customer may complete and save it as the first
current brand or skip it and enter the signed-in product without a brand. When a
complete first brand is saved, AI diagnosis is immediately available; when it is
skipped, brand-dependent work remains unavailable until the customer creates and
completes a brand. After registration, a customer who saved a complete first
brand enters AI-search diagnosis, while a customer who skipped brand information
enters the no-brand state of **My brands**. Later ordinary sign-ins open **My
brands**. The exact authentication mechanism remains later product and
interaction-design work.

Basic evaluation remains free. For the same unchanged evaluation-input revision,
the customer may complete at most one official evaluation. There is no separate
lifetime evaluation cap across later qualifying revisions of the brand
information. A completed evaluation with zero brand mentions is valid and uses
that revision's opportunity; absence from AI answers is a real result, not a
system failure.
If request, sampling, parsing, or synthesis failures remain after the product's
own retries and prevent a complete valid report, the attempt does not add to the
current revision's completed-evaluation count. The customer can retry without
recreating the brand profile.

The brand profile remains one editable current record rather than a customer-
managed version history. Every evaluation instead retains an immutable internal
snapshot of the evaluation-relevant brand information, exact question set, and
related context it actually used. That snapshot identifies the evaluation-input
revision, keeps the historical report truthful after later edits, and provides
the basis for the one-completed-evaluation limit. A normalized change to a field
that participates in evaluation-question generation creates a new revision;
contact information, writing-only information, materials, and format-only edits
do not. The initial product does not add customer-facing profile versions or
rollback.

Changing the editable brand profile does not by itself move the latest completed
evaluation report into history or otherwise change that report's status. The
report remains the brand's current report, still bound to its original immutable
snapshot, until the customer actually starts a new official evaluation. Starting
that evaluation moves the preceding report into evaluation history; later edits
never rewrite either report. When evaluation-relevant information has changed,
the relevant customer pages give a concise notice that the information has
changed and a new evaluation is recommended, but the notice does not itself
invalidate, hide, or move the existing report.

Saving profile changes, entering diagnosis, and generating or reviewing a new
question set are evaluation preparation only. A new official evaluation starts
only when the customer confirms the displayed questions and chooses **Start
evaluation**, causing the product to create the evaluation run and begin the
five-platform sampling work. At that point the preceding current report moves
into history and the current evaluation state becomes **Evaluating**. If the new
run later becomes **Please retry**, the preceding report stays in history rather
than returning to current; its latest completed optimization guidance remains
available to writing under the separate guidance rule.

The brand profile remains editable while its evaluation is running. The active
run continues exclusively from its frozen input and question snapshot, and a
concise notice explains that later changes do not affect that result. When the
run completes, its report becomes the brand's current report even if the editable
profile has since changed. In that case the report stays truthful to its snapshot
and the product also states that the brand information has changed and recommends
another evaluation; the customer is not forced to wait or discard later edits.

## Initial evaluation platform set

The initial evaluation uses one fixed, non-customer-selectable platform set:
**DeepSeek**, **Doubao (豆包)**, **Qwen (千问)**, **ERNIE Bot (文心一言)**,
and **Tencent Hunyuan (混元)**. Each evaluation therefore retains the approved
four-question by five-platform structure. A report records the five platform
labels actually used and the evaluation time. Historical reports never change
when a future platform configuration changes, and a configuration change does
not create a new brand-information revision or reset its completed-evaluation
allowance.

For each platform, an internal owner selects an explicit model that represents
that platform's current mainstream public-facing experience. Customers cannot
select the model. A report primarily shows the platform label and evaluation
time; the exact model is retained internally and can appear only in a compact,
secondary evaluation explanation. A model change affects later evaluations and
never changes the execution identity of a historical sample.

Every sample enables the provider's supported web-search capability but lets the
platform decide whether the question requires an actual search. A valid answer
does not become a failure merely because no search was triggered. The product
records whether search occurred and retains all source or citation information
returned for that sample as internal evidence. Customers see the complete answer
content but not the source list, citation metadata, search-trigger detail, or
other provider diagnostics.

The platform label is not a sufficient execution record. Every provider call
must use an explicit model and search configuration and be internally traceable
to the relevant account, brand, business run, and agent purpose. The trace must
also identify provider, platform, exact model identifier or version, prompt or
configuration version, search setting and observed search use, time, latency,
token and cost usage when available, result or error, and retry relationship.
Customer business records and complete evaluation evidence remain owned by the
product rather than by an observability vendor. Whether sensitive prompts and
outputs are duplicated into an observability tool, and for how long, remains an
architecture and security decision.

## Brand profiles and progressive completion

A terminal-user account may create and manage multiple brand profiles, including
when one owner operates several stores or brands. This is ordinary terminal-user
brand management and is separate from the agent or reseller relationship.

One profile is set as the **current brand**. Brand-profile completion,
evaluation, AI-search diagnosis, optimization, article generation, publishing
orders, and publication management use the same current brand context. Switching
the current brand updates those experiences consistently without moving existing
business records to the newly selected brand. Evaluations, article drafts,
confirmed articles, publishing orders, and publication results remain attached
to the brand under which they were created. Points instead belong to the terminal
user account and are shared when that account works with different brands.

Switching the current brand is only a change to the customer's visible working
context. It does not pause, cancel, move, or relabel an evaluation already running
for another brand. Different brands under the same account may have independent
evaluations running at the same time, and every status change and notification
identifies its owning brand. One brand may have at most one active official
evaluation: while that brand is **Evaluating**, another run for the same brand
cannot start, even if its editable profile has since formed a newer revision.
After the active run ends, a new eligible revision may start its own evaluation;
one unchanged revision still permits only one successfully completed report.

Brand cards can be created, edited, and selected as current. A brand with no
business records or active work can be deleted. Once a brand has associated
records, it cannot be directly deleted because it remains the independent
context that ties those records together. It can instead be archived through a
lightweight customer action when it has no active evaluation, article,
publishing, or exception work. An archived brand is removed from ordinary
current-brand selection and cannot start new work, but its historical records
remain viewable and the brand can be restored. If it is current when the customer
archives it, the customer selects another active brand or creates one before
continuing. The initial product does not add archive folders, retention rules,
approval, or profile-version history.

Brand information is completed progressively rather than through one long form:

1. During terminal-customer registration, the customer may complete and save the
   basic information required for evaluation as the first current brand or skip
   that step. A skipped account can create and complete its first brand later.
   Every additional brand follows the same evaluation-readiness rule.
2. More complete optimization information may be skipped initially. When the
   customer enters AI-search optimization and wants to generate an article, the
   missing information must be completed first.
3. Saved information belongs to the selected brand, can be supplemented over
   time, and can be saved as a draft so the customer can continue later.

Each brand has one current set of profile information. The initial product does
not retain earlier profile versions or provide profile rollback.

The required basic brand profile contains:

| Field                       | Product rule                                                                                                                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary industry            | Selected from the approved GEOEval-owned [industry catalog](industry-catalog.md) according to the product or service for which the brand most wants to be found and recommended                                                    |
| Secondary industry          | One dependent option under the selected primary industry that fixes the current recommendation context                                                                                                                             |
| Other industry description  | Required only when the selected secondary industry is `Other`; it names the concrete product or service and participates in question generation                                                                                    |
| Verified store location     | One concrete customer-selected POI verified by the server; it derives the official region and one customer-confirmed business area or honestly labelled address locality without device/IP positioning or a second region selector |
| Flagship product or service | One concrete 2–80 character offer that the brand most wants customers to find and recommend                                                                                                                                        |
| Brand characteristics       | Two to six distinct peer free-text values; two inputs are shown by default and presentation order does not imply priority                                                                                                          |
| Company or store name       | The business, brand, company, or storefront being evaluated                                                                                                                                                                        |
| Contact person              | Customer contact name                                                                                                                                                                                                              |
| Mobile number               | Initially copied from the registration mobile number and editable                                                                                                                                                                  |

The approved [industry catalog](industry-catalog.md) contains 13 primary
categories, dependent secondary categories, stable identifiers, one `Other`
under every primary, and the maintained recommendation subjects used to form
natural industry questions. A mixed business selects the one consumer,
procurement, or recommendation context that matters for the current evaluation;
it does not enumerate its complete licensed scope. Selecting a regulated
category supplies recommendation context only and never verifies compliance,
credentials, or permission to operate.

Registration, brand management, diagnosis, and optimization use the same brand
without duplicating its ownership. Registration establishes the terminal account
and may also establish its first diagnosis-ready current brand. **My brands** is
both the terminal customer's signed-in home and the owner of brand context: it
presents an intentional no-brand entry when needed, current-brand identity and
switching, concise diagnosis, optimization, publishing, and media-resource data
when available, and access to brand creation, editing, deletion, and archive
actions. **AI-search diagnosis** uses the current brand's basic information to
generate and review questions, run free evaluations, and present their reports;
it does not maintain a separate copy of the brand profile. **AI-search
optimization** presents the same current Brand with its existing facts,
characteristic details and small set of writing supplements, then saves explicit
changes back to that one record before article generation, editing, and
confirmation. It does not send the customer to a second profile or maintain
task-local Brand information. After registration, a complete saved first brand leads directly
into AI-search diagnosis, while a skipped first-brand step leads into the no-
brand state of My brands. Later ordinary sign-ins open My brands.

The optimization experience extends the current Brand through a deliberately
small Article Information surface: optional detail under the existing peer
characteristics, one whole-renminbi range or negotiable-price choice, suitable
customer/context phrases, optional supplemental background, and optional
customer-authored desired positioning. Company/store name, industry, verified
location and the flagship product/service remain the same existing Brand facts.
There is no second company introduction, brand introduction, business-district,
industry-position or core-strength collection. The page uses visible explicit
Save rather than auto-save, and writing-only changes do not force another
Evaluation.

The first end-to-end framework keeps prepared material absent and sends
`preparedMaterialDigest: null` to Writer. Upload, parsing and Prepared Material
Digest remain a future capability with their own lifecycle; the current product
does not fabricate processing success or require placeholder material fields.
The Writer boundary is provider-neutral, but the current implementation uses a
deterministic local Adapter only to verify generation, failure, retry, editing,
confirmation and replacement. Real Writer quality, Provider, Prompt/Skill and
claim-policy work remains a later gate behind the same boundary.

One generation produces exactly one editable title and one complete editable
Markdown body. The initial product does not produce title choices, summaries,
keywords, platform variants or several candidates. Brand and guidance inputs are
frozen for the generation; a later input change produces a non-blocking freshness
notice rather than silently regenerating. Edits use an exact article revision,
and regenerating an existing article requires explicit authorization for the
revision that may be replaced. Failure or a revision conflict preserves the
current article and creates no candidate history. After explicit confirmation,
the exact confirmed revision can lead into publishing-service selection.

Before paid order submission, each brand has only one current unsubmitted core
article rather than a collection of candidate drafts. If the customer has
edited that article and chooses to generate again, the product clearly warns
that the current article will be replaced and proceeds only after confirmation.
The initial product does not retain the replaced candidate as article history.

Entering publishing-service selection does not yet freeze the article. Until
the customer successfully submits the paid publishing order, the customer may
return, edit the current article, and confirm it again. Successful paid order
submission fixes that confirmed article as the basis of the order; the customer
cannot edit it afterwards. Operations may still make the already disclosed
publication adjustments during fulfilment.

After choosing a publishing method and selecting **Publish**, the customer sees
a concise consent prompt explaining that media may make small adjustments to the
article to improve publication success. After agreement and successful order
submission, the product says that the article is being distributed to media
platforms and is expected to finish within seven calendar days, counted from
successful paid order submission. This is an expected fulfilment period rather
than an unconditional completion guarantee. Progress can be followed in
**Article Publishing Management**, whose final name remains open.

If fulfilment exceeds that period, the order is shown as delayed and operations
continues handling it; the order is not automatically completed, failed, or
refunded merely because seven days elapsed. If a publication is confirmed to be
impossible, customer service contacts the customer to agree on replacement or
stopping the remaining service and records any agreed point return. The initial product does not
provide a customer-initiated refund or online exception-negotiation workflow.

The customer sees only five simple order states: **Pending handling** after paid
submission, **Publishing**, **Exception handling**, **Completed**, and **Closed**.
An order that exceeds the expected period retains its underlying state and adds
a visible delayed marker. Each successful publication appears immediately as a
result card, together with simple progress such as “6 of 10 completed,” rather
than waiting for the whole order to finish. A manually agreed replacement that
eventually fulfils the promised quantity leads to **Completed**. If the remaining
work is stopped with zero agreed points, the responsible operator closes it
directly, without administrator confirmation or a point entry. Positive termination
waits for administrator credit and closes atomically with it. Actual results and
the original quantity are retained; returning points never counts as publication.
Continuing-service compensation is independent: an order may be **Completed**
with compensation pending, and stays Completed after the administrator credits it.
No customer confirmation is required for either path.

Evaluation questions are generated from the current brand profile and are shown
to the customer before evaluation. The customer cannot directly rewrite them.
If a question is unsuitable, the customer corrects the brand information and
regenerates the questions. The brand-directed question is generated in the same
controlled way. Question generation remains a preparation step rather than an
evaluation: it does not use the current revision's one official-evaluation
opportunity. One unchanged evaluation-input revision has one generated four-
question set and the initial product provides no separate refresh or “change this
set” action. If the questions are unsuitable, the customer changes relevant brand
information, creating a new revision from which a new set is generated. When
evaluation begins, the product freezes the exact four-question set together with
the evaluation-relevant brand fields and other context. Later profile edits or
question generation cannot alter that run or report. The first release relies on
the configured question-generation Agent and its prompt design to produce a
usable set. It does not add a separate semantic-quality Agent, customer approval
workflow for query quality, multi-stage scoring workflow, or routine human review
around question generation; ordinary technical generation failure can still
follow the product's bounded retry handling. The customer still sees the generated
questions before choosing to start the evaluation.

## Basic evaluation report

The first evaluation should tell a simple, immediately understandable story
rather than provide a deep professional report. It includes:

1. an opening summary of one brand-directed question about the customer's
   business, together with a concise summary of the overall evaluation;
2. one overall five-star AI recommendation index, similar in presentation to a
   familiar consumer-review star rating, derived from the actual sampled results
   of the current evaluation; it uses only mention rate and appearance position
   in the open questions, gives mention rate 70% of the available value and
   appearance position 30%, prioritizes whether the business enters AI's
   recommendation set before how high it appears, and excludes the
   brand-directed question and positive or negative associated characteristics;
3. results for three open questions generated from the customer's profile,
   consisting of one industry-recommendation question and two
   characteristic-based queries, showing mention rate and appearance position;
   one combined positive-versus-negative characteristic view can use evidence
   from all four questions, shows no more than five broad themes on either side
   according to the actual evidence, and explains the observed result rather
   than changing the five-star index;
4. the complete observed output for every valid question-platform sample,
   presented as evidence without another summary for each output;
5. one concise optimization-direction section that identifies practical areas
   for improvement and can later inform promotional-content generation.

The customer-facing optimization section is deliberately concise. It shows no
more than three evidence-sized direction cards, with the actual count determined
by the evaluation. Each card contains the current problem, a recommended
direction, concise supporting evidence such as involved platforms or sample
count, and the intended improvement expressed without a guaranteed outcome.

The overall synthesizer also produces a more comprehensive internal optimization
guidance from the same brand context and evaluation evidence. That guidance is
objective, explicit enough to direct content work, and preserves the evidence,
priority, desired positioning, strengths to reinforce, weaknesses to address,
and important claim boundaries needed by the promotional-article agent. The
customer does not need to edit or choose among evaluation directions: the concise
report remains the readable presentation, while the complete guidance is passed
directly into article generation. This internal optimization guidance is the only
report-derived context supplied to the promotional-article agent: the report's
scores, raw samples, and other detailed findings are not passed as writing input.
The latest successfully completed guidance remains available after fine-grained
brand-profile edits and, if another evaluation starts, until newer completed
guidance replaces it. Current brand information and prepared materials remain the
authoritative source for current facts, so older guidance can direct broad GEO
focus but cannot overwrite the customer's latest details. Neither representation
may invent a new fact, change sample evidence, or imply a guaranteed model-level
improvement.

The evaluation contains four questions in total: one brand-directed question,
one open industry-recommendation question, and two open queries based on the
brand's characteristics. Each is evaluated once across five AI platforms,
forming twenty expected valid samples. One question-platform position contributes
at most one valid sample. A failed attempt may be retried to obtain that sample,
but retry attempts are not additional samples and do not increase its weight.

An official report can be produced with seventeen to twenty valid samples. If
fewer than seventeen remain after retries, the attempt enters **Please retry**,
does not produce an official report, and does not add to the current evaluation-
input revision's completed count. A report states its valid coverage, such as
“18 of 20 valid results.”
Each missing position remains visible as a simple card saying that no valid result
was obtained and it was not included in statistics. Customers do not see retry
counts, provider errors, stack traces, or other technical detail.

Failed positions are excluded from the AI recommendation index rather than
treated as “not mentioned.” The index uses only valid open-question samples, so a
technical failure cannot lower the customer's rating. Report eligibility depends
only on the total threshold of seventeen valid samples; the initial product does
not add separate minimums by platform or question family.

Charts, bars, and other simple visual forms should lead the presentation of
mention rate, score, cross-platform differences, and positive-versus-negative
characteristics, with concise text used for labels and explanation rather than
turning the report into a long written analysis. The characteristic section uses
a parallel comparison visual instead of a text-only list. It shows up to five
broad themes on each side, with the actual number determined by evidence rather
than padding either side, and keeps occurrence counts and platform coverage
visible. The report should show the current observed state and make real gaps and
optimization opportunities visible. It should not use decorative chart forms
that imply unsupported precision or create urgency by exaggerating evidence or
deliberately depressing a result.

The report follows an overview-first and evidence-on-demand reading order. Its
opening view emphasizes one concise overall assessment, the five-star index with
one decimal, total mention rate, the typical position when the brand is
mentioned, and a secondary valid-coverage indicator such as `18/20`. Detailed
five-platform comparison follows rather than competing with the first impression.
Mention-rate comparison uses clear bars, positions use separate rank labels or
markers rather than sharing a percentage axis, and valid coverage uses a quiet
progress indicator rather than an alarming failure treatment. The presentation
should be visually rich, well-spaced, logically ordered, and responsive to
interaction. Motion and transitions support hierarchy, comparison, progress,
expansion, and feedback; they must not obscure evidence or become decoration
that competes with important data.

The report presents one overall AI recommendation index for an immediate first
impression. It does not add another star index for each platform. Platform
sections instead show their concrete mention, position, and answer evidence so
the customer can understand differences behind the overall result.

For the valid open-question samples, let `M` be the mention rate and `P` be the
average normalized position score produced for mentioned samples. The raw index
is `5 × M × (0.70 + 0.30 × P)`. Explicit or semantically equivalent positions
use the initial normalized scale: first `1.0`, second `0.8`, third `0.6`, fourth
or fifth `0.4`, and sixth or later `0.2`. Failed samples remain outside both
inputs. The customer sees the raw index rounded to one decimal together with a
five-star graphic rounded to the nearest half star. A zero-mention evaluation
shows `0.0` and five empty stars, without another verbal grade.

Appearance position is not derived by matching ordinal words, character offsets,
or blindly splitting paragraphs. Evaluation interpretation has two stages. A
sample parser processes every answer from all four question types, including the
brand-directed question and the three open questions. It interprets ordered
lists, tables, headings, paragraph structure, and other recommendation forms;
extracts the complete description related to the current brand; and returns
structured mention, position, associated characteristics, evidence, and an
objective sample interpretation without changing the original answer. When a
customer is mentioned, it must assign a reasonable relative position from the
complete recommendation structure, including implicit ordering rather than only
explicit ordinal words.

After the report has enough successfully parsed samples, one overall evaluation
synthesizer uses the current brand context and all sample-level structured
results and relevant descriptions. It owns the report-opening overall assessment,
the combined positive-versus-negative characteristic section, and the final
optimization direction. It groups characteristics into a small number of broad,
customer-understandable themes such as professional service rather than exposing
fragmented near-synonyms. The combined section may use evidence from both the
brand-directed and open questions. Each broad characteristic counts at most once
per independent sample, may accumulate across samples and platforms, and can
show its total count and involved platforms. The synthesizer cannot rewrite
sample-level mention, position, interpretation, or original-answer evidence and
does not calculate or revise the recommendation index. Only open-question mention
and position contribute to that index.

The parser uses the current brand's known company or store name for entity
matching. A same-name occurrence within the specific open query is treated as the
customer. An unfamiliar alias that is not part of the known brand information is
not treated as the customer and therefore counts as not mentioned. The initial
product does not add a separate ambiguous-identity workflow for these rare cases.

The product retains the complete original answer in its returned structure and
format, including lists, tables, headings, and paragraph layout where provided.
Each sample card shows platform, question, whether the customer was mentioned,
the relative position when mentioned, a concise objective interpretation, and
the format-preserving original answer. Positive and negative characteristics are
not repeated as fields on every card; they belong to one combined report section.
The twenty positions are organized into four question groups, with the five
platform cards together under the same question so customers can compare like
with like. A card initially keeps the platform, mention result, position, and
concise interpretation visible while the complete original answer is collapsed
and available on demand. Expanding it preserves the returned format and evidence
highlights.

The report ends with one prominent **Start AI-search optimization** action rather
than an immediate purchase action. If the current brand's article information is
complete, the customer continues to the article-generation experience with the
current brand information, prepared materials when available, and the latest
completed internal optimization guidance already in context. If information is
incomplete, the product first
identifies the missing items, saves the customer's additions to the same brand
profile, and then continues. Generation, regeneration, editing, and confirmation
remain free; payment begins only after the customer confirms the article and
submits a selected publishing service.

Non-destructive highlighting is part of the initial report quality boundary. It
emphasizes the customer's mention or position and important positive or negative
evidence within significant headings or longer text blocks. It should not color
every matching token or flatten the answer's structure. When a complex returned
format cannot be annotated reliably, the product preserves and shows the original
without forcing a misleading highlight. Annotations are a separate presentation
layer and never rewrite the stored answer.

The sample parser runs automatically. Its primary candidate is Hunyuan Hy3 through
Tencent Cloud TokenHub. A failed call or structurally invalid result is retried
within a bounded system policy. If that route remains unavailable or invalid,
the product switches to the separately configured Alibaba Cloud Model Studio
DeepSeek V4 Flash fallback and tries again. Once one valid structured result is
obtained, that single result is used for the report. If both routes fail, the raw
platform answer remains stored and visible with a simple not-included message,
but contributes no mention, position, characteristic, or index data. The report
still requires at least seventeen successfully sampled and parsed positions;
otherwise the evaluation becomes **Please retry**. The initial product has no
routine human review, manual correction, or automatic historical reprocessing
when a newer parser becomes available.

The overall synthesizer uses the same bounded primary-retry and cross-provider
fallback policy. If both routes fail, all completed platform samples and valid
sample parses remain retained, but the product does not issue an incomplete
official report: the evaluation becomes **Please retry** and still does not
use the current input revision's official-evaluation opportunity.
Retrying resumes only the failed overall synthesis from the retained evidence
and does not request the five platforms or repeat successful sample parsing
again.

Customer-visible sampling uses one shared, versioned
[evaluation-objectivity profile](../../apps/backend/geo-intelligence/evaluation-objectivity.json).
Its executable text is the single source of truth; provider adapters only map
that same semantic content to each verified instruction transport, and every
sample retains the profile identity with its evidence. Search availability and
automatic trigger posture remain route configuration rather than prompt-level
product meaning.

The exact question wording, additional task-specific system instructions, retry
limits, detailed visual language and motion rules, and implementation remain
open for later evaluation-design and technical discussion.

## Evaluation progress and notifications

Evaluation continues after the customer leaves its page. Returning to the
original brand shows one of four simple states: **Not evaluated**, **Evaluating**,
**Completed**, or **Please retry**. While an evaluation is running, the customer
cannot start a duplicate attempt and is returned to the current progress. Only
**Completed** adds one to the current evaluation-input revision's completed count;
**Please retry** allows a new attempt without changing that count.

The diagnosis experience keeps the current state and current report primary. A
secondary **Evaluation history** entry lists prior completed reports newest first
without placing them beside the current report as an analytics dashboard. Each
history card shows evaluation time, AI recommendation index, total mention rate,
valid coverage, a concise indication that it used the brand information from that
evaluation, and an action to open the complete report. The opened historical
report is read-only and preserves its full evidence, original input snapshot, and
four questions.

When a new evaluation is running, the main diagnosis state is **Evaluating** and
the preceding report remains accessible in history. When it becomes **Please
retry**, that retry state remains primary while history stays available. A later
completed report becomes current and the earlier report stays in the same history.
The initial product does not add report-to-report comparison, trend charts,
improvement attribution, export, deletion, custom naming, or profile-version
browsing merely because multiple historical reports exist.

The product requires a role-aware in-product notification center. While a user is
online, relevant state changes can also appear through a browser-tab indicator
and a top-right notification without requiring refresh. Evaluation completion or
the need to retry must reach the customer even if the customer left the
evaluation page. The same notification capability will later serve terminal
customers, operations staff, administrators, and agents according to their own
relevant events. The notification center should be treated as a first-class
product capability when architecture begins; delivery protocols, event transport,
and deployment choices remain outside product discovery.

Each notification contains a short title, one-line result, occurrence time,
unread or read state, and a link to the relevant brand, evaluation, article,
order, point record, invoice request, or other business page. Opening it marks it
read and takes the recipient to that page; consequential actions remain on the
business page rather than executing directly from the notification. The initial
product supports marking one or all notifications read, but does not add manual
deletion, category subscriptions, or complex archiving. A uniform retention
period can be set later as an operating rule.

Customer notifications cover evaluation completion or the need to retry,
off-page article-generation completion or retry, recharge and administrator point
changes, completion of a submitted invoice request, publishing-order delay or a
need for manual consultation, and order completion or closure. Individual
publication cards continue to accumulate in the order and do not each create a
notification; the product may use one order-level notice to indicate that new
publication results are available.

Operations users are notified when new paid orders become available in the shared
publishing pool and use that pool to claim work. A normal publication exception
already being handled by the responsible operator does not create a redundant
notification for that same operator. Administrators receive only matters that
need administrator authority, such as point returns, escalated exceptions,
overdue unhandled work, or access-sensitive changes, rather than every order
update. Agents receive business milestones for attributed customers, including
registration, first evaluation, paid-order submission, and order completion.
The initial agent scope also includes performance and commission calculation, so
their approved performance and commission changes can produce the corresponding
notifications. Notifications themselves do not embed complete sampled answers,
article bodies, or customer point balances. A currently attributed agent may
still open the complete read-only customer evaluation report through the
approved customer-and-brand hierarchy; that access follows the separate report-
visibility boundary above.

## Role-appropriate errors and messages

Every feature should present information from the recipient's perspective. A
terminal customer sees only what happened to the customer's action or business
result, what it affects, and what the customer can do next. Messages should be
simple, clear, direct, formal, and information-dense. Retry counts, provider
failures, stack traces, internal routing, and other details that do not help the
customer act are not shown.

Operations staff, administrators, and agents may need different business context
and available actions for the same underlying problem. Technical diagnostics
belong in controlled logs rather than user-facing messages. Product behavior must
capture and handle errors deliberately instead of relying on generic failure
text, while later engineering standards define the shared taxonomy, message
contract, logging context, sensitive-data rules, ownership, and verification.
That single cross-cutting standard must be proposed and architecture-reviewed
after product approval and before application implementation begins.

The same three outcome patterns apply across interactive roles: **Needs
correction** points the role to information that role can fix, **Please retry**
offers another attempt after a temporary failure, and **In handling** makes clear
that no repeated action is required while another role or the system responds.
Normal business constraints such as insufficient points or unavailable authority
state their reason and available action directly rather than pretending to be a
system error. Wording, visible context, and actions are adapted to terminal
customers, agents, operations staff, or administrators instead of reusing one
generic message for everyone.

Page-local problems that the current role can resolve immediately stay with the
relevant page or field. Only asynchronous state changes, cross-page outcomes, or
issues requiring another role's attention enter the notification center. Backend
retries, diagnostic events, and technical log entries never become notifications
merely because they occurred. A short support reference is shown only when a
person needs it to locate a problem with customer service or internal support.

## Product boundary

For the selected current brand, the initial product connects a free basic
evaluation to one paid GEO optimization and publishing journey:

1. the evaluation provides a concise optimization direction;
2. a GEO promotional-article agent uses the customer's profile and evaluation
   context to generate a core promotional article;
3. the customer may edit and must confirm that core article before submission;
4. after confirming the article, the customer chooses either a random publishing
   package or precise publishing, reviews the order, and submits it using points;
5. a polishing step produces multiple differently angled and optimized variants
   from the confirmed core article;
6. the company operations team selects suitable variants and either publishes
   them directly or adjusts them further before publication;
7. publication results are uploaded and shown back to the customer.

The customer pays for GEO-oriented content preparation and real media
publication work, not for the free evaluation and not for a guaranteed AI
ranking outcome. The company commits to performing and evidencing the agreed
publishing service. It does not guarantee that AI platforms will mention the
customer more often, improve the AI recommendation index, or rank the customer
higher. Exact package composition and pricing and the short post-delivery
feedback period remain launch-owned operating inputs; replacement, point-return,
and manual customer-service boundaries are already defined below.

## First commercial release boundary

The first externally chargeable release closes all four agreed role journeys,
even if internal development and pilot builds deliver them incrementally:

- terminal customers can register, optionally defer first-brand creation, manage
  brands, complete bounded free evaluations,
  understand its report, generate and confirm an article, recharge, purchase a
  random or precise publishing service, follow fulfilment and results, and
  request an invoice for an eligible recharge;
- operations users can claim whole orders, execute publication work, return
  results, handle ordinary exceptions and required customer contact, and fulfil
  assigned invoice work;
- administrators can govern accounts and roles, the media library, packages and
  prices, point adjustments, exceptional orders, agent attribution, commission,
  withdrawal review, and other authorized platform rules;
- agents can see attributed-customer milestones and complete read-only current
  and historical evaluation reports, inspect performance and commission detail,
  and submit withdrawal requests without gaining customer-owned commercial
  authority.

Commercial-release acceptance requires a real brand to complete a real
five-platform evaluation and report, article generation and confirmation, real
online payment and point credit, a paid random or precise order, operations
fulfilment with an accessible real publication result, immediate customer
progress and result visibility, and the applicable invoice, attribution,
commission, and withdrawal support paths. Normal business paths cannot depend on
a developer editing the database, and important failure cases must reach the
approved state, message, and recovery path.

Frontend quality is part of this acceptance rather than a later cosmetic task.
The first commercial release must have attractive and consistent visual design,
clear hierarchy and spacing, prominent important information, readable forms and
data, responsive layouts, meaningful motion, and flexible, understandable
interaction for every included role. A technically connected but visually rigid,
confusing, or unfinished interface does not meet the product boundary.

The terminal-customer web journey must be fully usable on both common desktop and
mobile viewports. Operations, administrator, and agent experiences are desktop-
first because their dense fulfilment and governance work is primarily performed
there, while their layouts still adapt responsibly and keep notifications,
status inspection, and ordinary lightweight actions usable on mobile. The first
release does not include a native mobile application. Technology selection
remains a later architecture decision, but the selected frontend approach must
demonstrate these responsive outcomes rather than treating them as an optional
framework feature.

Each role has a separately composed signed-in home rather than one generic
dashboard filled with the same cards. Data panels are appropriate for all four
roles when they reflect that role's established modules; operations,
administrator, and agent homes should primarily present useful statistics and
management state. A home uses the full page as one ordered composition, applies
the same visual and interaction language as the rest of the product, and has
enough relevant information depth to avoid appearing unfinished without adding
unrelated filler. It does not force a generic "next action" as the page's
purpose, add the current article merely to fill space, or show the same
optimization or publication progress again under competing labels.

The terminal customer uses a consumer-style **current-brand service home**, not
a traditional management workbench or dense statistical dashboard. It is a
dynamic, visually rich, practical service page organized in a stable vertical
reading order around the selected brand. A compact brand area supports identity
and switching; the main service regions cover AI-search diagnosis, AI-search
optimization, article publishing, and media resources.

The public website and the signed-in product have deliberately different jobs.
The public website remains the marketing and acquisition entry and may use top
navigation. After login, all four roles enter one recognizable platform shell
with a role-appropriate left sidebar. For the terminal customer, that sidebar is
plain and shallow rather than management-oriented: **My brands** is the default
home, followed by **AI-search diagnosis**, **AI-search optimization**, **Media
resources**, **Article publishing management**, and **Account center**. The
shared top utility area keeps the current-brand switch, points, notifications,
and personal entry readily available. Using a left sidebar provides stable
platform orientation and consistency across roles; it does not change the
terminal customer's page content into an administrative dashboard.

If registration was completed without brand information, **My brands** remains a
complete signed-in home rather than an error or blank page. It explains the
brand-based service in a concise designed state, makes creation of the first
brand clear, and keeps brand-independent entries such as media resources and the
account center usable. Diagnosis, optimization, and publishing actions explain
that a brand must first be created and completed; they do not show fabricated
customer data.

The service home's structure stays stable while each region changes with the
current brand's actual state. Before diagnosis, optimization, or publication,
the relevant region uses a polished capability explanation and its ordinary
service entry rather than misleading zero statistics. After real data exists,
the same region replaces that introduction with a concise result or status:
diagnosis can show the recommendation index and a short result, optimization can
show information, material, generation, or confirmation state without exposing
the full article, and publishing can show order progress and returned results
without duplicating its management page. Media resources can always present real
platform coverage and representative maintained resources independently of the
brand's own history. Diagnosis and optimization remain separately enterable as
already agreed; the page may express their natural relationship without forcing
a global step-by-step gate.

Detailed copy, illustrations, exact component sizes, visual language, motion,
responsive composition, and the amount of preview content in each region belong
to the later product and interaction-design stage. That stage must start from
this role, navigation, state, and information boundary while using product-design
judgment to make the page dynamic, attractive, useful, and understandable to
non-experts; it must not reinterpret the service home as a conventional
administrative console.

The three supporting-role homes are now bounded by their established work:

- operations emphasizes fulfilment workload and urgency: unclaimed orders, the
  operator's in-progress orders, near-deadline or delayed work, exceptions,
  completed-publication volume, simple status or deadline-risk visualization,
  and the priority order list that carries directly into handling;
- the administrator emphasizes commercial, fulfilment, resource, and authority-
  requiring platform state: recharge amount remains distinct from paid-order
  count and actual order point consumption, fulfilment shows publishing,
  completed, delayed, and exception distribution, resource panels summarize
  available media and coverage plus random-versus-precise use, and pending work
  covers exceptional intervention, point return, reassignment, and withdrawal
  review. Routine user count, agent count, and point-adjustment history are not
  homepage panels;
- the agent home follows customer, performance-order, commission, and withdrawal
  modules. Available commission receives the strongest emphasis, followed by
  commission-eligible order consumption, pending commission, customer totals,
  commission trend and recent detail, and any active withdrawal state. It does
  not add a general customer-event feed. Customer management starts from the
  attributed terminal-customer account, opens that customer's independent brand
  list, and only then enters a brand's evaluation reports, optimization progress,
  or publishing progress. Performance orders, commission, and withdrawals remain
  dedicated agent-level modules; customer and brand views may link to concise
  related summaries but do not duplicate their ledgers or workflows.

Each supporting-role panel leads to its owning module and does not become a
second implementation of the detailed list or workflow.

The paid pilot accepts customers across the approved small- and medium-customer
target rather than restricting entry to a predetermined city, industry, or small
sample cohort. The system still requires sufficiently complete industry
classification, media catalog, availability, and pricing data to evaluate and
sell truthfully. Those are administrator- and business-owned launch inputs, not a
product dependency on choosing a narrow pilot segment.

Generating, editing, and confirming the core article do not consume points.
Points are deducted when the customer submits the publishing order. The paid
fulfilment includes producing multiple optimized variants for the purchased
publication quantity. Publishing purchases use a fixed conversion of one
renminbi to ten points. Points can be obtained only through customer recharge or
an administrator allocation; rewards, tasks, sign-ins, and other earning
mechanisms are outside the product. Customers see and spend one unified point
balance. Internally, the product distinguishes points funded by customer recharge
from points granted by the platform or an administrator because only real
customer-funded order consumption can contribute to agent commission. The
customer is not shown separate balances or asked to choose which origin to use.
When paying an order, granted points are consumed first and customer-funded
points are used only for the remainder. A full return restores the original
funded and granted composition. A partial return restores the two origins in the
same proportion as the order consumed them. Points are always whole numbers. For
a partial return, each origin's proportional result is first rounded down; any
remaining point is assigned to the origin with the larger discarded fractional
part, and an exact tie goes to granted points. The two restored origins must add
up exactly to the agreed return total.

An attributed customer's successfully submitted publishing order creates pending
agent performance and commission based on its commission-eligible order
consumption, not on recharge alone. Commission becomes effective only when the
corresponding service is successfully completed. If an order problem cannot be
resolved through replacement, customer service and the customer may agree to
terminate remaining work with a full or partial point return; an administrator
performs that positive return and the order closes. Continuing-service compensation
does not itself close an order. Returned points never contribute to effective commission. If part of the
service was successfully delivered and its corresponding points were not
returned, that non-returned customer-funded consumption becomes effective
commission when the partially returned order closes.

Agents receive a commission detail for each attributed order. It shows the order
number, customer and brand, order-submission and resolution times, total point
consumption, granted-point consumption, customer-funded-point consumption,
returned points split by origin, final commission-eligible points, the rate fixed
for that order, estimated or effective commission amount, and commission status.
This lets the agent reconstruct why some or all of an order does not create
commission without exposing the customer's current point balance.

Commission is recorded and displayed in renminbi rather than customer points.
The amount is the final commission-eligible points divided by ten and multiplied
by the order's commission rate. The initial product assigns one administrator-
maintained fixed rate to each agent. A paid order records the current rate so a
later rate change affects only new orders. The commission amount is rounded to
the nearest fen when calculated, with half-fen values rounded up. More complex
package-specific, media-specific, or performance-tier rates are outside the
initial rule.

Effective commission enters an agent's available-withdrawal balance. The initial
product provides an agent-initiated withdrawal request, administrator review,
offline company payment, administrator recording of the payment result, and an
agent notification. It does not require an automatic payout integration.

The agent center distinguishes pending commission, available commission,
withdrawal-in-process amount, cumulative settled commission, and cumulative
effective commission. A request moves through **Pending review**, **Paying**, and
**Completed**. A global administrator-maintained minimum applies, with its exact
amount confirmed by finance before launch. The initial product charges no
withdrawal fee and imposes no calendar frequency limit, but one agent can have
only one unfinished request at a time. If rejected, the administrator records a
reason and the frozen amount returns to available commission. If an approved
offline transfer fails, the request becomes **Payment failed**, records the
failure reason, returns the frozen amount to available commission, and notifies
the agent. After correcting the payout information, the agent submits a new
request rather than reopening the failed one.

Completing a withdrawal requires the authorized administrator to record the
actual paid amount, payment time, and bank transaction reference. A transfer
receipt can be attached when available, with the handling operator and a short
note retained in the operating record. These fields evidence the offline
payment; they do not turn the product into an automatic payout system.

An agent maintains one or more payout profiles for individual or enterprise bank
transfer. The core bank-transfer data is recipient type, bank-account name,
account number, bank name, and contact mobile number. Opening branch full name,
province and city, and the twelve-digit CNAPS or joint-bank number are collected
only when required by the company's actual bank-payment route. A physical street
address for the opening bank is not a default field. Each withdrawal captures a
snapshot of its payout profile; later edits affect only new requests. Account
numbers are masked after saving and visible in full only to authorized handling
roles.

The initial product has only two money-information routes. After a terminal
customer successfully completes a renminbi recharge order, the customer can
provide invoice information and request one invoice for that recharge order; the
company handles the request and returns the completed invoice result. One
recharge order is not split across multiple invoices or combined with other
recharge orders in the initial product. The invoice amount is the renminbi amount
actually paid for that order; credited point quantity, point origin, or later
point use does not determine invoice eligibility or amount. The initial product
issues only electronic ordinary invoices, supports either an individual or
enterprise purchaser title, and does not provide special VAT invoices. An agent,
whether an individual or enterprise, provides only the payout information needed
to request withdrawal of available commission. Agent invoices, taxpayer identity,
withholding, and other tax handling are outside the current product boundary.

Normal customer recharge is a self-service online-payment journey whose
successful completion automatically credits points at the fixed ten-to-one rate.
Administrator point allocation remains a separate path for grants, compensation,
and correction rather than an ordinary recharge substitute. The exact payment
channel is not selected during product discovery; merchant-account application,
official-interface research, commercial terms, and readiness validation must run
as an explicit workstream after the module boundaries are agreed.

The recharge page offers administrator-maintained shortcut amounts and a custom
whole-renminbi amount. It does not introduce recharge discounts, bonus campaigns,
or membership tiers in the initial product. When an order lacks enough points,
the customer sees the required points, current balance, shortfall, and suggested
renminbi recharge amount, and can enter recharge without losing the prepared
publishing order.

A recharge order is customer-visible as **Pending payment**, **Confirming**,
**Recharge successful**, or **Closed**. Points become available only after the
payment is confirmed successful. Cancellation, payment failure, and expiry do not
credit points and end as **Closed**. An unpaid order can be cancelled or expire;
a successful recharge has no customer self-service cash-refund flow in the
initial product. Exceptional payment or refund questions are handled manually
through a consistent customer-service entry. The product must reserve that entry
across relevant recharge and order-exception experiences, while the actual
contact name, telephone number, WeChat QR code, or other contact content is
confirmed before implementation or release.

The customer has one unified point history. Each change shows its time, added or
deducted points, resulting balance, a short customer-facing type and explanation,
and a link to the related recharge or publishing order when one exists. The
customer-facing types are recharge credited, publishing-order spending,
order-point return, and point adjustment. The history does not expose the
internal funded-versus-granted composition or agent-commission calculations.

An existing point-change record is never edited or deleted to correct a balance.
An authorized administrator creates a new positive or negative point-adjustment
record. The customer sees the adjustment amount and a concise reason; authorized
internal roles also retain the operator, full reason, and supporting business
reference. This is a traceable correction rather than a general point-history
rollback feature.

When an insufficient balance sends the customer to recharge, the unsubmitted
core article, selected publishing choice, selected media and quantities remain
prepared. A successful recharge returns the customer to the same order-review
context but never submits it automatically. The product rechecks current package
or media availability and price before submission. If they changed, the customer
sees the change and confirms again. Recharge does not reserve media inventory or
lock an unpaid price.

The invoice form remains conditional and short. An individual title requires the
customer's invoice name and receiving email. An enterprise title requires the
enterprise name, unified social credit code or taxpayer identification number,
and receiving email. The recharge-order number and actual renminbi paid are
system-supplied read-only context. The initial form does not ask for an address,
telephone, opening bank, bank account, or personal identity number. If operations
needs to contact the customer about a correction, it uses the mobile number
already held by the account rather than collecting another invoice-contact field.

Before submission, the customer can edit and confirm the invoice information.
Submission locks it. The customer then sees only **Processing**, **Needs
correction**, or **Issued**; before any request exists, the recharge order simply
offers an invoice-request action. If operations finds incorrect information, it
returns the same request as **Needs correction** with a short reason. The customer
edits and resubmits that request rather than creating another. An issued request
cannot be edited, cancelled, or reissued through customer self-service. Any
post-issue correction is handled through customer service outside the initial
online flow.

Operations creates the invoice outside the product and sends it directly to the
customer's receiving email. After the send succeeds, operations uploads the
invoice PDF, records the invoice number and issue date, and confirms the request
as **Issued**. The product then retains the downloadable result and sends the
already approved in-product completion notification. The product itself does not
send the invoice email and the initial product does not integrate with an
external tax-invoicing system.

Because financial-account information is sensitive, the product must give a
specific notice, collect only necessary information, obtain the required consent,
and define protected access and retention before implementation.

Before submission, the customer is told that content operations may make further
adjustments to improve publication success and effect while maintaining the
confirmed article's main subject matter. This is a simple service authorization,
not a promise that every publication will reproduce the confirmed wording.

The two publishing choices are peers:

- **Random publishing package:** the customer selects a package defined by a
  successful-publication quantity and total point price. The quantity counts
  completed media publications based on differently optimized variants of the
  confirmed core article, rather than identical copies or separately confirmed
  core articles. Operations may use the media library as a non-blocking
  reference but can also publish through an unlisted account, so library
  resources are visible examples and cannot be selected in this mode. The
  presentation should clearly communicate random allocation. The service
  guarantees the purchased quantity within the stated media scope, not a
  particular platform or account; unavailable placements can be replaced by
  other eligible media until that quantity is fulfilled.
- **Precise publishing:** the media library shows explicit point prices, and the
  customer chooses publishing platforms and quantities according to need. The
  order deducts the sum of the listed selections. Those platform choices and
  quantities form the order commitment and cannot be silently substituted. If a
  selected publication cannot be completed, customer service contacts the
  customer to agree on a replacement, or an administrator returns the
  corresponding points.

Example packages such as ten publications for 9,600 points or twenty for 15,000
points illustrate the intended shape only; package quantities, media data, and
prices are not approved until the assigned colleague supplies the information
and an administrator publishes the maintained catalog.

The media library has two product responsibilities. It demonstrates the
platform's real, maintained coverage through media platforms and optional
concrete-resource examples; and it supplies the selectable, platform-priced
destinations for precise publishing plus non-blocking references for operations.
Administrators own the accuracy of the platforms, examples, availability, and
pricing shown to customers. Customer-facing entries use the fixed media
categories, platform name and icon, domestic or overseas scope, one concise
description, current availability, and the platform's single-publication point
price. Up to fifty administrator-approved concrete-resource examples may be
shown completely or with an explicit masked alias, but cannot be selected or
treated as account-level commitments. Procurement cost, internal sources,
contacts, operating notes, unsupported weight, guaranteed inclusion, exposure,
or effect claims are not shown. The actual catalog content and prices remain
separately assigned business input.

The media library is a standalone primary customer entry in addition to its use
inside publishing-service selection. Its customer experience is designed as a
clear, professional resource presentation rather than an administrator table.
The administrator receives a separate maintenance experience for the same
catalog, including availability, platform prices, retirement, and audit. The
two role views share truthful maintained media facts but do not share the same
page organization or available actions.

Media-library management is intentionally centralized under administrators.
Operations users fulfil orders but do not edit media records, availability,
prices, or packages. The colleague responsible for collection can prepare or
import source information, while an administrator is the role that publishes and
maintains it in the product. The initial product has no multi-person approval:
an authorized administrator can create, edit, enable, disable, archive, or
publish media changes directly. Every change retains the actor,
time, reason, and before-and-after values. Changes affect new and still-unpaid
choices only; paid orders continue from their committed snapshots.

An erroneous or test media record that has never been used may be
deleted. Once referenced by an order, it can only be disabled, taken off sale,
or archived and may later be restored. Retirement removes it from new precise
selection without erasing historical order or delivery meaning. The architecture
keeps the live catalog, platform commercial configuration, paid-order snapshot,
and historical publication results as separately owned lifecycle concepts.
Media Supply owns the first two live facts; Publishing Commerce and Publication
Delivery retain snapshot and result ownership without direct media-table access.

Random and precise publishing use the same maintained library. Random mode
shows the library as non-selectable supporting context and uses clear
interaction or motion to express random allocation; its package quantity and
total price remain the commercial focus rather than individual-media prices.
Precise mode enables platform and quantity selection and keeps each price and the
running total visible.

Browsing, selecting, or reaching order review never reserves media or locks an
unpaid price. Immediately before point deduction, the product rechecks package
or media availability and price. A change is explained and requires explicit
reconfirmation. Successful paid submission fixes a snapshot of the selected
package scope or precise platform facts, quantities, and prices as the order
commitment; later library edits cannot rewrite that order. Media maintenance is
normally scheduled for low-traffic overnight periods, but correctness cannot
assume that no customer is selecting at the same time. A later availability
problem on a paid order follows the already agreed replacement or point-return
exception path.

The operations workbench has two primary views: **Unclaimed orders** and **My
orders**. The shared pool exposes enough summary for eligible operators to choose
work, but a successful claim is exclusive and prevents another operator from
editing the same order. An operator may return an order that has not begun to the
pool with a concise reason. Once actual handling has started, reassignment
requires an administrator and a recorded reason. Return or reassignment retains
all existing variants, progress, exceptions, and results. Customers see only the
business state and never the internal operator identity or transfer history.

Workbench lists emphasize order number, brand, random or precise mode, purchased
and completed quantity, package scope or selected-media summary, submission and
expected-completion times, and clear normal, nearing-deadline, delayed, or
exception markers. Nearing-deadline, delayed, and exception work receives
priority over a simple newest-first order. Opening an order presents the confirmed
article, relevant brand context, required publication quantity and media targets,
current progress, handling history, and clear result-upload actions. The exact
per-publication upload layout remains later interaction design.

The purchased quantity becomes an internal list of one-publication work items.
A random package of ten therefore creates ten work items whose media initially
remain to be assigned by operations from the eligible library. A precise order
creates one work item for every selected-media quantity unit and carries that
committed media target into each item. One work item can produce at most one
valid publication result and increments completed progress by one, so operations
and customers see the same quantity outcome as soon as a result succeeds.

Recording a successful result links its actual media to the maintained media
library and captures the published title, accessible URL, and publication time.
The actual publishing account or channel identifier is internal and recorded
when applicable; screenshot or delivery evidence and an internal note are
optional. Operations does not manually choose or record a source article variant
on the result because the actually published article is the delivery evidence.
Customers continue to see only the already approved media platform, title, URL,
time, and status. A responsible operator may correct an ordinary entry error with
a reason while preserving internal correction history. Replacing a committed
precise media target or otherwise changing the order promise is not a field
correction and must follow the agreed exception process.

Each internal publication work item uses four plain states: **Pending**,
**Publishing**, **Published**, and **Exception**. A random item remains pending
until the operator selects an eligible media target and confirms handling. A
precise item already carries its committed media target but also remains pending
until the operator explicitly confirms receipt of that publication information.
That confirmation moves the individual item to publishing and means the media
submission, review, scheduling, or go-live work is underway. If the operator
already has a valid live result, one result-submission action may confirm the
item and move it directly from pending to published without forcing an extra
intermediate step. Exception identifies a problem on that item that needs
handling.

Claiming the whole order moves the order itself from pending handling to
publishing but does not bulk-change its work items: an order can truthfully be
publishing while some items are pending, some publishing, and some published.
A recoverable item exception, such as a random-media replacement that operations
can resolve independently, does not by itself change the customer-visible order
to exception handling. The order enters exception handling only when the overall
promise is blocked or customer or administrator intervention is required.
Customers see the order state, completed count, and each published result as soon
as it succeeds, not the full internal item-state history.

The customer publishing-order page is progress-first. Its header emphasizes the
overall state, completed count against purchased quantity, a clear progress
visual, expected completion date, delayed marker when applicable, order number,
and submission time. The next section preserves the purchased commitment and
points: random orders show their package scope, while precise orders show the
selected media and quantities. Published result cards follow, with the confirmed
core article, concise service explanation, and customer-service entry available
below rather than displacing current fulfilment progress.

Unpublished targets are presented differently by purchase type. A random order
shows only aggregate progress until each result succeeds; an internal provisional
media allocation is not exposed as though it were promised. A precise order
continues to show every purchased media target from payment onward with a simple
customer-facing state of **In handling**, **Published**, or **Exception handling**.
When a precise target succeeds, its entry gains the published title, URL, and
time and becomes the formal result card. Internal pending and media-review steps
remain operations detail.

After payment, the customer page allows viewing the confirmed article, purchased
scope and points, progress, and results; opening publication links; and contacting
customer service. The initial product does not let the customer cancel, request a
self-service refund, change precise media, manually accept delivery, or close the
order. When consultation is required, the page states that customer service will
contact the customer and retains the support entry. Replacement and point return
continue through the approved manual process.

Each successful publication is shown to the customer as one simple result card
containing the media platform, published article title, directly accessible
link, publication time, and current publication status. The specific publishing
account is not shown. Cards appear as their publication results are returned,
and the order shows completed progress against the purchased quantity. Random
orders complete automatically when they contain the purchased number of valid
publication results. Precise orders complete
automatically when the purchased number of publications succeeds, including
agreed replacement placements. Stopping or returning points does not manufacture
successful publications; a terminated order retains its actual partial progress.
The customer does not perform a separate manual acceptance step.

A returned link must be accessible when it is submitted as a publication result
and when the order completes. Third-party media links are not guaranteed to
remain available permanently. If a link becomes unavailable within a short,
clearly communicated feedback period after delivery, operations investigates
and handles the exception. The exact duration remains a launch operating value
to set from real service capability; it does not reopen the agreed handling
ownership or permanent-availability boundary.

## Non-goals for the discovery phase

- Selecting the application stack or deployment architecture
- Designing APIs, schemas, services, or agents
- Selecting the realtime notification transport or technical delivery protocol
- Treating raw meeting notes or prompts as accepted requirements
- Committing to a universal GEO score before its meaning and actionability are defined
- Expanding into every possible GEO workflow before one valuable user journey is clear
- Adding scheduled or continuous monitoring, automatic re-evaluation, or causal
  improvement claims to the current product boundary
- Building a rich public case-showcase experience before the core product
  journey is complete
- Supporting medium- or large-enterprise organization, department, or complex
  team-permission management
- Letting customers self-cancel, self-refund, change paid precise media, or
  manually accept and close publishing orders
- Letting agents edit customer brands, confirm articles, spend customer points,
  or submit paid orders merely through attribution
- Letting customers choose evaluation platforms, models, writer Skills, article
  lengths, tones, templates, or media-specific writing variants
- Automating external media publication, tax-invoicing-system integration, or
  catalog and price multi-person approval in the first release
- Adding brand-profile version history, replaced-article candidate history, or
  customer-facing rollback

## Product principles

These are working constraints for discovery, not yet product-positioning claims:

1. Define user value before technical novelty.
2. Make evaluation results understandable and actionable.
3. Distinguish measured evidence, inference, and recommendation.
4. Deliver a narrow end-to-end outcome before broad platform scope.
5. Keep product language stable enough that users, documents, code, and agents mean the same thing.
6. Prefer simple and direct evaluation over professional depth that the target
   customer does not need.
7. Present each role only the information and actions that role needs.
8. Keep customer messages, operational handling context, and technical diagnostic
   logs distinct while linking them through an agreed standard.

## Next-stage gates

See the completed [product discovery plan](discovery-plan.md), the
[archived architecture-entry change](../../openspec/changes/archive/2026-08-25-define-application-architecture/proposal.md),
and the [archived product-foundation decision backlog](../../openspec/changes/archive/2026-08-24-define-product-foundation/decision-backlog.md).
The target customer, all four role boundaries, free-evaluation-to-paid-
publication journey, evaluation questions and index, report and optimization
semantics, article lifecycle, points and recharge, invoicing, agent commission
and withdrawal, media choices, operations fulfilment, order presentation,
commercial non-goals, and first-release acceptance boundary are agreed.

First-release product meaning and role-level information ownership are approved.
Evaluation preparation is bounded: one unchanged evaluation-input revision has
one non-editable generated question set and one completed official-evaluation
opportunity. A relevant brand-information change creates a new revision and new
question set; the initial product provides no independent question refresh. New
work therefore proceeds through product-design, controlled-validation, and
architecture gates without reopening these decisions as implementation detail.

Several items are launch-owned inputs rather than recurring product workshops:
the industry catalog and maintained administrative-region source used to derive
verified Store Location paths, actual media catalog and prices,
support contacts, agent rate, withdrawal minimum and bank template, invoice-
operator validation, writer Skills, and post-delivery link-feedback period.
Provider, parser, payment, writing, pilot, frontend-design, security, and
architecture evidence remain explicit later gates rather than implicit product
assumptions.
