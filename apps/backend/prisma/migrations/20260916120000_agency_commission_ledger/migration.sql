CREATE TABLE agency_commissions (
 order_id UUID PRIMARY KEY REFERENCES order_settlements(order_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 agent_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 rate_bps INTEGER NOT NULL CHECK(rate_bps BETWEEN 0 AND 10000),
 funded_points INTEGER NOT NULL CHECK(funded_points>=0),
 amount_fen BIGINT NOT NULL CHECK(amount_fen>=0),
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX agency_commissions_agent_account_id_created_at_order_id_idx ON agency_commissions(agent_account_id,created_at,order_id);
CREATE FUNCTION check_agency_commission() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_agent UUID; source_rate INTEGER; net_points INTEGER;
BEGIN
 SELECT a.agent_account_id,a.rate_bps,-p.funded_delta-COALESCE(r.funded_delta,0) INTO source_agent,source_rate,net_points
 FROM publishing_order_agency a JOIN order_settlements s ON s.order_id=a.order_id JOIN point_changes p ON p.publishing_order_id=a.order_id LEFT JOIN point_changes r ON r.returned_order_id=a.order_id
 WHERE a.order_id=NEW.order_id AND a.agent_active AND a.commission_enabled;
 IF NOT FOUND OR source_agent IS DISTINCT FROM NEW.agent_account_id OR source_rate IS DISTINCT FROM NEW.rate_bps OR net_points IS DISTINCT FROM NEW.funded_points OR NEW.amount_fen IS DISTINCT FROM (net_points::bigint*source_rate+500)/1000 THEN RAISE EXCEPTION 'commission must match final purchase facts'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER agency_commission_source BEFORE INSERT ON agency_commissions FOR EACH ROW EXECUTE FUNCTION check_agency_commission();
CREATE FUNCTION preserve_agency_commission() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'commission ledger is immutable'; END; $$;
CREATE TRIGGER agency_commission_immutable BEFORE UPDATE OR DELETE ON agency_commissions FOR EACH ROW EXECUTE FUNCTION preserve_agency_commission();
