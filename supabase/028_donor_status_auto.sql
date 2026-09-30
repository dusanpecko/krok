-- 028: Automatický stav darcu podľa darov.
--   aktívny   = dar za posledných 12 mesiacov (nastaví sa hneď pri novom dare – trigger)
--   neaktívny = posledný dar starší ako 12 mesiacov, alebo bez darov a založený pred > 12 mesiacmi
--               (prepočet refresh_donor_statuses() – denne cez cron /api/cron/sync-bank)
-- Stav 'suspended' (pozastavený) sa nikdy nemení automaticky.

CREATE OR REPLACE FUNCTION public.refresh_donor_statuses()
RETURNS TABLE (activated INTEGER, deactivated INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_act INTEGER;
  v_deact INTEGER;
BEGIN
  WITH last AS (
    SELECT dn.id, dn.status, dn.created_at, MAX(d.donation_date) AS last_date
    FROM donors dn
    LEFT JOIN donations d ON d.donor_id = dn.id
    GROUP BY dn.id
  ), upd AS (
    UPDATE donors SET status = 'active', updated_at = now()
    FROM last
    WHERE donors.id = last.id AND last.status = 'inactive'
      AND last.last_date >= (current_date - INTERVAL '12 months')
    RETURNING 1
  )
  SELECT count(*) INTO v_act FROM upd;

  WITH last AS (
    SELECT dn.id, dn.status, dn.created_at, MAX(d.donation_date) AS last_date
    FROM donors dn
    LEFT JOIN donations d ON d.donor_id = dn.id
    GROUP BY dn.id
  ), upd AS (
    UPDATE donors SET status = 'inactive', updated_at = now()
    FROM last
    WHERE donors.id = last.id AND last.status = 'active'
      AND (
        last.last_date < (current_date - INTERVAL '12 months')
        OR (last.last_date IS NULL AND last.created_at < now() - INTERVAL '12 months')
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_deact FROM upd;

  RETURN QUERY SELECT v_act, v_deact;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_donor_statuses() FROM PUBLIC, anon, authenticated;

-- Nový / zmenený dar za posledných 12 mesiacov → darca je aktívny
CREATE OR REPLACE FUNCTION public.donation_activates_donor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.donor_id IS NOT NULL AND NEW.donation_date >= (current_date - INTERVAL '12 months') THEN
    UPDATE donors SET status = 'active', updated_at = now()
    WHERE id = NEW.donor_id AND status = 'inactive';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_donation_activates_donor ON public.donations;
CREATE TRIGGER trigger_donation_activates_donor
  AFTER INSERT OR UPDATE OF donor_id, donation_date ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.donation_activates_donor();

-- Prvotný prepočet
SELECT * FROM public.refresh_donor_statuses();
