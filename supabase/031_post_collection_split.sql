-- 031: Rozúčtovanie hromadných platieb (inkaso Slovenskej pošty) na jednotlivých darcov.
-- Pošta pošle jednu platbu za viac darcov (mínus odmena) + PDF „Opis úhrad k prevodu“.
--  - bank_transactions.category = 'post_collection' – rozúčtovaná hromadná platba (nepáruje sa na darcu)
--  - donations.source_bank_transaction_id – dary vzniknuté rozúčtovaním (bank_transaction_id ostáva NULL,
--    takže unikátny index 1 platba = 1 dar z migrácie 026 platí ďalej pre bežné platby)
--  - bank_transactions.split_fee – odmena pošty (súčet darov − prijatá suma)
--  - donors.post_ecp – evidenčné číslo platiteľa (EČP) z PDF; ďalšie mesiace sa páruje podľa neho

ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS 'post_collection';

ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS source_bank_transaction_id UUID REFERENCES public.bank_transactions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_donations_source_bank_tx ON public.donations (source_bank_transaction_id);

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS split_fee NUMERIC(12,2);

ALTER TABLE public.donors
  ADD COLUMN IF NOT EXISTS post_ecp TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS donors_post_ecp_key ON public.donors (post_ecp) WHERE post_ecp IS NOT NULL;

COMMENT ON COLUMN public.donations.source_bank_transaction_id IS 'Hromadná platba (napr. inkaso pošty), z ktorej dar vznikol rozúčtovaním';
COMMENT ON COLUMN public.bank_transactions.split_fee IS 'Pri rozúčtovanej hromadnej platbe: odmena/poplatok (súčet darov − prijatá suma)';
COMMENT ON COLUMN public.donors.post_ecp IS 'Evidenčné číslo platiteľa (EČP) Slovenskej pošty – párovanie inkasa';
