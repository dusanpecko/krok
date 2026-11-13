-- 065: Kontakty webu dcza.sk (stránka /kontakty) – namiesto statického HTML v diocese_pages.
-- Sekcia (Kúria, Tribunál…) → blok (Učtáreň, Kancelár…, spoločný e-mail/telefón, text) → osoby.
-- Osoba: ručne zadané meno (laici), kňaz z registra (clergy_id – meno a tituly z registra)
-- alebo funkcia v kúrii (body_id + body_role_match – aktuálny držiteľ podľa registra, mení sa sám).
-- Čítanie aj zápis len cez server (service role) – ako 049/063.

CREATE TABLE IF NOT EXISTS public.diocese_contact_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diocese_contact_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.diocese_contact_sections(id) ON DELETE CASCADE,
  title TEXT,                                -- „Učtáreň“, „Kancelár“ (bez nadpisu = úvod sekcie)
  emails TEXT[] NOT NULL DEFAULT '{}',       -- spoločné e-maily bloku
  phones TEXT[] NOT NULL DEFAULT '{}',
  body TEXT,                                 -- voľný text (adresa, IČO, hodiny); riadky zachované
  sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_diocese_contact_blocks_section ON public.diocese_contact_blocks (section_id, sort_order);

CREATE TABLE IF NOT EXISTS public.diocese_contact_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.diocese_contact_blocks(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'clergy', 'function')),
  name TEXT,                                 -- manual: meno s titulmi
  clergy_id UUID REFERENCES public.clergy(id) ON DELETE SET NULL,
  body_id UUID REFERENCES public.diocese_bodies(id) ON DELETE SET NULL,
  body_role_match TEXT,                      -- function: začiatok funkcie v orgáne („kancelár“); prázdne = všetci
  role TEXT,                                 -- zobrazená funkcia/poznámka („vedúca učtárne“)
  emails TEXT[] NOT NULL DEFAULT '{}',
  phones TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  CHECK (
    (source = 'manual' AND name IS NOT NULL) OR
    (source = 'clergy' AND clergy_id IS NOT NULL) OR
    (source = 'function' AND body_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_diocese_contact_people_block ON public.diocese_contact_people (block_id, sort_order);

CREATE TABLE IF NOT EXISTS public.diocese_contact_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.diocese_contact_sections(id) ON DELETE SET NULL,
  section_title TEXT NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,                      -- create | update | delete | move
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diocese_contact_log_created ON public.diocese_contact_log (created_at DESC);

ALTER TABLE public.diocese_contact_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_contact_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_contact_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_contact_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.diocese_contact_sections IS 'Kontakty dcza.sk – sekcie stránky /kontakty';
COMMENT ON TABLE public.diocese_contact_blocks IS 'Kontakty dcza.sk – bloky sekcie (oddelenie, funkcia, hodiny)';
COMMENT ON TABLE public.diocese_contact_people IS 'Kontakty dcza.sk – osoby: ručne, kňaz z registra alebo aktuálny držiteľ funkcie v kúrii';
COMMENT ON TABLE public.diocese_contact_log IS 'Kontakty dcza.sk – kto a kedy upravil sekciu';

-- ------------------------------------------------------------ úvodné údaje zo živej stránky /kontakty (2026-11-13)
DO $$
DECLARE
  s UUID; b UUID;
  body_gv UUID := (SELECT id FROM public.diocese_bodies WHERE slug = 'generalny-vikar');
  body_kanc UUID := (SELECT id FROM public.diocese_bodies WHERE slug = 'kancelaria');
  body_ekon UUID := (SELECT id FROM public.diocese_bodies WHERE slug = 'ekonomicky-urad');
  body_trib UUID := (SELECT id FROM public.diocese_bodies WHERE slug = 'tribunal');
  body_urady UUID := (SELECT id FROM public.diocese_bodies WHERE slug = 'urady-a-poverenia');
  galis UUID := (SELECT id FROM public.clergy WHERE first_name = 'Tomáš' AND last_name = 'Galis' AND category = 'bishop' LIMIT 1);
BEGIN
  IF EXISTS (SELECT 1 FROM public.diocese_contact_sections) THEN RETURN; END IF;

  -- Všeobecné
  INSERT INTO public.diocese_contact_sections (slug, title, sort_order) VALUES ('vseobecne', 'Všeobecné', 10) RETURNING id INTO s;
  INSERT INTO public.diocese_contact_blocks (section_id, title, body, sort_order) VALUES (s, 'Fakturačná adresa',
    E'Rímskokatolícka cirkev\nŽilinská diecéza\nJána Kalinčiaka 1\n010 01 Žilina\n\nIČO: 42063043\nDIČ: 2022594398\nIČ DPH: SK 2022594398', 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, body, phones, emails, sort_order) VALUES (s, 'Korešpondenčná adresa',
    E'Biskupský úrad\nJána Kalinčiaka 1\nP.O.Box B-46\n011 36 Žilina 1\n\nfax: 041/56 584 53',
    ARRAY['+421 41 500 22 15', '+421 904 738 524'], ARRAY['kuria@dcza.sk', 'sekretariat@dcza.sk'], 2);

  -- Biskup (od 10. 11. 2026: menovaný biskup + apoštolský administrátor)
  INSERT INTO public.diocese_contact_sections (slug, title, sort_order) VALUES ('biskup', 'Biskup', 20) RETURNING id INTO s;
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Menovaný diecézny biskup', 1) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, name, sort_order) VALUES (b, 'manual', 'Mons. Peter Beňo', 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Apoštolský administrátor', 2) RETURNING id INTO b;
  IF galis IS NOT NULL THEN
    INSERT INTO public.diocese_contact_people (block_id, source, clergy_id, sort_order) VALUES (b, 'clergy', galis, 1);
  ELSE
    INSERT INTO public.diocese_contact_people (block_id, source, name, sort_order) VALUES (b, 'manual', 'Mons. doc. ThDr. Tomáš Galis, PhD.', 1);
  END IF;
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Osobný tajomník biskupa', 3) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, body_id, body_role_match, emails, sort_order)
    VALUES (b, 'function', body_kanc, 'tajomník', ARRAY['tajomnik@dcza.sk', 'bsekretar@dcza.sk'], 1);

  -- Kúria
  INSERT INTO public.diocese_contact_sections (slug, title, sort_order) VALUES ('kuria', 'Kúria', 30) RETURNING id INTO s;
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Generálny vikár, moderátor kúrie', 1) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, body_id, body_role_match, emails, sort_order) VALUES (b, 'function', body_gv, NULL, ARRAY['gvikar@dcza.sk'], 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Kancelár', 2) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, body_id, body_role_match, emails, sort_order) VALUES (b, 'function', body_kanc, 'kancelár', ARRAY['kancelarza@dcza.sk'], 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Notár, sudca', 3) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, body_id, body_role_match, emails, sort_order) VALUES (b, 'function', body_kanc, 'notár', ARRAY['notar@dcza.sk'], 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, emails, sort_order) VALUES (s, 'Sekretariát', ARRAY['sekretariat@dcza.sk'], 4) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, name, emails, sort_order) VALUES
    (b, 'manual', 'Ing. Juraj Malobický', ARRAY['malobicky@dcza.sk'], 1),
    (b, 'manual', 'Anna Privarčáková', ARRAY['privarcakova@dcza.sk'], 2);
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Ekonomické oddelenie', 5) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, body_id, body_role_match, emails, sort_order) VALUES (b, 'function', body_ekon, 'ekonóm', ARRAY['ekonom@dcza.sk'], 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, phones, emails, sort_order) VALUES (s, 'Personálne a mzdové oddelenie', ARRAY['041/56 584 22'], ARRAY['personalne@dcza.sk'], 6) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, name, emails, sort_order) VALUES (b, 'manual', 'Ing. Oľga Zuziaková', ARRAY['zuziakova@dcza.sk'], 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, phones, emails, sort_order) VALUES (s, 'Učtáreň', ARRAY['041/56 584 23'], ARRAY['uctaren@dcza.sk'], 7) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, name, role, sort_order) VALUES
    (b, 'manual', 'Lýdia Uríková', 'vedúca učtárne', 1),
    (b, 'manual', 'Mária Hlavatá', 'samostatná účtovníčka', 2),
    (b, 'manual', 'Mgr. Gabriela Šadibolová', 'referent účtovníctva a financovania', 3);
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Správca budovy a technická údržba', 8) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, name, phones, emails, sort_order) VALUES (b, 'manual', 'Ing. Jozef Tabak', ARRAY['041/56 584 28'], ARRAY['tabak@dcza.sk'], 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Hospodárska správa', 9) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, name, phones, emails, sort_order) VALUES (b, 'manual', 'Roman Kupčík', ARRAY['041/56 584 25'], ARRAY['ekonom@dcza.sk'], 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, phones, sort_order) VALUES (s, 'Referent hospodárskej správy a účtovníctva', ARRAY['041/56 584 26'], 10) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, name, emails, sort_order) VALUES
    (b, 'manual', 'Ing. Silvia Ďungelová', ARRAY['dungelova@dcza.sk'], 1),
    (b, 'manual', 'sr. Dária Motyková', '{}', 2);
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Hovorca diecézy', 11) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, body_id, body_role_match, emails, sort_order) VALUES (b, 'function', body_urady, 'hovorca', ARRAY['hovorca@dcza.sk'], 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Projektový asistent', 12) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, name, phones, emails, sort_order) VALUES (b, 'manual', 'Ing. Dušan Václav', ARRAY['041/56 584 34'], ARRAY['vaclav@dcza.sk'], 1);

  -- Tribunál
  INSERT INTO public.diocese_contact_sections (slug, title, sort_order) VALUES ('tribunal', 'Tribunál Žilinskej diecézy', 40) RETURNING id INTO s;
  INSERT INTO public.diocese_contact_blocks (section_id, emails, sort_order) VALUES (s, ARRAY['tribunal@dcza.sk'], 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Súdny vikár', 2) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, body_id, body_role_match, sort_order) VALUES (b, 'function', body_trib, 'súdny vikár', 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Súdni notári', 3) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, name, role, sort_order) VALUES
    (b, 'manual', 'Prof. ThDr. ICLic. RNDr. Jana Moricová, PhD.', 'kancelárka', 1),
    (b, 'manual', 'ICLic. Mgr. Anna Chudobová', NULL, 2),
    (b, 'manual', 'Bc. Daniela Privarčáková', NULL, 3);
  INSERT INTO public.diocese_contact_blocks (section_id, title, body, sort_order) VALUES (s, 'Čas vyhradený pre verejnosť', E'Streda: 12:00 – 15:00\nPiatok: 9:00 – 12:00', 4);

  -- Diecézny katechetický úrad
  INSERT INTO public.diocese_contact_sections (slug, title, sort_order) VALUES ('katecheticky-urad', 'Diecézny katechetický úrad', 50) RETURNING id INTO s;
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Riaditeľ diecézneho katechetického úradu', 1) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, body_id, body_role_match, emails, sort_order) VALUES (b, 'function', body_urady, 'riaditeľ Diecézneho katechetického', ARRAY['dku@dcza.sk'], 1);

  -- Diecézny školský úrad
  INSERT INTO public.diocese_contact_sections (slug, title, sort_order) VALUES ('skolsky-urad', 'Diecézny školský úrad', 60) RETURNING id INTO s;
  INSERT INTO public.diocese_contact_blocks (section_id, emails, sort_order) VALUES (s, ARRAY['dsu@dcza.sk'], 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Riaditeľ diecézneho školského úradu', 2) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, name, sort_order) VALUES (b, 'manual', 'Mgr. Ľuboš Bytčánek', 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Odborné referentky pre DŠÚ', 3) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, name, sort_order) VALUES
    (b, 'manual', 'Ing. Katarína Leitnerová', 1),
    (b, 'manual', 'Gabriela Maslíková', 2),
    (b, 'manual', 'Mgr. Pavla Pohančeníková', 3);

  -- Pastoračný fond
  INSERT INTO public.diocese_contact_sections (slug, title, sort_order) VALUES ('pastoracny-fond', 'Pastoračný fond Žilinskej diecézy', 70) RETURNING id INTO s;
  INSERT INTO public.diocese_contact_blocks (section_id, emails, sort_order) VALUES (s, ARRAY['pastoracnyfond@dcza.sk'], 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Riaditeľ pastoračného fondu Žilinskej diecézy', 2) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, body_id, body_role_match, emails, sort_order) VALUES (b, 'function', body_urady, 'riaditeľ Pastoračného fondu', ARRAY['pecko@dcza.sk'], 1);

  -- Čas vyhradený pre verejnosť
  INSERT INTO public.diocese_contact_sections (slug, title, sort_order) VALUES ('uradne-hodiny', 'Čas vyhradený pre verejnosť', 80) RETURNING id INTO s;
  INSERT INTO public.diocese_contact_blocks (section_id, title, body, sort_order) VALUES (s, 'September – jún',
    E'Pondelok: 13:00 – 15:00\nUtorok: 9:00 – 11:00; 13:00 – 15:00\nStreda: 9:00 – 11:00; 13:00 – 15:00\nŠtvrtok: 9:00 – 11:00; 13:00 – 15:00\nPiatok: 9:00 – 11:00\n\nPo telefonickej dohode sme vám k dispozícii aj mimo vyznačených hodín.', 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, body, sort_order) VALUES (s, 'Júl – august',
    E'Pondelok: 13:00 – 14:00\nUtorok: 8:00 – 11:00; 13:00 – 14:00\nStreda: 8:00 – 11:00; 13:00 – 14:00\nŠtvrtok: 8:00 – 11:00; 13:00 – 14:00\nPiatok: 8:00 – 11:00', 2);

  -- Nahlasovanie zneužívania
  INSERT INTO public.diocese_contact_sections (slug, title, sort_order) VALUES ('nahlasovanie-zneuzivania', 'Nahlasovanie prípadov sexuálneho zneužívania', 90) RETURNING id INTO s;
  INSERT INTO public.diocese_contact_blocks (section_id, body, phones, emails, sort_order) VALUES (s,
    'V zmysle Motu proprio pápeža Františka „Vos estis lux mundi“ (čl. 2, § 1)', ARRAY['041/500 22 15'], ARRAY['nahlaseniezneuzivania@dcza.sk'], 1);
  INSERT INTO public.diocese_contact_blocks (section_id, title, sort_order) VALUES (s, 'Kontaktné osoby', 2) RETURNING id INTO b;
  INSERT INTO public.diocese_contact_people (block_id, source, name, sort_order) VALUES (b, 'manual', 'Prof. ThDr. ICLic. RNDr. Jana Moricová, PhD.', 1);
  INSERT INTO public.diocese_contact_people (block_id, source, body_id, emails, sort_order) VALUES (b, 'function', body_gv, ARRAY['gvikar@dcza.sk'], 2);
  INSERT INTO public.diocese_contact_blocks (section_id, title, body, sort_order) VALUES (s, 'Konzultačné hodiny', E'Streda: 12:00 – 15:00\nPiatok: 9:00 – 12:00', 3);

  -- Ochrana osobných údajov
  INSERT INTO public.diocese_contact_sections (slug, title, sort_order) VALUES ('ochrana-osobnych-udajov', 'Ochrana osobných údajov', 100) RETURNING id INTO s;
  INSERT INTO public.diocese_contact_blocks (section_id, title, body, emails, sort_order) VALUES (s, 'Zodpovedná osoba',
    E'Konferencia biskupov Slovenska\nKapitulská 11, P. O. Box 11, 814 99 Bratislava\nIČO: 00684325\nDIČ: 2020804841\nhttps://gdpr.kbs.sk', ARRAY['dpo@kbs.sk'], 1);
END $$;
