# WeChat recharge callback deployment

This package deploys only the authenticated WeChat payment callback ingress for
Issue #77. It does not deploy the customer API, login, recharge Worker, Web app,
Alipay callback, or any real-payment command. The process stays in `verify`
mode: it can authenticate and durably record a WeChat notification, but it
cannot create a QR order.

## Fixed production boundary

- Public path: `POST https://app.geohdp.com/recharges/providers/wechat/notify`
- Local listener: `127.0.0.1:3300`
- Process: `dist/recharge-callback-main.js`
- Runtime identity: `geoeval-callback`; it can read only systemd's copied
  WeChat Pay public key and APIv3 credential.
- Database identity: peer-authenticated `geoeval-callback`, limited to
  `recharge_payment_observations` and `recharge_notification_receipts`.
- Resource ownership: callback and PostgreSQL are children of `geo.slice` and
  `geo-runtime.target`. The existing GEOMonitor limit is unchanged. Their
  configured `MemoryMax` values add up to 736 MiB, leaving 32 MiB below the
  existing 768 MiB slice ceiling for cgroup and short lifecycle overhead.
- All other `app.geohdp.com` HTTPS paths continue to return `503`.

The public-key identifier is
`PUB_KEY_ID_0111177257782026091700211615001802`. The APIv3 value and key
contents remain outside Git. The service reads their existing protected source
files through `LoadCredential=`; the source files are never made readable by
the callback account.

## Preconditions and stop conditions

Before any host write, confirm all of the following:

1. The service-account AppID `wx0402876c556f2029` is certified and bound to
   merchant `1117725778`, and Native payment remains open.
2. `/opt/geoeval/shared/secrets/wechat/wechatpay_public_key.pem` and
   `/opt/geoeval/shared/secrets/wechat/api_v3.key` still pass the repository's
   protected-file checks. Do not print either value.
3. PostgreSQL `16/main` still has no non-GEO database or consumer. Stop if this
   is no longer true; moving a shared database into `geo.slice` would cross an
   application boundary.
4. The immutable release was built from the reviewed commit and contains the
   complete current migration chain and backend build.
5. The shared-host owner has accepted the exact window. Acquire
   `/run/lock/shared-host-control.lock` before the GEO application lock. Do not
   run `apt`, `dpkg`, or touch LanChen's MySQL, Redis, units, or files.
6. Record the current unit, Nginx, PostgreSQL configuration and service state so
   the control-plane changes can be restored exactly.

Stop the window if a preflight differs from the reviewed state, migration or
unit verification fails, the existing LanChen/GEOMonitor health changes, or the
callback cannot durably write before its response deadline.

## Reviewed assets

| Asset | Installation target |
| --- | --- |
| `systemd/geoeval-recharge-callback.service` | `/etc/systemd/system/geoeval-recharge-callback.service` |
| `systemd/geo-runtime.target.d/20-geoeval-recharge-callback.conf` | matching target drop-in |
| `systemd/postgresql@16-main.service.d/20-geo-slice.conf` | matching PostgreSQL drop-in |
| `postgresql/20-geoeval.conf` | `/etc/postgresql/16/main/conf.d/20-geoeval.conf` |
| `recharge-callback.env.example` | `/etc/geoeval/recharge-callback.env` after exact review |
| `nginx/app.geohdp.com.conf` | `/etc/nginx/sites-available/geoeval-app.conf` |

Do not copy this directory wholesale. Install and verify each control plane in
the following order while holding the shared-host lock.

## Controlled installation sequence

### 1. Release and operating-system identity

Create the no-login `geoeval-callback` account if it does not exist. Its primary
group is `geo-runtime`; the unit supplies `geoeval` only as a supplementary
group so it can traverse the read-only release tree. The protected source
credential directory remains mode `0700` and is not traversable by that group.

Copy the reviewed release to `/opt/geoeval/releases/geoeval-<revision>` as
`root:geoeval`, remove group/other write permission, and atomically point
`/opt/geoeval/current` at it. Never build or mutate a release in place.

### 2. PostgreSQL resource boundary

Install the PostgreSQL systemd drop-in and `20-geoeval.conf`. The initial budget
uses 30 total connections, 128 MiB shared buffers, 256 MiB `MemoryHigh`, and
320 MiB `MemoryMax`. This is sized for the callback-first topology; later API
and Worker activation must remeasure and review it instead of silently adding
processes.

