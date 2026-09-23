# Verification

Local evidence on 2026-09-23 (China time), from the Issue #161 branch:

- Backend configuration and Alibaba adapter tests: 26 passed.
- Identity/PostgreSQL integration: 23 passed; routed demo mobile retained its
  original account/role, absent demo mobile could not register, wrong mobile
  could not consume its code, ordinary mobile used normal delivery, and expiry
  stopped routing.
- Backend and Web typecheck, production build, Web suite (243 tests),
  formatting and project framework validation: passed.
- Full backend suite: 965 passed, 16 skipped, one unrelated callback-host
  cleanup test timed out in `afterEach`; isolated rerun reproduced that same
  callback-only timeout. No callback source was changed in this diff. The PR's
  required CI remains the integration authority for that environment.

Not yet verified: live SMS delivery to the designated recipient, human-entered
OTP/Session for each demo role, production rollback, and route expiry on the
named host. These are release checks, not local-test claims.
