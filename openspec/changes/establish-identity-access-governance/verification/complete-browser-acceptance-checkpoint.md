# Complete Identity browser acceptance checkpoint

Date: 2026-09-04

## Evidence continuity

This final browser pass combines reusable evidence with a latest-branch narrow
inspection:

- [fixed role-entry checkpoint](fixed-role-entry-checkpoint.md): desktop login,
  administrator, operations, agent, denial, and no-overflow behavior;
- [administrator governance checkpoint](admin-account-governance-checkpoint.md):
  desktop account commands, confirmation, self/customer restrictions, audit
  readback, and modal behavior;
- [role Session-state checkpoint](role-session-state-checkpoint.md): desktop
  unauthenticated, operations ready, cross-role denial, absolute expiry,
  administrator-style revocation, inactive account, and retry behavior.

The commits after those observations changed backend last-administrator error
precedence, tests, and evidence only. They did not change the previously observed
desktop component/CSS paths, so the desktop evidence remains applicable under
the repository's evidence-reuse rule.

## Latest-branch narrow matrix

Chrome used an explicit 390×844 viewport override.

| Surface                         | Visible behavior                                                                               | Layout result                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Terminal customer `/brands`     | Real signed-in identity and empty first-brand state                                            | `innerWidth=390`, `scrollWidth=390`                 |
| Administrator `/admin`          | Management overview and current module links                                                   | `390 / 390`                                         |
| Administrator `/admin/accounts` | Target account list/detail and governance actions                                              | `390 / 390`                                         |
| Dangerous deactivation dialog   | One native modal; target/revision/consequence; reason and suffix confirmation; submit disabled | `390 / 390`; reason textarea focused; Escape closed |
| Operations `/operations`        | Role boundary plus three unavailable future capability cards                                   | `390 / 390`                                         |
| Operations at `/agent`          | Fixed-role denial and return link `/operations`                                                | `390 / 390`                                         |
| Agent `/agent`                  | Role boundary plus three unavailable future capability cards                                   | `390 / 390`                                         |

Screenshots visually confirmed the responsive header, cards, readable spacing,
and modal controls. Browser logs contained no warning or error. The viewport
override was reset; the default viewport returned to width 1201 before close.

## Session establishment boundary

The customer first login used the visible deterministic Challenge flow. Under
the Chrome viewport override, the browser extension would not persist
programmatic text-field input. The remaining short-lived sessions were therefore
created by same-origin Chrome DevTools `fetch` requests to the local
Challenge/Session endpoints with credentials enabled. The browser received the
HttpOnly Cookie; the Session token was never returned to the agent, printed, or
written to a file. Every completed role session used the normal product logout
before cleanup.

This is browser state setup, not authorization evidence. The pages still called
`/identity/me`, and the backend independently enforced all role/API access.

## Fixture correction and cleanup

The first internal-account fixture prefix, `+8613900054`, was one zero shorter
than the normalized mobiles entered in the browser. The attempted administrator
login therefore created an unintended test customer under the correct normalized
prefix. Work stopped immediately:

- the unexpected Session was cleared through normal current logout;
- both declared prefixes were selected exactly;
- six accounts, two Challenges, two rate rows, zero audits, and all cascaded
  Sessions were removed;
- the authoritative pass restarted with `+86139000054xx` accounts.

Final authoritative cleanup reported:

| Record kind         | Before | After |
| ------------------- | -----: | ----: |
| Accounts            |      4 |     0 |
| Sessions            |      3 |     0 |
| Challenges          |      3 |     0 |
| Challenge rate rows |      3 |     0 |
| Governance audits   |      0 |     0 |

Local API 3300 and Web 3201 refused connections after stop, and both browser
tabs were closed. No production, external, real user, or Issue #57 data was used.

## Architecture review

Verdict: ready for this browser checkpoint.

- Responsive evidence uses an actual browser viewport capability, not CSS width
  injection or a cropped desktop screenshot.
- Shared Session UI remains presentation only; allowed/denied outcomes still
  originate from the server-owned role and Session state.
- Honest empty role shells were inspected for absence of simulated business
  outcomes as well as layout.
- The fixture-prefix error and discarded data are recorded explicitly, and the
  authoritative rerun starts only after exact cleanup.

## Remaining Issue-level work

Issue #50 is not complete. Aggregate verification and fixed-diff code/
architecture review, accepted-design reconciliation, PR review, and integration
remain open.
