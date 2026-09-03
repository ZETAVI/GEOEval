# Verification

## Automated evidence

- `pnpm check` with the isolated worktree PostgreSQL and Redis services:
  formatting, all workspace type checks, 24 backend test files, and 129 backend
  tests passed.
- `pnpm --filter @geoeval/web exec vitest run`: 3 files and 16 tests passed,
  including the deletion dialog, aligned field headings, Chinese audit labels,
  and absence of browser-native deletion confirmation.
- `pnpm build`: Prisma and OpenAPI/client generation, backend build, client type
  check, and the Next.js production build passed.
- `python3 scripts/validate_project_framework.py`: all 17 cataloged Skills and
  local Markdown links passed.
- `git diff --check`: passed.

## Browser evidence

Reviewed `http://127.0.0.1:3200/admin/media` with an administrator session:

- inactive platform with one resource shows a disabled `删除平台` action and
  the exact association prerequisite;
- inactive supplier with two resources shows a disabled `删除供应商` action and
  the exact association prerequisite;
- inactive resource shows `停用`, grouped edit/delete actions, and opens the
  styled in-product confirmation dialog;
- resource and supplier views show the grouped batch toolbar;
- resource edit fields align their input surfaces after hints moved into the
  field heading;
- a narrow viewport had no horizontal document overflow.

No platform, resource, or supplier was deleted during visual verification.
