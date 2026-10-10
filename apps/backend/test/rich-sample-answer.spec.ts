import { describe, expect, it } from "vitest";
import { projectRichSampleAnswer } from "../src/geo-intelligence/domain/rich-sample-answer.js";

const paragraph = (text: string) => ({
  type: "paragraph",
  inlines: [{ type: "text", text }],
});
describe("rich browser answer public projection", () => {
  it("rejects empty or source-only display projections so a nonempty raw answer can be used", () => {
    for (const blocks of [
      [],
      [{ type: "paragraph", inlines: [{ type: "citation", label: "1" }] }],
      [
        { type: "heading", level: 3, text: "参考网页" },
        {
          type: "list",
          ordered: false,
          items: [
            {
              inlines: [
                { type: "link", text: "信源", href: "https://source.example/" },
              ],
            },
          ],
        },
      ],
      [{ type: "list", ordered: false, items: [] }],
      [{ type: "table", rows: [[{ text: "", header: false }]] }],
      [{ type: "paragraph", text: " \n " }],
    ])
      expect(
        projectRichSampleAnswer({ version: 2, blocks, sources: [] }, []),
      ).toBeNull();
  });
  it("keeps image-only, table-only and nested-list-only answers as meaningful rich content", () => {
    for (const blocks of [
      [{ type: "image", id: "image-1", alt: "门店环境" }],
      [{ type: "table", rows: [[{ text: "花悦庭", header: false }]] }],
      [
        {
          type: "list",
          ordered: false,
          items: [
            {
              inlines: [],
              children: [
                {
                  ordered: true,
                  items: [
                    {
                      inlines: [
                        { type: "image", id: "image-1", alt: "门店环境" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    ])
      expect(
        projectRichSampleAnswer({ version: 2, blocks }, []),
      ).not.toBeNull();
  });
  it("does not restore a citation-only table cell from its raw text fallback", () => {
    const output = projectRichSampleAnswer(
      {
        version: 2,
        blocks: [
          {
            type: "table",
            rows: [
              [
                {
                  text: "2",
                  header: false,
                  inlines: [
                    { type: "citation", label: "2", sourceId: "source-2" },
                  ],
                },
                { text: "有效正文", header: false },
              ],
            ],
          },
        ],
      },
      [],
    );
    expect(output?.blocks[0]?.rows?.[0]?.[0]).toEqual({
      text: "",
      header: false,
      inlines: [],
    });
  });
  it("keeps real tables, formatting, nested lists and image metadata without raw mutation", () => {
    const content = {
      version: 2,
      blocks: [
        {
          type: "heading",
          level: 2,
          inlines: [{ type: "text", text: "北京烤鸭比较", marks: ["strong"] }],
        },
        {
          type: "table",
          rows: [
            [
              { text: "门店", header: true },
              { text: "预算", header: true },
            ],
            [
              {
                text: "花悦庭",
                header: false,
                inlines: [{ type: "text", text: "花悦庭", marks: ["strong"] }],
              },
              { text: "228 元", header: false },
            ],
          ],
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              inlines: [{ type: "text", text: "预约" }],
              children: [
                {
                  ordered: true,
                  items: [{ inlines: [{ type: "text", text: "核实人数" }] }],
                },
              ],
            },
          ],
        },
        { type: "image", id: "image-1", alt: "烤鸭" },
      ],
      sources: [{ href: "https://internal.example/", title: "信源" }],
      sourceCapture: { status: "CAPTURED" },
    };
    const images = [
      {
        id: "image-1",
        alt: "烤鸭",
        src: "https://images.example/duck.png",
        width: 640,
        height: 480,
        role: "content",
        availability: "remote_url",
        diagnostics: "secret",
      },
    ];
    const before = JSON.stringify({ content, images });
    const output = projectRichSampleAnswer(content, images)!;
    expect(output.blocks.map((block) => block.type)).toEqual([
      "heading",
      "table",
      "list",
      "image",
    ]);
    expect(output.images[0]).toMatchObject({
      src: "https://images.example/duck.png",
      width: 640,
      height: 480,
    });
    expect(JSON.stringify(output)).not.toMatch(
      /sources|sourceCapture|diagnostics|internal.example/,
    );
    expect(JSON.stringify({ content, images })).toBe(before);
  });
  it("hides citation mapping and source sections only in the display projection", () => {
    const content = {
      version: 2,
      blocks: [
        {
          type: "paragraph",
          inlines: [
            { type: "text", text: "正文" },
            {
              type: "citation",
              label: "2",
              sourceId: "ref2",
              href: "https://source.example/",
            },
          ],
        },
        {
          type: "heading",
          level: 3,
          inlines: [{ type: "text", text: "四、实际参考网页" }],
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              inlines: [
                { type: "link", text: "探店", href: "https://source.example/" },
              ],
            },
          ],
        },
        paragraph("仍需核实当天营业时间。"),
      ],
    };
    const output = projectRichSampleAnswer(content, []);
    expect(output?.blocks).toEqual([
      paragraph("正文"),
      paragraph("仍需核实当天营业时间。"),
    ]);
    expect(content.blocks).toHaveLength(4);
  });
  it("retains ordinary links while hiding source badges and metadata", () => {
    const output = projectRichSampleAnswer(
      {
        version: 2,
        blocks: [
          {
            type: "paragraph",
            inlines: [
              {
                type: "link",
                text: "预约入口",
                href: "https://restaurant.example/book",
                sourceId: "link-1",
              },
              {
                type: "link",
                text: "- 知乎",
                href: "https://source.example/",
                sourceId: "source-2",
              },
            ],
          },
        ],
      },
      [],
    );
    expect(output?.blocks[0]?.inlines).toEqual([
      {
        type: "link",
        text: "预约入口",
        href: "https://restaurant.example/book",
      },
    ]);
  });
  it("strips executable and credential URLs without discarding valid text", () => {
    const output = projectRichSampleAnswer(
      {
        version: 2,
        blocks: [
          {
            type: "paragraph",
            inlines: [
              { type: "link", text: "危险链接", href: "javascript:alert(1)" },
            ],
          },
        ],
      },
      [
        { id: "a", alt: "图", src: "data:image/svg+xml,<svg onload=alert(1)>" },
        { id: "b", alt: "图", src: "https://user:password@images.example/" },
      ],
    );
    expect(output?.blocks[0]?.inlines).toEqual([
      { type: "link", text: "危险链接" },
    ]);
    expect(
      output?.images.every(
        (image) => image.src === null && image.availability === "unavailable",
      ),
    ).toBe(true);
  });
  it("falls back for missing, malformed, unsupported, or oversized optional structures", () => {
    for (const content of [
      null,
      { version: 3, blocks: [] },
      { version: 2, blocks: [{ type: "script", text: "x" }] },
      { version: 2, blocks: Array.from({ length: 257 }, () => paragraph("x")) },
      { version: 2, blocks: [paragraph("x".repeat(64_001))] },
    ]) {
      expect(projectRichSampleAnswer(content, [])).toBeNull();
    }
  });
  it("bounds recursive and cyclic lists instead of throwing or returning partial output", () => {
    const nested: Record<string, unknown> = { ordered: false, items: [] };
    nested.items = [
      { inlines: [{ type: "text", text: "x" }], children: [nested] },
    ];
    expect(
      projectRichSampleAnswer(
        { version: 2, blocks: [{ type: "list", ...nested }] },
        [],
      ),
    ).toBeNull();
  });
  it("supports explicit text fallback blocks and missing image URLs", () => {
    const output = projectRichSampleAnswer(
      {
        version: 2,
        blocks: [
          { type: "paragraph", text: "第一行\n第二行" },
          { type: "image", id: "a", alt: "环境" },
        ],
      },
      [{ id: "a", alt: "环境", src: null }],
    );
    expect(output?.blocks[0]?.text).toBe("第一行\n第二行");
    expect(output?.images[0]?.availability).toBe("unavailable");
  });
});
