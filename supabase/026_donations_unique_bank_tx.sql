-- 026: Jedna bankova transakcia = najviac jeden dar.
-- Oprava chyby: pre-parovanie platby (zmena darcu / vyzvy) vkladalo novy zaznam
-- do donations namiesto upravy existujuceho → dar sa zapocital viackrat.

-- 1. Vycistenie duplikatov – ponechame najnovsi zaznam (zodpoveda aktualnemu
--    darcovi v bank_transactions), starsie zmazeme.
DELETE FROM donations d
USING (
  SELECT id, row_number() OVER (PARTITION BY bank_transaction_id ORDER BY created_at DESC) AS rn
  FROM donations
  WHERE bank_transaction_id IS NOT NULL
) x
WHERE d.id = x.id AND x.rn > 1;

-- 2. Unikatny index (NULL-y pre online/manualne dary su povolene viackrat).
--    Umoznuje upsert s onConflict: 'bank_transaction_id'.
CREATE UNIQUE INDEX IF NOT EXISTS donations_bank_transaction_id_key
  ON donations (bank_transaction_id);
