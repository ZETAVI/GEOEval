# Product Definition Specification

## Evolution marker

- State: `split-on-activation`
- Trigger: the first approved implementation change for a named product
  capability establishes its module and owner-local behavioral boundary.
- Target: move that capability's accepted scenarios to
  `openspec/specs/<capability>/spec.md` and leave an index-level scope and link
  here; never maintain both copies.
- Reconciler: the lead agent for each activating standard or architectural
  change must execute or explicitly retain this marker at close.
- Agency extraction: initial acquisition entries and source-bearing registration
  are owned by [Agency Entry](../agency-entry/spec.md). Current service
  relationships, administrator reassignment and customer/brand/report access
  are owned by [Agency Customer Service](../agency-customer-service/spec.md).
  Commission estimates and final entries now belong to [Agency Commission](../agency-commission/spec.md). Retain this marker for withdrawal activation; purchase snapshots are owned by [Agency Order Terms](../agency-order-terms/spec.md).
- Completed extraction: S6 provider execution, protected provider evidence,
  semantic route recovery, and public report projection are owned by the
  [evaluation-evidence](../evaluation-evidence/spec.md) and
  [evaluation-report](../evaluation-report/spec.md) specifications. Controlled
  industry selection, verified Store Location and derived-region meaning, Brand
  readiness, fingerprinting, and the evaluation-purpose projection are owned by
  the [Brand Knowledge specification](../brand-knowledge/spec.md).
  The administrator-maintained platform catalog, pricing, optional resource
  examples, revision, and audit boundary are owned by the
  [Media Supply specification](../media-supply/spec.md). Fixed single-role
  accounts, authentication, Session lifecycle, access, account governance,
  Bootstrap, and fixed role entry are owned by the
  [Identity and Access specification](../identity-and-access/spec.md). This
  marker remains for product capabilities that have not yet gained an activated
  owner. Writer input snapshots, deterministic generation execution, the one
  current Core Article and confirmed-article handoff are owned by the
  [GEO Optimization specification](../geo-optimization/spec.md), including its
  terminal-customer API and workspace. This marker remains for unactivated
  payment and related capabilities. Maintained random-package
  configuration, audit and customer offer visibility are now owned by the
  [Publishing Commerce specification](../publishing-commerce/spec.md).
  Account-owned points, granted-only administrator adjustments and customer-safe
  history, explicitly saved random/precise selections and advisory quotes also
  use that owner. Exact-article purchase, atomic granted-first spending, immutable
  paid agreement, linked history and pending-order reads also use that owner.
  Customer recharge API/history, controlled Native checkout and saved publishing
  continuation now follow [Recharge](../recharge/spec.md). This marker is explicitly
  retained for real-merchant/operational activation, maintained amount policy,
  recharge invoices and withdrawals; controlled testing does not activate them.
  Order admission, exclusive whole-order responsibility, explicit start/return
  and administrator reassignment now use [Publication Delivery](../publication-delivery/spec.md).
  Sparse work items, Mock/manual preparation, effective results/corrections,
  customer-safe progress, normal automatic completion and deadline-priority
  workbench presentation also use that owner. Manual negotiation, precise
  replacement, remaining-work termination and eligibility use Delivery; actual
  original-order returns and linked point history use Commerce. Support conversation, order appeal admission and responsibility now use [Support](../support/spec.md); final automatic settlement and all-customer ledger reads use Commerce. Their detailed
  scenarios are extracted below. The marker is explicitly retained for the other
  unactivated capabilities, not a second owner of implemented fulfilment or returns.

## Requirements

### Requirement: Explicit product identity

The product definition SHALL identify the primary user, the problem being solved, the desired observable outcome, and the first-release non-goals.

#### Scenario: A new contributor enters the project

- **GIVEN** the product foundation is approved
- **WHEN** a new human or agent reads the current product sources
- **THEN** they can state who the first product serves and what valuable outcome it provides
- **AND** they can distinguish that outcome from deferred platform ambitions

#### Scenario: The product states its differentiated promise

- **WHEN** GEOEval explains why a small or medium customer should use it
- **THEN** it presents a lightweight and fast path from the customer's current
  multi-platform answer evidence to understandable guidance, a customer-confirmed
  article, managed media publication, and visible delivery results
- **AND** it does not position an isolated score, generic AI writing, or a media
  storefront as the complete product value
- **AND** it does not convert the controlled work promise into a guaranteed AI-
  model outcome

### Requirement: Role-specific signed-in homes

Each interactive role SHALL receive a signed-in home whose information hierarchy
and data panels are designed around that role's responsibilities and established
modules rather than a generic collection of the same cards. All roles SHALL use
one recognizable signed-in platform shell with a role-appropriate left sidebar,
while the public marketing website remains a distinct top-navigation experience.

#### Scenario: A user enters the signed-in product

- **WHEN** a terminal customer, operations user, administrator, or agent opens
  the role's home
- **THEN** the page uses one clear top-to-bottom reading order and the product's
  shared visual and interaction language
- **AND** it uses the full page coherently with enough relevant information depth
  to avoid appearing unfinished
- **AND** operations, administrator, and agent homes primarily present the
  statistics and management state relevant to their own modules
- **AND** it does not require a generic next-action prompt to justify the home
- **AND** it does not add a current-article panel merely to fill space
- **AND** it does not present one optimization or publishing state repeatedly
  under competing labels
- **AND** the role's primary modules remain available through a consistent left-
  navigation shell without forcing every role to use the same menu or page
  density
- **AND** the exact sections for each role remain an explicit information-
  architecture decision before frontend design

#### Scenario: A terminal customer has no module data yet

- **GIVEN** the current brand has not completed diagnosis, optimization, or
  publication
- **WHEN** the customer opens the signed-in home
- **THEN** the product presents a consumer-style current-brand service home
  rather than a traditional management workbench or dense dashboard
- **AND** the stable vertical structure contains a compact current-brand area
  and AI-search diagnosis, AI-search optimization, article publishing, and media-
  resource regions
- **AND** the corresponding regions use polished capability explanations rather
  than fabricated or zero-valued statistics
- **AND** each region exposes its ordinary service entry
- **AND** media resources can present truthful maintained coverage and
  representative resources without depending on customer-specific history
- **AND** when real brand data becomes available, that same region replaces the
  empty state with concise module-owned data
- **AND** the page still forms a complete visual composition without adding
  unrelated panels solely to occupy space

#### Scenario: A terminal customer skipped brand information at registration

- **GIVEN** terminal-customer registration completed without a saved brand
- **WHEN** the customer enters My brands
- **THEN** My brands remains the signed-in home and presents a designed first-
  brand entry rather than a blank page or technical error
- **AND** the customer can understand diagnosis, optimization, publishing, and
  media-resource capabilities without seeing fabricated customer data
- **AND** media resources and the account center remain usable
- **AND** brand-dependent actions explain that the customer must create and
  complete a brand before continuing

#### Scenario: A terminal customer returns with brand data

- **WHEN** the current brand has diagnosis, optimization, or publishing data
- **THEN** the same service-home regions present concise current results or state
- **AND** diagnosis may show the recommendation index and short result without
  duplicating the full report
- **AND** optimization may show information, material, generation, or
  confirmation state without showing the full article body
- **AND** publishing may show order progress and returned results without
  duplicating the detailed publishing-management page
- **AND** switching the current brand refreshes all regions to that brand's state
- **AND** My brands provides both the concise cross-module data overview and the
  brand-management actions expected from the terminal-customer home
- **AND** diagnosis and optimization remain separately enterable rather than
  becoming a forced global sequence

#### Scenario: A terminal customer navigates the product

- **GIVEN** the customer has entered the signed-in product rather than the public
  marketing website
- **THEN** the customer uses a simple, shallow left sidebar whose primary entries
  are My brands, AI-search diagnosis, AI-search optimization, Media resources,
  Article publishing management, and Account center
- **AND** My brands opens as the default current-brand service home
- **AND** current brand, points, notifications, and the personal entry remain in
  the shared top utility area
- **AND** the public website retains its distinct marketing and acquisition role
  instead of becoming a second signed-in home
- **AND** the left-navigation shell does not turn the terminal customer's content
  into a dense management dashboard
- **AND** exact copy, illustration, component sizing, motion, responsive
  composition, and preview depth remain later product and interaction-design
  decisions constrained by this approved information boundary

#### Scenario: A role uses the web product on different devices

- **WHEN** a terminal customer uses a common desktop or mobile viewport
- **THEN** the complete customer journey remains usable through responsive web
  layouts without requiring a native mobile application
