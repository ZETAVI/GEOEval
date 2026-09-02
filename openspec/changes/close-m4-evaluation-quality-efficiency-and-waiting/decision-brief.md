# Decision Brief: M4 评测收束

## State and authority

- Review state: `Propose → Approve`
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
| D2 | 新增客户可理解的“主打产品或服务”；特点默认展示两个并允许继续添加 | #40 owns ordered Brand facts; #26 selects or combines any additional characteristics without increasing the four-question count |
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
- Existing v1/v2 snapshots, Definitions, Runs, attempts and reports remain
  readable and immutable. A representation-only migration cannot create a new
  evaluation opportunity.
- The customer does not see internal question-family enums, IDs, Prompt, model,
  Provider, retry, queue, trace or protected source details.
- Notification remains a durable inbox with SSE as a recoverable refresh hint;
  M4 progress does not introduce a second notification or realtime authority.

## Not yet approved

These choices remain with the named child Issue and are not implied by D1–D9:

| Owner | Open decision before implementation or integration |
| --- | --- |
| #40 | Exact AMap endpoint/SDK, credential placement, server revalidation, quota, source identity, locality choice, failure fallback, maximum characteristic count, schema/migration and rollback |
| #26 | Versioned Prompt/model contract, representative examples, exact selection/composition behavior, route reuse and Query-only product-review evidence on Snapshot v3 |
| #32 | Exact minimal readability predicate and deterministic fallback for the proven `}}}`-class failure without weakening mention or rank evidence |
| #41 | Compact synthesis input, name-candidate preparation, customer-copy contract and reachable safety fallback without creating a brand master system |
| #42 | Selected task graph, model per purpose, concurrency/limiter, timeout, retry, cost and latency budgets, and the quantitative definition of “material improvement” |
| #43 | Exact stage labels, easing intervals, long-wait content, responsive interaction and accessibility details within the truthful progress contract |
| #44 | Diagnostic allowlist, environment gate, local/test retention and access; any production content capture remains a separate security/privacy approval |
| #39 Gate | Representative store, Provider-call authorization, evidence retention locator, and final integration revision |

No exact three-minute or five-minute customer SLA is confirmed. The transcript
contains both numbers as discussion, while #42 must establish a measured baseline,
budget and acceptance threshold before such a promise can become current truth.

## Approval request

The product owner is asked to approve D1–D9, the preserved meaning, the child
ownership of open decisions, and the integration dependency graph. Approval does
not authorize implementation outside a child Issue, any real Provider call,
production deployment, API purchase, customer-data migration or production
content telemetry.
