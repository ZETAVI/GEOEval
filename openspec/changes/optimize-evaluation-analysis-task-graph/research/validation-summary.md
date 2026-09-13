# Candidate and Formal Runtime Validation Summary

## Selected configuration

- Analysis model: `deepseek-v4-flash-0731`
- Thinking: disabled
- Temperature: `0.6`
- Maximum output tokens: `8192`
- Shared concurrency: `5`
- Controlled Parser Prompt: `1.4.0`
- Formal Parser Prompts: common/open `3.0.0`, directed `3.1.0`
- Formal name-resolution Prompt: `2.2.0`
- Formal composition Prompt: `1.7.0`
- Automatic model fallback: disabled

## Name-resolution evidence

The name-level interface was first replayed twice over each retained dataset:

| Dataset | Source records → names | Strict coverage | Repeat result |
| --- | --- | --- | --- |
| 方所 | 95 → 50 | 2/2 | identical memberships |
| 陶陶居 | 100 → 57 | 2/2 | identical memberships |
| 泰咀刁 | 90 → 63 | 2/2 | core identities stable; three vague descriptions varied |

All six calls accounted for every input name exactly once. Core examples
included 钟书阁/1200bookshop/联合书店, all tested White Swan and Bingsheng forms,
and the previously split 大头虾 and 泰爱里 forms. Mean resolution latency was
`9.945s`; mean total tokens were `8,814`.

Prompt `2.1.0` added only general simplified/traditional and full-/half-width
name equivalence. A two-call retained Taotaoju replay then merged 東園/东园 twice
without regressing White Swan or Bingsheng. 点都德/毕德寮 grouped once and stayed
separate once; supplied context describes the latter as a premium line, so this
remains a product counting ambiguity rather than a structural failure.

## Fresh full-chain acceptance

The final controlled run used Guangzhou Taotaoju, four questions and the current
five public evaluation routes. It performed one acquisition and one parser call
per question/platform pair, then one name-resolution and one composition call.
No retry, fallback or mid-run Prompt change occurred.

| Stage | Result | Latency |
| --- | --- | --- |
| Acquisition | 20/20 | mean `39.217s`, range `15.671–65.907s` |
| First-layer parsing | 20/20 | mean `9.239s`, range `6.270–16.541s` |
| Name resolution | 1/1 | `9.298s` |
| Composition | 1/1 | `11.435s` |
| Whole chain | complete | `238.644s` |

All five directed samples contained one focus row. Open samples contained the
focus in `13/15`; every present result came from a source that named 陶陶居, and
the two absent results came from the two sources without that name. There was no
invented focus, duplicate focus row or focus-as-competitor leakage.

The resolver expanded `51` unique names back to `106` source competitor records
and returned `39` concrete groups. Leading distinct-sample counts were 广州酒家
`13`, 泮溪酒家 `9`, 炳胜 `9`, 银灯食府 `8` and 白天鹅 `6`.

The report returned a `126`-character performance assessment, a `154`-character
brand perception, three positive themes, three negative themes and two GEO
article directions. References and deterministic statistics passed; customer
prose contained no internal IDs.

Total provider-reported usage was `336,392` tokens: acquisition `257,718`,
parsing `60,501`, resolution `8,675`, composition `9,498`.

## Formal runtime acceptance

PR #90 then exercised the formal PostgreSQL/Outbox/BullMQ/Worker path with
Guangzhou Jinpeng Law Firm. A first run retained all 20 platform answers but
exhausted the five directed-question parses. Every rejected DeepSeek output had
correct brand meaning and content but used `name` because the directed Prompt
did not name the required `displayName` field. The local contract correctly
rejected these structurally incompatible results. Prompt `3.1.0` aligned that
one field, and a customer retry reused all accepted answers, parsed only the five
failed positions, then accepted one name resolution and one composition in
`32.358s`. No platform acquisition was repeated.

A second empty-database run fixed all current Prompts before starting and
completed the formal path without retry or fallback:

| Stage | Result | Provider latency |
| --- | --- | --- |
| Acquisition | 20/20 | mean `36.479s`, range `11.128–66.016s` |
| First-layer parsing | 20/20 | mean `7.631s`, range `4.828–10.601s` |
| Name resolution | 1/1 | `10.136s` |
| Composition | 1/1 | `15.208s` |
| Whole Worker path | complete | `206.227s` |

The run made exactly `42` real calls and reported `282,399` total tokens:
acquisition `221,975`, parsing `45,382`, resolution `8,838`, and composition
`6,204`. All 20 samples persisted under Parser contract `2.0.0`; the accepted
resolution accounted for all 56 observed names exactly once, produced 42
commercial-brand groups and ignored three public mediation/workstation names.
The completed report retained 20/20 coverage, deterministic 0/15 open mention,
no internal IDs, a 124-character performance assessment, a 158-character brand
perception, three positive themes, three negative themes and two GEO content
directions.

The local test receipt combined an official Haizhu district fact with the
business-area label Zhujiang New Town. This fixture inconsistency does not alter
the Worker, persistence, recovery, latency or report-expression evidence, but
the run is not evidence for real-world locality generation accuracy.

## Evidence integrity and boundary

Private Langfuse traces:

- name-resolution cross-dataset: `af6734f3914493f4ea7c79a8ba3eed82`;
- Prompt2.1 Taotaoju replay: `c5259581cfe678cc71ab02f6c59a48f7`;
- fresh full chain: `dc49db6de917f28e6fc5e0b5201b054d`.

All actual model inputs, outputs, settings and usage matched local evidence after
normal JSON serialization handling. Raw inputs/outputs, credentials and private
evidence files are not committed.

This evidence accepts the controlled candidate, the formal Worker/report path,
component reuse on retry and the three-to-five-minute budget. It does not verify
frontend rendering, deployment, production capacity or production behavior.

The clean PR revision also passes both Required Checks. Full project CI covers
database generation/migration, formatting, typecheck, backend/Web tests, complete
build and generated-artifact drift inspection. This verifies compatibility with
the current main baseline, not runtime activation of the controlled candidate.
