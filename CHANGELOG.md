# Changelog

All notable audience-facing changes will be recorded here. Internal refactors, tests, formatting, process setup, and research are omitted unless they change observable behavior or operational risk.

## Unreleased

No unreleased audience-facing changes.

## 2026-09-28

### Fixed

- Controlled production pilot: Amap store search now returns validated JSONP with
  the JavaScript response type required by browser MIME checks. Customers can
  search, select a result and verify its address while `nosniff` remains enabled.
