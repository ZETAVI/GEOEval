# Decision Brief: M4 评测收束

## State and authority

- Review state: Approved on 2026-09-02; execution sequence simplified on
  2026-09-04; #42 controlled candidate accepted on 2026-09-11 and runtime
  integration approved on 2026-09-13
- Approval evidence:
  [Issue #39 product-owner record](https://github.com/ZETAVI/GEOEval/issues/39#issuecomment-5505659279)
- Confirmed-decision source: owning Issue
  [#39](https://github.com/ZETAVI/GEOEval/issues/39)
- Research inputs:
  [part 1](../../../../docs/product/research/meeting-transcripts/GEO-Eval-M4-评测系统优化与功能迭代-part1.txt)
  and
  [part 2](../../../../docs/product/research/meeting-transcripts/GEO-Eval-M4-评测系统优化与功能迭代-part2.txt)
- Source rule: transcripts are verbatim research records, not approved
  requirements. Their speaker-to-owner mapping is not confirmed.

## Confirmed decisions

| ID  | Confirmed product decision                                                                                     | Owner and consequence                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | 首期目标品牌具有具体门店；完整、有效的门店位置属于评测相关资料                                                 | #40 / Brand Knowledge owns editable facts, validation, fingerprint and frozen projection                                                                                                          |
| D2  | 新增客户可理解的“主打产品或服务”；特点默认展示两个并允许继续添加                                               | #40 owns ordered Brand facts; #26 selects or combines any additional characteristics without increasing the four-question count                                                                   |
| D3  | 保留行业推荐问题；三个开放问题都以门店商圈和主打产品或服务为主轴，两个特点问题叠加不同需求角度且不能机械模板化 | #26 owns one immutable ordered four-question Definition from the Brand projection                                                                                                                 |
| D4  | 高德位置能力只是候选外部边界，用于辅助选择有效门店并取得结构化地址、坐标和商圈候选                             | #40 must use current official evidence and controlled validation before choosing the API, authorization, source identity or fallback; this decision does not approve a purchase or production key |
| D5  | Prompt 和结构输出说明是 Agent 质量的主要手段；程序只保护已证明可达的客户边界失败                               | #32 and #41 own narrow model-to-domain and report-projection guards; frontend masking cannot be the fix                                                                                           |
| D6  | 明显简称、门店形态和从属品牌线优先由整体综合 Agent 语义归并；不建立严格品牌主数据系统                          | #41 owns grouping proposals and customer narrative; program logic preserves references and deterministic counts                                                                                   |
| D7  | 综合工作可以按任务拆分、按复杂度选择模型并安全并行；确定性指标仍由程序计算                                     | #42 may change purpose-level task topology but cannot move metric, evidence or report authority into an Agent, queue or telemetry system                                                          |
| D8  | 等待进度不暴露内部重试，也不只显示“采样中”；每个平台显示已获取和已分析的具体数量                               | #42 produces a customer-safe durable progress projection; #43 renders it and may ease only within the current truthful stage                                                                      |
| D9  | 本地/测试诊断内容与生产客户数据外传是两个审批边界；先支持显式本地诊断，生产继续 metadata-only                  | #44 owns the telemetry projection and mask; PostgreSQL business records remain authoritative and telemetry failure remains non-blocking                                                           |

## Preserved product meaning

- Four questions remain one brand-directed, one industry-recommendation and two
  characteristic-oriented questions over the same fixed five platforms.
- The recommendation index, 70/30 weighting, deterministic metric ownership,
  17/20 report threshold and valid no-mention meaning do not change.
- Existing v1/v2 snapshots, Definitions, Runs, attempts and reports remain
  readable and immutable. A representation-only migration cannot create a new
  evaluation opportunity.
- The customer does not see internal question-family enums, IDs, Prompt, model,
  Provider, retry, queue, trace or protected source details.
- Notification remains a durable inbox with SSE as a recoverable refresh hint;
  M4 progress does not introduce a second notification or realtime authority.

## Child-owned decisions and current disposition

These choices remain with the named child Issue and are not implied by D1–D9.
Completed rows identify where the child decision is now accepted; open rows
remain change-local rather than becoming new parent requirements:

| Owner    | Decision boundary and current disposition                                                                                                                                                                      |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #40      | Completed in PR #46: AMap boundary, verified store identity, locality, Snapshot v3, compatibility, migration and rollback                                                                                      |
| #26      | Completed in PR #28: versioned Prompt/model contract, durable preparation and product-reviewed four-question projection over Snapshot v3                                                                       |
| #32      | Completed in PR #35. Its exact-anchor runtime is historical input; #42 replaces it with immutable original answers, source-grounded content points and non-blocking highlight fallback.                       |
| #41      | Accepted on PR #90's formal report path: customer copy, deterministic-statistic fidelity, name coverage and GEO content directions pass; PR #48 remains rejected historical work.                             |
| #42      | Completed in PR #90: formal DeepSeek no-thinking Parser → name resolution → deterministic statistics → composition, recovery, measured 206.227s path and customer-safe progress contract.                     |
| #43      | Completed in PR #91: exact customer-language stages, per-platform durable counts, bounded easing, GEO waiting content, responsive interaction and accessibility within the truthful progress contract.          |
| #44      | Completed in PR #47: local/test diagnostic allowlist and failure isolation; production content capture remains a separate security/privacy approval                                                            |
| #39 Gate | Passed for `main@1269b69`: authorized real 4×5 evidence remained valid for the unchanged backend path; the Web/API/PostgreSQL/Redis/Worker/notification journey passed on `befd0c0`, followed only by a test-only CI repair. |

No exact three-minute or five-minute customer SLA is confirmed. The transcript
contains both numbers as discussion, while #42 must establish a measured baseline,
budget and acceptance threshold before such a promise can become current truth.

## Approval result

The product owner approved D1–D9, the preserved meaning, the child ownership of
open decisions, and the initial integration dependency graph on 2026-09-02.

On 2026-09-13 the owner approved replacing the old formal Parser and one-shot
synthesis with the PR #62 candidate inside the existing runtime owners. #41 is
the semantic acceptance gate over that integrated report path rather than a
separate implementation predecessor. #42 produces the stable server progress
contract and #43 consumes it afterward. This keeps one implementation owner and
does not create opposing blockers or another performance Issue.

The original parent approval did not itself authorize implementation outside a
child Issue, real Provider calls, production deployment, API purchase,
customer-data migration or production content telemetry. Later explicit
authorization covered only the controlled Provider validations recorded by
#42. Production deployment, capacity, customer migration and production content
telemetry remain outside this completed parent outcome.
