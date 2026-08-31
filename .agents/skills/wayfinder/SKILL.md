---
name: wayfinder
description: Maps a large, multi-session GEOEval outcome whose route is still unclear into bounded decision questions and dependencies. Invoke explicitly after normal alignment cannot expose a safe path. Do not use it for a well-scoped feature or as a permanent implementation backlog.
---

# Wayfinder

Find the route to a destination before creating delivery tasks.

## Workflow

1. Confirm the destination: the exact decision, approved spec, or state that
   ends wayfinding.
2. Read current truth and existing active changes. If the route already fits one
   bounded session, stop and recommend the normal change workflow.
3. Separate:
   - decisions already made;
   - precise open questions;
   - in-scope fog that cannot yet be stated precisely;
   - work outside the destination.
4. Create one decision item per precise question. Use research, prototype, or
   requirement grilling only when that question needs it. Record dependencies.
5. Resolve one human-owned decision at a time. Promote accepted cross-change
   knowledge to its canonical owner and remove duplicated fog.
6. Stop when no material decision remains before a normal proposal can be
   written. Hand off to `$start-change`; do not continue into implementation.

When GitHub coordination is unavailable, keep the map inside the active change
as temporary control state. Do not create a second permanent tracker. A map is
an index and must not copy complete answers from its decision items.
