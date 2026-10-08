-- 047: Odstránenie textového stĺpca parishes.deanery (z 001_schema).
-- Duplikoval deanery_id → deaneries.name (overené 2026-10-08: 122 hodnôt, 0 rozdielov),
-- nečíta ho žiadny kód, pohľad ani funkcia. Názov dekanátu sa berie vždy z tabuľky deaneries.

ALTER TABLE public.parishes DROP COLUMN IF EXISTS deanery;
