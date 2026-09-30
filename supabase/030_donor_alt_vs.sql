-- 030: Ďalšie (staré) variabilné symboly darcu.
-- Pri zlúčení duplicitných kariet darcu si ponechaná karta pamätá VS zlúčenej karty –
-- platby s ktorýmkoľvek z nich sa spárujú s ňou (fio-sync, XML import, VS v popise).

ALTER TABLE public.donors
  ADD COLUMN IF NOT EXISTS alt_variable_symbols TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_donors_alt_variable_symbols
  ON public.donors USING GIN (alt_variable_symbols);

COMMENT ON COLUMN public.donors.alt_variable_symbols IS 'Ďalšie VS darcu (napr. zo zlúčenej duplicitnej karty) – párujú sa rovnako ako variable_symbol';
