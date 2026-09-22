# Internal production pilot design

## Affected slice

The deployed application remains one modular monolith with process-specific
entry points:

| Process           | Responsibility                                                               | Durable dependencies                               |
| ----------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| Web               | Pages, same-origin acquisition bridge and Amap security proxy                | API over loopback; Amap for the narrow proxy route |
| API               | Identity, customer and administrator HTTP contracts, Alipay cashier creation | PostgreSQL; approved external HTTP adapters        |
| Product Worker    | Outbox relay and AI execution                                                | PostgreSQL, Redis and approved model providers     |
| Recharge Worker   | Query, close, settlement and customer-notification recovery                  | PostgreSQL and enabled payment providers           |
| Recharge callback | Authenticated provider notification ingress only                             | Narrow PostgreSQL callback grants                  |

The callback stays a separate trust boundary. The other three backend entry
points share the application database role because they are one deployable
business authority and already share the same repository contracts. Web uses a
different OS account and receives no database access.

## Public topology

Two approaches were considered:

1. add `api.geohdp.com`; this gives a clear hostname boundary but requires a
   second DNS/TLS release and cross-origin Cookie/CORS decisions;
2. use `app.geohdp.com/api/*`; this preserves host-only secure Cookies and one
   trusted Origin, but Nginx must distinguish the Next acquisition bridge from
   backend APIs.

The pilot uses the second approach. Nginx routes the exact Next
`/api/entry/challenge` path to Web, all other `/api/*` requests to API after
removing the prefix, the two exact provider callback paths to the callback, and
all remaining paths to Web. Exact callback routes take precedence and are not
served by the broader API process.

## Release and data integrity

The release is built for Linux x64 with Node 24.12 and stored under a revisioned
directory. `current` changes only after migrations, grants and loopback probes
succeed. The production database is backed up before the additive migration;
rollback changes processes and public routing but never deletes or rewrites
payment, point, account, media or audit facts.

The first media batch is reconstructed from the canonical workbook whose SHA-256
is enforced by the importer. Plan and confirmation precede the serializable
apply, and the receipt is stored outside the public release. This avoids copying
an empty or test development database.

Identity data is not seeded through SQL. The offline Bootstrap creates only the
first administrator. A signed-in administrator creates other internal roles,
and terminal customers are created by the real Challenge flow using confirmed
test identities. Existing production payment-customer facts remain untouched.

## Resource boundary

The current callback-first `geo.slice` limit is too small for the application
processes. The pilot raises the slice to a 768 MiB high threshold and 1 GiB hard
limit, while every unit also has a smaller hard limit and a V8 old-space cap.
Services start one at a time and the next service starts only after host and
slice memory are measured. Reaching a limit stops the current activation step;
it does not justify changing MySQL, LanChen or GEOMonitor.

## Credentials and external effects

Secret values live in root-owned `0600` environment files or systemd credential
files outside Git. Public build-time values are recorded in the release
manifest. Values pasted into chat are treated as disclosed and are rotated
before activation.

Alipay private/public key material is passed through `LoadCredential`; the
callback still receives only the public verification key. Amap follows the
official recommended server proxy pattern for the JS security code. Real AI
execution requires all four provider routes, the approved Model Studio
workspace-specific base URL, explicit timeouts and metadata-only Langfuse.

GEO Optimization remains behind its existing provider-neutral Writer port. The
pilot can explicitly select `demo`, which maps to the existing deterministic
local adapter and therefore preserves the same immutable input snapshot,
idempotency, retry, replacement and article-revision rules. Production still
rejects the local/test `deterministic` setting, `disabled` remains the default,
and no implicit fallback turns demo generation on. The mode performs no model
or Skill call and does not satisfy Issue #11's professional Writer outcome.

Internal-demo authentication reuses the existing Challenge, rate-limit,
Session, role and audit path. An explicit `INTERNAL_DEMO_MODE=1` permits the
deterministic Challenge delivery and disabled human verification in a production
process, while Nginx Basic Auth protects every Web/API route and exempts only
the exact provider callback locations. The Web may complete the returned demo
Challenge immediately. This mode cannot be combined with Aliyun Challenge or
CAPTCHA modes and must be removed when real authentication is activated.

This exception does not apply to AI execution. The Product Worker remains in
real mode and uses the four configured Provider API connections for sampling,
semantic parsing and synthesis; no deterministic production override is added.

## Activation and recovery

Activation order is database, API, Web, real login, media/accounts, recharge
Worker, product Worker, then external capability probes. Nginx changes last.
The first failed step restores the prior service state; a public-path failure
restores the prior callback-only Nginx file. Existing callback and PostgreSQL
processes are not restarted merely to activate Web or API.
