-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migration: BEZPEČNOSTNÁ OPRAVA – odobratie prístupu anon k RPC funkciám
-- ============================================================
--
-- PROBLÉM (kritický únik osobných údajov / GDPR):
--   Funkcie search_donors_unaccent() a get_suggested_matches() sú
--   SECURITY DEFINER (obchádzajú RLS) a mali GRANT EXECUTE ... TO anon.
--   Ktokoľvek s verejným anon kľúčom (je súčasťou JS balíka v prehliadači)
--   tak vedel vyčítať mená, e-maily, IBAN, adresy a sumy VŠETKÝCH darcov.
--
-- OPRAVA:
--   Obe funkcie volá iba server action (banka/actions.ts) cez
--   SERVICE_ROLE kľúč, preto stačí prístup pre service_role.
--   Odoberáme EXECUTE anonymnému aj prihlásenému rolu aj PUBLIC.
-- ============================================================

-- 1. search_donors_unaccent
REVOKE ALL ON FUNCTION search_donors_unaccent(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION search_donors_unaccent(text) FROM anon;
REVOKE EXECUTE ON FUNCTION search_donors_unaccent(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION search_donors_unaccent(text) TO service_role;

-- 2. get_suggested_matches
REVOKE ALL ON FUNCTION get_suggested_matches() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_suggested_matches() FROM anon;
REVOKE EXECUTE ON FUNCTION get_suggested_matches() FROM authenticated;
GRANT EXECUTE ON FUNCTION get_suggested_matches() TO service_role;

-- ============================================================
-- 3. Pohľady (Views) unikajúce cez anon kľúč
-- ============================================================
-- v_donor_summary a v_monthly_summary sú vytvorené bez security_invoker,
-- takže bežia s právami vlastníka a OBCHÁDZAJÚ RLS na donors/bank_transactions.
-- Cez anon kľúč tak boli čitateľné mená a e-maily VŠETKÝCH 394 darcov
-- (v_donor_summary) a mesačné finančné súhrny (v_monthly_summary).
-- Appka tieto pohľady nepoužíva (žiadny výskyt v src/), takže ich
-- uzatvárame úplne pre anon aj authenticated a zároveň zapíname
-- security_invoker, aby prípadné budúce použitie ctilo RLS.

ALTER VIEW v_donor_summary SET (security_invoker = true);
ALTER VIEW v_monthly_summary SET (security_invoker = true);

REVOKE ALL ON v_donor_summary FROM anon, authenticated;
REVOKE ALL ON v_monthly_summary FROM anon, authenticated;

GRANT SELECT ON v_donor_summary TO service_role;
GRANT SELECT ON v_monthly_summary TO service_role;