- **AND** operations, administrator, and agent experiences remain desktop-first
  for dense fulfilment and governance work
- **AND** their responsive layouts still preserve notifications, status
  inspection, and ordinary lightweight actions on mobile
- **AND** the later frontend choice must demonstrate these outcomes without the
  product definition selecting a framework

#### Scenario: An operations user opens the home

- **THEN** the home emphasizes unclaimed orders, the operator's in-progress
  orders, near-deadline or delayed work, exceptions, completed-publication
  volume, and a priority order list
- **AND** any visualization explains fulfilment state or deadline risk rather
  than unrelated platform statistics
- **AND** each summary leads into the owning order-workbench view

#### Scenario: An administrator opens the home

- **THEN** the home organizes commercial, fulfilment, media-resource, and
  authority-requiring state
- **AND** recharge amount, paid-order count, and actual order point consumption
  are labeled as distinct measures
- **AND** fulfilment includes publishing, completed, delayed, and exception state
- **AND** resource information covers available media and maintained coverage
  plus random-versus-precise publishing use
- **AND** authority-requiring work can include exceptional order intervention,
  point return, reassignment, and agent-withdrawal review
- **AND** routine user count, agent count, and point-adjustment history are not
  homepage panels

#### Scenario: An agent opens the home

- **THEN** available commission is the most prominent result
- **AND** secondary information comes from the customer, performance-order,
  commission, and withdrawal modules
- **AND** can include commission-eligible order consumption, pending commission,
  customer totals, commission trend, recent commission detail, and an active
  withdrawal state
- **AND** customer management starts with currently attributed customer accounts,
  opens one customer's brand list, and only then enters a brand's evaluation,
  optimization, or publishing information
- **AND** performance orders, commission, and withdrawals stay in dedicated
  agent-level modules while customer and brand views use concise linked summaries
  rather than duplicate ledgers or workflows
- **AND** the home does not create a general customer-business event stream
- **AND** every summary leads into its owning module rather than duplicating its
  detailed workflow

### Requirement: Interpretable evaluation semantics

The product definition SHALL distinguish observed evidence, findings, inferred scores or judgments, recommendations, confidence, and limitations.

#### Scenario: A user receives an evaluation result

- **WHEN** GEOEval presents an evaluation result
- **THEN** the user can understand what evidence supports it
- **AND** can distinguish observation from inference and recommendation
- **AND** can identify at least one meaningful next decision or action when the product claims the result is actionable

### Requirement: Multi-brand profiles with one current context

A terminal-user account SHALL be able to manage multiple brand profiles and
SHALL use one selected current brand as the consistent context for downstream
product journeys.

#### Scenario: A customer manages several businesses or stores

- **WHEN** the customer creates, edits, or selects brand cards
- **THEN** each profile represents a separate business, brand, company, or store
- **AND** an incomplete additional brand may be saved and selected but cannot
  enter diagnosis until the required basic evaluation information is complete
- **AND** selecting one profile as current updates brand completion, AI diagnosis,
  evaluation, AI-search optimization, article work, publishing orders, and
  publication management to that same brand context
- **AND** the capability is treated as terminal-user brand management rather
  than an agent or reseller relationship

#### Scenario: A customer switches the current brand

- **GIVEN** the account has business records for more than one brand
- **WHEN** the customer selects a different current brand
- **THEN** evaluations, article drafts, confirmed articles, publishing orders,
  and publication results remain attached to the brand under which they were
  created
- **AND** the account's point balance remains available across the customer's
  brands

#### Scenario: A customer switches brands while evaluation is running

- **GIVEN** one brand has an official evaluation in progress
- **WHEN** the customer selects another brand as current
- **THEN** the running evaluation remains attached to and continues for its
  original brand
- **AND** switching visible context does not pause, cancel, move, or relabel that
  work
- **AND** the customer may start an eligible evaluation for the other brand
- **AND** different brands may evaluate independently at the same time
- **AND** each status and notification identifies the owning brand and opens that
  brand's corresponding evaluation view
- **BUT** a brand that is already evaluating cannot start another official run
  until the active run ends
- **AND** the one-completed-evaluation rule continues to apply separately to each
  unchanged evaluation-input revision

#### Scenario: A customer deletes a brand

- **WHEN** the selected brand has no business records or active work
- **THEN** the customer can delete it
- **BUT WHEN** the brand has associated business records or active work
- **THEN** the customer cannot directly delete it
- **AND** the product preserves the brand as the independent context for those
  records

#### Scenario: A customer archives a previously used brand

- **GIVEN** the brand has associated historical records but no active
  evaluation, article, publishing, or exception work
- **WHEN** the customer archives it
- **THEN** it is removed from ordinary current-brand selection
- **AND** it cannot start new work while archived
- **AND** its historical records remain viewable under that brand
- **AND** the customer can restore it
- **AND** if it was current, the customer must select another active brand or
  create one before continuing
- **AND** the initial product does not add archive folders, approval, retention
  configuration, or profile-version history

### Requirement: Progressive brand-profile completion

Brand information SHALL be collected in a required evaluation stage and a more
complete optimization stage so that a customer is not forced through the entire
article-generation form before receiving the free evaluation. Each brand SHALL
have one current set of profile information; profile-version history and rollback
are outside the initial product boundary.

#### Scenario: A terminal customer registers the first brand

- **WHEN** a terminal customer completes registration through the public channel
  or an approved agent acquisition channel
- **THEN** the registration flow offers the required basic brand-information form
- **AND** the customer may save it as the first current brand or skip it and
  enter the signed-in product without a brand
- **AND** a saved complete brand makes AI diagnosis immediately available
- **AND** a skipped registration leaves brand-dependent work unavailable until
  the customer later creates and completes a brand
- **AND** richer optimization information may remain incomplete until the
  customer wants to generate an article
- **AND** agent-channel attribution does not change the account's terminal-
  customer role or the first brand's ownership

#### Scenario: A customer prepares the current brand for evaluation

- **WHEN** the customer wants to start AI diagnosis or evaluation
- **THEN** the current brand satisfies the controlled industry/`Other`, verified
  Store Location and derived official-region, company/store name, flagship
  product/service, two-to-six peer-characteristic, contact, and mobile readiness
  rules owned by the [Brand Knowledge specification](../brand-knowledge/spec.md)
- **AND** the selected industry represents the product or service for which the
  brand most wants to be found and recommended
- **AND** the registration mobile number is prefilled but remains editable
- **AND** evaluation cannot begin until those fields are complete
- **AND** the customer can save the brand and continue to either AI diagnosis or
  AI-search optimization
- **AND** registration, My brands, diagnosis, and optimization all refer to that
  same current brand rather than maintaining module-specific copies

#### Scenario: A customer is not ready to generate an article

- **WHEN** the basic brand information is complete but optimization information
  is incomplete
- **THEN** the customer may skip the additional information and still use the
  evaluation journey
- **AND** the missing optimization information must be completed before article
  generation
- **AND** partially completed optimization information can be saved as a draft
  and continued later

#### Scenario: A customer completes article information

- **WHEN** the customer wants to generate an article for the current brand
- **THEN** the same current Brand is progressively completed under the
  [Brand Knowledge specification](../brand-knowledge/spec.md)
- **AND** article readiness uses characteristic details, an integer RMB range or
  negotiable price, suitable customer/context items and optional supplemental
  background and desired positioning
- **AND** no company-introduction, brand-introduction, business-district,
  industry-position or second core-strength collection is required
- **AND** materials remain an absent future input rather than a fabricated upload
  or parsing capability
- **AND** the optimization page updates the same Brand through an explicit save
  rather than creating another profile or auto-saving.

#### Scenario: A customer generates and edits an article

- **GIVEN** the current brand has complete article information
- **WHEN** the customer generates or regenerates a core promotional article
- **THEN** exact Snapshot, generation, retry, replacement, revision, confirmation,
  freshness and Future Order handoff behavior is owned by the
  [GEO Optimization specification](../geo-optimization/spec.md)
- **AND** one generation produces exactly one title and one complete body rather
  than choices, summaries, keywords, platform variants or candidate history
- **AND** title or body edits never change the Brand
- **AND** real Writer selection, quality and Provider policy remain a separate
  future workstream rather than being inferred from the deterministic local
  Adapter.

### Requirement: Controlled industry classification

The product SHALL use the approved, versioned GEOEval
[industry catalog](../../../docs/product/industry-catalog.md) to express one
coherent product-or-service recommendation context for the current brand.
Exact source ownership, dependent selection, `Other`, mainland-region,
readiness, and fingerprint behavior are defined once by the
[Brand Knowledge specification](../brand-knowledge/spec.md).

