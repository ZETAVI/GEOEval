# Controlled WeChat prepay-close acceptance

This one-shot operator command creates one normal persisted RechargeOrder for
exactly one yuan, verifies the returned Native QR through the production
gateway, then requests cancellation and drives that same order through query
and close. It never prints the QR and cannot create an Account.

The production customer must already exist as an active `TERMINAL_CUSTOMER`
owned by Identity. Copy `wechat.env.example` to
`/etc/geoeval/wechat-acceptance.env` as `root:geoeval` mode `0640`; it contains
paths and public identifiers, never key contents. The four source key files
remain `geoeval:geoeval` mode `0600`.

Run only from an immutable reviewed release while holding
`/run/lock/shared-host-control.lock` and `/run/lock/geoeval-deploy.lock`, as OS
user `geoeval`:

```text
node apps/backend/dist/wechat-recharge-acceptance-main.js prepay-close \
  --account-id <existing-customer-uuid> \
  --idempotency-key <fresh-uuid>
```

The shell supplies the reviewed environment file without printing it. Success
returns only the local order ID, merchant order number, fixed amount/points,
closed state and operation count. Any provider, verification, commit, lease or
review uncertainty exits non-zero and keeps the order, attempt and reservation
for normal same-order recovery. Never delete or recreate that order as a retry.

After success, verify the order is `CLOSED`, its reservation is `RELEASED`, the
attempt sequence contains authenticated `INITIATE`, `QUERY NOTPAY` and `CLOSE`,
and no payment observation or `RECHARGE` point change exists. This does not
authorize or prove a real payment.
