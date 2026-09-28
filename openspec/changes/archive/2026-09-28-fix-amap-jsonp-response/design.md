# Owner-local proxy repair

Owner: Web's existing Amap security proxy. No new interface or dependency.

Validate one ASCII JavaScript identifier/dotted identifier callback, bounded to
200 characters. Duplicate/empty/invalid callbacks return 400 before fetch.
For callback requests, buffer the upstream text, verify the exact callback
wrapper and JSON payload, and return `text/javascript; charset=utf-8`.
Accept ordinary whitespace and an optional trailing semicolon. A mismatch or
non-JSON payload returns 502; it never becomes executable. Non-callback
responses retain the current streaming behavior and upstream MIME/status.

The existing 10-second abort covers JSONP body validation. Search responses are
bounded by the provider's existing POI pagination; do not add another provider,
expand the allowlist or weaken `nosniff`. No data/migration boundary is touched.

Architecture review: ready. The reachable risk from making JSONP executable is
callback/response injection, addressed at this owner-local seam. The smallest
proof is a valid-JSONP MIME regression plus invalid/duplicate/mismatched and
non-JSON rejection; existing credential/path tests remain in force. Browser
search→selection→backend verification proves the actual failure boundary.

Release: build the immutable Linux x64 Web on the local Linux container, never
on the 4-GiB production host. Hold shared-host then GEO deploy locks; preserve
current release and runtime environments, publish the reviewed Web and restart
Web only. Verify public/API/CRM baselines and map flow. On regression, restore
the previous release pointer and restart Web. Backend/DB data are unchanged.
