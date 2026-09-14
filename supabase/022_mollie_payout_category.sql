-- ============================================================
-- KROK – Migrácia 022: kategória bankovej transakcie `mollie_payout`
-- ============================================================
-- Mollie posiela vyzbierané online dary na účet hromadne (payout) ako jednu
-- kreditnú transakciu. Tie dary sú už zaznamenané v `donations` cez
-- `online_payments`, preto sa payout NESMIE párovať na darcu ani vkladať ako dar
-- (inak by sa započítal dvakrát). Appka ho pri importe/synchronizácii označí
-- touto kategóriou a párovanie ho ignoruje.
-- ============================================================

ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS 'mollie_payout';

-- Mesačný prehľad: payout nie je „nespárovaná“ platba čakajúca na spracovanie.
-- (Pozn.: hodnotu enumu nemožno použiť v tej istej transakcii, v ktorej bola
--  pridaná – porovnávame preto cez text.)
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
  EXTRACT(YEAR FROM booking_date)::INT AS year,
  EXTRACT(MONTH FROM booking_date)::INT AS month,
  SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END) -
  SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) AS net,
  COUNT(*) FILTER (WHERE direction = 'credit') AS credit_count,
  COUNT(*) FILTER (WHERE direction = 'debit') AS debit_count,
  COUNT(*) FILTER (
    WHERE direction = 'credit' AND matched = false AND category::text <> 'mollie_payout'
  ) AS unmatched_count
FROM bank_transactions
GROUP BY year, month
ORDER BY year DESC, month DESC;
