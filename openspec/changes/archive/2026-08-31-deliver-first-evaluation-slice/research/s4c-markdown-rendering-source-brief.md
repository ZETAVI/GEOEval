# Source Brief: S4c Safe Markdown Rendering and Evidence Annotation

## Recommendation

Use `react-markdown@10.1.0`, `remark-gfm@4.0.1`, and
`rehype-sanitize@6.0.0` in the Web package. Keep embedded raw HTML disabled.
Run `rehype-sanitize` before one project-owned deterministic annotation plugin
that can only add fixed `mark` nodes for backend-approved source ranges.

Do not add a generic text-highlighting or HTML-rendering library. Evidence
annotation has project-specific fail-closed semantics and is smaller and safer
as a bounded AST transformation than as an imperative DOM mutation.

Confidence is high for the dependency choice. Exact source-position mapping is
an implementation boundary and must be proven with controlled list, table,
heading, paragraph, repeated-text, malicious-HTML, and unsupported-range tests.

## Decision Constraints

- The complete retained answer is untrusted Markdown and must never become an
  unsanitized HTML string or use `dangerouslySetInnerHTML`.
- Lists, headings, paragraphs, links, code, and GFM tables must retain readable
  structure.
- Sanitization runs before annotation. Code after the sanitizer must be small,
  deterministic, and unable to introduce arbitrary tags, attributes, or URLs.
- A range that cannot be mapped exactly must produce the original sanitized
  rendering without any highlight; it must not guess.
- React 19, Next.js 16, ESM, TypeScript, and the existing project-local package
  workflow must remain supported.

## Evidence

| Claim | Primary source | Version/date | Design implication |
| --- | --- | --- | --- |
| `react-markdown` parses Markdown through remark/rehype into React elements, supports custom components and plugins, is secure by default, and recommends `rehype-sanitize` when plugins are involved | [Official react-markdown README](https://github.com/remarkjs/react-markdown#security) | `10.1.0`, accessed 2026-08-27 | Use its AST-to-React path; do not build or inject an HTML string |
| The current package supports React 18 or later, includes React 19 in its own development matrix, is ESM, and uses the MIT license | [Official react-markdown package manifest](https://raw.githubusercontent.com/remarkjs/react-markdown/main/package.json) | `10.1.0`, accessed 2026-08-27 | Compatible with the current React 19 project and acceptable for local bundling |
| `rehype-sanitize` removes nodes and properties outside an allow-list schema and recommends sanitizing untrusted authors or plugins | [Official rehype-sanitize README](https://github.com/rehypejs/rehype-sanitize#when-should-i-use-this) | `6.0.0`, accessed 2026-08-27 | Sanitize the HAST before the trusted annotation transformer |
| Everything after `rehype-sanitize` must itself be trusted | [Official rehype-sanitize security guidance](https://github.com/rehypejs/rehype-sanitize#security) | `6.0.0`, accessed 2026-08-27 | The annotation plugin may emit only fixed `mark` nodes and inert classification data |
| `remark-gfm` adds tables, autolinks, footnotes, strikethrough, and task lists and is an ESM MIT package | [Official remark-gfm README](https://github.com/remarkjs/remark-gfm) | `4.0.1`, accessed 2026-08-27 | Add it because sampled answers can contain tables and ordinary users expect GFM table behavior |

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| `react-markdown` + `remark-gfm` + `rehype-sanitize` + bounded custom annotation | Adopt | Matches the existing React stack, preserves structure, keeps untrusted content out of HTML injection, and gives the project a fail-closed evidence mapping seam |
| Enable `rehype-raw` for embedded HTML | Reject | The product promises retained Markdown structure, not arbitrary provider HTML; raw HTML expands the attack surface without adding required report value |
| Build HTML with `remark-html` or another serializer and inject it | Reject | Creates an HTML-string boundary and makes safe React composition and evidence annotation harder |
| DOM search-and-replace or a generic highlighting component | Reject | Can cross structural boundaries, mutate rendered evidence, or select the wrong repeated occurrence; it cannot enforce the accepted source-range contract |
| Render the original answer as plain text only | Reject | Safe but loses confirmed heading, list, table, paragraph, and link structure |

## Unknowns and Validation

- Confirm in repository tests that HAST text-node source positions remain usable
  after the selected GFM parse and sanitizer pipeline. If one approved range
  cannot be mapped to an exact text-node slice, the entire card must render
  safely without highlights.
- Confirm that raw HTML and unsafe URL protocols cannot create executable or
  loaded content. Images are rendered as inert labelled placeholders rather
  than remote requests.
- Confirm in the real Next.js build and browser that collapsed tables remain
  horizontally scrollable and that expanding one answer does not alter the
  retained Markdown string.

## Reuse and Refresh Boundary

- Reusable while: React remains 18 or later; `react-markdown@10`,
  `remark-gfm@4`, and `rehype-sanitize@6` remain the installed major lines; raw
  HTML stays disabled; and annotation continues to accept only backend-approved
  immutable source ranges.
- Refresh when: a dependency major changes, raw HTML or remote media becomes a
  product requirement, the renderer moves away from React, or annotations need
  to span multiple Markdown AST nodes rather than fail closed.
