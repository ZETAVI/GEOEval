# Source brief

## Decision

Use the existing application-owned Amap proxy route for the JS security code and
Next.js standalone output for Web deployment. Keep the Amap code and every
provider credential outside Git and outside client bundles.

## Current primary sources

- Amap recommends storing the JS security code on the server and forwarding the
  fixed `/_AMapService` path; plaintext browser configuration is described as
  unsuitable for production:
  https://lbs.amap.com/api/javascript-api-v2/guide/abc/jscode
- Amap Web Service calls require a separate Web Service Key:
  https://lbs.amap.com/api/webservice/create-project-and-key
- Next.js standalone output contains the minimal server but does not copy
  `public` or `.next/static`; those directories must be copied into the
  standalone tree before running `server.js`:
  https://nextjs.org/docs/app/api-reference/config/next-config-js/output

Accessed 2026-09-21 China Standard Time.

## Design consequences

- `NEXT_PUBLIC_AMAP_JS_KEY` is a public release build input; the security code
  is a server runtime secret consumed only by the Next proxy route.
- The backend Amap Web Service Key remains a separate server secret.
- The release builder copies `public` and `.next/static` into the monorepo
  standalone application directory and records the build revision.

## Refresh boundary

Refresh these sources if Amap changes the fixed proxy prefix/security scheme,
the product begins using custom or overseas map endpoints, or the deployed
Next.js major/minor changes its standalone layout.
