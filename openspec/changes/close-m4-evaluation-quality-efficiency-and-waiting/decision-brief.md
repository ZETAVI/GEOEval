# Decision Brief: M4 评测收束

## State and authority

- Review state: D1-D9 approved on 2026-09-02; child decisions reconciled and
  experiment-first sequence confirmed by owner feedback on 2026-09-05
- Approval evidence:
  [Issue #39 product-owner record](https://github.com/ZETAVI/GEOEval/issues/39#issuecomment-5505659279)
- Confirmed-decision source: owning Issue
  [#39](https://github.com/ZETAVI/GEOEval/issues/39)
- Research inputs:
  [part 1](../../../docs/product/research/meeting-transcripts/GEO-Eval-M4-评测系统优化与功能迭代-part1.txt)
  and
  [part 2](../../../docs/product/research/meeting-transcripts/GEO-Eval-M4-评测系统优化与功能迭代-part2.txt)
- Source rule: transcripts are verbatim research records, not approved
  requirements. Their speaker-to-owner mapping is not confirmed.

## Confirmed decisions

| ID | Confirmed product decision | Owner and consequence |
| --- | --- | --- |
| D1 | 首期目标品牌具有具体门店；完整、有效的门店位置属于评测相关资料 | #40 / Brand Knowledge owns editable facts, validation, fingerprint and frozen projection |
| D2 | 新增客户可理解的“主打产品或服务”；特点默认展示两个并允许继续添加 | #40 owns peer Brand characteristics; #26 selects or combines any additional characteristics without increasing the four-question count |
| D3 | 保留行业推荐问题；三个开放问题都以门店商圈和主打产品或服务为主轴，两个特点问题叠加不同需求角度且不能机械模板化 | #26 owns one immutable ordered four-question Definition from the Brand projection |
| D4 | 高德位置能力只是候选外部边界，用于辅助选择有效门店并取得结构化地址、坐标和商圈候选 | #40 must use current official evidence and controlled validation before choosing the API, authorization, source identity or fallback; this decision does not approve a purchase or production key |
| D5 | Prompt 和结构输出说明是 Agent 质量的主要手段；程序只保护已证明可达的客户边界失败 | #32 and #41 own narrow model-to-domain and report-projection guards; frontend masking cannot be the fix |
| D6 | 明显简称、门店形态和从属品牌线优先由整体综合 Agent 语义归并；不建立严格品牌主数据系统 | #41 owns grouping proposals and customer narrative; program logic preserves references and deterministic counts |
| D7 | 综合工作可以按任务拆分、按复杂度选择模型并安全并行；确定性指标仍由程序计算 | #42 may change purpose-level task topology but cannot move metric, evidence or report authority into an Agent, queue or telemetry system |
| D8 | 等待进度不暴露内部重试，也不只显示“采样中”；每个平台显示已获取和已分析的具体数量 | #42 produces a customer-safe durable progress projection; #43 renders it and may ease only within the current truthful stage |
| D9 | 本地/测试诊断内容与生产客户数据外传是两个审批边界；先支持显式本地诊断，生产继续 metadata-only | #44 owns the telemetry projection and mask; PostgreSQL business records remain authoritative and telemetry failure remains non-blocking |

## Preserved product meaning

- Four questions remain one brand-directed, one industry-recommendation and two
  characteristic-oriented questions over the same fixed five platforms.
- The recommendation index, 70/30 weighting, deterministic metric ownership,
  17/20 report threshold and valid no-mention meaning do not change.
- #40 subsequently approved development-empty activation of single Snapshot v3;
  no v1/v2 runtime decoder or development-data migration remains required.
  Current accepted v3 Definitions, Runs and reports remain immutable; display-only
  changes cannot create an evaluation opportunity.
- The customer does not see internal question-family enums, IDs, Prompt, model,
  Provider, retry, queue, trace or protected source details.
- Notification remains a durable inbox with SSE as a recoverable refresh hint;
  M4 progress does not introduce a second notification or realtime authority.

## Child-owned decisions and current disposition

These choices remain with the named child Issue and are not implied by D1–D9.
Completed rows identify where the child decision is now accepted; open rows
remain change-local rather than becoming new parent requirements:

| Owner | Decision boundary and current disposition |
| --- | --- |
| #40 | Completed in PR #46: AMap boundary, verified store identity, locality, Snapshot v3 and explicitly authorized empty-development activation |
| #26 | Completed in PR #28: versioned Prompt/model contract, durable preparation and product-reviewed four-question projection over Snapshot v3 |
| #32 | Completed in PR #35: strict mention/open-position evidence, recoverable optional detail, one model-facing limit contract and the narrow `}}}`-class customer-copy fallback |
| #41 | Review / Decision: source-faithful synthesis context, brand decisions and actual report-path acceptance; detached probes cannot close the Issue |
| #42 | Open: Phase A compares Prompt/context/topology candidates; select only after evidence, then integrate execution with #41 and prove recovery, timing and truthful progress |
| #43 | Exact stage labels, easing intervals, long-wait content, responsive interaction and accessibility details within the truthful progress contract |
| #44 | Completed in PR #47: local/test diagnostic allowlist and failure isolation; production content capture remains a separate security/privacy approval |
| #39 Gate | Representative store, Provider-call authorization, evidence retention locator, and final integration revision |

No exact three-minute or five-minute customer SLA is confirmed. The transcript
contains both numbers as discussion, while #42 must establish a measured baseline,
budget and acceptance threshold before such a promise can become current truth.

## Approval result

The product owner approved D1–D9, the preserved meaning, the child ownership of
open decisions, and the initial integration dependency graph on 2026-09-02.

On 2026-09-04 the owner accepted the completed #40/#26/#44 state and requested a
simpler correction for the #41/#42 cycle. The accepted execution rule is to keep
both existing Issues: #42 first records the selected task boundary in a Partial
PR, #41 then completes the customer-synthesis contract on that boundary, and
#42 finally completes runtime orchestration, budgets and progress projection.
This phase exchange is recorded in the parent sequence rather than represented
as two opposing native blockers or a new Issue.

The 2026-09-05 owner feedback confirms experiment-first comparison and current-state
reconciliation. Two tasks are not selected. #41 closure follows actual report-path
integration, even when an isolated model probe passes. Preserve the 2026-09-04
no-extra-Issue decision; the earlier architecture-first sequence is superseded.

The approval does not authorize implementation outside a child Issue, any real
Provider call, production deployment, API purchase, customer-data migration or
production content telemetry.
