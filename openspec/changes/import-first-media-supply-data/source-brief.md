# Source Brief: Fixed-workbook XLSX and embedded-Logo reader

## Recommendation

Use project-local `exceljs@4.4.0` only inside the offline first-batch import CLI.
It is the smallest mature library found that documents both ordinary XLSX cell
reads and embedded-image retrieval. Gate all parsing on the exact approved input
SHA-256, keep the library out of HTTP/request paths, pin it in the lockfile, run
the actual workbook/Image API smoke on Node 24, and review the resolved dependency
audit before implementation acceptance.

## Decision constraints

- Must read an existing `.xlsx`, preserve numeric cell types, and retrieve the
  40 embedded image buffers with their worksheet anchors.
- Must run as a project-local Node dependency without global installation or a
  Codex-only runtime.
- Must never parse user uploads or arbitrary workbook versions in this Change.
- Must allow complete removal with the one-off importer; no runtime business
  module may depend on it.

## Evidence

| Claim | Primary source | Version/date | Design implication |
| --- | --- | --- | --- |
| `Workbook.xlsx.readFile` reads an existing workbook; worksheets expose rows/cells | https://github.com/exceljs/exceljs#reading-xlsx | 4.4.0, accessed 2026-09-03 | Fixed parser can read the reviewed sheet without a conversion service |
| `Worksheet.getImages()` plus `Workbook.getImage()` exposes placed image IDs, buffers, extensions, and anchors | https://github.com/exceljs/exceljs#images | 4.4.0, accessed 2026-09-03 | One parser can verify exact row-to-Logo mapping and bytes |
| Package is MIT and declares Node `>=8.3.0` | https://github.com/exceljs/exceljs/blob/master/package.json and https://github.com/exceljs/exceljs/blob/master/LICENSE | 4.4.0, accessed 2026-09-03 | License is compatible; declared range includes Node 24 but does not substitute for a real smoke |
| v4.4.0 is the latest stable release and added Node 20 to its test matrix | https://github.com/exceljs/exceljs/releases/tag/v4.4.0 | released 2023, accessed 2026-09-03 | Node 24 behavior is not directly proven by upstream CI and must be validated locally |
| Maintainers have open reports about outdated/transitive dependencies | https://github.com/exceljs/exceljs/issues/2968 and https://github.com/exceljs/exceljs/issues/3055 | accessed 2026-09-03 | Restrict to exact trusted input, inspect `pnpm audit`, and do not expose parser as a service |

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| ExcelJS 4.4.0 | Adopt with controls | Documents both required cell and embedded-image read surfaces; broad age/transitive risk is bounded by exact-hash offline input and local audit |
| Codex bundled artifact tool | Reject for repository runtime | Useful for independent workbook inspection, but it is not a project dependency or deployable application contract |
| Custom OOXML/ZIP parser | Reject | Would create a fragile parallel spreadsheet framework for one fixed workbook and expand security/format responsibility |
| Cell-only readers | Reject | Do not satisfy the one-to-one embedded-Logo extraction and anchor requirement from primary documentation |

## Unknowns and validation

- Run the exact reviewed workbook through `readFile`, `getImages`, and
  `getImage` using project Node 24 after lockfile installation.
- Confirm 40 image anchors map to the 40 platform rows and each buffer is PNG.
- Run `pnpm audit` for the resolved lockfile. A reachable high/critical parser
  issue changes the decision; ordinary unsupported write/stream paths remain
  outside the CLI boundary.

## Reuse and refresh boundary

- Reusable only for the exact reviewed hash, ExcelJS 4.4.0 lockfile resolution,
  offline CLI, and Node 24 environment proven by this Change.
- Refresh when the input hash/shape changes, the parser becomes reachable from
  an API/upload path, Node/runtime changes, the lockfile resolves different
  parser dependencies, or a relevant security advisory appears.
