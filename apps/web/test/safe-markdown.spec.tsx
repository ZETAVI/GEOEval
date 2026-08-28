import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SafeMarkdown } from "../app/diagnosis/safe-markdown.js";

describe("safe report Markdown", () => {
  it("renders common answer structures without enabling raw HTML", () => {
    const markup = renderToStaticMarkup(
      <SafeMarkdown
        markdown={
          "## 推荐名单\n\n| 品牌 | 位置 |\n| --- | --- |\n| 星河咖啡 | 1 |\n\n- 安静\n- 适合办公"
        }
        highlights={[]}
      />,
    );

    expect(markup).toContain("<h2>");
    expect(markup).toContain("<table>");
    expect(markup).toContain("<ul>");
  });

  it("does not execute raw HTML, unsafe links, or remote images", () => {
    const markup = renderToStaticMarkup(
      <SafeMarkdown
        markdown={
          '<script>alert("x")</script>\n\n[危险链接](javascript:alert(1))\n\n![远程图片](https://example.com/track.png)'
        }
        highlights={[]}
      />,
    );

    expect(markup).not.toContain("<script");
    expect(markup).not.toContain("javascript:");
    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("https://example.com");
    expect(markup).toContain("图片：远程图片");
  });

  it("applies only an exact single-text-node source range", () => {
    const markdown = "## 推荐\n\n星河咖啡适合办公。";
    const start = markdown.indexOf("星河咖啡");
    const markup = renderToStaticMarkup(
      <SafeMarkdown
        markdown={markdown}
        highlights={[
          {
            start,
            end: start + "星河咖啡".length,
            exactText: "星河咖啡",
            kind: "TARGET",
          },
        ]}
      />,
    );

    expect(markup).toContain('data-highlight-kind="TARGET"');
    expect(markup).toContain(">星河咖啡</mark>");
  });

  it("keeps the whole card unhighlighted when any range is stale or crosses nodes", () => {
    const staleMarkup = renderToStaticMarkup(
      <SafeMarkdown
        markdown="星河咖啡适合办公。"
        highlights={[
          { start: 0, end: 4, exactText: "旧的品牌", kind: "TARGET" },
        ]}
      />,
    );
    expect(staleMarkup).not.toContain("<mark");
    expect(staleMarkup).toContain("星河咖啡适合办公");

    const markdown = "**星河**咖啡适合办公。";
    const start = markdown.indexOf("星河");
    const crossNodeMarkup = renderToStaticMarkup(
      <SafeMarkdown
        markdown={markdown}
        highlights={[
          {
            start,
            end: start + "星河**咖啡".length,
            exactText: "星河**咖啡",
            kind: "TARGET",
          },
        ]}
      />,
    );
    expect(crossNodeMarkup).not.toContain("<mark");
    expect(crossNodeMarkup).toContain("星河");
    expect(crossNodeMarkup).toContain("咖啡适合办公");
  });
});
