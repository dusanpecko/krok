-- 060: Celebret na plastovú kartu (CR80) podľa vzoru diecézy (2026-10-12).
-- Číslo vo formáte „RR-NNNN“ (napr. 26-0001) ako na doterajších kartách; web kúrie na rube karty.

CREATE OR REPLACE FUNCTION public.next_celebret_number(p_year INT)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT lpad((p_year % 100)::text, 2, '0') || '-' || lpad(nextval('public.celebret_number_seq')::text, 4, '0')
$$;
REVOKE ALL ON FUNCTION public.next_celebret_number(INT) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.celebret_settings ADD COLUMN IF NOT EXISTS curia_web TEXT NOT NULL DEFAULT 'www.dcza.sk';
