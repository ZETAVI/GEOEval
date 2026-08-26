# Evidence: E0 Provider Entitlement Gate

- Change: [`define-application-architecture`](../proposal.md)
- Execution date: 2026-08-25
- Branch revision before execution: `4d2ae8631ff970a625f1a5637415bd1d17188305`
- Run: `e0-20260825-entitlement-01`
- Result: Passed for credential, endpoint, and basic model identity only
- Authorization: four named calls, fictional `R00` input, no web search,
  no service or quota change, CNY 5 sub-ceiling

## Evidence matrix

| Route | Controlled observation | Result | Raw response SHA-256 |
| --- | --- | --- | --- |
| Tencent TokenHub model list | HTTP 200; 114 account-visible IDs; both bare platform IDs `deepseek-v4-flash` and `hy3` present | Passed | `178b8b4b0210f91a3aed8f2448432255d4df2f7d417b874f446f2a075f7de6de` |
| Volcengine Ark | Requested and returned `doubao-seed-2-0-lite-260428`; exact `OK`; 41 input, 1 output, 42 total tokens; 1314 ms | Passed | `dcc87d00c28a51059c4e3183f2d533d18b9f92f8d81b5a75a7a22f493ecf2917` |
| Alibaba Model Studio | Requested and returned `qwen3.7-flash`; exact `OK`; 59 input, 1 output, 60 total tokens; response billing type `response_api`; 637 ms | Passed | `786a3e30ae1a467555c66fe3aceb5dbae54d4775676c277de706573478085635` |
| Baidu Qianfan | Requested and returned `ernie-4.5-turbo-128k`; exact `OK`; 11 prompt, 1 completion, 12 total tokens; 1360 ms | Passed | `f560ec23d5b108225040cd1d42ca62617bf069b05dc948690a82078621831983` |

All three generated outputs have the same expected-text SHA-256:
`565339bc4d33d72817b583024112eb7f5cdf3e5eef0252d6ec1b9c9a94e12bb3`.
The raw run directory and every descendant directory were verified mode `0700`;
every request, response, header, manifest, and summary file was verified mode
`0600`. Git ignores the complete raw-evidence root.

## What this gate proves

- The rotated credentials authenticate against the four approved endpoint
  families.
- The TokenHub account exposes the selected bare platform DeepSeek and Hy3 IDs.
- The selected Ark, Model Studio, and Qianfan model IDs are callable and the
  returned model identity can be retained without alias ambiguity.
- Provider-native token usage, request identity, duration, response hashes, and
  complete raw envelopes can be captured without printing secrets or answers.

## What remains unverified

- No call enabled web search, so search triggering, query evidence, citations,
  source completeness, search pricing, and search-region constraints are not
  verified.
- DeepSeek and Hy3 generation were not called; their model-list presence is not
  inference evidence.
- Streaming assembly, reasoning fields, answer-format fidelity, error mapping,
  retry, fallback, parser and synthesis quality, Langfuse export, full-run
  latency, and the twenty-sample cost remain not run.
- Native token usage was observed, but the final provider-console bill was not
  reconciled. This gate therefore does not claim an exact monetary cost or
  approve the complete CNY 100 E0 ceiling.
- API availability and exact returned identity do not prove equivalence with
  each provider's default free Web or App route.

## Next gate

Prepare a separately approved search-and-fidelity probe for R01-R03 across the
five evaluation routes. It must name the exact requests, search mode, maximum
calls and cost, stop conditions, and retained evidence before execution.