#### Scenario: A mixed business chooses its evaluation focus

- **WHEN** a brand manufactures, sells, or services more than one kind of
  product
- **THEN** the customer selects one primary and one dependent secondary industry
  for the consumer, procurement, or recommendation scenario that matters to the
  current evaluation
- **AND** the customer does not enumerate every licensed or statistically
  classified activity
- **AND** legal form, production method, and sales channel do not override the
  intended recommendation scenario

### Requirement: Controlled evaluation-question generation

Evaluation questions SHALL be generated from the current brand profile and
SHALL not be directly rewritten by the customer.

#### Scenario: A generated question is unsuitable

- **GIVEN** the customer can review one brand-directed question, one open
  industry-recommendation question, and two open characteristic-based queries
  before evaluation
- **WHEN** a question does not represent the intended business context
- **THEN** the customer returns to correct the current brand information
- **AND** regenerates the questions from the corrected profile
- **AND** cannot replace the question with arbitrary free-form text
- **AND** cannot refresh or replace the question set while the evaluation-
  relevant brand information remains unchanged

#### Scenario: An industry label is too broad to be a natural question

- **WHEN** the product generates the open industry-recommendation question
- **THEN** it uses the secondary category's maintained recommendation subject
  together with the current region, concrete product or service, and relevant
  brand-profile facts
- **AND** it does not copy a broad primary display name into the question as if
  that label were a natural customer query

#### Scenario: An evaluation fixes its actual question context

- **GIVEN** the customer has reviewed the currently generated four-question set
- **WHEN** the customer starts the official evaluation
- **THEN** the product fixes the exact questions, evaluation-relevant brand
  fields, and related context used by that evaluation
- **AND** that context includes the selected primary and secondary stable
  identifiers, their displayed labels, the catalog version, the `Other` phrase
  when present, and the recommendation subject actually used
- **AND** later brand edits or question generation cannot alter the active run or
  its report
- **AND** generating the question set for a revision does not by itself use that
  revision's official-evaluation opportunity

### Requirement: Simple first-evaluation story

The first evaluation SHALL give a non-expert small-business customer a concise,
visual account of the customer's current observed AI-platform performance while
retaining the evidence behind that account.

Real provider execution, attempt evidence, semantic route recovery, and the
public-versus-protected report projection are activated owner-local capabilities
defined by the [evaluation-evidence](../evaluation-evidence/spec.md) and
[evaluation-report](../evaluation-report/spec.md) specifications. This product
definition retains only their customer meaning and product constraints.

#### Scenario: A customer reviews the first evaluation

- **WHEN** the first evaluation is complete
- **THEN** it begins with a concise summary of one brand-directed question and
  the overall evaluation
- **AND** it presents a five-star AI recommendation index for open-question
  performance
- **AND** that index is one overall rating derived from the actual sampled
  results of the current evaluation rather than a permanent business rating
- **AND** the brand-directed question does not contribute to that index
- **AND** only mention rate and appearance position contribute to that index
- **AND** being mentioned has priority over appearing higher after a mention
- **AND** for valid open-question samples the raw index equals `5 × mention rate
× (0.70 + 0.30 × average normalized position score)`
- **AND** normalized position scores are `1.0` for first, `0.8` for second, `0.6`
  for third, `0.4` for fourth or fifth, and `0.2` for sixth or later
- **AND** the customer sees the index rounded to one decimal and a five-star
  graphic rounded to the nearest half star
- **AND** zero mentions produces `0.0` and five empty stars without an additional
  verbal grade
- **AND** it shows mention rate, appearance position, and counted positive and
  negative associated characteristics or keywords from three profile-derived
  open questions across the selected platforms
- **AND** positive and negative associated characteristics or keywords explain
  the observed result without changing the index
- **AND** platform sections show their concrete findings and evidence without
  adding a separate five-star index for each platform
- **AND** it makes the complete output of every valid question-platform sample
  available without adding another summary to each output
- **AND** the customer-facing report presents the actual questions and observed
  results without exposing **brand-directed**, **open question**, or other
  internal question-family terminology
- **AND** it does not show provider search sources, citation metadata, search-
  trigger detail, model identifiers, or other provider diagnostics in the main
  customer report
- **AND** after the sampled-answer evidence it ends with one concise
  optimization-direction section

#### Scenario: The evaluation forms its sampling set

- **GIVEN** the evaluation has four questions and the fixed platform set of
  DeepSeek, Doubao, Qwen, ERNIE Bot, and Tencent Hunyuan
- **WHEN** sampling is performed
- **THEN** the evaluation expects twenty valid question-platform samples
- **AND** the customer cannot add, remove, or replace a platform
- **AND** the report records the platform set actually used and the evaluation
  time
- **AND** later platform-configuration changes affect only later evaluations,
  never rewrite a historical report, and do not create a new brand-information
  revision or reset its completed-evaluation allowance
- **AND** each platform uses an internally selected explicit model representing
  its current mainstream public-facing experience
- **AND** the customer cannot choose the model
- **AND** the main report shows platform label and evaluation time while exact
  model identity remains internal or in a compact secondary explanation
- **AND** each question-platform position contributes at most one valid sample
- **AND** a failed attempt may be retried to obtain that sample
- **AND** retry attempts are not treated as additional samples or additional
  weight
- **AND** an official report can be produced only when at least seventeen valid
  samples are available

#### Scenario: A report contains missing valid samples

- **GIVEN** seventeen to nineteen valid samples are available
- **WHEN** the official report is presented
- **THEN** it shows the valid count out of twenty
- **AND** each missing question-platform position remains visible with a concise
  message that no valid result was obtained and it was not included in statistics
- **AND** retry counts and technical failure details are not shown to the customer
- **AND** failed positions are excluded from the recommendation-index denominator
  rather than treated as no mention
- **AND** only valid open-question samples contribute to the index
- **AND** no additional minimum is imposed by platform or question family beyond
  the seventeen-sample total

#### Scenario: A platform decides whether to search

- **GIVEN** the evaluation enables the platform's supported web-search capability
- **WHEN** the platform produces one valid sample
- **THEN** the platform may decide whether the question requires an actual search
- **AND** an answer remains valid when no search is triggered
- **AND** the internal sample record states whether search occurred
- **AND** all source or citation information returned by the provider is retained
  as internal evidence
- **AND** the customer sees the complete answer but not the source list, citation
  metadata, search-trigger detail, or provider diagnostics

#### Scenario: The product interprets a sampled answer

- **WHEN** an answer from the brand-directed or any open question needs analysis
- **THEN** a dedicated sample parser reads the complete original answer
- **AND** it interprets ordered lists, tables, headings, paragraph structure, and
  other semantic recommendation forms rather than relying on ordinal-word,
  character-position, or paragraph-splitting rules alone
- **AND** it returns one ordered record per concrete brand with the brand
  subject, whether it is the current brand, overall attitude, source-grounded
  content points, and one concise sample-card interpretation
- **AND** it identifies the distinct brands explicitly present in the answer,
  their displayed names, reasonable relative positions when the answer implies
  an order, and the meaningful answer content supporting those interpretations
- **AND** it distinguishes the current brand from other mentioned brands so
  deterministic report logic can later calculate customer mention, position,
  and competitor occurrence without asking the parser to perform cross-sample
  statistics
- **AND** the limited customer-provided brand snapshot is used to identify and
  contextualize the current brand, not as a complete factual baseline for
  grading the sampled answer as accurate, inaccurate, or contradictory
- **AND** the parser may preserve uncertainty or limitations expressed by the
  answer itself but does not create a separate first-release fact-checking or
  conflict-assessment result
- **AND** when the current brand is mentioned, it assigns a reasonable relative
  position from the complete recommendation structure, including implicit order
- **AND** a brand-directed answer has no recommendation position merely because
  the named brand appears; when that answer genuinely contains an ordered
  multi-brand comparison, the parser may retain a separate contextual order
  that never contributes to open-question statistics
- **AND** it can provide a concise, objective interpretation for the sample card
  without replacing, rewriting, or summarizing away the original answer
- **AND** a same-name occurrence within the specific open query is treated as the
  current customer
- **AND** an unfamiliar alias outside the known brand information is treated as
  not mentioned without adding an ambiguous-identity workflow
- **AND** the product preserves the complete original answer structure and format
  as returned, including lists, tables, headings, and paragraphs when available
- **AND** each sample card shows platform, question, mention result, relative
  position when mentioned, concise objective interpretation, and the original
  answer
