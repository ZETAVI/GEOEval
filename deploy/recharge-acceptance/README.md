# Controlled payment acceptance

## WeChat prepay-close

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

## Alipay one-yuan payment

The Alipay command creates one normal persisted one-yuan `RechargeOrder`,
reserves 10 funded points, grants the official PC cashier action and writes the
signed POST page to a new protected file. It never prints the form, signature
or key material. The file path must stay under
`/run/geoeval-alipay-acceptance/`, and the operator removes it after copying it
through the protected administration channel and opening it in the named test
browser.

The profile keeps the normal three-active-order account limit so an unresolved
order from another provider remains untouched. This command still creates only
the one named Alipay order and never scans, closes or replaces those orders.

Install `alipay.env.example` as `/etc/geoeval/alipay-acceptance.env` with
`root:geoeval` mode `0640`. Keep the long-lived source keys in the root-only
merchant directory. While holding both production locks, root creates
`/run/geoeval-alipay-acceptance/` as `geoeval:geoeval` mode `0700` and copies
only the application private key and Alipay public key into it as mode `0600`.
The callback identity cannot traverse this directory and never receives the
application private key. Remove the temporary directory after the named order
is reconciled. Run from one immutable reviewed release as OS user `geoeval`:

```text
node apps/backend/dist/alipay-recharge-acceptance-main.js prepare \
  --account-id <existing-customer-uuid> \
  --idempotency-key <fresh-uuid> \
  --cashier-file /run/geoeval-alipay-acceptance/<fresh-name>.html
```

After the user completes the one-yuan payment, run the same order through the
normal authenticated query and durable settlement lane:

```text
node apps/backend/dist/alipay-recharge-acceptance-main.js reconcile \
  --account-id <same-customer-uuid> \
  --order-id <persisted-order-uuid>
```

`reconcile` may truthfully return `PENDING_PAYMENT` or `CONFIRMING`; rerun it
against the same order after the provider retry interval. Completion requires
`SUCCESSFUL`, one ledger ID, 10 funded points, one authenticated payment fact
and the merchant-side one-yuan receipt. Browser return navigation never
decides payment or credit. Do not create another order as a retry.
