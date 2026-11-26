-- 075: Výnimky z pravidla „prístup len pre @dcza.sk“ – spravuje admin v Kňazskej zóne → Výnimky.
-- Biskupi (kbs.sk), rehoľníci (saleziáni, verbisti…), testovací účet. Prihlasujú sa e-mailom a heslom.
-- Ak je výnimka priradená kňazovi z registra, použije ju pozvánka do kňazskej zóny aj prístup do správy
-- farskej stránky podľa schematizmu (namiesto diecézneho e-mailu z registra).

CREATE TABLE IF NOT EXISTS public.access_email_exceptions (
  email TEXT PRIMARY KEY CHECK (email = lower(btrim(email)) AND email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  clergy_id UUID REFERENCES public.clergy(id) ON DELETE SET NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- jedna výnimka na osobu z registra
CREATE UNIQUE INDEX IF NOT EXISTS uq_access_email_exceptions_clergy ON public.access_email_exceptions (clergy_id) WHERE clergy_id IS NOT NULL;
-- len server (service role); bez politík
ALTER TABLE public.access_email_exceptions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.access_email_exceptions (email, clergy_id, note) VALUES
  ('dusan@pecko.me', NULL, 'testovací účet (IT)'),
  ('galis@kbs.sk', (SELECT id FROM public.clergy WHERE id = '542b09ea-eb21-43b3-b439-f180d6ad4050'), 'diecézny biskup – prihlásenie e-mailom a heslom'),
  ('beno@kbs.sk', NULL, 'biskup – priradiť k osobe v registri')
ON CONFLICT (email) DO NOTHING;

-- Zmena prístupu podľa schematizmu: prihlásenie cez Google len pre @dcza.sk, inak e-mail a heslo
UPDATE public.email_templates
SET body = replace(body,
      '<p><strong>Ako sa prihlásiť:</strong> otvorte odkaz nižšie a kliknite na tlačidlo <strong>„Prihlásiť sa cez Google“</strong>. Vyberte svoj diecézny účet <strong>{{email}}</strong>.</p>',
      '{{#google}}<p><strong>Ako sa prihlásiť:</strong> otvorte odkaz nižšie a kliknite na tlačidlo <strong>„Prihlásiť sa cez Google“</strong>. Vyberte svoj diecézny účet <strong>{{email}}</strong>.</p>{{/google}}{{^google}}<p><strong>Ako sa prihlásiť:</strong> otvorte odkaz nižšie a prihláste sa e-mailom <strong>{{email}}</strong> a heslom. Ak si heslo nepamätáte, použite „Zabudli ste heslo?“.</p>{{/google}}'),
    available_variables = available_variables || '["{{#google}}"]'::jsonb,
    updated_at = now()
WHERE template_key = 'parish_access_clergy_changed' AND body NOT LIKE '%{{#google}}%';

-- staré odkazy na mojkrok.sk v pozvánkach s heslom (kňazská zóna a správa farskej stránky sú na dcza.sk)
UPDATE public.email_templates
SET body = replace(replace(body, 'na stránke mojkrok.sk', 'na stránke dcza.sk'), 'Vášmu účtu na stránke mojkrok.sk', 'Vášmu účtu na stránke dcza.sk'),
    updated_at = now()
WHERE template_key IN ('clergy_zone_invite', 'clergy_zone_granted', 'parish_access_invite', 'parish_access_granted');
