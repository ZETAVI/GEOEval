# Architecture review

## Contract

The review covers Issue #141's deployment configuration and active design. The
accepted domain behavior remains owned by current specs and code; this change
only composes their production entry points. Payment callbacks remain governed
by `deploy/recharge-callback`, and Identity activation remains governed by Issue
#64.

## Affected boundaries

- Public HTTP routing among callback, API and Web.
- Process, credential and resource isolation on the shared host.
- Runtime DML versus migration ownership in PostgreSQL.
- Immutable release, first media import and account creation paths.
- External provider activation and rollback ordering.

## Findings

### Resolved must-fix: Web and API path collision

Both Next and the backend own `/recharges` and other root paths. Sending all
root paths to either process would make the other contract unreachable. The
narrow `/api` browser base with one exact Next acquisition exception resolves
the collision without creating a second Cookie/CORS authority.

### Resolved must-fix: callback privilege expansion

Running the full API on the existing callback process would expose payment
private keys and business-table access to the public notification ingress. The
callback remains a separate process, user, port and grant set; only API and
recharge Worker receive the Alipay private key.

### Resolved must-fix: unbounded shared-host expansion

The callback-first slice cannot safely absorb four unconstrained processes.
Each new unit now has a V8 and systemd ceiling, the shared slice has an explicit
pilot ceiling, and activation stops after each process for measurement.

### Residual release Gates

- The internal demo Identity exception requires the outer Basic Auth gate and
  must be removed before general public access or real SMS/CAPTCHA activation.
- Amap/model/Langfuse values disclosed in chat must be rotated before install.
- The Model Studio workspace-specific base URL and approved account/demo mobile
  identities are still external inputs.
- Linux x64 artifact assembly, runtime memory, media apply, real payment and
  provider calls remain unverified until deployment.

### Resolved release gate: article generation stops in production

The accepted GEO Optimization seam already separates the Writer adapter from
input snapshots, generation execution and article state. The observed demo
failure came from the production default selecting the disabled adapter, not
from missing form persistence or a broken article lifecycle. Adding a second
order path, direct article insert or API-only mock would duplicate ownership and
bypass idempotency/revision checks.

The bounded fix is an explicit `demo` runtime mode mapped to the existing
deterministic adapter. It preserves the owner module and all durable lifecycle
rules, performs no external effect and cannot be confused with the local/test
`deterministic` setting in production configuration. Disabled remains the
default and unsupported modes still fail startup, so the pilot cannot enable
demo generation accidentally. Professional Writing Skill recovery remains with
Issue #11.

### Resolved pilot gate: account access before SMS/CAPTCHA approval

Creating direct Sessions or adding a separate demo-account endpoint would split
Identity ownership and bypass its expiry, role and audit controls. The pilot
instead reuses the existing deterministic Challenge adapter behind a required
Nginx Basic Auth boundary. Only explicit internal-demo configuration permits the
production exception; normal production still rejects deterministic delivery
and disabled human verification. Provider callback routes stay outside Basic
Auth because their own signatures are the authentication mechanism.

The exception is limited to Identity and the no-provider article Writer. Real
sampling, multi-platform parsing and synthesis remain on the production Worker
and its existing Provider contracts.

## Conclusion

`ready with follow-up` for an independently reviewable deployment-config PR.
The configuration does not authorize public activation by itself. The residual
items are named runtime and external Gates in Issue #141 rather than reasons to
redesign the business modules.
