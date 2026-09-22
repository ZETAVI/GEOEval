# GEOEval production application

This directory owns the full application deployment for the controlled public
service at `app.geohdp.com`. It extends the accepted callback-first deployment in
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
NEXT_PUBLIC_AUTH_HUMAN_VERIFICATION_MODE=aliyun
NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX=1fz571
NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID=18hnihr4
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

- `application-api.env`: Identity, Amap server access and the enabled payment
  cashiers.
- `application-web.env`: loopback API bridge and Amap JS proxy security code.
- `application-worker.env`: model providers and metadata-only Langfuse.
- `application-recharge-worker.env`: enabled payment-channel recovery and
  notification delivery.

The API and recharge Worker receive the Alipay key pair plus the WeChat merchant
private key, WeChat Pay public key and APIv3 key through systemd credentials.
The callback receives only provider verification/decryption material and never
either merchant private key. Web and the product Worker receive no payment key.
Credentials that appeared in chat or command output must be rotated before
installation.

The API defaults to `GEO_OPTIMIZATION_WRITER_MODE=disabled`. For the controlled
internal demonstration only, set it explicitly to `demo`. This mode runs the
local deterministic adapter through the normal immutable snapshot, idempotency,
retry and article-revision path; it makes no model call and is not evidence of a
real Writing Agent. Never select the local/test-only `deterministic` mode in
production.

The public Demo uses product Identity rather than an outer shared password.
Nginx exposes the homepage and entry, applies narrow source-IP limits to
Challenge issue and Session completion, and keeps the two callback locations
exact. The API independently enforces Session, fixed-role and CSRF policy on
every non-public product route. Production does not register Swagger or the F0
Foundation validation controller, and the Web Foundation probe returns not
found.

Production runs with `INTERNAL_DEMO_MODE=0`, formal Alibaba CAPTCHA/SMS and no
browser-visible deterministic code. The accepted initial SMS signature is
`互动派科技`; it is visible to recipients. The API requires explicit daily and
monthly Challenge-attempt caps, emits a redacted warning at 80%, and retains the
manual stop-new-Challenge switch. The public entry links the current security
and privacy notice before CAPTCHA/SMS processing. Session, role, expiry and
audit behavior stay on the normal Identity path.

## Resource boundary

Install the `geo.slice` drop-in and all units, then run `systemd-analyze verify`
before reloading systemd. The slice uses `MemoryHigh=1G` and
`MemoryMax=1280M`. Each process also has a V8 cap and a smaller systemd hard
limit.
These are pilot limits, not measured production capacity.
The recharge Worker loads both payment adapters when Alipay and WeChat are
active. Keep its V8 heap cap at 64 MiB, with `MemoryHigh=160M` and
`MemoryMax=192M` for native SDK and TLS memory. A lower 96/128 MiB boundary was
observed to hold the process in cgroup reclaim before it could claim a due
order.

The callback also handles both public provider protocols. Keep its 64 MiB V8
cap, with `MemoryHigh=176M` and `MemoryMax=192M`. After real payments on both
channels, the old 144/160 MiB callback-only profile held the process around 155
MiB, accumulated 5,178 high events and produced sustained reclaim pressure. The
176/192 MiB runtime probe stopped new high events and returned ten-second
pressure to zero without a restart or OOM. The five application-process hard
limits total 1280 MiB and do not exceed the parent limit on their own.
PostgreSQL is an additional `geo.slice` child, so those maxima are intentionally
overcommitted and the parent remains authoritative. The live group was about
835 MiB, 189 MiB below its soft limit, with no swap or OOM; do not raise a child
independently without rechecking actual group headroom.

On Alibaba Cloud Linux, install the drop-ins under
`systemd/alibaba-cloud-linux/`. They replace the Debian PostgreSQL and Redis
unit names with `postgresql-16.service` and `redis.service`; the application
units and runtime identities remain unchanged.

Start one new process at a time. After each start, record host available memory,
swap, `geo.slice` memory, the new unit's memory/restart count and all existing
shared service states. Stop the new unit when it reaches its hard limit or when
LanChen, GEOMonitor, MySQL, Redis, Nginx or PostgreSQL changes from the accepted
baseline. Do not compensate by changing another application's limits.

## Public activation sequence

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
7. Confirm the Alibaba scene is formal, the runtime RAM policy allows only the
   fixed server egress, the replacement credential works and the superseded key
   is revoked. Verify configured day/month caps and the privacy notice.
8. Atomically point `current` to the release, install the reviewed public Nginx
   file, run `nginx -t`, reload, and repeat anonymous HTTPS Web, protected API,
   rate-limit and callback probes. Keep the prior Basic-Auth Nginx file as the
   immediate edge rollback.
9. Import media and create accounts through their owned interfaces.
10. Start recharge Worker, prove an existing order query/recovery cycle, then
    complete one authorized small Alipay customer-page payment.
11. Start product Worker only after all provider and telemetry configuration
    passes a no-business-write controlled probe.

The initial public authentication policy uses 100 persisted Challenge attempts
per Asia/Shanghai day and 2,500 per month. The singleton budget row is
transactionally locked across mobiles and survives ordinary Challenge cleanup.
Reaching the 80% threshold emits a warning without mobile, code, CAPTCHA or
credential data. Exhaustion returns a generic temporary failure and invokes no
SMS. Inspect the row and `identity.challenge.request` telemetry together; the
row is operational control state, not proof of carrier delivery.

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
- **WeChat:** set API and recharge Worker to `live` only after the exact merchant
  certificate, AppID binding, signed no-funds query and one-yuan prepay/close
  acceptance pass. Callback verification remains independently available.
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