- **AND** positive and negative characteristics are not repeated as separate
  fields on every sample card and instead feed one combined report section
- **AND** the initial customer interface adds non-destructive highlights for the
  customer mention or position and important positive or negative evidence in
  significant headings or longer text blocks without modifying the stored
  original
- **AND** semantic parsing may supply reliably mappable evidence anchors for
  deterministic presentation, but line, occurrence, and character anchors are
  not required for an otherwise valid interpretation; generated markup never
  replaces the retained original
- **AND** it preserves an unannotated complex format rather than applying a
  misleading highlight when reliable evidence mapping is unavailable
- **AND** only the approved mention and normalized-position fields affect the AI
  recommendation index

#### Scenario: The product derives cross-sample statistics

- **GIVEN** accepted semantic interpretations exist for enough sample positions
- **WHEN** the report calculates mention, position, theme, platform, or
  competitor statistics
- **THEN** deterministic application logic derives every count, rate, score,
  platform set, and rank from accepted structured records
- **AND** no parsing or synthesis Agent supplies a trusted final statistic
- **AND** each independent sample contributes at most once to the same derived
  theme or brand-occurrence count

#### Scenario: The report presents frequently recommended other brands

- **GIVEN** valid open-question interpretations identify brands other than the
  current customer
- **WHEN** the report presents the competitive recommendation context
- **THEN** it shows no more than five evidence-sized other brands, with the
  actual number determined by the accepted samples
- **AND** each entry may show occurrence count, involved platforms, and typical
  relative position derived by deterministic application logic
- **AND** brand-directed-question occurrences do not contribute to this
  competitive summary
- **AND** one name-resolution stage may use the observed names and their
  necessary mention context to map names that ordinary customers would
  reasonably understand as the same consumer brand into one reporting group
- **AND** that grouping may include aliases, translations, abbreviations,
  store formats, or an obvious subordinate brand line such as **Starbucks
  Reserve** under **Starbucks**, while a distinctly and independently
  positioned sub-brand remains a separate reporting group
- **AND** the model uses readable observed names rather than internal mention or
  group identifiers, and program logic restores the original mention records
- **AND** every observed name is assigned exactly once to one group or the
  ignored-name collection, with uncertain identities left separate and no
  external web-backed entity research
- **AND** the report does not assign competitors a five-star index, claim a
  complete market ranking, or expand the first evaluation into professional
  competitor intelligence

#### Scenario: The product composes overall performance

- **GIVEN** enough positions have a successful platform answer and valid sample
  parse
- **WHEN** the product forms the overall assessment
- **THEN** deterministic logic first applies the accepted name resolution and
  calculates all report metrics and leading competitor facts
- **AND** one report composer receives the current-brand content points,
  deterministic performance facts, and resolved leading-competitor statistics
- **AND** it does not receive complete raw answers, competitor descriptions,
  content hashes, Prompt versions, or internal execution metadata
- **AND** it does not calculate grouped occurrence counts, platform counts, or
  ranks
- **AND** it produces the report-opening overall assessment, a natural overview
  of how the sampled AI answers understand the brand, the combined broad
  positive-versus-negative characteristic section, and final GEO promotional-
  content directions
- **AND** it does not calculate or revise the recommendation index or overwrite
  any sample-level mention, position, interpretation, or original-answer evidence
- **AND** the characteristic section contains no more than five positive and five
  negative broad themes, with the actual number determined by the available
  evidence rather than padded to a fixed count
- **AND** characteristic evidence can come from the brand-directed and open
  questions
- **AND** one broad characteristic counts at most once per independent sample and
  can accumulate across samples and platforms
- **AND** the combined section uses a parallel comparison visual rather than a
  text-only list and keeps total count and involved platforms visible
- **AND** only open-question mention and position fields contribute to the AI
  recommendation index

#### Scenario: The product presents and reuses optimization direction

- **GIVEN** the overall evaluation synthesis succeeds
- **WHEN** the report presents optimization direction
- **THEN** the customer sees no more than two direction cards, with the actual
  number determined by the evaluation evidence
- **AND** each card contains a current problem, recommended direction, concise
  supporting evidence such as platforms or sample count, and a non-guaranteed
  intended improvement
- **AND** the report composer retains a more comprehensive internal guidance
  from the same brand context and evaluation evidence
- **AND** that guidance is objective and explicit about evidence, priority,
  desired positioning, strengths to reinforce, weaknesses to address, and
  important claim boundaries
- **AND** the complete guidance becomes direct context for the promotional-article
  agent without requiring the customer to edit or select evaluation directions
- **AND** neither representation invents facts, changes sample evidence, or
  implies a guaranteed AI-platform outcome

#### Scenario: A customer scans the evaluation report

- **WHEN** the product presents mention rate, recommendation index, platform
  differences, and positive-versus-negative characteristics
- **THEN** the opening view emphasizes a concise overall assessment, the overall
  five-star index with one decimal, total mention rate, typical mentioned
  position, and a secondary valid-coverage indicator
- **AND** typical mentioned position is the median raw relative position among
  valid open-question samples that mention the brand
- **AND** one middle rank is shown as an approximate position, two different
  middle ranks are shown as a range, and no position is shown when none of the
  valid open-question samples mentions the brand
- **AND** this median display does not replace the average normalized position
  score used by the AI recommendation index
- **AND** detailed five-platform comparison follows the opening view
- **AND** charts, bars, stars, and other simple visual forms lead the comparison
- **AND** concise text labels and explanations retain the exact business meaning
- **AND** section titles use clear, formal language rather than conversational or
  overly accommodating phrasing
- **AND** the report omits implementation notes, grouping rules, display limits,
  and other explanatory copy that the customer does not need to interpret the
  result
- **AND** mention rates use clear comparative bars while positions use separate
  rank labels or markers rather than sharing a percentage axis
- **AND** accepted positive or negative brand-impression themes use a concise
  comparative visual, while insufficient evidence produces one explicit short
  empty state rather than an apparently blank section
- **AND** valid coverage uses a quiet progress treatment rather than an alarming
  failure warning when the report meets its completion threshold
- **AND** meaningful motion and flexible interaction support hierarchy,
  comparison, progress, expansion, and feedback
- **AND** the product does not replace evidence with decorative graphics or imply
  unsupported precision, and motion does not compete with important data

#### Scenario: A customer explores the twenty sampled answers

- **GIVEN** one evaluation contains four questions across five platforms
- **WHEN** the customer reaches the sampled-answer evidence
- **THEN** the report groups the twenty positions into four question sections
- **AND** the five platform cards for the same question appear together for
  direct comparison
- **AND** each card initially shows platform, mention result, relative position,
  and concise objective interpretation
- **AND** the complete original answer is collapsed by default and can be
  expanded without losing its original format or evidence highlights

#### Scenario: A customer continues from evaluation to optimization

- **GIVEN** the customer is viewing a completed evaluation report
- **WHEN** the customer chooses **Start AI-search optimization**
- **THEN** the product does not request payment at that point
- **AND** if the current brand's article information is incomplete, the product
  identifies the missing items and saves the completed information to that same
  brand profile before continuing
- **AND** article generation receives the current brand information, prepared
  materials when available, and complete internal optimization guidance
- **AND** report scores, raw samples, and other detailed evaluation findings do
  not become promotional-article context
- **AND** generation, regeneration, editing, and confirmation remain free
- **AND** payment begins only when the customer submits a selected publishing
  service after confirming the article

#### Scenario: Brand information changes after a completed evaluation

- **GIVEN** the brand has completed evaluation guidance
- **WHEN** the customer changes fine-grained brand information or starts a newer
  evaluation that has not yet completed
- **THEN** article generation may continue using the latest successfully
  completed internal optimization guidance as broad directional context
- **AND** the current brand information and latest prepared materials remain
  authoritative for facts and cannot be overwritten by older guidance
- **AND** successfully completing a newer evaluation replaces the guidance used
  by later article generation

#### Scenario: The evaluation communicates urgency

- **WHEN** the report shows poor performance or optimization opportunities
- **THEN** the urgency is supported by the observed evidence
- **AND** the product does not exaggerate findings or deliberately depress an
  index to create fear

### Requirement: Free basic evaluation

The initial product SHALL provide the basic evaluation without charging the
customer and SHALL use it to reveal the customer's current observed problem and
available optimization direction. The same unchanged evaluation-input revision
SHALL allow at most one successfully completed official evaluation, without
creating a continuous or scheduled monitoring capability.

#### Scenario: A visitor enters the product

