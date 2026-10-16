-- 062: Subdoména farnosti = e-mailová schránka farnosti (rozhodnutie 2026-10-16: e-mail je zdroj pravdy).
-- bela@dcza.sk → bela.dcza.sk; bodky a podčiarkovníky v mene schránky → pomlčka (subdoména musí byť
-- jedna úroveň: zilina.mesto@dcza.sk → zilina-mesto.dcza.sk). Farnosti bez adresy @dcza.sk subdoménu nemenia.
-- Trigger prepočíta subdoménu pri každej zmene e-mailu (admin, schválený návrh farnosti, import).

CREATE OR REPLACE FUNCTION public.parish_subdomain_from_email(p_email TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_email ~* '^[a-z0-9._-]+@dcza\.sk$'
    THEN trim(both '-' from regexp_replace(lower(split_part(p_email, '@', 1)), '[._-]+', '-', 'g'))
  END
$$;

CREATE OR REPLACE FUNCTION public.parishes_sync_subdomain()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  derived TEXT := public.parish_subdomain_from_email(NEW.email);
BEGIN
  IF derived IS NOT NULL AND derived <> '' THEN
    NEW.subdomain := derived;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_parishes_sync_subdomain ON public.parishes;
CREATE TRIGGER trg_parishes_sync_subdomain
  BEFORE INSERT OR UPDATE OF email, subdomain ON public.parishes
  FOR EACH ROW EXECUTE FUNCTION public.parishes_sync_subdomain();

-- jednorazové zosúladenie (testovacia farnosť sa nemení – nemá adresu @dcza.sk)
UPDATE public.parishes
SET subdomain = public.parish_subdomain_from_email(email)
WHERE public.parish_subdomain_from_email(email) IS NOT NULL
  AND subdomain IS DISTINCT FROM public.parish_subdomain_from_email(email);

COMMENT ON COLUMN public.parishes.subdomain IS 'Subdoména farnosti = meno e-mailovej schránky @dcza.sk (trigger trg_parishes_sync_subdomain, 062); bez adresy @dcza.sk ručne';
