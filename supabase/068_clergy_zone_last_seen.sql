-- 068: Kňazská zóna – kedy bol kňaz naposledy v zóne (admin → Kňazská zóna → Kňazi a prístupy).
-- Zapisuje getZoneAccess pri návšteve stránky zóny alebo stiahnutí súboru (najviac raz za 10 minút).

ALTER TABLE public.clergy ADD COLUMN IF NOT EXISTS zone_last_seen_at timestamptz;

COMMENT ON COLUMN public.clergy.zone_last_seen_at IS 'Posledná návšteva kňazskej zóny (stránka alebo súbor), zapisuje aplikácia.';
