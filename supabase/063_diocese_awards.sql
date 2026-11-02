-- 063: Ocenenia a vyznamenania (web dcza.sk, stránka o-nas/dieceza/ocenenia).
-- Ocenenie = pápežské alebo diecézne vyznamenanie s popisom a voliteľným albumom fotogalérie.
-- Ocenení = meno s titulmi tak, ako sa má zobraziť; kňaz/diakon z registra má clergy_id (odkaz na profil
-- v schematizme, zosnulý podľa registra). Čítanie aj zápis len cez server (service role) – ako 049.

CREATE TABLE IF NOT EXISTS public.diocese_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  grantor TEXT NOT NULL DEFAULT 'papez' CHECK (grantor IN ('papez', 'biskup')),
  description TEXT,                          -- odseky oddelené prázdnym riadkom
  image_url TEXT,                            -- fotka medaily / insígnie
  album_id UUID REFERENCES public.diocese_albums(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diocese_awards_order ON public.diocese_awards (grantor, sort_order);

CREATE TABLE IF NOT EXISTS public.diocese_award_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id UUID NOT NULL REFERENCES public.diocese_awards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                        -- „Prof. MUDr. RNDr. Rudolf Pullmann, PhD.“
  clergy_id UUID REFERENCES public.clergy(id) ON DELETE SET NULL,
  deceased BOOLEAN NOT NULL DEFAULT false,   -- † (pri kňazovi z registra aj podľa jeho stavu)
  year INT CHECK (year IS NULL OR year BETWEEN 1900 AND 2100),
  note TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diocese_award_recipients_award ON public.diocese_award_recipients (award_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_diocese_award_recipients_clergy ON public.diocese_award_recipients (clergy_id) WHERE clergy_id IS NOT NULL;

ALTER TABLE public.diocese_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_award_recipients ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.diocese_awards IS 'Pápežské a diecézne ocenenia – stránka o-nas/dieceza/ocenenia na dcza.sk';
COMMENT ON TABLE public.diocese_award_recipients IS 'Ocenení; kňazi z registra cez clergy_id (odkaz na profil v schematizme)';

-- stránka v strome (Diecéza → Ocenenia, vyznamenania) + stará adresa živého webu
INSERT INTO public.diocese_pages (parent_id, slug, path, title, sort_order, source)
SELECT id, 'ocenenia', 'o-nas/dieceza/ocenenia', 'Ocenenia, vyznamenania', 10, 'krok'
FROM public.diocese_pages WHERE path = 'o-nas/dieceza'
ON CONFLICT (path) DO NOTHING;

INSERT INTO public.diocese_redirects (from_path, to_path)
VALUES ('/sk/dokumenty/dieceza/ocenenia', '/o-nas/dieceza/ocenenia')
ON CONFLICT (from_path) DO UPDATE SET to_path = EXCLUDED.to_path;

-- úvodné údaje zo živého dcza.sk (2026-11-02)
INSERT INTO public.diocese_awards (slug, name, grantor, description, sort_order) VALUES
('kaplani-jeho-svatosti', 'Kapláni Jeho Svätosti', 'papez', NULL, 10),
('rad-sv-gregora-velkeho', 'Commenda dell''Ordine di San Gregorio Magno', 'papez',
 'Pápežský Rád sv. Gregora Veľkého (Ordine di San Gregorio Magno) je jedným z piatich pápežských rytierskych rádov, ktoré udeľuje priamo Svätá stolica. Rád založil v roku 1831 pápež Gregor XVI. ako ocenenie mužov, ktorí sa významne pričinili o rozvoj Cirkvi, spoločenské dobro a podporu Svätej stolice. Členstvo v ráde neukladá nositeľom žiadne povinnosti, no spája sa s určitými privilégiami platnými na území Vatikánu.

Členovia rádu majú právo vojsť v sedle dovnútra Baziliky sv. Petra vo Vatikáne (toto právo už dlhú dobu nikto z rytierov ani dám rádu nevyužil). Rytierom je zaručené privilegované miesto počas pápežských procesií i pri iných obradoch. Švajčiarska garda je povinná rádovým rytierom salutovať.', 20),
('pro-ecclesia-et-pontifice', 'Pro Ecclesia et Pontifice', 'papez',
 'Pápežské záslužné vyznamenanie Pro Ecclesia et Pontifice (v preklade Pre Cirkev a pápeža) založil pápež Lev XIII. 17. júla 1888 pri príležitosti 50. výročia svojej kňazskej vysviacky. Ocenenie je známe tiež pod názvom „Dekorácia cti“.

Z pôvodne jednorazového ocenenia vznikla tradícia a v súčasnosti toto vyznamenanie pápež udeľuje laikom a kňazom za význačnú službu Cirkvi a jej hlave.', 30),
('strieborny-kriz', 'Strieborný kríž Žilinskej diecézy', 'biskup',
 'Za mimoriadne zásluhy o rozvoj a podporu Žilinskej diecézy udelil žilinský biskup vyznamenanie Strieborný kríž Žilinskej diecézy týmto laureátom:', 10)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.diocese_award_recipients (award_id, name, deceased, sort_order)
SELECT a.id, r.name, r.deceased, r.ord
FROM (VALUES
  ('kaplani-jeho-svatosti', 'Mons. Michal Baláž', false, 1),
  ('kaplani-jeho-svatosti', 'Mons. Milan Gabriš', false, 2),
  ('kaplani-jeho-svatosti', 'Mons. Anton Galus', false, 3),
  ('kaplani-jeho-svatosti', 'Mons. Marek Hriadel', false, 4),
  ('kaplani-jeho-svatosti', 'Mons. Jozef Hrtús', false, 5),
  ('kaplani-jeho-svatosti', 'Mons. Michal Janech', false, 6),
  ('kaplani-jeho-svatosti', 'Mons. Michal Keblušek', false, 7),
  ('kaplani-jeho-svatosti', 'Mons. Vladimír Kutiš', false, 8),
  ('kaplani-jeho-svatosti', 'Mons. Vladimír Medzihorský', true, 9),
  ('kaplani-jeho-svatosti', 'Mons. Ján Ondrejička', false, 10),
  ('kaplani-jeho-svatosti', 'Mons. Jozef Petráš', false, 11),
  ('kaplani-jeho-svatosti', 'Mons. Ondrej Sandanus', true, 12),
  ('kaplani-jeho-svatosti', 'Mons. Ladislav Stromček', true, 13),
  ('kaplani-jeho-svatosti', 'Mons. Jozef Šelinga', false, 14),
  ('kaplani-jeho-svatosti', 'Mons. Ján Šmelka', false, 15),
  ('kaplani-jeho-svatosti', 'Mons. Cyril Šujak', true, 16),
  ('kaplani-jeho-svatosti', 'Mons. Pavol Talapka', false, 17),
  ('rad-sv-gregora-velkeho', 'Prof. MUDr. RNDr. Rudolf Pullmann, PhD.', false, 1),
  ('rad-sv-gregora-velkeho', 'Ing. Anton Barcík', false, 2),
  ('pro-ecclesia-et-pontifice', 'MUDr. Viera Belková', false, 1),
  ('pro-ecclesia-et-pontifice', 'Anna Birčáková', false, 2),
  ('pro-ecclesia-et-pontifice', 'ThDr. Mgr. Ján Bittšanský, PhD.', false, 3),
  ('pro-ecclesia-et-pontifice', 'MUDr. Oľga Čechová', false, 4),
  ('pro-ecclesia-et-pontifice', 'Ing. Mgr. Miriam Janegová', false, 5),
  ('pro-ecclesia-et-pontifice', 'Ing. František Kočalka', false, 6),
  ('pro-ecclesia-et-pontifice', 'Mgr. Ľudovít Lajčin', true, 7),
  ('pro-ecclesia-et-pontifice', 'Mgr. Anton Noga', false, 8),
  ('pro-ecclesia-et-pontifice', 'RNDr. Ľubomír Viliam Prikryl, CSc.', true, 9),
  ('pro-ecclesia-et-pontifice', 'Mgr. Margita Prikrylová', true, 10),
  ('pro-ecclesia-et-pontifice', 'Mons. Mgr. Ondrej Sandanus', true, 11),
  ('pro-ecclesia-et-pontifice', 'Ing. Andrej Sočuvka', false, 12),
  ('pro-ecclesia-et-pontifice', 'Ladislav Štefanec st.', false, 13),
  ('pro-ecclesia-et-pontifice', 'Mons. Jozef Šelinga', false, 14),
  ('strieborny-kriz', 'J. E. Alois Kothgasser', false, 1),
  ('strieborny-kriz', 'J. E. Ludwig Schwarz', false, 2),
  ('strieborny-kriz', 'Don Luciano Cappelli', false, 3),
  ('strieborny-kriz', 'Mgr. Ivan Mahrík', false, 4),
  ('strieborny-kriz', 'Ing. Anton Barcík', false, 5),
  ('strieborny-kriz', 'Mgr. Peter Birčák', false, 6),
  ('strieborny-kriz', 'Ing. Anna Kondelová, PhD. a Ing. Emil Kondela', false, 7),
  ('strieborny-kriz', 'Ing. Mgr. Miriam Janegová', false, 8),
  ('strieborny-kriz', 'Mgr. Juliana Burschiková', false, 9)
) AS r(award, name, deceased, ord)
JOIN public.diocese_awards a ON a.slug = r.award
WHERE NOT EXISTS (SELECT 1 FROM public.diocese_award_recipients x WHERE x.award_id = a.id);

-- prepojenie kňazov s registrom (len jednoznačná zhoda mena a priezviska)
UPDATE public.diocese_award_recipients r
SET clergy_id = c.id
FROM public.clergy c
WHERE r.clergy_id IS NULL
  AND r.name ~ ('(^|\s)' || c.first_name || '\s+' || c.last_name || '(,|\s|$)')
  AND (SELECT count(*) FROM public.clergy c2 WHERE c2.first_name = c.first_name AND c2.last_name = c.last_name) = 1;
