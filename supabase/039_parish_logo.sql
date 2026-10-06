-- 039: Erb / logo farnosti – farnosť ho nahrá v zóne farnosti (Prezentácia) a ukladá hneď (LIVE pole).
-- Na verejnej stránke má v hlavičke a pätičke prednosť pred titulnou fotkou (image_url).
-- Čítanie ide cez service role s explicitným zoznamom stĺpcov (lib/parishes/public.ts) – column GRANT netreba.

ALTER TABLE public.parishes ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN public.parishes.logo_url IS 'Erb alebo logo farnosti (URL nahratého obrázka) – hlavička a pätička stránky farnosti';
