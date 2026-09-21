# GEOEval internal production application

This directory owns the full application deployment for the internal production
pilot at `app.geohdp.com`. It extends the accepted callback-first deployment in
[`deploy/recharge-callback`](../recharge-callback/README.md); it does not replace
the callback's narrower trust boundary.

## Fixed topology

| Public path                          | Loopback target                       | Owner                               |
| ------------------------------------ | ------------------------------------- | ----------------------------------- |
| `/recharges/providers/alipay/notify` | `127.0.0.1:3300`                      | recharge callback                   |
| `/recharges/providers/wechat/notify` | `127.0.0.1:3300`                      | recharge callback                   |
| `/api/entry/challenge`               | `127.0.0.1:3200`                      | Next same-origin acquisition bridge |
| `/api/*`                             | `127.0.0.1:3301`, with `/api` removed | full API                            |
| all remaining paths                  | `127.0.0.1:3200`                      | Next Web                            |

All application listeners stay on loopback. The browser uses `/api` as
`NEXT_PUBLIC_API_BASE_URL`, preserving the `__Host-` Session Cookie and one
trusted Origin. Keep the two callback locations exact and above the general Web
location.

## Immutable release

Build the release for **Linux x64 with Node 24.12** from the accepted revision.
Build on an isolated runner or workstation with a Linux container. Do not run a
Next production build on the 4 GiB application host; deployment only transfers
an already verified immutable release.
Do not copy a macOS `node_modules` or `.next/standalone` tree to the server.
After `pnpm install --frozen-lockfile` and `pnpm build`, assemble the Web output
as required by Next.js:

```text
apps/web/.next/standalone/apps/web/server.js
apps/web/.next/standalone/apps/web/public/**
apps/web/.next/standalone/apps/web/.next/static/**
```

`public` and `.next/static` are not copied by `next build`; the release builder
must copy them into the monorepo standalone app directory. Build-time public
values are:

```text
NEXT_PUBLIC_API_BASE_URL=/api
NEXT_PUBLIC_AMAP_JS_KEY=<domain-bound public JS key>
NEXT_PUBLIC_AUTH_HUMAN_VERIFICATION_MODE=disabled
NEXT_PUBLIC_INTERNAL_DEMO_MODE=enabled
```

Record the Git revision, archive SHA-256, platform, Node/pnpm versions and these
public inputs without recording any secret. Extract into
`/opt/geoeval/releases/geoeval-<revision>` and keep the previous release. Never
build or mutate the active release in place.

## Host and database identities

Create two locked OS accounts if absent:

- `geoeval-app`, primary group `geoeval`: API and both backend Workers;
- `geoeval-web`, primary group `geoeval`: Web only.

They need no shell or home directory. Web receives no database URL. Run
[`postgresql/grant-application.sql`](postgresql/grant-application.sql) as the
local PostgreSQL administrator after every migration. It creates the peer-auth
`geoeval-app` role with runtime DML but no schema, role or database creation.
Migrations continue to run once as the existing `geoeval` migration owner.

## Protected configuration

Copy the four examples to `/etc/geoeval/` without the `.example` suffix. Set
owner `root:root`, mode `0600`, and fill values through a protected channel.
Never print, diff, commit or attach them to an Issue.

- `application-api.env`: Identity, Amap server access and Alipay cashier.
- `application-web.env`: loopback API bridge and Amap JS proxy security code.
- `application-worker.env`: model providers and metadata-only Langfuse.
- `application-recharge-worker.env`: Alipay recovery and notification delivery.

The API and recharge Worker receive the Alipay key pair through systemd
credentials. The callback retains only the public verification key. Credentials
that appeared in chat or command output must be rotated before installation.

The API defaults to `GEO_OPTIMIZATION_WRITER_MODE=disabled`. For the controlled
internal demonstration only, set it explicitly to `demo`. This mode runs the
local deterministic adapter through the normal immutable snapshot, idempotency,
retry and article-revision path; it makes no model call and is not evidence of a
real Writing Agent. Never select the local/test-only `deterministic` mode in
production.

The internal pilot is protected by Nginx Basic Authentication using
`/etc/nginx/geoeval-demo.htpasswd`, owned by `root` and readable only by the
Nginx service group. The payment callback locations
explicitly disable Basic Authentication so Alipay and later WeChat can still
deliver notifications. Behind that outer gate, `INTERNAL_DEMO_MODE=1` permits
the existing deterministic Challenge adapter and disabled CAPTCHA in production;
the Web automatically completes the returned short-lived Challenge. Session,
role, rate-limit, expiry and audit behavior remain on the normal Identity path.
Use a random deployment-only Challenge code and Basic Auth password, keep both
outside Git, and remove this mode and the outer gate when real SMS/CAPTCHA is
activated.

