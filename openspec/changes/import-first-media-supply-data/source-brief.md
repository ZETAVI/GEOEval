# Source Brief: Fixed-workbook OOXML and embedded-Logo reader

## Recommendation

Use project-local `fflate@0.8.3` plus `fast-xml-parser@5.10.1` inside the offline
first-batch import CLI. The importer verifies the exact approved SHA-256 before
decompression, keeps all archive entries in memory, rejects DOCTYPE/entity
declarations, removes XML namespace prefixes, and reads only the fixed workbook,
worksheet, relationship, drawing, and PNG paths required by this batch.

Do not use ExcelJS for this input. Its documented `readFile`/image API was tested
on Node 24 against the exact workbook and failed before returning a workbook
model because this source uses namespace-prefixed OOXML elements. ExcelJS also
introduced an avoidable vulnerable `uuid@8.3.2` path in the resolved audit. The
dependency and all of its transitive packages were removed.

## Decision constraints

- Must read namespace-prefixed OOXML cell values and the 40 embedded image
  buffers with drawing-row anchors.
- Must run as project-local Node dependencies without global installation or a
  Codex-only runtime.
- Must not parse any input before exact hash verification or accept arbitrary
  sheets, columns, formulas, counts, image types, or archive relations.
- Must allow complete removal with the one-off importer; no runtime business
  module may depend on it.

## Evidence

| Claim | Primary source or controlled evidence | Version/date | Design implication |
| --- | --- | --- | --- |
| `unzipSync(Uint8Array)` returns named decompressed entries | https://github.com/101arrowz/fflate/blob/master/docs/functions/unzipSync.md | 0.8.3, accessed 2026-09-03 | The exact-hash XLSX can be read in memory without external commands or temporary extraction |
| fflate 0.8.3 fixes a Zip64 buffer over-read and is MIT | https://github.com/101arrowz/fflate/releases/tag/v0.8.3 and https://github.com/101arrowz/fflate/blob/master/LICENSE | 0.8.3, accessed 2026-09-03 | Pin the current release and avoid an older archive-read defect |
| `removeNSPrefix`, attribute parsing, and non-coercing value options are supported | https://github.com/NaturalIntelligence/fast-xml-parser/blob/master/_autodocs/configuration.md | 5.10.1, accessed 2026-09-03 | The parser can read `x:workbook`, `xdr:oneCellAnchor`, and relationship attributes without rewriting XML |
| fast-xml-parser 5.10.1 is current, MIT, and includes entity/unsafe-name hardening accumulated in v5 | https://github.com/NaturalIntelligence/fast-xml-parser/releases/tag/v5.10.1 and https://github.com/NaturalIntelligence/fast-xml-parser/blob/master/CHANGELOG.md | 5.10.1, accessed 2026-09-03 | Pin the current v5 release and still reject DOCTYPE/entity input before parsing |
| The exact workbook produced 55 ZIP entries, one expected sheet, 40 drawing anchors, 40 PNG buffers, and the expected 40/208/76/6 counts on Node 24.12.0 | Controlled local smoke on approved SHA-256 | 2026-09-03 | The selected narrow interface is proven on the actual source rather than inferred from docs |
| ExcelJS 4.4.0 threw while parsing the exact namespace-prefixed workbook and resolved vulnerable `uuid@8.3.2` | Controlled local smoke plus `pnpm audit --prod --json` | Node 24.12.0, 2026-09-03 | Remove ExcelJS rather than normalize OOXML behind an unproven general workbook model |

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| fflate 0.8.3 + fast-xml-parser 5.10.1 | Adopt with fixed-shape controls | Current, small, documented primitives; actual workbook namespace/image path passes |
| ExcelJS 4.4.0 | Reject | Exact source fails before model construction; old transitive dependency adds risk |
| Codex bundled artifact tool | Reject for repository runtime | Useful for independent inspection, but not a project dependency or deployable application contract |
| Custom ZIP/DEFLATE or XML tokenizer | Reject | Reimplementing compression or XML parsing would expand security and format responsibility |

## Unknowns and validation

- Run the fixed-shape parser against a generated namespace-prefixed fixture for
  hash, formula, fractional-cost, duplicate-row, invalid-case-reference, and
  missing-Logo behaviors.
- Run the exact reviewed workbook on project Node 24, then run the complete
  plan/apply/browser rehearsal against the independent review database.
- Review the resolved production dependency audit. Existing unrelated Prisma
  optional and Nest/qs findings remain visible; any advisory newly attributable
  to fflate or fast-xml-parser changes this decision.

## Reuse and refresh boundary

- Reusable only for the exact reviewed hash, fixed OOXML paths/schema, pinned
  fflate/fast-xml-parser resolutions, offline CLI, and Node 24 environment proven
  by this Change.
- Refresh when the input hash/shape changes, the parser becomes reachable from
  an API/upload path, Node/runtime changes, the lockfile resolves different
  parser dependencies, or a relevant security advisory appears.