Run `systemd-analyze verify` against the installed PostgreSQL and callback
units, then reload systemd. Restart `postgresql@16-main.service` once inside the
maintenance window and confirm:

```text
ActiveState=active
Slice=geo.slice
MemoryHigh=268435456
MemoryMax=335544320
```

Also query `max_connections`, `shared_buffers`, `work_mem`, and the local socket
directory. A failed or killed database ends the window; do not raise the slice
ceiling ad hoc.

### 3. Database, migrations, and least privilege

Run `postgresql/bootstrap.sql` against the `postgres` database as the local
PostgreSQL administrator. It creates or normalizes the peer-authenticated
`geoeval` migration role, the limited `geoeval-callback` role, and database
`geoeval` without passwords or network exposure. The callback role's ten
connections match the current node-postgres default pool ceiling; later pool
changes must update and remeasure this limit explicitly.

Run the complete migration chain from the immutable release as OS user
`geoeval`, using:

```text
DATABASE_URL=postgresql://geoeval@/geoeval?host=%2Fvar%2Frun%2Fpostgresql
```

After migrations succeed, run `postgresql/grant-callback.sql` against
`geoeval`. Repeat that grant file after any future migration before restarting
the callback. Verify that `geoeval-callback` can connect, select/insert the
observation table, and select/insert/update the receipt table, while it cannot
access `recharge_orders`, `point_changes`, `accounts`, or schema creation.

### 4. Callback process in verify mode

Install `/etc/geoeval/recharge-callback.env` from the example as
`root:geo-runtime` mode `0640`. It contains no key material. Install the service
and target drop-in, then reload systemd. Because `geo-runtime.target` is already
active on the current host, start `geoeval-recharge-callback.service`
explicitly during this first installation; do not restart the target and
interrupt GEOMonitor merely to discover the new dependency. The target owns
the callback on the next normal lifecycle start/restart.

Verify the effective unit before exposing Nginx:

```text
User=geoeval-callback
Group=geo-runtime
Slice=geo.slice
MemoryHigh=134217728
MemoryMax=167772160
```

Check that only `127.0.0.1:3300` listens. A forged loopback notification must
return `401`; a signed synthetic notification built with non-production test
keys is not valid against this service. Confirm the callback account cannot
open the merchant private key or certificate source files.

### 5. Exact public path

Back up the active `geoeval-app.conf`, install the reviewed Nginx file, and run
`nginx -t` before reload. Reload Nginx only after the local callback checks pass.

Then verify:

- forged JSON at the exact HTTPS callback path returns `401` and creates no
  observation or receipt;
- `GET /health` and every non-callback application path still return `503`;
- existing `geohdp.com`, GEOMonitor, LanChen, MySQL, and Redis checks are
  unchanged;
- Nginx and callback logs contain no key material, raw decrypted resource,
  payer identity, or full database URL.

This completes callback deployment only. A real WeChat notification remains
unverified until a separately authorized one-yuan payment test.

## Recovery

For callback or Nginx failure, restore the previous Nginx file first so all
`app.geohdp.com` routes return the known `503`, reload Nginx, then stop and
disable `geoeval-recharge-callback.service`. Preserve the PostgreSQL database,
payment observations, receipts, logs, release, and credential sources for
diagnosis. Never reverse an additive migration or delete accepted payment facts
as a rollback shortcut.

Moving PostgreSQL out of `geo.slice`, changing its tuning, dropping roles or
database, or removing a release is a separate maintenance decision after
confirming all consumers and recovery value. Release activation later follows
the same order: immutable release, migrations, grants, local callback, exact
public path, then evidence.

## Later one-yuan evidence

Once this callback slice is healthy, the next gates are separate:

1. Create one persisted `RechargeOrder` for **1 yuan** through the normal
   runtime and immediately close it, proving request signing, successful
   response verification and recoverable close behavior without payment.
2. With an explicitly named tester and finance observation, create one **1
   yuan** Native order, scan it on a real device, and prove callback/query
   convergence, exactly-once funded points, customer/admin projections, and
   merchant receipt. Return WeChat activation to `verify` immediately if any
   evidence is incomplete.

The product does not support a one-fen RechargeOrder; all controlled channel
probes and real-funds acceptance use the same one-yuan minimum.
