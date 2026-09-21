# Tasks

- [x] Record the current release, services, resource use, certificate and data
      counts without changing production.
- [x] Identify the canonical media workbook and verify its locked hash.
- [x] Fix the public topology, process ownership, resource budget and rollback
      order.
- [x] Add and verify application Nginx, systemd, environment and database-role
      contracts.
- [ ] Rebase after PR #134 merges and build a Linux x64 immutable release.
- [ ] Back up production, deploy the release, apply migrations and runtime
      grants, then verify existing payment facts.
- [ ] Protect and activate API/Web with Basic Auth plus demo Challenge delivery;
      verify terminal/internal role isolation through normal Sessions.
- [ ] Activate the explicit demo Writer and verify one saved-input → generated
      draft → edit → confirmation journey without provider traffic.
- [ ] Import the first media batch and create approved role/demo accounts through
      owned interfaces.
- [ ] Activate Alipay recovery and complete a customer-page small-payment proof.
- [ ] Rotate and install Amap/model/Langfuse credentials; complete bounded
      provider probes before starting product Worker traffic.
- [ ] Reconcile current deployment documentation, Issue/PR evidence, release
      record and workspace exit state.
