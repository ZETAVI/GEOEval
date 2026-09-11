# Public introduction site

This directory owns the small static introduction at `geohdp.com`. Publish only
`index.html`; this README and deployment records are not public website assets.
The site does not run the product, accept payments, expose login, collect forms
or connect to a database. `app.geohdp.com` remains reserved.

The owner supplied website filing `粤ICP备11067188号-12`. The footer uses the
subject filing `粤ICP备11067188号`, linked to the MIIT portal, following
[Alibaba Cloud's Guangdong guidance](https://help.aliyun.com/zh/icp-filing/basic-icp-service/support/website-to-add-the-record-number-faq).
Company name and telephone are omitted from this introductory page by the owner's
decision; this does not remove merchant identity requirements from the Alipay
application or predetermine later paid-service disclosure requirements.

## Deployment boundary

- Use `/var/www/geohdp` exclusively, with versioned `releases/<content-hash>` and
  a `current` symlink. Keep the previous release when replacing a page.
- Add one Nginx site matching exactly `geohdp.com`, with dedicated logs. Do not
  change another site's configuration, root, upstream, certificate or data.
- Do not set a wildcard or default server. The static site needs no additional
  public port or application process. Unknown paths return 404.
- Use a dedicated `acme-webroot` inside this directory for certificate validation.
  The existing Certbot webroot method allows validation without stopping Nginx;
  avoid the standalone authenticator or automatic edits to other websites.
- Once the dedicated certificate exists, serve the page over HTTPS. HTTP serves
  only the ACME challenge path and redirects other requests to the fixed domain.
- Test the complete Nginx configuration before reload. Verify this domain and
  the existing sites after the change. A DNS record, successful upload or
  successful syntax check alone does not prove public HTTPS availability.
- For an initial deployment failure, remove only this site's newly enabled
  configuration and test before reload. For later page failures, restore the
  previous `current` target. Preserve other applications and their data.

The selected host, before/after observations, actual artifact hashes, DNS receipt,
certificate/renewal checks and release outcome belong to the owning Issue/PR's
deployment evidence. No credentials or private keys belong in this directory.

The actual page explicitly states that online service and recharge are not yet
open. Its publication helps payment preparation but does not prove application
approval, product entitlement or real transaction readiness. Refer to the
[Alipay product conditions](https://opendocs.alipay.com/open/270/105898) for the
application's actual website and service-material requirements. Replace this
page when the full public website takes over; do not maintain two competing
sources for the same domain.
