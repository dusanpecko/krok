-- 035: Verejné stránky farností (návrh krok_navrh_farnosti.md § 4, fáza F5; O26–O30).
-- Oznamy a aktuality farnosti, sviatosti (diecézny štandard + úprava farnosti), motív stránky.
-- Verejné čítanie ide cez server (service role) s explicitným výberom stĺpcov – anon nemá
-- priamy prístup k tabuľkám farností (okrem diecéznych textov sviatostí).

-- ------------------------------------------------------------
-- 1. Motív verejnej stránky (O29) – register motívov je v kóde (lib/parish-themes)
-- ------------------------------------------------------------
ALTER TABLE public.parishes
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'standard';

-- ------------------------------------------------------------
-- 2. Oznamy a aktuality (O28) – idú na web bez schvaľovania, diecéza ich vie stiahnuť (§ 4.3)
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE parish_post_type AS ENUM ('announcement', 'news');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.parish_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES public.parishes(id) ON DELETE CASCADE,
  type parish_post_type NOT NULL DEFAULT 'announcement',
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,                              -- HTML z TipTap, sanitizované na serveri
  image_url TEXT,
  attachment_url TEXT,                       -- oznamy v PDF (voliteľne)
  attachment_name TEXT,
  valid_from DATE,                           -- oznamy: týždeň platnosti
  valid_to DATE,
  event_at TIMESTAMPTZ,                      -- aktualita ako udalosť: dátum konania
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  pinned BOOLEAN NOT NULL DEFAULT false,
  taken_down_at TIMESTAMPTZ,                 -- stiahnuté diecézou
  taken_down_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  takedown_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parish_id, slug),
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);
CREATE INDEX IF NOT EXISTS idx_parish_posts_public ON public.parish_posts (parish_id, type, published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_parish_posts_recent ON public.parish_posts (published_at DESC) WHERE published;

DROP TRIGGER IF EXISTS trigger_parish_posts_updated_at ON public.parish_posts;
CREATE TRIGGER trigger_parish_posts_updated_at BEFORE UPDATE ON public.parish_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- 3. Sviatosti (O27) – štandard diecézy, farnosť si text môže upraviť
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sacrament_texts (
  type TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parish_sacrament_texts (
  parish_id UUID NOT NULL REFERENCES public.parishes(id) ON DELETE CASCADE,
  type TEXT NOT NULL REFERENCES public.sacrament_texts(type) ON UPDATE CASCADE ON DELETE CASCADE,
  content TEXT,                              -- NULL = použije sa diecézny text
  is_hidden BOOLEAN NOT NULL DEFAULT false,  -- farnosť sekciu nezobrazuje
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (parish_id, type)
);

INSERT INTO public.sacrament_texts (type, title, sort_order, content) VALUES
('krst', 'Krst', 10,
 '<p>Krst je brána do života v Kristovi a do spoločenstva Cirkvi. Rodičia, ktorí si prajú pokrstiť dieťa, sa majú prihlásiť na farskom úrade <strong>v mieste bydliska</strong> čo najskôr, ideálne už počas tehotenstva.</p><h3>Čo treba</h3><ul><li>rodný list dieťaťa,</li><li>údaje o rodičoch a krstných rodičoch (krstný rodič musí byť pokrstený a birmovaný katolík, ktorý žije podľa viery),</li><li>účasť rodičov a krstných rodičov na príprave.</li></ul><p>Termín krstu a prípravy dohodnete osobne na farskom úrade.</p>'),
('prve-sv-prijimanie', 'Prvé sväté prijímanie', 20,
 '<p>Na prvú svätú spoveď a prvé sväté prijímanie sa deti pripravujú spravidla v 3. ročníku základnej školy, v spolupráci farnosti, rodiny a školy.</p><p>Informácie o príprave a prihlasovaní vyhlási farnosť v oznamoch na začiatku školského roka.</p>'),
('birmovka', 'Birmovanie', 30,
 '<p>Birmovanie zdokonaľuje krstnú milosť a posilňuje kresťana darmi Ducha Svätého. Príprava birmovancov prebieha vo farnosti podľa pokynov diecézy a trvá spravidla dlhšie obdobie.</p><p>O začiatku prípravy a podmienkach prihlásenia informuje farnosť v oznamoch.</p>'),
('manzelstvo', 'Manželstvo', 40,
 '<p>Snúbenci sa majú prihlásiť na farskom úrade <strong>najmenej tri mesiace pred plánovaným sobášom</strong>, aby bol čas na predmanželskú prípravu a vybavenie potrebných dokladov.</p><h3>Čo treba</h3><ul><li>krstné listy (nie staršie ako 6 mesiacov),</li><li>občianske preukazy,</li><li>absolvovanie predmanželskej prípravy,</li><li>pri sobáši mimo farnosti bydliska – súhlas (delegácia) príslušného farára.</li></ul>'),
('pomazanie', 'Pomazanie chorých', 50,
 '<p>Sviatosť pomazania chorých môže prijať veriaci, ktorý je vážne chorý, pred operáciou alebo pre starobu oslabený. Kňaza k chorému zavolajte včas – nečakajte na posledné chvíle.</p><p>V naliehavom prípade volajte farský úrad alebo kňaza na telefónnom čísle uvedenom v kontaktoch.</p>'),
('pohreb', 'Pohreb', 60,
 '<p>Cirkevný pohreb dohodnú pozostalí na farskom úrade po vybavení pohrebnej služby. Prineste so sebou list o prehliadke mŕtveho alebo úmrtný list a údaje o zosnulom.</p><p>Spolu s kňazom dohodnete termín pohrebu a svätej omše za zosnulého.</p>'),
('spoved', 'Svätá spoveď', 70,
 '<p>Príležitosť na svätú spoveď je pred svätými omšami a v časoch uvedených v rozpise bohoslužieb. Pred prvým piatkom v mesiaci a pred veľkými sviatkami býva spovedanie rozšírené – sledujte farské oznamy.</p>')
ON CONFLICT (type) DO NOTHING;

-- ------------------------------------------------------------
-- 4. RLS – zápisy ide cez server actions (service role); priamo len admin a čítanie člena farnosti
-- ------------------------------------------------------------
ALTER TABLE public.parish_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sacrament_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parish_sacrament_texts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['parish_posts', 'parish_sacrament_texts'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (is_admin()) WITH CHECK (is_admin())', t || '_admin_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_member_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (is_parish_member(parish_id))', t || '_member_select', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS sacrament_texts_admin_all ON public.sacrament_texts;
CREATE POLICY sacrament_texts_admin_all ON public.sacrament_texts FOR ALL USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS sacrament_texts_public_select ON public.sacrament_texts;
CREATE POLICY sacrament_texts_public_select ON public.sacrament_texts FOR SELECT USING (is_active);
