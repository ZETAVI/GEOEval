# Design: Query-role Parsing and Sample-level Report Provenance

## Outcome and Boundary

- Owner and observable outcome: GEO Intelligence produces competitor summaries
  only from brands that sampled answers present as choices, and composes reports
  without model-generated content-point pairs.
- In: parser/composer Prompt assets, compact model schemas, deterministic
  projection, synthesis input order, focused tests and controlled validation.
- Out: Provider sampling, name-identity decisions, target-brand score semantics,
  retry orchestration, Worker locks, frontend layout and external fact checks.
- Upstream prerequisites and downstream consumers: accepted provider answers
  remain upstream; deterministic report metrics, public reports and protected
  Writer guidance remain downstream.

## Current failure

The parser currently derives another brand's canonical role from sentiment:
positive becomes `RECOMMENDED`, neutral becomes `CONDITIONALLY_RECOMMENDED` and
negative becomes `EXCLUDED`. Sentiment answers how the text evaluates a brand;
it does not answer whether the text offers that brand for the query. This makes
an explicit "no nearby branch" statement eligible for competitor statistics.

Composition currently returns each theme with `{sampleRef, pointRef}` pairs.
The public document reduces those pairs to independent sample count and platform
set, and the Writer projection removes references entirely. Point-level output
therefore adds a failure mode without a current consumer.

## Chosen interface

### Open parser model output

Directed-question output stays unchanged. Each non-focus open-answer brand adds:

```json
{
  "queryRole": "CANDIDATE | REFERENCE | NOT_APPLICABLE"
}
```

- `CANDIDATE`: the answer offers the brand as a choice for the current query,
  including choices with ordinary conditions or drawbacks;
- `REFERENCE`: the brand is comparison, example, history, location or other
  context rather than a choice;
- `NOT_APPLICABLE`: the answer explicitly says the brand does not satisfy an
  important query constraint.

This is an interpretation of the supplied question and answer, not external
competitor research. Focus-brand output keeps `queryRole: null` in the open
model schema because #112 does not change target mention or index semantics.

Projection reuses the current canonical semantic contract:

| Query role                     | Canonical role              | Recommendation position |
| ------------------------------ | --------------------------- | ----------------------- |
| `CANDIDATE` + positive         | `RECOMMENDED`               | candidate order         |
| `CANDIDATE` + neutral/negative | `CONDITIONALLY_RECOMMENDED` | candidate order         |
| `REFERENCE`                    | `MENTIONED_ONLY`            | none                    |
| `NOT_APPLICABLE`               | `EXCLUDED`                  | none                    |

Candidate order follows first appearance while skipping contextual and
inapplicable other-brand records. The focus row retains its current position
meaning and contributes one position slot when present, preserving approved
target metrics.

### Report composition model output

Composition input keeps target content text and polarity grouped under a stable
sample reference but removes content-point references. Themes return:

```json
{
  "label": "执行响应",
  "summary": "多条回答提到响应和落地效率。",
  "sampleRefs": ["s1", "s5"]
}
```

Program logic validates that every reference names a supplied sample with a
same-polarity current-brand content point, deduplicates the references and
selects one deterministic representative observation for the current accepted
evidence shape. The model no longer selects that internal point. Directions
already use sample references and remain unchanged. The public report still
derives sample count and platform set; the Writer still receives prose without
internal references.

Samples are sorted by question ordinal and platform ordinal before short
references are assigned. Database result order never becomes a model contract.

## Lifecycle and Data

- States and allowed transitions: unchanged; the existing sample-interpretation,
  name-resolution, composition and report-acceptance stages remain authoritative.
- Authoritative records and invariants: original answers remain immutable;
  current accepted semantic and synthesis payloads remain the persistence owners;
  every model-facing reference is resolved locally before acceptance.
- Transaction, concurrency, and history boundary: unchanged. Existing reports
  and accepted interpretations are never rewritten.
- Migration and rollback: no migration. Rollback returns routing to the prior
  Prompt/model contract versions; new accepted payloads remain readable because
  canonical stored versions do not change.

## Contracts and Dependencies

- Public commands, queries and facts: unchanged.
- Dependency direction: Prompt interprets meaning; compact model schema owns
  shape; GEO Intelligence projects roles, ordering and evidence; report and
  Writer consumers receive the existing public/protected contracts.
- External ports and failure boundary: the selected DeepSeek analysis route is
  unchanged. Provider errors remain outside this change.
- Earned seam: existing parser and report-composition model contracts are the
  correct seams; no new service or Agent is introduced.

## Failure and Recovery

| Failure                                              | Classification               | Recovery owner                     | Evidence                              |
| ---------------------------------------------------- | ---------------------------- | ---------------------------------- | ------------------------------------- |
| unknown or missing query role                        | permanent model-output error | current parser attempt policy      | strict model schema and contract test |
| reference/inapplicable mention counted as competitor | semantic defect              | deterministic projection           | three query-role regression cases     |
| theme references absent sample                       | permanent composition error  | current composition attempt policy | local sample-reference validation     |
| old report or interpretation unreadable              | compatibility regression     | GEO Intelligence                   | legacy/current read tests             |

Corrective retry changes are deferred. The existing retry policy remains a
safety net but is not used as evidence that the new contracts are correct.

## Operational and Verification Boundary

- Security and sensitive data: no new data leaves the current attempt boundary;
  customer prose continues to reject internal references.
- Backpressure, capacity and cost: no additional calls or Agents; composition
  output and schema become smaller.
- Metrics, logs and traces: current attempt model/Prompt versions distinguish
  the new path.
- Completion evidence: focused parser/composition/metric tests, integration
  tests, typecheck/build, retained 花悦庭 and 互动派 replay, and one fresh
  authorized real evaluation.
- Residual risk accepted by: product owner may later decide whether contextual
  target mentions should affect the recommendation index; #112 intentionally
  does not change that behavior.

## Alternatives

- `eligibleForCompetition: boolean` was rejected because it hides why a mention
  is excluded and encourages an external market judgment.
- new content-point tokens were rejected because no current consumer requires
  point-level report provenance.
- moving query relevance to name resolution was rejected because identity and
  per-answer use are separate decisions.
- external branch verification was rejected because the evaluation reports what
  sampled AI answers expressed; it is not a POI fact-checking product.
