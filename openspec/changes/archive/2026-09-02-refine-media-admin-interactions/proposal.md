# Change: Refine media administrator interactions

## Why

The second visual review of PR #38 found that correct backend rules are not
communicated clearly in the administrator workspace. Resource cards expose
unstyled, separated actions; form hints consume their own grid row and misalign
paired controls; deletion is hidden whenever an object is not currently
eligible, making platform and supplier deletion appear absent. The phrase
“manual inactive” also exposes an implementation distinction more strongly than
the administrator needs.

## Outcome

Present one concise resource state vocabulary, make deletion visible and
self-explanatory without weakening its guards, and use consistent owner-local
action and form primitives across platform, resource, and supplier maintenance.

## Scope

- Rename the exposed effective state from `MANUAL_INACTIVE` to
  `RESOURCE_INACTIVE` and display it simply as `停用`.
- Retain `因供应商停用` only where the supplier is the current blocking cause.
- Replace browser prompt/confirm deletion with one Media Supply confirmation
  dialog containing consequences, prerequisites, and a required reason.
- Keep platform/supplier/resource delete actions visible; disable them with a
  plain-language prerequisite when deletion is currently blocked.
- Group resource-card actions and refine batch controls into a coherent action
  toolbar.
- Introduce one small field-heading component so labels and optional hints share
  one row and paired inputs align.
- Re-review current Media Supply code and documents for stale or duplicated
  “manual” terminology and obsolete UI implementation language.

## Non-goals

- Changing the persisted resource or supplier state model.
- Relaxing deletion constraints, cascading deletion, or adding order schemas.
- Building a generic design system, form engine, or workflow framework.
- Importing Issue #34 data, merging PR #38, or deploying.
