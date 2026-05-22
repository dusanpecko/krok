-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migration: Vyhľadávanie darcov bez diakritiky (unaccent)
-- ============================================================

-- 1. Zapnutie rozšírenia unaccent pre odstraňovanie dĺžňov/mäkčeňov
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Vytvorenie RPC funkcie pre inteligentné vyhľadávanie
CREATE OR REPLACE FUNCTION search_donors_unaccent(search_query text)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  variable_symbol TEXT,
  city TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.first_name, d.last_name, d.email, d.variable_symbol, d.city
  FROM donors d
  WHERE 
    unaccent(d.first_name) ILIKE unaccent('%' || search_query || '%')
    OR unaccent(d.last_name) ILIKE unaccent('%' || search_query || '%')
    OR unaccent(d.first_name || ' ' || d.last_name) ILIKE unaccent('%' || search_query || '%')
    OR unaccent(d.last_name || ' ' || d.first_name) ILIKE unaccent('%' || search_query || '%')
    OR d.variable_symbol ILIKE '%' || search_query || '%'
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Priradenie prístupových práv pre API a Next.js klientov
GRANT EXECUTE ON FUNCTION search_donors_unaccent(text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_donors_unaccent(text) TO service_role;
GRANT EXECUTE ON FUNCTION search_donors_unaccent(text) TO anon;
