# Source Brief: Qwen Interpretation Reasoning Effort

- Decision: whether Qwen3.8 Flash per-sample extraction can use `low` instead of
  `medium` reasoning effort.
- Accessed: 2026-09-01

## Primary facts

- Alibaba Cloud Model Studio's OpenAI-compatible Chat documentation lists
  `xhigh`, `medium`, and `low` for qwen3.8-flash. It maps `low` to a 4096-token
  thinking budget and `medium` to 16384.
- Model Studio's Responses documentation states that reducing reasoning effort
  can reduce response time and reasoning Token use.
- The current GEOEval adapter already sends the route's reviewed
  `structuredReasoningEffort` through the supported request parameter; no SDK or
  protocol change is required.

## Sources

- [OpenAI-compatible Chat API](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)
- [OpenAI-compatible Responses API](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses)
- [Qwen3.8 Flash model page](https://help.aliyun.com/zh/model-studio/qwen3-8-flash)

## Recommendation

Use `low` for `EVALUATION_INTERPRETATION` only. Keep Query generation and overall
synthesis at `medium`. Do not disable reasoning until protected replay and one
bounded real comparison show that low still wastes material time.

## Refresh trigger

Refresh only if the requested model, Model Studio protocol, accepted effort
values, or interpretation task changes.
