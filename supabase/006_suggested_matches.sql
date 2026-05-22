-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migration: Návrhy na automatické párovanie platieb (smart match)
-- ============================================================

-- Vytvorenie RPC funkcie, ktorá vráti všetky nespárované platby s ich najlepšími navrhnutými darcami
CREATE OR REPLACE FUNCTION get_suggested_matches()
RETURNS TABLE (
  transaction_id UUID,
  booking_date DATE,
  counterparty_name TEXT,
  counterparty_iban TEXT,
  amount DECIMAL(12,2),
  variable_symbol TEXT,
  remittance_info TEXT,
  
  donor_id UUID,
  first_name TEXT,
  last_name TEXT,
  donor_variable_symbol TEXT,
  city TEXT,
  match_reason TEXT,
  match_confidence INT
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_suggestions AS (
    SELECT 
      t.id AS tx_id,
      t.booking_date AS tx_date,
      t.counterparty_name AS tx_name,
      t.counterparty_iban AS tx_iban,
      t.amount AS tx_amount,
      t.variable_symbol AS tx_vs,
      t.remittance_info AS tx_info,
      
      d.id AS d_id,
      d.first_name AS d_fname,
      d.last_name AS d_lname,
      d.variable_symbol AS d_vs,
      d.city AS d_city,
      
      CASE
        -- 1. Zhodný IBAN (najvyššia priorita)
        WHEN t.counterparty_iban IS NOT NULL AND t.counterparty_iban <> '' 
          AND regexp_replace(d.iban, '\\s+', '', 'g') = regexp_replace(t.counterparty_iban, '\\s+', '', 'g')
          THEN 'Zhodný IBAN účtu'::TEXT
          
        -- 2. Zhodný variabilný symbol (druhá priorita)
        WHEN t.variable_symbol IS NOT NULL AND t.variable_symbol <> '' AND t.variable_symbol <> 'NOTPROVIDED'
          AND (d.variable_symbol = t.variable_symbol OR ltrim(d.variable_symbol, '0') = ltrim(t.variable_symbol, '0'))
          THEN 'Zhodný variabilný symbol'::TEXT
          
        -- 3. Meno aj priezvisko sa nachádza v protiúčte
        WHEN t.counterparty_name IS NOT NULL AND t.counterparty_name <> ''
          AND unaccent(t.counterparty_name) ILIKE '%' || unaccent(d.last_name) || '%'
          AND unaccent(t.counterparty_name) ILIKE '%' || unaccent(d.first_name) || '%'
          THEN 'Meno sa zhoduje s názvom účtu'::TEXT
          
        ELSE NULL
      END AS rsn,
      
      CASE
        WHEN t.counterparty_iban IS NOT NULL AND t.counterparty_iban <> '' 
          AND regexp_replace(d.iban, '\\s+', '', 'g') = regexp_replace(t.counterparty_iban, '\\s+', '', 'g')
          THEN 100
        WHEN t.variable_symbol IS NOT NULL AND t.variable_symbol <> '' AND t.variable_symbol <> 'NOTPROVIDED'
          AND (d.variable_symbol = t.variable_symbol OR ltrim(d.variable_symbol, '0') = ltrim(t.variable_symbol, '0'))
          THEN 90
        WHEN t.counterparty_name IS NOT NULL AND t.counterparty_name <> ''
          AND unaccent(t.counterparty_name) ILIKE '%' || unaccent(d.last_name) || '%'
          AND unaccent(t.counterparty_name) ILIKE '%' || unaccent(d.first_name) || '%'
          THEN 75
        ELSE 0
      END AS conf,
      
      ROW_NUMBER() OVER (
        PARTITION BY t.id 
        ORDER BY 
          CASE
            WHEN t.counterparty_iban IS NOT NULL AND t.counterparty_iban <> '' 
              AND regexp_replace(d.iban, '\\s+', '', 'g') = regexp_replace(t.counterparty_iban, '\\s+', '', 'g')
              THEN 100
            WHEN t.variable_symbol IS NOT NULL AND t.variable_symbol <> '' AND t.variable_symbol <> 'NOTPROVIDED'
              AND (d.variable_symbol = t.variable_symbol OR ltrim(d.variable_symbol, '0') = ltrim(t.variable_symbol, '0'))
              THEN 90
            WHEN t.counterparty_name IS NOT NULL AND t.counterparty_name <> ''
              AND unaccent(t.counterparty_name) ILIKE '%' || unaccent(d.last_name) || '%'
              AND unaccent(t.counterparty_name) ILIKE '%' || unaccent(d.first_name) || '%'
              THEN 75
            ELSE 0
          END DESC
      ) as rn
      
    FROM bank_transactions t
    CROSS JOIN donors d
    WHERE t.matched = false 
      AND t.direction = 'credit'
  )
  SELECT 
    tx_id, tx_date, tx_name, tx_iban, tx_amount, tx_vs, tx_info,
    d_id, d_fname, d_lname, d_vs, d_city, rsn, conf
  FROM ranked_suggestions
  WHERE rn = 1 AND conf > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_suggested_matches() TO authenticated;
GRANT EXECUTE ON FUNCTION get_suggested_matches() TO service_role;
GRANT EXECUTE ON FUNCTION get_suggested_matches() TO anon;
