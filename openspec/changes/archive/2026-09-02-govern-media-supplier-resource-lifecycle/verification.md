# Verification

## Migration and data integrity

- Applied both migrations to the isolated review and test databases.
- Review data preserved supplier and resource UUIDs.
- Existing `32000` and `18000` fen values became `320` and `180` integer yuan.
- Existing `ACTIVE` stayed active; prior paused resource became `INACTIVE`.
- `OVERSEAS_MEDIA` membership is absent while platform `regionScope` remains the
  geography owner.
- Supplier normalized name and positive revisions were present after migration;
  the database default for a new supplier is inactive.

## Behavioral evidence

- Focused domain/persistence/HTTP suite: 3 files, 15 tests passed.
- Effective-status matrix covers all four resource/supplier combinations.
- Supplier stop and restore hide/restore only manually active resources from
  customer examples and fulfilment candidates.
- Manual resource inactivity survives supplier restoration.
- Moving a visible resource to an inactive supplier advances catalog freshness.
- Stale batch input rolls the entire batch back; accepted batch changes audit
  every resource.
- Deletion rejects an active resource and atomically deletes the last manually
  inactive resource plus its inactive, unreferenced supplier when requested.
- Final `pnpm check`: formatting and all workspace typechecks passed; complete
  backend regression passed 24 files / 129 tests.
- Web behavior: 3 files, 15 tests passed.

## Build and contract evidence

- `pnpm typecheck`: passed for backend, API client, and Web.
- `pnpm build`: Prisma/OpenAPI/client generation, backend build, client
  typecheck, and Next production build passed; `/admin/media` is present.
- `python3 scripts/validate_project_framework.py`: passed.
- Global current-source search found no stale source, fen-cost, overseas-category,
  or three-state resource symbols outside historical migrations/ADRs.
- `git diff --check`: passed.

## Browser evidence

Chrome against `http://127.0.0.1:3200/admin/media` and the isolated review API:

- administrator account entered the workspace successfully;
- `平台与资源` and `供应商管理` are separate first-level areas;
- platform category choices contain no geography category;
- resource cards show `可用`, `手动停用`, or `因供应商停用` and integer-yuan cost;
- resource form uses Chinese business labels, one supplier, two manual states,
  and `优质 / 常规 / 基础` quality labels;
- platform and supplier association lists expose atomic batch controls;
- supplier detail displays two resources across two platforms with navigation;
- create supplier form does not request a change reason and states that new
  suppliers default inactive;
- responsive breakpoint stacks the workspace without horizontal page overflow.

## Review disposition

Fixed-diff code review found one customer-freshness omission: changing a
resource's supplier was not classified as a public-affecting resource field.
`supplierId` is now included and a regression test proves the catalog revision
advances. No remaining material intent, engineering, evidence, or continuity
finding blocks review.

Production migration, Issue #34 import, PR merge, and deployment were not run.
