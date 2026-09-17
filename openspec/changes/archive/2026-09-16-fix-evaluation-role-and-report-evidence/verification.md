# Verification: Query-role Parsing and Sample-level Provenance

- Branch: `codex/issue-112-evaluation-role-evidence`
- Base: `origin/main@a522e8d4e9d53cd52b8b8c01eff8b335192f5bf1`
- Current result: Verified for the approved #112 behavior; final PR and CI are
  the remaining delivery steps

| Claim                                                            | Evidence                                                                     | Result | Notes                                                                                                                                                                |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Query role is independent from sentiment                         | `sample-parser.contract.spec.ts`                                             | Passed | Covers candidate, reference, not-applicable and a candidate with negative attitude                                                                                   |
| Only candidates enter competitor statistics                      | `evaluation-report.policy.spec.ts`                                           | Passed | Reference and excluded occurrences remain parsed but are not eligible                                                                                                |
| Composition no longer asks the model for point pairs             | `evaluation-analysis.contract.spec.ts` and integration request inspection    | Passed | Model input/schema contain no `pointRef(s)`; program restores one same-polarity observation                                                                          |
| Model-facing sample order is deterministic                       | `evaluation-process.integration.spec.ts`                                     | Passed | Composition request order matches report question/platform order                                                                                                     |
| Directed parsing and historical stored contracts remain readable | focused contract tests and complete integration suite                        | Passed | No database migration or public API change                                                                                                                           |
| Full evaluation lifecycle remains intact                         | isolated `geoeval_issue112` database and Redis DB 12                         | Passed | 20/20 evaluation-process integration cases                                                                                                                           |
| Existing backend behavior remains intact                         | isolated complete backend suite                                              | Passed | 83 files passed, 3 skipped; 864 tests passed, 15 skipped                                                                                                             |
| Static and build integrity                                       | backend typecheck/build, Prettier, diff check, project framework             | Passed | No new dependency or generated API change                                                                                                                            |
| Query roles remain correct in captured provider output           | five retained 花悦庭 raw outputs                                             | Passed | DeepSeek returned the intended `CANDIDATE`, `REFERENCE` and `NOT_APPLICABLE` roles in every retained raw output                                                      |
| Provider enum drift does not discard otherwise valid parsing     | exact observed casing/mixed patterns, focused tests and three post-fix calls | Passed | Program normalizes only enum casing and overall `mixed` to `NEUTRAL`; unknown values remain rejected                                                                 |
| 花悦庭 parser succeeds end to end on selected real model         | three post-fix parser calls                                                  | Passed | `NOT_APPLICABLE → EXCLUDED`, candidate with drawback → `CONDITIONALLY_RECOMMENDED`, contextual comparison → `MENTIONED_ONLY`; 2.9–3.9 seconds each                   |
| 互动派 report composes twice without point-reference failure     | two authorized composition calls                                             | Passed | Both outputs passed sample-level reference validation in 5.4–6.8 seconds and contained no internal content-point references                                          |
| One fresh 4x5 real evaluation succeeds                           | isolated real-route run `510e4c9e-9363-407c-93f9-18bfd0951611`               | Passed | 42/42 calls without retry or fallback; 20/20 evidence and interpretations, one resolution, one synthesis and one accepted report; zero focus-as-competitor leakage   |
| Customer report excludes ineligible mentions and internal IDs    | fresh report plus persisted semantic role counts                             | Passed | Parser retained 12 contextual and 2 inapplicable mentions without counting them as eligible competitors; report prose contained no internal sample/point identifiers |
| Accepted design is represented by current owners                 | product glossary and current evaluation-report spec                          | Passed | Query use is distinct from sentiment; composition provenance is sample-level; exact anchors remain optional presentation aids                                        |

## Test environment incident and recovery

The first integration command inherited the shared local `geoeval` database.
The repository test reset deleted local demo accounts, reports and media data.
This was an execution mistake, not a product-code failure. Further tests moved
to isolated database `geoeval_issue112` and Redis DB 12.

Recoverable shared-demo state was rebuilt:

- administrator, operations, agent and `+8613145783887` customer accounts;
- 100,000 internal testing points for the customer;
- the reviewed workbook with SHA-256
  `2b071c88a94b962e1f8331df400e4ee9a7ca220510b849e7469ccc3f100dc8e9`;
- 40 active media platforms, 6 active suppliers and 208 active resources.

Historical 互动派/花悦庭 reports were not reconstructible from the cleared
database and were not fabricated. The retained authorized inputs were used for
the bounded replay described below.

## Real-provider findings

The authorized run sent the retained 花悦庭 and 互动派 inputs to public
DashScope using DeepSeek `deepseek-v4-flash-0731` with thinking disabled. It
performed six parser calls and two composition calls, with telemetry disabled
and no new acquisition.

The parser consistently understood the new query-role distinction, but the
provider did not honor enum spelling from the JSON Schema: attitudes were
returned as lowercase `positive` or `neutral`, and mixed overall evaluations as
`mixed`; some point polarities were also lowercase. This caused six contract
failures before any role projection. The implementation now performs only
bounded lexical normalization for those observed forms before applying the
same strict schema. It does not repair brands, query roles or unknown enums.

The two composition calls both passed the new sample-level provenance contract.
Their customer prose remained free of internal sample/point identifiers and
their themes referenced samples with matching positive or negative target
content.

The post-fix replay then passed all three role boundaries on the selected model.
The Prompt returned the requested uppercase enum values, while deterministic
normalization remains a bounded compatibility guard for the already observed
lowercase and `mixed` outputs.

## Fresh full-chain evidence

An isolated real-route evaluation used a fictional Guangzhou restaurant profile
so the run proves workflow behavior rather than real-world brand accuracy. It
completed `42/42` external calls without retry or fallback:

- acquisition `20/20`;
- first-layer parsing `20/20`;
- brand-name resolution `1/1`;
- report composition `1/1`;
- one accepted `COMPLETED/REPORT_ACCEPTED` run with `20/20` coverage.

The interpretations retained `47` recommended, `14` conditionally recommended,
`12` contextual-reference and `2` inapplicable other-brand records. The accepted
report counted only eligible competitors, contained no focus-brand leakage and
exposed no internal references.

The direct validation harness finished in `396.519s` because it deliberately
waited for each fixed five-call batch before starting the next. Qwen acquisition
was the long tail at `77.069–98.604s` per call. This harness is therefore not
formal Worker performance evidence. The changed boundaries themselves remained
bounded: interpretation averaged `6.248s` with `10.254s` maximum, name
resolution took `10.215s`, and composition took `8.661s`. The unchanged formal
Worker scheduling boundary retains its existing `206.227s` evidence.

## Remaining delivery step

PR #115 passed both Required Checks and merged as `main@1c60d36`. Issue #112
closed through its native `Closes #112` relationship. Follow-up Issues #113 and
#114 own stage-aware corrective retry and BullMQ lock renewal; neither changes
the accepted #112 behavior.
