import { describe, expect, it } from "vitest";
import { buildM4ReadingText } from "../src/ai-execution/controlled-validation/m4-reading-text.js";

describe("M4 deterministic Markdown reading view", () => {
  it.each([
    ["**金牌虾饺皇：** 必点。", "金牌虾饺皇： 必点。"],
    ["__青禾__ 与 *山岚* / _晴川_", "青禾 与 山岚 / 晴川"],
    ["***青禾*** / **山岚与 *晴川***", "青禾 / 山岚与 晴川"],
    [
      "# **品牌比较**\r\n\r\n1. **青禾**\r\n   - *山岚*\r\n2. 晴川\r\n",
      "# 品牌比较\r\n\r\n1. 青禾\r\n   - 山岚\r\n2. 晴川\r\n",
    ],
    [
      "| **品牌** | 评价 |\n| :--- | ---: |\n| *青禾* | 安静但不便宜 |\n",
      "| 品牌 | 评价 |\n| :--- | ---: |\n| 青禾 | 安静但不便宜 |\n",
    ],
    [
      "> **建议**\n\n- [x] *已考虑*\n- [ ] 待考虑",
      "> 建议\n\n- [x] 已考虑\n- [ ] 待考虑",
    ],
    [
      "`**literal**`\n\n```text\n**literal**\n```",
      "`**literal**`\n\n```text\n**literal**\n```",
    ],
    [
      "foo_bar_baz，2 * 3，\\*字面\\*，未闭合 **文本",
      "foo_bar_baz，2 * 3，\\*字面\\*，未闭合 **文本",
    ],
    [
      "~~已撤回~~ [**青禾**](https://example.com/a_b)\n\n[1]: https://example.com",
      "~~已撤回~~ [青禾](https://example.com/a_b)\n\n[1]: https://example.com",
    ],
    [
      "🍵**青禾**\n\n不推荐山岚。\n最后可选晴川。",
      "🍵青禾\n\n不推荐山岚。\n最后可选晴川。",
    ],
  ])("preserves structure and source text: %s", (input, expected) => {
    expect(buildM4ReadingText(input)).toBe(expected);
    expect(buildM4ReadingText(expected)).toBe(expected);
  });
});
