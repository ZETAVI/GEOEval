import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SafeSampleAnswer } from "../app/diagnosis/safe-sample-answer.js";

const paragraph = (text: string) => ({
  type: "paragraph",
  inlines: [{ type: "text", text }],
});
const rich = (blocks: unknown[], images: unknown[] = []) => ({
  version: 2,
  blocks,
  images,
});
const render = (answer: unknown, originalAnswer = "旧Markdown原文") =>
  renderToStaticMarkup(
    <SafeSampleAnswer
      originalAnswer={originalAnswer}
      richAnswer={answer}
      highlights={[]}
    />,
  );

describe("rich sample answer card", () => {
  it("does not reintroduce removed citations through table cell fallback text", () => {
    const markup = render(
      rich([
        {
          type: "table",
          rows: [[{ text: "source-reference-2", header: false, inlines: [] }]],
        },
      ]),
    );
    expect(markup).toContain("<td></td>");
    expect(markup).not.toContain("source-reference-2");
  });
  it("renders tables, headings, strong emphasis, nested lists, code and hard breaks", () => {
    const markup = render(
      rich([
        {
          type: "heading",
          level: 2,
          inlines: [{ type: "text", text: "北京烤鸭比较", marks: ["strong"] }],
        },
        {
          type: "table",
          rows: [
            [
              { text: "餐厅", header: true },
              { text: "预算", header: true },
            ],
            [
              { text: "花悦庭", header: false },
              { text: "228 元", header: false },
            ],
          ],
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              inlines: [{ type: "text", text: "提前预约" }],
              children: [
                {
                  ordered: true,
                  items: [{ inlines: [{ type: "text", text: "确认人数" }] }],
                },
              ],
            },
          ],
        },
        { type: "quote", inlines: [{ type: "text", text: "第一行\n第二行" }] },
        { type: "code", text: "<code>不是HTML</code>" },
      ]),
    );
    expect(markup).toContain("<h3><strong>北京烤鸭比较</strong></h3>");
    expect(markup).toContain('<th scope="col">餐厅</th>');
    expect(markup).toContain("<td>228 元</td>");
    expect(markup).toContain(
      "<ul><li>提前预约<ol><li>确认人数</li></ol></li></ul>",
    );
    expect(markup).toContain("<blockquote>第一行<br/>第二行</blockquote>");
    expect(markup).toContain("&lt;code&gt;不是HTML&lt;/code&gt;");
    expect(markup).not.toContain("旧Markdown原文");
  });
  it("does not display source mappings, citation badges, or source-only sections", () => {
    const answer = rich([
      {
        type: "paragraph",
        inlines: [
          { type: "text", text: "正文" },
          {
            type: "citation",
            label: "2",
            href: "https://source.example/",
            sourceId: "secret-source-id",
          },
        ],
      },
      {
        type: "heading",
        level: 3,
        inlines: [{ type: "text", text: "参考网页" }],
      },
      {
        type: "list",
        ordered: false,
        items: [
          {
            inlines: [
              {
                type: "link",
                text: "网页来源",
                href: "https://source.example/",
              },
            ],
          },
        ],
      },
      paragraph("仍需核实营业时间。"),
    ]);
    const before = JSON.stringify(answer);
    const markup = render(answer);
    expect(markup).toContain("正文");
    expect(markup).toContain("仍需核实营业时间");
    expect(markup).not.toMatch(
      /source.example|secret-source-id|参考网页|网页来源/,
    );
    expect(JSON.stringify(answer)).toBe(before);
  });
  it("keeps ordinary safe body links and removes named source badges", () => {
    const markup = render(
      rich([
        {
          type: "paragraph",
          inlines: [
            {
              type: "link",
              text: "预约入口",
              href: "https://restaurant.example/book",
            },
            {
              type: "link",
              text: "- 知乎",
              sourceId: "source",
              href: "https://source.example/",
            },
          ],
        },
      ]),
    );
    expect(markup).toContain(
      'href="https://restaurant.example/book" target="_blank" rel="noopener noreferrer"',
    );
    expect(markup).not.toMatch(/知乎|source.example/);
  });
  it("uses returned image URLs and alt placeholders without persistence or scripts", () => {
    const markup = render(
      rich(
        [
          { type: "image", id: "a", alt: "环境" },
          { type: "image", id: "b", alt: "摆设" },
        ],
        [
          {
            id: "a",
            alt: "门店环境",
            src: "https://images.example/environment.png",
          },
          { id: "b", alt: "桌面摆设", src: null },
        ],
      ),
    );
    expect(markup).toContain('src="https://images.example/environment.png"');
    expect(markup).toContain('loading="lazy" referrerPolicy="no-referrer"');
    expect(markup).toContain("桌面摆设（图片暂不可用）");
  });
  it("escapes text and attributes and blocks executable or credential-bearing URLs", () => {
    const markup = render(
      rich(
        [
          paragraph('<script>alert("x")</script>'),
          {
            type: "paragraph",
            inlines: [
              { type: "link", text: "链接", href: "javascript:alert(1)" },
            ],
          },
          { type: "image", id: "a", alt: '" onerror="alert(1)' },
        ],
        [
          {
            id: "a",
            alt: '" onerror="alert(1)',
            src: "https://user:password@images.example/",
          },
        ],
      ),
    );
    expect(markup).toContain("&lt;script&gt;");
    expect(markup).not.toMatch(/<script|javascript:|https:\/\/user:|<img/);
  });
  it("renders an inline image with its original position", () => {
    const markup = render(
      rich(
        [
          {
            type: "paragraph",
            inlines: [
              { type: "text", text: "图片之前" },
              { type: "image", id: "a", alt: "烤鸭" },
              { type: "text", text: "图片之后" },
            ],
          },
        ],
        [{ id: "a", alt: "烤鸭", src: "https://images.example/duck.png" }],
      ),
    );
    expect(markup.indexOf("图片之前")).toBeLessThan(markup.indexOf("<img"));
    expect(markup.indexOf("<img")).toBeLessThan(markup.indexOf("图片之后"));
  });
  it("retains old Markdown and exact highlights when rich metadata is unavailable", () => {
    const markup = renderToStaticMarkup(
      <SafeSampleAnswer
        originalAnswer="星河咖啡适合办公。"
        richAnswer={null}
        highlights={[
          { start: 0, end: 4, exactText: "星河咖啡", kind: "TARGET" },
        ]}
      />,
    );
    expect(markup).toContain('data-highlight-kind="TARGET"');
    expect(markup).toContain(">星河咖啡</mark>");
  });
  it("does not apply raw Markdown offsets to a rich DOM representation", () => {
    const markup = renderToStaticMarkup(
      <SafeSampleAnswer
        originalAnswer="星河咖啡适合办公。"
        richAnswer={rich([paragraph("星河咖啡适合办公。")])}
        highlights={[
          { start: 0, end: 4, exactText: "星河咖啡", kind: "TARGET" },
        ]}
      />,
    );
    expect(markup).not.toContain("<mark");
    expect(markup).toContain("星河咖啡适合办公");
  });
  it("falls back safely for malformed, oversized and recursive metadata", () => {
    const loop: Record<string, unknown> = { ordered: false, items: [] };
    loop.items = [{ inlines: [{ type: "text", text: "x" }], children: [loop] }];
    for (const metadata of [
      { version: 2, blocks: [{}], images: [] },
      rich(Array.from({ length: 257 }, () => paragraph("x"))),
      rich([{ type: "list", ...loop }]),
    ]) {
      expect(render(metadata, "原始完整回答")).toContain("原始完整回答");
    }
  });
});
