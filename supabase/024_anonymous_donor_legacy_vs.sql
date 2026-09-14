-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migrácia 024: Systémový „Anonymný darca“ + počítanie darcov výzvy
-- ============================================================
--
-- Dary prevodom s VS výzvy zo starého webu (projects.legacy_variable_symbol)
-- nemajú známeho darcu. Bankový sync ich zapíše k výzve cez tento systémový
-- záznam (donors.legacy_id = 'ANONYMOUS_DONOR'). Aby sa každý taký dar
-- počítal ako samostatný darca, pohľad v_project_stats ich počíta po jednom.
-- ============================================================

-- 1. Systémový anonymný darca (idempotentne)
INSERT INTO public.donors (legacy_id, first_name, last_name, donor_type, status, notes)
SELECT
  'ANONYMOUS_DONOR',
  'Anonymný',
  'darca',
  'individual',
  'active',
  'Systémový záznam: dary prevodom bez známeho darcu, priradené k výzve podľa VS zo starého webu. Nemazať.'
WHERE NOT EXISTS (SELECT 1 FROM public.donors WHERE legacy_id = 'ANONYMOUS_DONOR');

-- 2. v_project_stats: anonymné dary = každý dar jeden darca
CREATE OR REPLACE VIEW public.v_project_stats
WITH (security_invoker = true) AS
SELECT
  p.id AS project_id,
  (p.legacy_collected_amount + COALESCE(SUM(d.amount), 0))::numeric(12,2) AS collected_amount,
  (
    p.legacy_supporters_count
    + COUNT(DISTINCT CASE WHEN dn.legacy_id = 'ANONYMOUS_DONOR' THEN d.id::text ELSE d.donor_id::text END)
  )::int                                                                  AS supporters_count,
  COUNT(d.id)::int                                                        AS donations_count,
  MAX(d.donation_date)                                                    AS last_donation_at,
  CASE
    WHEN p.target_amount IS NOT NULL AND p.target_amount > 0
    THEN LEAST(100, ROUND((p.legacy_collected_amount + COALESCE(SUM(d.amount), 0)) / p.target_amount * 100, 1))
  END                                                                     AS percent
FROM public.projects p
LEFT JOIN public.donations d ON d.project_id = p.id
LEFT JOIN public.donors dn ON dn.id = d.donor_id
GROUP BY p.id;

COMMENT ON VIEW public.v_project_stats IS 'Vyzbieraná suma a počet darcov výzvy = legacy hodnoty + živé dary z donations (anonymné dary sa počítajú po jednom)';