- **WHEN** a visitor views the initial homepage
- **THEN** the homepage can remain a simple product entry without a complete
  public case-showcase experience
- **AND** the visitor is not required to log in merely to view it
- **BUT WHEN** the visitor begins terminal-customer registration
- **THEN** the product creates the account and offers the first brand's required
  basic-information form in that registration journey
- **AND** the customer may complete it and enter diagnosis or skip it and enter
  My brands without a current brand

#### Scenario: A customer receives a completed evaluation

- **WHEN** the customer completes the basic evaluation journey
- **THEN** the customer can review the complete agreed evaluation without paying
  for it
- **AND** payment is associated with the subsequent GEO optimization and
  publishing service rather than the evaluation
- **AND** a valid completed evaluation with zero brand mentions uses the current
  evaluation-input revision's official-evaluation opportunity
- **AND** the same unchanged revision cannot start a second official evaluation
- **AND** a qualifying change to evaluation-relevant brand information creates a
  new revision whose allowance is counted separately
- **AND** the completed report remains available for later viewing
- **AND** customer-initiated evaluation remains distinct from continuous or
  scheduled monitoring

#### Scenario: An evaluation preserves its input context

- **WHEN** an evaluation begins for the current brand
- **THEN** it retains an immutable internal snapshot of the evaluation-relevant
  brand information and question context actually used
- **AND** the resulting report remains linked to that snapshot after the current
  brand profile changes
- **AND** the current brand profile remains one editable record rather than a
  customer-facing version history
- **AND** the initial product does not provide profile-version browsing or
  rollback merely to enforce the evaluation allowance
- **AND** the snapshot includes the exact generated question set actually used,
  not merely the current brand values

#### Scenario: Brand information changes before another evaluation

- **GIVEN** the brand has a completed current evaluation report
- **WHEN** the customer changes evaluation-relevant or other brand information
  without starting another official evaluation
- **THEN** the completed report remains the brand's current report
- **AND** the report continues to show and use only its original immutable input
  and question snapshot
- **AND** the profile edit alone does not move the report into evaluation history
- **AND** relevant customer pages state concisely that the information has
  changed and recommend another evaluation without invalidating the report

#### Scenario: A customer starts another official evaluation

- **GIVEN** the brand has a completed current evaluation report and a new eligible
  evaluation-input revision
- **AND** saving profile changes, entering diagnosis, and generating or reviewing
  the new question set have not changed the existing report's status
- **WHEN** the customer confirms the displayed question set and chooses to start
  evaluation, causing the product to create the run and begin platform sampling
- **THEN** the preceding current report moves into evaluation history
- **AND** the new evaluation becomes **Evaluating**
- **AND** it remains viewable with its original evaluation time, evidence, input,
  and question snapshot
- **AND** the new evaluation independently follows evaluating, completed, or
  please-retry behavior
- **AND** if the new evaluation becomes **Please retry**, the preceding report
  remains in history rather than returning to current

#### Scenario: Sampling cannot produce a valid report

- **GIVEN** the product has performed its own bounded retries
- **WHEN** fewer than seventeen of the twenty expected valid samples are available
- **THEN** the evaluation state becomes **Please retry**
- **AND** no official report or AI recommendation index is presented
- **AND** the attempt does not change the current revision's completed count
- **AND** the customer can retry without recreating the brand profile

### Requirement: Background evaluation and role-aware notifications

Evaluation SHALL continue independently of the open page, and the product SHALL
provide a role-aware in-product notification center with online prompts that do
not require refresh.

#### Scenario: A customer leaves during evaluation

- **WHEN** the customer leaves the evaluation page after starting an attempt
- **THEN** the evaluation continues
- **AND** returning to the brand shows not evaluated, evaluating, completed, or
  please retry as the current state
- **AND** evaluating prevents a duplicate start and returns the customer to the
  current progress
- **AND** completed adds one to the current revision's completed count
- **AND** please retry allows another attempt without changing that count

#### Scenario: A customer opens evaluation history

- **WHEN** the current brand has one or more prior completed reports
- **THEN** diagnosis keeps the current state or current report primary and exposes
  Evaluation history as a secondary entry
- **AND** prior reports are listed newest first rather than beside the current
  report as a comparison dashboard
- **AND** each history card shows evaluation time, AI recommendation index, total
  mention rate, valid coverage, a concise prior-information marker, and an action
  to view the complete report
- **AND** the complete historical report is read-only and preserves its original
  evidence, input snapshot, and four questions
- **AND** evaluating or please-retry remains the primary diagnosis state while
  preceding completed reports stay accessible in history
- **AND** the initial product provides no report comparison, trend, improvement
  attribution, export, deletion, custom naming, or profile-version browser

#### Scenario: A customer edits the brand while evaluation is running

- **GIVEN** an official evaluation is running from its frozen brand-input and
  question snapshot
- **WHEN** the customer edits and saves that brand's current profile
- **THEN** the profile remains editable and the new values are saved normally
- **AND** the running evaluation and its eventual report continue to use only the
  frozen snapshot
- **AND** a concise notice explains that later changes do not affect the running
  evaluation
- **AND** if the evaluation completes after relevant profile changes, its report
  becomes current while the product also recommends another evaluation from the
  changed information

#### Scenario: Evaluation state changes while the customer is elsewhere

- **WHEN** the evaluation completes or requires a retry while the customer is
  online elsewhere in the product
- **THEN** the notification center receives a customer-relevant notice
- **AND** the product can surface a browser-tab indicator and top-right prompt
  without requiring refresh
- **AND** the notification capability can target terminal customers, operations
  staff, administrators, or agents according to the event's intended recipient
- **AND** the product requirement does not prescribe the realtime transport or
  technical delivery protocol

#### Scenario: A recipient uses the notification center

- **WHEN** a role-relevant asynchronous or cross-page business result occurs
- **THEN** its notification shows a short title, one-line result, occurrence
  time, unread or read state, and an entry to the related business page
- **AND** opening the notification marks it read and navigates to that page
- **AND** the recipient can mark one or all notifications read
- **AND** consequential actions are completed on the related business page
  rather than directly from the notification
- **AND** the initial product does not require manual deletion, category
  subscriptions, or complex notification archiving
- **AND** a uniform retention period remains an operating rule to set later

#### Scenario: A customer receives important business results

- **WHEN** an evaluation completes or needs retry, off-page article generation
  completes or needs retry, a recharge or administrator point change completes,
  a submitted invoice request is completed, an order is delayed or needs manual
  consultation, or an order completes or closes
- **THEN** the affected customer receives a notification linked to the relevant
  business page
- **AND** each individual publication-result card does not create a separate
  notification
- **AND** new publication results may instead produce one order-level notice

#### Scenario: Supporting roles receive bounded notifications

- **WHEN** a new paid order becomes available in the shared publishing pool
- **THEN** eligible operations users can be notified and claim it from that pool
- **BUT WHEN** the responsible operator is already handling a normal publication
  exception
- **THEN** that exception does not create a redundant notification for the same
  operator
- **AND** administrators receive only events that need administrator authority,
  including point returns, escalated exceptions, overdue unhandled work, or
  access-sensitive changes, rather than every order update
- **AND** agents receive approved milestones for attributed customers, including
  registration, first evaluation, paid-order submission, order completion, and
  later-agreed performance or commission changes
- **AND** notification payloads do not embed complete sampled answers, article
  bodies, or customer point balances
- **AND** a currently attributed agent can still navigate from the related
  customer and brand to the complete read-only evaluation report under the
  separately defined report-visibility boundary

### Requirement: Role-appropriate errors and messages

User-visible failures and exceptional states SHALL be communicated according to
the recipient's role and SHALL remain distinct from controlled technical logs.

#### Scenario: A terminal customer encounters an error

- **WHEN** an error affects a customer action or business result
- **THEN** the customer sees what happened, what is affected, and what action is
  available next
- **AND** the message is simple, clear, direct, formal, and information-dense
- **AND** retry counts, provider errors, stack traces, internal routing, and other
  non-actionable technical details are not shown

#### Scenario: An interactive role needs an error outcome

- **WHEN** a terminal customer, agent, operations user, or administrator
  encounters a problem
- **THEN** the role-facing outcome is needs correction, please retry, or in
  handling according to the action available to that role
- **AND** normal business constraints state the reason and available action
  directly rather than appearing as generic system errors
- **AND** wording, visible business context, and actions are adapted to the role
  rather than copied unchanged across roles

#### Scenario: The same problem needs internal handling

- **WHEN** operations, an administrator, an agent, or technical support needs to
  respond to the problem
