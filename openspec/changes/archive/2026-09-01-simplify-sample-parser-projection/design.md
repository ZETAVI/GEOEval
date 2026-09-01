# Design: Simplify Sample Parser Projection

## Boundary

The model-output schema is a fallible extraction proposal. The canonical sample
semantic contract is business truth. `sample-parser-model.contract.ts` is the
existing seam that must convert the former into the latter without moving
Provider behavior into the domain contract.

## Evidence classification

### Hard assertions

- A mentioned target must have an exact displayed form in the original answer.
- An open-query mention must retain a positive relative position.
- A non-mentioned target cannot carry target forms or position evidence.
- No stored evidence anchor may point outside the original answer.

Failure of a hard assertion still rejects the attempt and may use the existing
bounded retry route.

### Recoverable optional detail

- an observation whose optional quote does not resolve;
- an other-brand record whose quote or displayed form does not resolve;
- duplicate other-brand records;
- an optional other-brand or direct-question contextual position whose paired
  field/evidence is incomplete;
- more observations in one category than the canonical category accepts.

These records are dropped, deduplicated, truncated, or normalized to no
position. They cannot affect the target mention or open-query position metric.

## Projection order

1. Validate and register exact target forms and target evidence first.
2. When a target form literally occurs but the model omitted a usable target
   evidence span, register the exact form itself as the minimal anchor.
3. Register only exact optional evidence spans while respecting the canonical
   anchor budget.
4. Keep optional observations/brands only when at least one supporting anchor
   remains; deduplicate brands by normalized observed name.
5. Normalize incomplete optional position pairs to `null/null` and slice each
   projected observation category to its canonical bound.
6. Run the unchanged canonical schema and semantic validation.

No fuzzy matching or content rewriting is introduced.

## Prompt and inference budget

The common instruction will request only report-relevant facts, no more than two
evidence spans per fact, and a small set of meaningful other brands. The direct
profile will normally leave `otherBrands` empty unless the answer explicitly
compares actual competitors; platforms, tools, customers, cases, products, and
places are not competitor brands.

Qwen3.8 Flash interpretation changes from `medium` to `low`. Query generation
and overall synthesis remain `medium`. Official Model Studio documentation says
Qwen3.8 Flash supports `low`, maps it to a smaller thinking budget, and that a
lower reasoning effort reduces latency and reasoning Token use. See the source
brief in this Change.

## Alternatives

- **Loosen the canonical contract:** rejected because it could store invented
  mention or rank facts.
- **Prompt-only repair:** rejected because both Qwen and Hy3 already repeat the
  same optional structural deviations.
- **Disable reasoning entirely:** deferred; `low` is the smaller first step that
  preserves model planning for long, irregular answers.
- **Increase Worker concurrency:** rejected for this Bug because current
  concurrency is already five and more concurrency would not reduce per-sample
  retries or semantic rejection.

## Rollback

Restore the prior parser model/Prompt versions and medium route option. Existing
accepted semantics remain readable because the canonical contract and database
schema do not change.
