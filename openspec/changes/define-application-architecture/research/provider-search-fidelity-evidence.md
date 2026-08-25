# Evidence: E0 Provider Search and Fidelity Probe

- Change: [`define-application-architecture`](../proposal.md)
- Execution date: 2026-08-25
- Branch revision before execution: `159f5b4361cd5a766919603619d0a51cbd1fe274`
- Run: `e0-20260825-search-fidelity-01`
- Result: Partially verified; three routes passed R01-R03 and two routes stopped at R01
- Authorization: at most fifteen named calls, fictional R01-R03 inputs,
  automatic provider search, no service or quota changes; call count bounded
  without a separate monetary ceiling

## Executed matrix

The runner executed one route at a time. A blocked R01 stopped the remaining
fixtures for that route, so eleven of the authorized maximum fifteen calls were
made.

| Route and fixture | Controlled observation | Result | Raw response SHA-256 |
| --- | --- | --- | --- |
| TokenHub DeepSeek R01 | HTTP 200; exact model; search triggered; 6 sources; reasoning content retained; 22,042 ms | Passed | `256f32bb37552d79f6a6836cb47f274a2f65eb652fb40cb48b5fc78d9ac4e2d2` |
| TokenHub DeepSeek R02 | HTTP 200; exact model; complete answer; no source evidence; search state not exposed | Passed with `unknown` search state | `b3ec2ee6cd973bca21f0a91d54774afc00d8ca515d1e418850a239ca21cd44aa` |
| TokenHub DeepSeek R03 | HTTP 200; exact model; heading, paragraph, numbered list, table, Unicode, and order preserved | Passed | `f8a0c13ac715c4cc00dec75e31a003e3514a284b2b711225b04e93d39472e129` |
| TokenHub Hy3 R01 | HTTP 200; exact model; search triggered; 4 sources; reasoning-token usage but no reasoning text; 38,374 ms | Passed | `bb735aafdd13001374a36f04598dfc053cbf947e4c1184b508b48d97bede037e` |
| TokenHub Hy3 R02 | HTTP 200; exact model; complete answer; no source evidence; search state not exposed | Passed with `unknown` search state | `47a92389dd1cd7320cc34916bb43e274caccd4156573414a6ece80d34a2b343d` |
| TokenHub Hy3 R03 | HTTP 200; exact model; requested Markdown structures and order preserved | Passed | `bb328106bdd3fbe82d59917defbe950c6065e0196c3d2e118b5e1ef2da69738e` |
| Ark Doubao R01 | HTTP 200; exact model; search triggered; 3 sources; reasoning-token usage but no reasoning text; 34,549 ms | Passed | `e59faf34c4b9ec29beda48b8de8087791bcea6f90ab1042285a2209c1499bbfd` |
| Ark Doubao R02 | HTTP 200; exact model; complete answer; no source evidence; search state not exposed | Passed with `unknown` search state | `6e4ef2bb5bcb074891e74d50ecbdc64b89ac4cdabe08c1798a8115ace93319a5` |
| Ark Doubao R03 | HTTP 200; exact model; requested Markdown structures and order preserved | Passed | `d8a79b16bcfd7b5590f14fb376d875674056ba2b24a9e459ca5c9c5dd9e25b6a` |
| Model Studio Qwen R01 | No HTTP response before the 120,012 ms client timeout; no identity, answer, source, or usage evidence | Blocked: timeout | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Qianfan ERNIE R01 | HTTP 400 before generation; sanitized error inspection identified an invalid non-streaming `enable_status` combination | Blocked: invalid request | `3a0c82a9d7cb4d5b1a8c004f43b461309bd31324e4b8ccde90a83f95f430c223` |

Qwen R02-R03 and ERNIE R02-R03 were not run. The runner did not retry either
blocked R01. The ERNIE request definition was corrected after the run by
omitting `enable_status` from non-streaming probes; that correction is not
runtime evidence.

## Semantic and format checks

Without printing answer bodies, focused local checks confirmed that all nine
successful outputs retained the requested locality, category, recommendation,
fictional brand, and declared-feature signals. Each successful R03 retained a
level-two heading, numbered list, Markdown table, brand text, and required
ordering. These checks establish transport and coarse fidelity, not human-rated
recommendation quality or factual accuracy of every source.

The R02 and R03 calls supplied search tools but returned neither sources nor an
explicit zero-search counter. They are therefore `unknown`, not
`not_triggered`. The three-state search contract remains necessary.

DeepSeek returned identifiable reasoning content. Hy3 and Doubao returned
reasoning-token counts but no reasoning text or summary; those counts must not
be presented as chain-of-thought evidence.

## Evidence security and limitations

The raw run remains below ignored `.provider-evidence/`. All run directories
are mode `0700` and all request, response, header, manifest, and summary files
are mode `0600`. Only sanitized observations and hashes enter Git.

This probe does not prove consumer Web/App equivalence, streaming assembly,
Qwen or ERNIE search support in the selected account route, production cost,
error retries, fallback, parser or synthesis quality, Langfuse export, a full
twenty-position evaluation, or customer-data processing approval.

## Next gate

Diagnose Qwen without repeating a business sample, then separately authorize a
minimal Qwen search retry and corrected ERNIE R01. R02-R03 may proceed only
after each repaired R01 passes. System-instruction behavior follows its own
documented and controlled evidence gate.
