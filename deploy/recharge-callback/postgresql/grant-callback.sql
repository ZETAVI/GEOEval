\set ON_ERROR_STOP on

REVOKE ALL ON DATABASE geoeval FROM "geoeval-callback";
GRANT CONNECT ON DATABASE geoeval TO "geoeval-callback";

REVOKE ALL ON SCHEMA public FROM "geoeval-callback";
GRANT USAGE ON SCHEMA public TO "geoeval-callback";

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM "geoeval-callback";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM "geoeval-callback";

GRANT SELECT, INSERT
ON TABLE recharge_payment_observations
TO "geoeval-callback";

GRANT SELECT, INSERT, UPDATE
ON TABLE recharge_notification_receipts
TO "geoeval-callback";

ALTER ROLE "geoeval-callback" IN DATABASE geoeval
SET statement_timeout = '4s';
ALTER ROLE "geoeval-callback" IN DATABASE geoeval
SET lock_timeout = '1s';
ALTER ROLE "geoeval-callback" IN DATABASE geoeval
SET idle_in_transaction_session_timeout = '5s';
