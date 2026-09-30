-- 029: Počet podporovateľov výzvy = skutoční platitelia.
-- Dary na anonymných / zástupných darcoch („Anonymný darca“, „DARY Donátor“, „darca výzvy“
-- zo starého webu s VS výzvy, napr. „Lectio Divina“) sa nerátajú ako jeden darca,
-- ale podľa účtu platiteľa (IBAN z bankovej platby); bez IBAN-u ako samostatný dar.

CREATE OR REPLACE VIEW public.v_project_stats WITH (security_invoker = true) AS
WITH pseudo AS (
  SELECT dn.id
  FROM donors dn
  WHERE dn.legacy_id IN ('ANONYMOUS_DONOR', '11770000')
     OR EXISTS (
       SELECT 1 FROM projects px
       WHERE px.legacy_variable_symbol IS NOT NULL
         AND ltrim(regexp_replace(px.legacy_variable_symbol, '\D', '', 'g'), '0')
           = ltrim(regexp_replace(COALESCE(dn.variable_symbol, ''), '\D', '', 'g'), '0')
     )
)
SELECT
  p.id AS project_id,
  (p.legacy_collected_amount + COALESCE(SUM(d.amount), 0))::numeric(12,2) AS collected_amount,
  (p.legacy_supporters_count + COUNT(DISTINCT
    CASE
      WHEN d.id IS NULL THEN NULL
      WHEN d.donor_id IS NULL OR d.donor_id IN (SELECT id FROM pseudo) THEN
        COALESCE('iban:' || NULLIF(upper(replace(bt.counterparty_iban, ' ', '')), ''), 'don:' || d.id::text)
      ELSE 'donor:' || d.donor_id::text
    END))::int AS supporters_count,
  COUNT(d.id)::int AS donations_count,
  MAX(d.donation_date) AS last_donation_at,
  CASE
    WHEN p.target_amount IS NOT NULL AND p.target_amount > 0
    THEN LEAST(100, ROUND((p.legacy_collected_amount + COALESCE(SUM(d.amount), 0)) / p.target_amount * 100, 1))
  END AS percent
FROM public.projects p
LEFT JOIN public.donations d ON d.project_id = p.id
LEFT JOIN public.bank_transactions bt ON bt.id = d.bank_transaction_id
GROUP BY p.id;

COMMENT ON VIEW public.v_project_stats IS 'Vyzbieraná suma a počet podporovateľov výzvy = legacy hodnoty + živé dary; anonymní/zástupní darcovia sa rátajú podľa IBAN-u platiteľa';
