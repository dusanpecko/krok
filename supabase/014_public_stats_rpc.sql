-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migration: RPC get_public_stats() – verejné štatistiky bez limitu riadkov
-- ============================================================
--
-- PROBLÉM: getPublicStats() v appke načítaval riadky cez PostgREST a sčítaval
--   ich v JS. PostgREST vracia max 1000 riadkov, takže pri >1000 kreditných
--   transakciách za rok bola „Vyzbieraná suma" aj počet darcov OSEKANÉ.
--
-- RIEŠENIE: Agregácia priamo v DB (žiadny limit). Funkcia vracia:
--   - donors_count  = počet unikátnych darcov v spárovaných kreditoch tento rok
--   - total_amount  = súčet VŠETKÝCH kreditných (prichádzajúcich) platieb tento rok
--   - projects_count = počet projektov, ktoré nie sú draft
--
-- Vracia iba agregáty (žiadne osobné údaje), volá ju server action cez
-- service_role.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE (donors_count integer, total_amount numeric, projects_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  y_start date := date_trunc('year', now())::date;
  y_end   date := (date_trunc('year', now()) + interval '1 year')::date;
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT donor_id)::int
       FROM public.bank_transactions
      WHERE direction = 'credit' AND matched = true AND donor_id IS NOT NULL
        AND booking_date >= y_start AND booking_date < y_end),
    (SELECT COALESCE(SUM(amount), 0)::numeric
       FROM public.bank_transactions
      WHERE direction = 'credit'
        AND booking_date >= y_start AND booking_date < y_end),
    (SELECT COUNT(*)::int
       FROM public.projects
      WHERE status <> 'draft');
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO service_role;