- **THEN** each role receives only the business context and actions relevant to
  that role
- **AND** detailed technical diagnostics are recorded in controlled logs rather
  than copied into role-facing messages
- **AND** page-local problems that the current role can fix do not create
  notification-center entries
- **AND** only asynchronous, cross-page, or other-role-attention outcomes create
  role-relevant notifications
- **AND** backend retries and technical log entries do not become notifications
- **AND** a support reference is shown to a role only when a person needs it to
  locate the problem for support
- **AND** a shared pre-implementation standard will define error classification,
  message contracts, logging context, sensitive-data handling, ownership, and
  verification without making those technical choices in product discovery

### Requirement: Bounded supporting-role authority

The product SHALL give operations users, system administrators, and agents only
the authority needed for their agreed supporting responsibilities, while the
terminal customer retains ownership of brand information, points, article
confirmation, and paid-order decisions.

#### Scenario: Operations fulfils a paid service

- **GIVEN** a customer has submitted a paid publishing order
- **WHEN** the order enters a shared publishing pool for multiple operations
  users and one operations user claims it
- **THEN** the claim covers the whole order and makes that operations user its
  only current responsible operator
- **AND** operations can use the relevant brand information and confirmed
  article, prepare or adjust publication variants, arrange eligible media,
  update progress and exceptions, and return publication results
- **AND** initial customer-service contact, including manual publication-
  exception negotiation, can be handled within the operations role
- **BUT** operations cannot manage roles, directly adjust customer points, or
  redefine global business rules

#### Scenario: Operations returns or transfers responsibility

- **WHEN** responsibility changes for an admitted order
- **THEN** the active rules use [Publication Delivery](../publication-delivery/spec.md)
- **AND** later activation of variants, results and exceptions must preserve
  those facts through responsibility changes, not reset the purchased work.

#### Scenario: An operations user scans fulfilment work

- **WHEN** an operations user opens the workbench
- **THEN** it separates **Unclaimed orders** from **My orders**
- **AND** lists show order number, brand, publishing mode, purchased and completed
  quantity, package scope or selected-media summary, submission and expected-
  completion times, and clear deadline or exception markers
- **AND** nearing-deadline, delayed, and exception work is more prominent than a
  simple newest-first ordering
- **AND** opening an order exposes the confirmed article, relevant brand context,
  required publication quantity and media targets, current progress, handling
  history, and clear result-upload actions
- **AND** the exact per-publication upload layout remains later interaction
  design

#### Scenario: Purchased quantity becomes trackable publication work

- **WHEN** a paid order enters fulfilment
- **THEN** each purchased publication quantity unit becomes one internal
  publication work item
- **AND** the administrator-maintained media library may provide optional
  operations reference candidates but does not require one to be selected
- **AND** a future publication result may keep a null media-resource reference
- **AND** one recorded accessible publication URL and the required result facts
  are sufficient completion evidence without automated URL-to-platform matching
- **AND** one work item can produce at most one valid publication result and add
  one to completed progress
- **AND** a successful result updates the customer-visible progress immediately

#### Scenario: Operations advances an individual publication item

- **GIVEN** one publication work item is **Pending**
- **WHEN** the operator starts actual publication work, with or without choosing
  an existing media-library reference
- **THEN** that item becomes **Publishing**
- **AND** publishing means its media submission, review, scheduling, or go-live
  work is underway
- **BUT WHEN** the operator already has a valid live result
- **THEN** result submission can confirm the item and move it directly from
  **Pending** to **Published**
- **AND** an item becomes **Exception** when its own fulfilment needs problem
  handling

#### Scenario: Order and item states remain related but distinct

- **WHEN** an operations user claims a pending-handling order
- **THEN** the order becomes **Publishing**
- **AND** its publication items do not all change state automatically
- **AND** one publishing order can contain pending, publishing, published, and
  exception items at the same time
- **AND** a recoverable item exception that operations can resolve independently
  does not by itself change the customer-visible order to exception handling
- **BUT WHEN** the order promise is blocked or customer or administrator
  intervention is required
- **THEN** the order becomes **Exception handling**
- **AND** each successful item immediately updates completed progress and creates
  its customer-visible result without exposing the full internal item history

#### Scenario: Operations records or corrects a publication result

- **WHEN** the responsible operator records one successful publication
- **THEN** the actual media links to a maintained media-library entry
- **AND** the result records published title, accessible URL, and publication time
- **AND** the actual publishing account or channel identifier is internal and
  recorded when applicable
- **AND** screenshot or delivery evidence and an internal note are optional
- **AND** operations does not manually select or record a source article variant
  because the actually published article is the delivered result
- **AND** the customer sees only media platform, title, URL, time, and status
- **AND** an ordinary entry error can be corrected with a reason while retaining
  internal correction history
- **BUT** changing a committed precise-media target or another order promise is
  not an ordinary correction and follows the approved exception process

#### Scenario: An administrator governs the platform

- **WHEN** platform governance or authorized business intervention is required
- **THEN** an administrator can manage accounts, roles and permissions, perform
  authorized point additions, deductions or returns, maintain packages, prices
  and global business rules, maintain media-library facts and availability,
  assign or intervene in exceptional orders, and inspect key operating records
- **BUT** the administrator is not the default role for routine article
  preparation, media publication, or order fulfilment

#### Scenario: An agent assists an attributed customer

Current read-only assistance and full-contact visibility are owned by
[Agency Customer Service](../agency-customer-service/spec.md). This includes
all customer brands and current/historical customer-visible reports, with
current-relationship checks and revoked old-link access after migration.
It does not confer customer write, purchase or report-export authority.

Historical performance/commission remains a separate commercial entitlement;
retaining it never restores customer-service or contact access after migration.
Delegated operation would require a separate customer authorization decision.

### Requirement: Account-level agent attribution

[Agency Entry](../agency-entry/spec.md) owns initial source capture and atomic
first registration; [Agency Customer Service](../agency-customer-service/spec.md)
owns administrator reassignment to another agent or the public pool. Both operate
at the terminal-customer account boundary without changing the account's role.
Later commercial ownership must be frozen at order submission; no order or
commission is recalculated from the customer's current relationship.

### Requirement: Customer-confirmed optimization and publishing service

The paid product SHALL connect evaluation context, GEO-oriented promotional
content preparation, customer approval, media-service selection, payment,
operations fulfilment, and visible publication results into one coherent
service journey.

#### Scenario: The first commercial release closes all role journeys

- **WHEN** the product is declared ready for external chargeable use
- **THEN** the terminal-customer journey supports registration, multi-brand
  context, bounded free evaluations, reports, article generation and
  confirmation, recharge, random or precise purchase, fulfilment visibility,
  results, and an eligible recharge-invoice request
- **AND** operations can claim and fulfil orders, return results, handle ordinary
  exceptions and customer contact, and fulfil assigned invoice work
- **AND** administrators can govern accounts and roles, media catalog, packages
  and prices, point adjustments, exceptional orders, agent attribution,
  commission, withdrawals, and authorized platform rules
- **AND** agents can follow approved attributed-customer milestones, open complete
  read-only current and historical evaluation reports for currently attributed
  customers, inspect performance and commission detail, and submit withdrawal
  requests without customer-owned authority
- **AND** internal development builds may stage these capabilities but do not
  redefine the external commercial-release boundary

#### Scenario: Commercial release is accepted through a real closed loop

- **WHEN** the team verifies the first commercial release
- **THEN** a real brand can complete a real five-platform evaluation and report,
  article generation and confirmation, real online payment and point credit, a
  paid random or precise order, operations fulfilment, and an accessible real
  publication result visible immediately to the customer
- **AND** applicable invoice, attribution, commission, and withdrawal support
  paths work according to their approved rules
- **AND** normal business paths do not depend on a developer editing the database
- **AND** important failure cases reach the approved state, message, and recovery
  path
- **AND** included pages meet a coherent frontend-quality boundary for visual
  design, hierarchy, readability, responsive layout, meaningful motion, and
  understandable interaction rather than merely exposing connected fields

#### Scenario: The first release enters a real paid pilot

- **GIVEN** the company considers its internal product validation sufficient
- **WHEN** the first release begins customer trial use
- **THEN** it proceeds directly through the real paid commercial journey
- **AND** it does not impose a preceding free, city-limited, industry-limited, or
  fixed-small-cohort pilot stage
- **AND** eligible small and medium customers can enter as long as the maintained
  industry, media, availability, and pricing data supports truthful service
- **AND** those maintained data inputs do not redefine the product as limited to
  one pilot segment

#### Scenario: Explicit capabilities remain outside the first release

