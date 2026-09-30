-- 032: Prideľovanie variabilného symbolu darcu cez DB sekvenciu.
-- Predtým: v JS „max(VS) + 1“ na 5 miestach (registrácia, Mollie, admin, pošta, VS výziev) –
-- dve súbežné registrácie mohli dostať rovnaký VS (race condition, TODO P1).
-- next_donor_variable_symbol() je atomická a preskočí VS, ktoré už niekto má
-- (aj ručne pridelené alebo „ďalšie VS“ zo zlúčených kariet).

CREATE SEQUENCE IF NOT EXISTS public.donor_vs_seq;

SELECT setval(
  'public.donor_vs_seq',
  GREATEST(
    COALESCE((SELECT MAX(variable_symbol::BIGINT) FROM public.donors WHERE variable_symbol ~ '^\d{1,12}$'), 0),
    11771451
  )
);

CREATE OR REPLACE FUNCTION public.next_donor_variable_symbol()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v TEXT;
BEGIN
  LOOP
    v := nextval('public.donor_vs_seq')::TEXT;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM donors WHERE variable_symbol = v OR v = ANY (alt_variable_symbols)
    );
  END LOOP;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.next_donor_variable_symbol() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_donor_variable_symbol() TO service_role;

COMMENT ON FUNCTION public.next_donor_variable_symbol() IS 'Ďalší voľný VS darcu (atomicky, sekvencia donor_vs_seq) – volá len server (service role)';
