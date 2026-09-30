-- 033: Onboarding darcu – výber farnosti a projektu (návrh farností § 6.3, fáza F1b).
-- Darca bez farnosti je po prihlásení presmerovaný na /profil/vitajte. Voľba „nepatrím do žiadnej
-- farnosti“ je platná – aby sa nepýtalo stále dokola, uloží sa čas dokončenia voľby.

ALTER TABLE public.donors
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Kto už farnosť alebo podporovaný projekt má, voľbu už urobil
UPDATE public.donors d
SET onboarding_completed_at = COALESCE(d.registered_at, d.created_at, now())
WHERE d.onboarding_completed_at IS NULL
  AND (d.parish_id IS NOT NULL OR EXISTS (SELECT 1 FROM public.donor_projects dp WHERE dp.donor_id = d.id));

COMMENT ON COLUMN public.donors.onboarding_completed_at IS 'Kedy darca potvrdil výber farnosti / projektu (aj „bez farnosti“); NULL = zobraziť /profil/vitajte';
