-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migrácia: Odkaz na stránku podporeného projektu (web, sociálna sieť…)
-- ============================================================

ALTER TABLE public.supported_projects ADD COLUMN IF NOT EXISTS link_url TEXT;

-- Doplnenie odkazov známych z pôvodnej stránky mojkrok.dcza.sk (rok 2025)
UPDATE public.supported_projects SET link_url = 'https://godzone.sk/' WHERE year = 2025 AND name = 'GODZONE tour 2025';
UPDATE public.supported_projects SET link_url = 'https://www.lectio.one/' WHERE year = 2025 AND name = 'Lectio divina';
UPDATE public.supported_projects SET link_url = 'https://instagram.com/pkt_das' WHERE year = 2025 AND name = 'Diecézna animátorská škola';
UPDATE public.supported_projects SET link_url = 'https://www.youtube.com/results?search_query=slovko+diec%C3%A9ze' WHERE year = 2025 AND name = 'Jubilejné slovko diecézy';
UPDATE public.supported_projects SET link_url = 'https://www.facebook.com/esterzenam/' WHERE year = 2025 AND name = 'ESTER – ženské stretnutia';
UPDATE public.supported_projects SET link_url = 'https://www.tkkza.sk/' WHERE year = 2025 AND name = 'Jubileum umelcov – TKK';
UPDATE public.supported_projects SET link_url = 'https://www.zahradavnas.sk/' WHERE year = 2025 AND name = 'ZÁHRADA – rozvojový program';
UPDATE public.supported_projects SET link_url = 'http://schoenstatt-sk.eu/?page_id=142' WHERE year = 2025 AND name = 'Putovné kaplnky Schoenstatt';
