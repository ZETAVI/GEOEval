# Design: agency pilot activation

The Agency Entry module already owns stable links, anonymous visit credentials
and the first-account binding transaction. Identity owns Challenge and Session;
Commerce owns immutable purchase terms; the Commission Worker and Withdrawal
module have their own independent activation switches. No boundary or schema
change is needed.

The obsolete `ApiModule` production exception is removed because purchase-time
agent/rate snapshots now exist and the product owner has approved a controlled
test. `AGENCY_ACQUISITION_ENABLED` remains `0` by default on both processes.
The API rejects entry resolution, issuance and source-bearing Challenges while
off; the Web then uses `/enter` directly. When on, the Web resolves the public
or existing agent entry through the API and its same-origin bridge carries the
anonymous Cookie only into a source-bearing Challenge. Completion commits new
customer and attribution together as before.

| Failure | Expected behavior | Recovery |
| --- | --- | --- |
| Web on, API off | Entry page reports unavailable; no silent public fallback | Restore matching flags |
| Agent disabled or link invalid | No new source accepted | Check agent eligibility; do not remap to another agent |
| CAPTCHA/SMS or completion fails | Existing Challenge/registration rules apply | Retry under normal limits; no partial customer binding |
| Flags turned off after registration | New acquisition stops; old attribution persists | Re-enable only after an approved release check |

The demo release verifies both runtime flags and leaves commission and
withdrawal execution disabled. Accepted Identity, Agency Entry, Order Terms and
Commission specs remain the current owners; this change is archived after
runtime acceptance.