## Resource boundary

Install the `geo.slice` drop-in and all units, then run `systemd-analyze verify`
before reloading systemd. The slice uses `MemoryHigh=1G` and
`MemoryMax=1280M`. Each process also has a V8 cap and a smaller systemd hard
limit.
These are pilot limits, not measured production capacity.

On Alibaba Cloud Linux 3 with systemd 239, install the complete units under
`systemd/alibaba-cloud-linux/units/` instead of the newer default units. They
use `postgresql-16.service` and `redis.service`, retain the supported sandbox
and resource controls, and give payment-authorized processes absolute paths to
the group-readable `0640 root:geoeval` key files. Systemd 239 does not support
`LoadCredential`; do not install the default units or ignore compatibility
warnings.

Start one new process at a time. After each start, record host available memory,
swap, `geo.slice` memory, the new unit's memory/restart count and all existing
shared service states. Stop the new unit when it reaches its hard limit or when
LanChen, GEOMonitor, MySQL, Redis, Nginx or PostgreSQL changes from the accepted
baseline. Do not compensate by changing another application's limits.

## First activation sequence

Hold `/run/lock/shared-host-control.lock` and then
`/run/lock/geoeval-deploy.lock` for every production write.

1. Capture the release revision, current symlink, services, listeners, memory,
   certificate and exact database counts.
2. Create a custom-format PostgreSQL backup and verify `pg_restore --list` can
   read it. Store it outside the release directory with mode `0600`.
3. Extract and hash the immutable release. Run migrations as OS user `geoeval`,
   rerun callback grants, then apply the application grants.
4. Install and statically verify systemd and Nginx files. Do not change public
   routing yet.
5. Start API on `3301`; require loopback `/health`, database readiness, a `401`
   for an unauthenticated protected endpoint, and unchanged payment counts.
6. Start Web on `3200`; require the entry page and static/media-logo assets over
   loopback. Confirm no server-side cache write mutates the release.
7. Install the root-owned Basic Auth file, verify both callback paths remain
   unauthenticated, and prove demo login plus role isolation. Do not expose the
   deterministic Challenge path without the outer gate.
8. Atomically point `current` to the release, install the reviewed Nginx file,
   run `nginx -t`, reload, and repeat HTTPS Web/API/callback probes.
9. Import media and create accounts through their owned interfaces.
10. Start recharge Worker, prove an existing order query/recovery cycle, then
    complete one authorized small Alipay customer-page payment.
11. Start product Worker only after all provider and telemetry configuration
    passes a no-business-write controlled probe.

## Media and account data

The first media input is the hash-locked workbook accepted by the importer. Run
`media-supply:first-batch plan` against production using the Bootstrap
administrator as actor and the release's `apps/web/public` as asset root. Review
the expected 40 platforms, 208 resources, 6 suppliers, warnings and confirmation
token. Apply the exact token once and store the `0600` receipt under
`/opt/geoeval/shared/import-receipts/`. Re-running an identical batch must plan
as existing data, not duplicate it.

Do not copy the empty development database. Preserve the existing production
terminal customer and all payment/point facts. Use the offline Bootstrap once
for the first administrator, then the administrator Governance API for a second
administrator, operations and agent accounts. Terminal demo customers must use
confirmed test mobile identities and the real Challenge flow. Never create
accounts or Sessions with SQL.

## Capability activation

- **Alipay:** `live` in API and recharge Worker; exact notification path remains
  on callback. `return_url` is navigation only.
- **WeChat:** callback verification remains available, but API/Worker order
  creation stays disabled until its own live acceptance succeeds.
- **Amap:** API uses the Web Service Key; Web exposes the public JS Key and keeps
  the JS security code in its server proxy. Probe only the approved place-text
  path.
- **AI:** all four provider connections and the approved Model Studio
  workspace-specific base URL are required for real mode. Use explicit timeout
  and ambiguity deadlines. The internal demo still uses real Provider APIs for
  sampling and parsing; `INTERNAL_DEMO_MODE` does not weaken Worker configuration.
- **Langfuse:** optional and non-blocking; production uses `metadata-only` and a
  named release/environment. Telemetry failure must not reject business facts.

## Recovery

If a loopback process fails before public activation, stop only that new unit
and leave `current`, Nginx, callback and PostgreSQL unchanged. If the public Web
or API check fails, restore the previous Nginx callback-only file first, test,
reload, stop the new units, and repoint `current` only after no process uses the
candidate release.

Do not reverse additive migrations or delete accounts, media, payment,
notification, point, audit, outbox or provider-attempt facts as rollback. A
database restore is an incident operation requiring writes to stop and separate
authorization.
