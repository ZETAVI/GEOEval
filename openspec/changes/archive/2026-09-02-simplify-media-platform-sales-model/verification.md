# Verification

| Claim | Evidence | Result | Notes |
| --- | --- | --- | --- |
| Existing Listing data migrates without losing price or revision | Applied all sixteen migrations to dedicated review and test databases; queried the three review fixtures before and after | Passed | On-shelf became active; Draft and paused became inactive; prices and revisions remained |
| New platforms default to inactive and active platforms require price | Database default and checks, service validation, focused HTTP/repository tests | Passed | Review database reports the `INACTIVE` column default and no Listing table |
| Disabling immediately stops new orders | `media-supply.integration.spec.ts` | Passed | Quote becomes non-buyable while price and revision remain |
| Partial edits preserve omitted facts | Platform, resource, and source integration assertions | Passed | Corrected creation-default leakage in update schemas |
| Web exposes one platform status and coherent forms | Web unit tests plus Chrome visual/AX inspection | Passed | Platform, source, and resource form layouts inspected against the live review API |
| Generated contracts and deployable build agree | `pnpm check`, `pnpm build` | Passed | 23 Backend files / 122 tests; 3 Web files / 15 tests; `/admin/media` built |
| Repository governance remains valid | `python3 scripts/validate_project_framework.py` | Passed | 17 Skills and local Markdown links validated |

Result: `verified` for the local review boundary. Merge, production migration,
deployment, and #34 data import were not run.
