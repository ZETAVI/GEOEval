# Controlled Candidate Validation Summary

## Selected configuration

- Analysis model: `deepseek-v4-flash-0731`
- Thinking: disabled
- Temperature: `0.6`
- Maximum output tokens: `8192`
- Shared concurrency: `5`
- Parser Prompt: `1.4.0`
- Name-resolution Prompt: `2.1.0`
- Composition Prompt: `1.6.0`
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

## Evidence integrity and boundary

Private Langfuse traces:

- name-resolution cross-dataset: `af6734f3914493f4ea7c79a8ba3eed82`;
- Prompt2.1 Taotaoju replay: `c5259581cfe678cc71ab02f6c59a48f7`;
- fresh full chain: `dc49db6de917f28e6fc5e0b5201b054d`.

All actual model inputs, outputs, settings and usage matched local evidence after
normal JSON serialization handling. Raw inputs/outputs, credentials and private
evidence files are not committed.

This evidence accepts the controlled candidate and the three-to-five-minute
budget. It does not verify formal Worker retry/resume, API/report persistence,
frontend rendering, deployment or production behavior.