- **WHEN** the team evaluates first-release scope
- **THEN** continuous or scheduled monitoring, automatic re-evaluation, causal
  improvement claims, complex public cases, enterprise organization and team
  management, customer self-service order
  cancellation or refund, attributed-agent customer operation, customer model or
  writer-style choice, automated media publication, tax-system integration,
  catalog multi-person approval, and profile or article rollback remain outside
  the boundary

#### Scenario: A customer moves from evaluation to publishing

- **WHEN** a customer continues from optimization to a purchase
- **THEN** article preparation/confirmation follows the
  [GEO Optimization specification](../geo-optimization/spec.md), and saved
  choices, explicit buying, spending and pending orders follow
  [Publishing Commerce](../publishing-commerce/spec.md)
- **AND** paid-order admission, operations fulfilment and result return follow
  [Publication Delivery](../publication-delivery/spec.md); a successful purchase
  alone does not mean that publication has been completed.

#### Scenario: A customer edits around publishing-service selection

- **WHEN** editing interacts with unpaid or paid publishing
- **THEN** the owner-local Commerce specification governs article revision
  reconfirmation and the immutable purchased snapshot, without freezing the
  separately mutable current article forever
- **AND** operations retains only the authority to adjust publication variants
  during fulfilment defined by
  [Publication Delivery](../publication-delivery/spec.md).

### Requirement: Variants and operational content adjustment

Paid fulfilment SHALL produce multiple differently angled and polished variants
from the customer-confirmed core article and SHALL allow content operations to
prepare those variants for publication.

#### Scenario: Operations prepares purchased publications

- **GIVEN** the customer has confirmed the core article and submitted a paid
  publishing order
- **WHEN** the order enters fulfilment
- **THEN** a polishing step produces multiple optimized variants from the core
  article
- **AND** operations can publish a suitable variant directly or adjust it
  further before publication
- **AND** before submission the customer is clearly informed that such
  adjustments may be made to improve publication success and effect while
  maintaining the core article's main subject matter

#### Scenario: The service communicates its outcome boundary

- **WHEN** the product offers or completes a GEO optimization and publishing
  service
- **THEN** it promises the agreed content-preparation and media-publication work
  together with visible fulfilment results
- **AND** it does not promise that an AI platform will mention the customer more
  often, improve the AI recommendation index, or rank the customer higher

### Requirement: Two peer publishing choices

The product SHALL use [Publishing Commerce](../publishing-commerce/spec.md) for
peer random/precise selection, prices, explicit purchase and immutable scope.
Random in-scope allocation, one unit per successful publication and explicit
negotiated precise replacement SHALL follow
[Publication Delivery](../publication-delivery/spec.md); neither returns nor
replacement can rewrite the original purchased quantity or terms.

### Requirement: Bounded points model

Current wallet, granted adjustments, spending order, original-order returns and customer history SHALL
follow [Publishing Commerce](../publishing-commerce/spec.md). The following
scenarios preserve the remaining activation and commission requirements.
Customer order states, safe cancellation, whole-renminbi creation, verified
credit and publishing continuation follow [Recharge](../recharge/spec.md).

#### Scenario: A customer needs points for an order

- **WHEN** the customer reviews or submits a publishing order
- **THEN** the product shows the required points and available point balance
- **AND** points can be obtained only through customer recharge or administrator
  allocation
- **AND** the product does not imply that sign-ins, tasks, levels, or other
  reward mechanisms can generate points

#### Scenario: Real customer recharge is activated

- **WHEN** the separately approved merchant and operational environment is ready
- **THEN** self-service payment follows the Recharge contract, with
  administrator-maintained shortcut amounts and a custom whole-renminbi amount
- **AND** actual support contact content is maintained before activation
- **AND** recharge discounts, bonus campaigns and membership tiers remain outside
  the initial product
- **AND** channel enablement requires merchant entitlement and current
  official-source validation; controlled tests alone do not satisfy that gate.

Original-consumption source restoration and integer allocation now follow
Publishing Commerce above. Granted consumption and returned points remain
ineligible for the future commission capability below.

#### Scenario: A customer reviews point history

- **WHEN** a recharge has actually credited the account
- **THEN** Commerce history shows its RECHARGE entry linked to the Recharge order
  while retaining the existing privacy boundary; unpaid orders remain in
  Recharge history rather than being fabricated as point changes.

#### Scenario: An administrator corrects a point balance

- **WHEN** an authorized administrator needs to correct a point balance
- **THEN** the administrator creates a new positive or negative point-adjustment
  record rather than editing or deleting an existing point change
- **AND** the customer sees the amount and a concise reason
- **AND** authorized internal roles retain the operator, full reason, and
  supporting business reference
- **AND** the initial product does not require a general point-history rollback
  feature

Current purchase attribution, commission switch/rate configuration and suspension behavior are owned by [Agency Order Terms](../agency-order-terms/spec.md). Estimates, final retained-funded-consumption commission, immutable entries and scoped earnings queries are owned by [Agency Commission](../agency-commission/spec.md). Closed orders participate regardless of publication count. The following withdrawal requirements remain future activation.

### Requirement: Manually reviewed agent withdrawals

The initial product SHALL let an agent request withdrawal of available commission
while keeping approval and actual payment under company control.

#### Scenario: An agent views commission balances

- **WHEN** the agent opens the commission center
- **THEN** the product separately shows pending commission, available commission,
  amount in withdrawal processing, cumulative settled commission, and cumulative
  effective commission
- **AND** only effective, unreserved commission contributes to the available
  amount

#### Scenario: An agent submits a withdrawal

- **GIVEN** the requested amount does not exceed available commission
- **AND** it meets the global minimum amount maintained by an administrator
- **AND** the agent has no other unfinished withdrawal request
- **WHEN** the agent selects a valid payout profile and submits the request
- **THEN** the requested amount is frozen from available commission
- **AND** the request enters **Pending review**
- **AND** the request stores a snapshot of the selected payout profile
- **AND** later profile changes do not alter that request
- **AND** the initial product charges no withdrawal fee and applies no separate
  daily, weekly, or monthly request-frequency limit
- **AND** finance confirms the initial minimum amount before launch

#### Scenario: An administrator processes a withdrawal

- **WHEN** an administrator approves a pending request for offline payment
- **THEN** the request enters **Paying**
- **AND** the company completes the transfer outside the product
- **AND** an authorized administrator records the actual paid amount, payment
  time, and bank transaction reference before the request becomes **Completed**
- **AND** the administrator can attach a transfer receipt and records the
  handling operator and any short operating note
- **AND** the amount moves from withdrawal processing to cumulative settled
  commission
- **AND** the agent receives a completion notification
- **BUT WHEN** the administrator rejects the request
- **THEN** the administrator must record a reason
- **AND** the request becomes **Rejected**
- **AND** the frozen amount returns to available commission
- **AND** the agent receives the result and reason
- **AND** the initial product does not require an automatic payout interface

#### Scenario: An approved offline transfer fails

- **GIVEN** a withdrawal request is in **Paying**
- **WHEN** the company cannot complete the bank transfer
- **THEN** an authorized administrator records the failure reason
- **AND** the request becomes **Payment failed**
- **AND** its frozen amount returns to available commission
- **AND** the agent receives a failure notification and can correct the payout
  profile
- **AND** the agent submits a new request rather than reopening the failed one

### Requirement: Minimal and protected payout profiles

Payout information SHALL support the company's actual domestic bank-transfer
route without collecting unrelated identity, invoice, or tax data.

#### Scenario: An agent saves individual or enterprise payout instructions

- **WHEN** an agent creates or edits a payout profile
- **THEN** the product records recipient type, exact bank-account name,
  bank-account number, bank name, and contact mobile number
- **AND** it requests opening branch full name, opening-bank province and city,
  or a twelve-digit CNAPS or joint-bank number only when the actual bank-payment
  route requires them
- **AND** it does not require a physical opening-bank street address
- **AND** it does not require a bank-card image
- **AND** the account number is masked after saving except in authorized handling
  views

#### Scenario: Sensitive payout data is collected

- **WHEN** the product asks an agent for a financial account
- **THEN** it explains the payout purpose, necessity, data categories, handling,
  and material impact
- **AND** obtains the consent required for sensitive financial-account data
- **AND** limits full-value access and retention to the approved business need
- **AND** the withdrawal flow does not request identity documents, taxpayer
  identifiers, enterprise-registration information, agent invoices, or
  withholding information
- **AND** those tax matters remain outside the current product boundary

### Requirement: Two bounded money-information routes

