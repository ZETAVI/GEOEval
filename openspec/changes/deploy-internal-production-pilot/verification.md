# Verification

| Claim                                                               | Evidence                                                        | Result  | Notes                                                               |
| ------------------------------------------------------------------- | --------------------------------------------------------------- | ------- | ------------------------------------------------------------------- |
| Public route owners are disjoint                                    | `application-deployment.spec.ts`                                | Passed  | Exact callbacks, exact Next bridge, `/api` rewrite and Web fallback |
| Callback keeps its narrow trust boundary                            | application + callback deployment tests                         | Passed  | Private Alipay key appears only in API/recharge Worker units        |
| Units parse on the target host                                      | `systemd-analyze verify` against four temporary candidate units | Passed  | Only pre-existing `cloudmonitor.service` warnings were emitted      |
| Nginx parses with the target certificate and includes               | target-host `nginx -t` using a temporary top-level config       | Passed  | Candidate was neither installed nor reloaded                        |
| Runtime database grant SQL is valid                                 | local PostgreSQL execution inside `BEGIN`/`ROLLBACK`            | Passed  | No role or grant remained changed                                   |
| Environment examples match executable API/Worker config             | deployment config test with fictional credentials               | Passed  | Production, real provider and metadata-only modes parse             |
| Deployment/demo composition remains covered with callback rules     | 3 focused Vitest files, 28 tests                                | Passed  | No external calls                                                   |
| Type contracts remain valid                                         | `pnpm typecheck`                                                | Passed  | All workspaces                                                      |
| Existing backend and Web behavior remains green                     | backend 955 passed/16 skipped; Web 241 passed                   | Passed  | Local project PostgreSQL and Redis; no Provider calls               |
| Application packages compile                                        | `pnpm build`                                                    | Passed  | Local build; target Linux build remains a deployment check          |
| Project artifacts and local links are valid                         | `scripts/validate_project_framework.py`                         | Passed  | 17 cataloged Skills                                                 |
| Linux x64 immutable artifact runs                                   | target deployment                                               | Not run | Requires accepted revision and build                                |
| Explicit production demo Writer preserves the accepted article path | focused module/config/lifecycle tests and target journey        | Not run | No model call; real Writing Agent remains unavailable               |
| Production backup, migration and counts preserve facts              | target deployment                                               | Not run | Production write Gate                                               |
| Basic Auth protects demo Identity while callbacks stay reachable    | Nginx contract test plus target HTTPS probes                    | Not run | Demo Challenge still uses normal Session and role controls          |
| Media/account import and customer visibility work                   | target deployment                                               | Not run | Requires real administrator and confirmed mobile identities         |
| Alipay, Amap, AI and Langfuse work end to end                       | controlled production probes                                    | Not run | Requires rotated credentials and named cost probes                  |
| Shared services remain healthy under application load               | target operational checks                                       | Not run | Requires staged service activation                                  |

Result: **partially verified**. The proposed configuration is ready for code
review; production delivery remains unverified until the named runtime Gates are
completed.
