-- 061: Heslo k celebretu (2026-10-12) – vytlačené na karte pod QR kódom.
-- Overovacia stránka bez hesla ukáže len stav VALET / NON VALET, číslo a platnosť;
-- meno, fotku, dátumy a text až po zadaní hesla. Náhodné 4 číslice (nie z dátumu narodenia).

ALTER TABLE public.clergy_celebrets ADD COLUMN IF NOT EXISTS access_code TEXT CHECK (access_code ~ '^[0-9]{4}$');
UPDATE public.clergy_celebrets SET access_code = lpad((floor(random() * 10000))::int::text, 4, '0') WHERE access_code IS NULL;
ALTER TABLE public.clergy_celebrets ALTER COLUMN access_code SET NOT NULL;

COMMENT ON COLUMN public.clergy_celebrets.access_code IS 'Heslo z karty – odomkne údaje na overovacej stránke (stav platnosti je verejný)';
