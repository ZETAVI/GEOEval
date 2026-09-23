# Design: bounded demo SMS delivery

Identity owns the one-time Challenge and the original normalized mobile. The
Alibaba delivery adapter owns only the destination passed to `SendSms`. A small
Identity policy shared by Challenge issuance and the adapter recognizes an
exact configured source set until a fixed expiry. Issuance forces
`existingAccountOnly` for that set, while the Challenge digest and completion
still use the original mobile. The adapter substitutes only the transport
destination, with no second send, retry or provider-specific API change.

The configuration is API-only, root-owned deployment data: a comma-separated
list of at most five normalized demo mobiles, one normalized mainland
destination and an absolute expiry. All three fields are required together;
invalid, duplicate or destination-in-source values reject startup. The
destination and list are absent from the Web build and public response. The Web
uses a neutral confirmation message for all users because the displayed input
may differ from the actual delivery destination during this pilot.

| Failure | Expected behavior | Recovery |
| --- | --- | --- |
| Missing or partial routing config | API startup rejects the config | Correct or clear the three fields |
| Expired route | Original-number delivery resumes | Remove route or approve a new bounded expiry |
| Provider rejects or times out | Existing reject/unknown semantics, no retry | Inspect bounded provider outcome; normal resend policy |
| Demo source account absent or inactive | Completion cannot create or activate it | Correct the allowlist through the release path |
| Recipient handset unavailable | Existing Challenge expires normally | Use another authorized handset/configuration; do not reveal code |

No new table, public contract, provider permission or migration is required.
The only persistent writes are the existing Challenge, budget and Session
records. The accepted Identity spec and runbook remain the current owners.
