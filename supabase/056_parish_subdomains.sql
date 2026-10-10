-- 056: Subdomény farností (F6 = D5, O13, § 4.4 a § 20) – <subdomena>.mojkrok.sk a <subdomena>.dcza.sk.
-- Subdoména je len vstupná adresa: middleware ju presmeruje na stránku farnosti
-- (na dcza.sk na vlastný web farnosti, ak ho má – parishes.website).
--
-- Predvolene subdoména = slug farnosti (len farnosti, nie duchovné správy – tie majú dlhé slugy;
-- subdoménu im diecéza môže nastaviť ručne v admine). Rezervované názvy sa nepriradia.

-- 1. formát a jedinečnosť
ALTER TABLE public.parishes DROP CONSTRAINT IF EXISTS parishes_subdomain_format;
ALTER TABLE public.parishes ADD CONSTRAINT parishes_subdomain_format
  CHECK (subdomain IS NULL OR (subdomain ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(subdomain) <= 63));
CREATE UNIQUE INDEX IF NOT EXISTS idx_parishes_subdomain ON public.parishes (subdomain) WHERE subdomain IS NOT NULL;

-- 2. predvolené subdomény pre farnosti
UPDATE public.parishes
SET subdomain = slug
WHERE subdomain IS NULL
  AND kind = 'parish'
  AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  AND length(slug) <= 40
  AND slug NOT IN ('www', 'test', 'beta', 'mail', 'mx', 'admin', 'api', 'app', 'dev', 'staging', 'ftp', 'smtp', 'webmail', 'autodiscover', 'farnosti');

-- 3. middleware (anon kľúč) potrebuje nájsť farnosť podľa subdomény a jej web
GRANT SELECT (subdomain, website) ON public.parishes TO anon, authenticated;

COMMENT ON COLUMN public.parishes.subdomain IS 'Subdoména farnosti (<subdomena>.mojkrok.sk / .dcza.sk) – presmerovanie na stránku farnosti; NULL = bez subdomény';