The initial product SHALL support customer recharge invoices and agent commission
withdrawals as two simple and separate routes.

#### Scenario: A customer requests an invoice for a recharge order

- **GIVEN** a terminal customer has successfully completed a renminbi recharge
  order
- **WHEN** the customer provides the required invoice information and submits an
  invoice request for that recharge record
- **THEN** the company can process and issue the invoice
- **AND** the invoice amount equals the renminbi amount actually paid for that
  recharge order
- **AND** credited point quantity, point origin, or later point use does not
  determine invoice eligibility or amount
- **AND** one recharge order can create at most one invoice request and one
  resulting invoice
- **AND** the initial product does not combine multiple recharge orders into one
  invoice or split one recharge order across multiple invoices
- **AND** the customer can choose an individual or enterprise purchaser title
- **AND** the initial product issues only an electronic ordinary invoice and does
  not support a special VAT invoice
- **AND** an individual title requires invoice name and receiving email
- **AND** an enterprise title requires enterprise name, unified social credit
  code or taxpayer identification number, and receiving email
- **AND** the recharge-order number and actual renminbi paid are supplied by the
  system as read-only context
- **AND** the form does not request an address, telephone, opening bank, bank
  account, or personal identity number
- **AND** any manual-correction contact uses the mobile number already held by the
  account rather than a second invoice-contact field
- **AND** the completed result is returned to the customer and can produce the
  already defined invoice-completion notification
- **AND** publishing-order submission and point consumption do not create a
  separate invoice route in the initial product

#### Scenario: An invoice request needs correction

- **GIVEN** the customer can freely edit the invoice information before
  submission
- **WHEN** the customer submits the invoice request
- **THEN** the submitted information is locked and the customer sees
  **Processing**
- **BUT WHEN** operations finds that the submitted information needs correction
- **THEN** operations records a short reason and the customer sees **Needs
  correction**
- **AND** the customer edits and resubmits the same request rather than creating
  another invoice request for the recharge order
- **AND** the initial product does not provide customer self-service cancellation
  or withdrawal of a submitted request

#### Scenario: Operations delivers an issued invoice

- **GIVEN** an invoice request is **Processing**
- **WHEN** operations creates the invoice outside the product and successfully
  sends it to the customer's receiving email
- **THEN** operations uploads the invoice PDF, records the invoice number and
  issue date, and confirms the request as **Issued**
- **AND** the customer can view or download the result from the related recharge
  order or invoice record
- **AND** the customer receives the approved in-product invoice-completion
  notification
- **AND** the product itself does not send the invoice email or integrate with an
  external tax-invoicing system
- **AND** after issue the customer cannot edit, cancel, or reissue the invoice
  through self-service, while exceptional correction is handled manually through
  customer service

#### Scenario: An individual or enterprise agent requests withdrawal

- **WHEN** an agent requests withdrawal of available commission
- **THEN** the agent supplies only the payout profile required for the offline
  transfer
- **AND** the same product boundary applies whether the agent is an individual
  or an enterprise
- **AND** the initial product does not ask the agent for invoice, taxpayer,
  withholding, or other tax information

### Requirement: Truthful media library

The product SHALL use the owner-local
[Media Supply specification](../media-supply/spec.md) for the maintained
platform catalog, platform-level point pricing, optional concrete-resource
examples, administrator audit, public revision, and downstream quote/candidate
contracts.

#### Scenario: A customer inspects publishing capability

- **WHEN** the customer views the media library
- **THEN** the customer can understand the maintained platform coverage and
  platform-level point prices available through the service
- **AND** any complete or masked resource examples are non-selectable supporting
  context rather than specific-account commitments
- **AND** cards do not expose procurement cost, supply-source/contact data,
  internal notes, or unsupported weight, inclusion, exposure, or effect claims
- **AND** the customer can enter the media library independently of an active
  publishing purchase
- **AND** the customer experience uses a clear professional resource
  presentation rather than exposing an administrator maintenance table

#### Scenario: An administrator maintains catalog records

- **WHEN** an authorized administrator changes platform, Listing, resource,
  source, availability, or price facts
- **THEN** Media Supply applies its role, transaction, audit, revision, and
  deletion rules without requiring a second approver
- **AND** operations users cannot maintain media-library, availability, package,
  or price records
- **AND** administrator maintenance is a role-specific experience distinct from
  the standalone customer presentation while both use the same maintained facts
- **AND** the change affects new or still-unpaid choices but does not rewrite a
  future paid-order snapshot or publication result.

#### Scenario: Media maintenance overlaps an unpaid customer selection

- **GIVEN** media maintenance is normally scheduled during a low-traffic period
- **WHEN** media availability or price changes while a customer has an
  unpaid selection or order review open
- **THEN** the product does not assume the maintenance window has eliminated
  concurrent customer activity
- **AND** it rechecks current availability and price immediately before point
  deduction
- **AND** it explains any change and requires the customer to confirm again
- **AND** successful paid submission stores the package scope or media facts,
  quantities, and prices as that order's committed snapshot
- **AND** later library edits do not rewrite the paid order
- **AND** a later fulfilment problem follows the approved replacement or
  point-return exception path

### Requirement: Visible publication results and automatic completion

Each successful publication SHALL produce a simple customer-visible result, and
orders SHALL complete from their agreed fulfilment conditions without requiring
manual customer acceptance. Customers SHALL see a bounded order lifecycle rather
than internal operations detail.

#### Scenario: A customer follows the order lifecycle

- **WHEN** a customer reviews a paid publishing order
- **THEN** its main state is one of pending handling, publishing, exception
  handling, completed, or closed
- **AND** exceeding the expected period adds a visible delayed marker without
  replacing the main state
- **AND** internal operating steps are not exposed as additional customer states
- **AND** the page header emphasizes state, completed quantity against purchased
  quantity, a clear progress visual, expected completion date, delay when
  applicable, order number, and submission time
- **AND** the next section preserves random-package scope or precise selected
  media and quantities together with the paid points
- **AND** published results follow, while the confirmed article, concise service
  explanation, and customer-service entry remain available below

#### Scenario: A customer views unpublished targets

- **WHEN** a random order still has unpublished quantity
- **THEN** the customer sees aggregate progress without provisional internal
  media allocation
- **BUT WHEN** a precise order has unpublished selected media
- **THEN** each purchased target remains visible from payment onward as **In
  handling**, **Published**, or **Exception handling**
- **AND** a successful target gains title, URL, and publication time and becomes
  its formal result card
- **AND** internal pending and media-review steps are not exposed

#### Scenario: A customer uses the paid-order page

- **WHEN** the customer opens a paid publishing order
- **THEN** the customer can view the confirmed article, purchased scope and
  points, progress, and results, open publication links, and contact customer
  service
- **BUT** the customer cannot self-cancel, request a self-service refund, change
  precise media, manually accept delivery, or close the order
- **AND** when consultation is required, the page states that customer service
  will contact the customer and retains the support entry
- **AND** replacement is negotiated by operations; point return follows the automatic final settlement rules owned by Commerce

Normal result recording/correction, immediate customer visibility, completion
from actual purchased quantity, delay/priority presentation, manual negotiation,
replacement and termination are owned by
[Publication Delivery](../publication-delivery/spec.md). Its customer-safe view
distinguishes completed publication from Closed partial service and promised
compensation from actual credit. The narrow once-only original-order return is
owned by [Publishing Commerce](../publishing-commerce/spec.md). Customers can submit issues through [Support](../support/spec.md), without automatically crediting points or accepting delivery. The current operator confirms the agreement; the system executes final settlement. These are activated owner-local rules, not future scenarios here.

### Requirement: Bounded publication-link availability

Publication links SHALL be accessible when returned and at order completion,
without implying permanent control over third-party media availability.

#### Scenario: A delivered link later becomes unavailable

- **GIVEN** the link was accessible when returned and when the order completed
- **WHEN** it becomes unavailable during the communicated short feedback period
- **THEN** operations investigates and handles the exception
- **AND** the service does not represent the third-party link as permanently
  guaranteed

### Requirement: Bounded first journey

The product definition SHALL specify one first-release journey from user trigger to valuable outcome, including inputs, important failure boundaries, and observable acceptance.

#### Scenario: The MVP is proposed

- **WHEN** the team proposes the first implementation slice
- **THEN** every included capability traces to the approved first journey
- **AND** deferred capabilities are explicit rather than silently implied

### Requirement: Stable shared language

The product definition SHALL maintain one agreed meaning for consequential product terms and SHALL distinguish nearby concepts that would otherwise produce incompatible behavior.
