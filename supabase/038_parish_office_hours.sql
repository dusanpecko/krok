-- 038: Úradné hodiny farskej kancelárie – nový druh položky rozpisu (parish_schedule_items).
-- Využíva rovnaké režimy (cez rok / leto), dni a časy od–do ako bohoslužby; farnosť ich mení
-- hneď v záložke Bohoslužby. Na verejnej stránke sú pri „Farský úrad“, nie medzi bohoslužbami.

ALTER TYPE parish_service_type ADD VALUE IF NOT EXISTS 'office';
