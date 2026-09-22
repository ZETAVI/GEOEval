# Deploy the internal production pilot

- Status: Completed. The independent host runs the accepted application under
  an outer Basic Auth gate with real Alibaba CAPTCHA/SMS inside, both desktop
  payment channels, bounded systemd services, recoverable PostgreSQL data and
  an immutable release. Public authentication proceeds under #156; public
  desktop payment operations proceed under #157.
- Issue: [#141](https://github.com/ZETAVI/GEOEval/issues/141)
- Owner: ZETAVI
- Lane/class: release / architectural; shared-host production boundary

## Problem

`app.geohdp.com` currently exposes only the two provider callback paths. The
accepted product Web, API, product Worker and recharge recovery Worker are not
running in production, and the first media catalog has not been imported. The
shared host also runs unrelated applications, so adding four unbounded Node
processes would turn a product release into a host-wide availability risk.

Production authentication, Amap, model execution and telemetry reject local
substitutes. A deployable process is therefore not the same as an activated
capability. The release needs one explicit topology, resource boundary,
credential contract, data migration path and rollback order.

## Outcome

Provide an immutable, reversible internal production deployment for the
accepted modular monolith:

- Next.js serves `app.geohdp.com`; browser API traffic uses `/api/*` and Nginx
  removes the prefix before forwarding to the loopback API;
- payment notifications keep their dedicated callback process and database
  grants;
- API, Web, product Worker and recharge Worker have separate systemd units and
  bounded resources;
- production migrations preserve existing payment facts, and the controlled
  media importer loads its hash-locked first batch;
- accounts are created only through Identity Bootstrap, Governance and the real
  Challenge flow;
- external capabilities activate only with rotated credentials and controlled
  runtime evidence.
- the optimization journey may explicitly activate a no-provider `demo` Writer
  so an internal presentation can produce and edit a draft without claiming a
  real Writing Agent.
- the public pilot surface is protected by an outer Basic Auth gate; inside it,
  the normal Identity Challenge/session flow may use an explicit internal-demo
  adapter without waiting for SMS/CAPTCHA approval.

## Scope

- `deploy/application/` Nginx, systemd, environment, database and operating
  contracts.
- Deployment contract tests that protect the callback, API-prefix and resource
  boundaries.
- Shared-host capacity and recovery rules.
- Production data and activation sequence for media, accounts, Alipay, Amap,
  model execution and metadata-only Langfuse telemetry.

## Non-goals

- No payment, point, media or Identity domain redesign.
- No development-mode authentication, direct account SQL or synthetic Session
  creation in production.
- No WeChat order creation until its own merchant acceptance succeeds.
- No activation of agency acquisition, withdrawal, automatic invoicing or
  external publication authority without their owning release Gates.
- No professional Writing Skill, real model-backed Writer, material parsing or
  automatic article publication.
- No deterministic substitute for the real model sampling and multi-platform
  parsing Worker.

## Ownership

Issue #141 owns this deployment. Issue #64 continues to own the real SMS and
CAPTCHA capability, while Issue #77 continues to own payment semantics and
channel acceptance. The deployment consumes those owners without redefining
them.
