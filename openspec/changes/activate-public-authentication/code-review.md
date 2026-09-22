# Fixed-diff code review

Review date: 2026-09-22. Compared with `main@bed4d41`.

## Verdict

No unresolved blocking finding in the reviewed code diff. Production provider
and release gates remain intentionally open and are tracked separately in
`tasks.md`.

## Requirement fidelity

- Anonymous reachability is changed only at the Nginx owner; protected API
  authorization is unchanged.
- New accounts still enter through the existing terminal-customer flow.
- CAPTCHA stays server-authoritative and precedes Challenge persistence.
- The early budget read prevents an already exhausted period from purchasing
  another CAPTCHA call; the locked transactional check prevents concurrent SMS
  attempts from exceeding the cap.
- Persisted attempts count conservatively even when a later SMS submission is
  rejected or uncertain.
- Public errors omit period, count and provider detail. Warning and telemetry
  omit mobile, code, CAPTCHA value, credentials and raw risk observations.
- Callback routes, payment schemas and payment logic are unchanged.

## Engineering review

- Database constraints enforce one non-negative singleton state row; migration
  initialization uses the accepted Asia/Shanghai policy and retained Challenge
  facts.
- The repository interface exposes budget semantics without leaking Prisma or
  SQL to the application service.
- Nginx uses shared IP-keyed zones across both Challenge entry paths, a separate
  Session-completion zone and exact locations before the general API proxy.
- Swagger/Foundation removal is keyed to runtime environment and preserves
  local/test diagnostics.
- Privacy UI reuses current public styling and links before the side effect.
- No generated secret, credential, full mobile or OTP is added to repository
  content or evidence.

## Findings resolved during review

1. Removed broad Prisma formatter churn outside the new budget model.
2. Corrected the rollover test so it executes and verifies an elapsed-period
   reset rather than overwriting the stale state before the assertion.
3. Added proof that a pre-exhausted budget invokes neither human verification
   nor Challenge persistence.
4. Reworded the deployment owner from internal pilot to controlled public
   service so documentation matches the approved release boundary.

