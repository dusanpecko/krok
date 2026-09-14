-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migrácia 023: Výzvy na podporu (darcovské kampane) nad tabuľkou projects
-- Návrh: krok_navrh_vyzvy.md (rozhodnuté 2026-09-14)
-- ============================================================
--
-- Čo pridáva:
--   1. projects – prezentačné a finančné stĺpce pre verejnú stránku výzvy
--   2. project_media – galéria, videá a dokumenty (fáza pred / počas / po)
--   3. project_budget_items – rozpočet (plán / skutočnosť)
--   4. project_milestones – harmonogram (rekonštrukcie)
--   5. posts.project_id – priebežné správy = aktuality naviazané na výzvu
--   6. v_project_stats + get_project_stats() – živé počítadlo
--   7. oprávnenie manage_projects
--   8. doplnenie údajov zo starého webu pre 4 existujúce výzvy
-- ============================================================

-- ------------------------------------------------------------
-- 1. Rozšírenie projects
-- ------------------------------------------------------------
ALTER TABLE public.projects
  -- prezentácia
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS closing_summary TEXT,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  -- kto a kde
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_address TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_name TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_role TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS parish_id UUID REFERENCES public.parishes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location TEXT,
  -- financie
  ADD COLUMN IF NOT EXISTS legacy_variable_symbol TEXT,
  ADD COLUMN IF NOT EXISTS legacy_collected_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS legacy_supporters_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allow_one_time BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_recurring BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS suggested_amounts INTEGER[] NOT NULL DEFAULT '{10,20,50,100}';

CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_legacy_vs
  ON public.projects (legacy_variable_symbol) WHERE legacy_variable_symbol IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_public ON public.projects (visible_on_web, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_projects_parish ON public.projects (parish_id);

COMMENT ON COLUMN public.projects.subtitle IS 'Podnadpis / perex (1–2 vety) pre karty a OG';
COMMENT ON COLUMN public.projects.content IS 'Dlhý popis výzvy, HTML z TipTap';
COMMENT ON COLUMN public.projects.video_url IS 'YouTube / Vimeo URL hero videa';
COMMENT ON COLUMN public.projects.closing_summary IS 'Záverečná správa po ukončení (HTML)';
COMMENT ON COLUMN public.projects.featured IS 'Zobraziť na domovskej stránke';
COMMENT ON COLUMN public.projects.recipient_name IS 'Príjemca daru (napr. Diecézna charita Žilina)';
COMMENT ON COLUMN public.projects.guarantor_name IS 'Garant projektu';
COMMENT ON COLUMN public.projects.location IS 'Miesto realizácie, napr. názov školy a mesto';
COMMENT ON COLUMN public.projects.legacy_variable_symbol IS 'VS výzvy zo starého webu (rad 1177xxxx) – bežiace trvalé príkazy';
COMMENT ON COLUMN public.projects.legacy_collected_amount IS 'Suma vyzbieraná pred migráciou do Kroku, pripočítava sa k živému súčtu';
COMMENT ON COLUMN public.projects.legacy_supporters_count IS 'Počet darcov pred migráciou, pripočítava sa k živému počtu';
COMMENT ON COLUMN public.projects.suggested_amounts IS 'Navrhované sumy v darovacom widgete (€)';
COMMENT ON COLUMN public.projects.end_date IS 'Darovať môžete do; NULL = priebežne';

-- ------------------------------------------------------------
-- 2. Galéria, videá a dokumenty
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video', 'document')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  phase TEXT CHECK (phase IN ('before', 'during', 'after')),
  mime_type TEXT,
  file_size INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.project_media IS 'Galéria fotiek, videá a dokumenty výzvy; phase = pred / počas / po (rekonštrukcie)';
CREATE INDEX IF NOT EXISTS idx_project_media_project ON public.project_media (project_id, kind, sort_order);

ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_media_select" ON public.project_media;
CREATE POLICY "project_media_select" ON public.project_media
  FOR SELECT USING (visible = true OR is_admin());
DROP POLICY IF EXISTS "project_media_modify_admin" ON public.project_media;
CREATE POLICY "project_media_modify_admin" ON public.project_media
  FOR ALL USING (is_admin());

-- ------------------------------------------------------------
-- 3. Rozpočet
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  planned_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_amount NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.project_budget_items IS 'Rozpočtové položky výzvy: plán a skutočné náklady';
CREATE INDEX IF NOT EXISTS idx_project_budget_project ON public.project_budget_items (project_id, sort_order);

DROP TRIGGER IF EXISTS trigger_project_budget_items_updated_at ON public.project_budget_items;
CREATE TRIGGER trigger_project_budget_items_updated_at
  BEFORE UPDATE ON public.project_budget_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.project_budget_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_budget_select" ON public.project_budget_items;
CREATE POLICY "project_budget_select" ON public.project_budget_items
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "project_budget_modify_admin" ON public.project_budget_items;
CREATE POLICY "project_budget_modify_admin" ON public.project_budget_items
  FOR ALL USING (is_admin());

-- ------------------------------------------------------------
-- 4. Harmonogram
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_at DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.project_milestones IS 'Míľniky / harmonogram výzvy (napr. stavebné povolenie, začiatok prác, kolaudácia)';
CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON public.project_milestones (project_id, sort_order);

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_milestones_select" ON public.project_milestones;
CREATE POLICY "project_milestones_select" ON public.project_milestones
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "project_milestones_modify_admin" ON public.project_milestones;
CREATE POLICY "project_milestones_modify_admin" ON public.project_milestones
  FOR ALL USING (is_admin());

-- ------------------------------------------------------------
-- 5. Priebežné správy: aktuality naviazané na výzvu
-- ------------------------------------------------------------
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_posts_project ON public.posts (project_id, published_at DESC);
COMMENT ON COLUMN public.posts.project_id IS 'Ak je vyplnené, článok je správou o priebehu danej výzvy';

-- ------------------------------------------------------------
-- 6. Živé štatistiky
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_project_stats
WITH (security_invoker = true) AS
SELECT
  p.id AS project_id,
  (p.legacy_collected_amount + COALESCE(SUM(d.amount), 0))::numeric(12,2) AS collected_amount,
  (p.legacy_supporters_count + COUNT(DISTINCT d.donor_id))::int          AS supporters_count,
  COUNT(d.id)::int                                                        AS donations_count,
  MAX(d.donation_date)                                                    AS last_donation_at,
  CASE
    WHEN p.target_amount IS NOT NULL AND p.target_amount > 0
    THEN LEAST(100, ROUND((p.legacy_collected_amount + COALESCE(SUM(d.amount), 0)) / p.target_amount * 100, 1))
  END                                                                     AS percent
FROM public.projects p
LEFT JOIN public.donations d ON d.project_id = p.id
GROUP BY p.id;

COMMENT ON VIEW public.v_project_stats IS 'Vyzbieraná suma a počet darcov výzvy = legacy hodnoty + živé dary z donations';

CREATE OR REPLACE FUNCTION public.get_project_stats(p_project_id UUID)
RETURNS TABLE (
  project_id UUID,
  collected_amount NUMERIC,
  supporters_count INTEGER,
  donations_count INTEGER,
  last_donation_at DATE,
  percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT s.project_id, s.collected_amount, s.supporters_count, s.donations_count, s.last_donation_at, s.percent
  FROM public.v_project_stats s
  WHERE s.project_id = p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_project_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_project_stats(UUID) TO service_role;

-- ------------------------------------------------------------
-- 7. Oprávnenie manage_projects
-- ------------------------------------------------------------
INSERT INTO public.permissions (id, name, description) VALUES
  ('manage_projects', 'Správa výziev a projektov', 'Vytváranie a úprava výziev na podporu: obsah, rozpočet, galéria, harmonogram.')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  ('administrator', 'manage_projects')
ON CONFLICT DO NOTHING;

UPDATE public.permissions
SET description = 'Prístup k nastaveniam farností a dekanátov.'
WHERE id = 'manage_config';

-- ------------------------------------------------------------
-- 8. Údaje zo starého webu (mojkrok.dcza.sk/grantove-vyzvy, stav k 31.01.2026)
--    end_date nechávame NULL (priebežne) – pôvodné termíny (2025) už uplynuli,
--    nové termíny nastaví admin.
-- ------------------------------------------------------------
UPDATE public.projects SET
  category = 'charity',
  subtitle = 'Farské charity spájajú dobrovoľníkov, ktorí majú otvorené oči a srdce pre pomoc rodinám a jednotlivcom v ťažkých životných situáciách.',
  content = '<p>Farské charity spájajú dobrovoľníkov, ktorí majú otvorené oči a srdce pre pomoc rodinám a jednotlivcom v ťažkých životných situáciách. Vo svojej farnosti vyhľadávajú a pomáhajú ľuďom chudobným, starým, chorým, osamelým, viacdetným rodinám, matkám samoživiteľkám… Vďaka nim môže byť Diecézna charita Žilina bližšie pri človeku.</p><p>Vo farskej charite sa z pasívneho občana, možného prijímateľa pomoci, stáva darca. Seniori sú angažovaní, aktívni, spolupodieľajú sa na budovaní spoločnosti, mladí a deti sú pozývaní a formovaní k dobrovoľníctvu, sebadarovaniu, chorí a slabí sú potrební, lebo majú dôležitú úlohu modliť sa za charitné aktivity, ľudia v produktívnom veku realizujú svoju potrebu zmysluplného života.</p><p>Dobrovoľníci farských charít sú kvalitne a pravidelne formovaní prostredníctvom vzdelávania, duchovných obnov, pracovných stretnutí, pútí a iných aktivít.</p><p>Vaša finančná a modlitebná pomoc je pre nás veľmi dôležitá. Ak je toto oblasť, ktorá vám leží na srdci, budeme veľmi vďační za vašu podporu, aby sme mohli našu službu vo farských charitách zefektívniť a skvalitniť. Potrebujeme vás!</p>',
  recipient_name = 'Diecézna charita Žilina',
  recipient_address = 'Bratislavská 423/27, 010 01 Žilina',
  guarantor_name = 'Mgr. Peter Birčák',
  legacy_variable_symbol = '11771415',
  legacy_collected_amount = 1720.93,
  legacy_supporters_count = 19,
  sort_order = 30
WHERE slug = 's-farskou-charitou-blizsie-k-vam';

UPDATE public.projects SET
  category = 'evangelization',
  subtitle = 'Pozývame vás dať Božiemu Slovu priestor vo vašom každodennom živote – sami, v rodine alebo v malých skupinách.',
  content = '<p>Lectio Divina je starobylá forma modlitby, ktorú odpradávna praktizovali tak rehoľné komunity, ako aj jednotlivci. Pozývame vás pripojiť sa a dať Božiemu Slovu priestor vo vašom každodennom živote. Či už budete Lectio praktizovať sami alebo v rodine, prípadne v malých skupinách, váš život s Bohom sa prostredníctvom čítania jeho Slova začne prehlbovať.</p>',
  recipient_name = 'KROK – Pastoračný fond Žilinskej diecézy',
  recipient_address = 'Jána Kalinčiaka 1, 010 01 Žilina',
  guarantor_name = 'Mgr. Dušan Pecko',
  guarantor_role = 'riaditeľ fondu',
  legacy_variable_symbol = '11770001',
  legacy_collected_amount = 243,
  legacy_supporters_count = 19,
  sort_order = 10
WHERE slug = 'lectio-divina';

UPDATE public.projects SET
  category = 'youth',
  subtitle = 'Diecézna animátorská škola – kurz osobnej duchovnej formácie „Príď kráľovstvo tvoje“ pre mladých Žilinskej diecézy.',
  content = '<p>Príď kráľovstvo tvoje (PKT) je kurz osobnej duchovnej formácie, 1. ročník v rámci Diecéznej animátorskej školy (DAŠ), organizovanej Komisiou pre mládež Žilinskej diecézy. Zahŕňa 7 (zamerané na duchovný rast) + 3 (zamerané na animátorstvo) víkendových stretnutí a 5-dňové letné sústredenie počas šk. roka 2024/25, kde zažiješ bohatý duchovný program a úžasné spoločenstvo mladých ľudí, ktorí chcú rásť v poznaní Boha a v službe druhým. Ak túžiš získať aj certifikát z neformálneho akreditovaného vzdelávania Diecézna animátorská škola, je potrebné absolvovať celý rozsah kurzu.</p>',
  recipient_name = 'Sekcia pre mládež',
  recipient_address = 'Jána Kalinčiaka 1, 010 01 Žilina',
  guarantor_name = 'Mgr. Jozef Biely',
  guarantor_role = 'kaplán pre mládež',
  legacy_variable_symbol = '11771414',
  legacy_collected_amount = 3673,
  legacy_supporters_count = 26,
  sort_order = 20
WHERE slug = 'podpora-mladeze';

UPDATE public.projects SET
  category = 'youth',
  subtitle = 'Pomôžme mladým dobre sa pripraviť pre život v manželstve – víkendové programy pre chlapcov a dievčatá od 16 rokov.',
  content = '<p>Čas spoločného spoznávania pred vstupom do manželstva je pre každého mladého človeka dôležitým časom osobného dozrievania. Mnohí z nich ho však prežijú povrchne alebo v ňom dokonca zažijú bolestivé sklamania, ktoré ich poznačia pre budúci život v manželstve. Pri programoch pre manželov, ktoré už 13 rokov prebiehajú v Rodinkove – Dome prijatia pre rodiny, sa manželia často vrátia k času chodenia a zistia, že mnohé nedorozumenia a ťažkosti, ktoré prežívajú v manželstve majú svoje korene v zraneniach z obdobia spoločného chodenia pre manželstvom. „Väčšina ľudí venuje neporovnateľne viac času príprave na svoje budúce pracovné povolanie, než príprave na manželstvo,“ hovorí Dr. Gary Chapman, skúsený manželský poradca a autor mnohých kníh o manželstve, svetovo známy hlavne vďaka knihe Päť jazykov lásky. Rozhodli sme sa preto pripraviť jeden víkendový program pre tínedžerov chlapcov od 16 rokov a druhý víkendový program pre dospievajúce dievčatá od 16 rokov, postavený na odborných poznatkoch z oblasti prípravy na manželstvo, ale aj na osobných skúsenostiach a svedectvách manželov a samotných mladých ľudí.</p><p>Náklady, ktoré zahŕňajú ubytovanie a stravu na celý víkend a pokrytie ostatných organizačných výdavkov, sú 100 € na jedného účastníka. To je suma, ktorú si mladí stredoškoláci nemôžu dovoliť uhradiť, hoci by chceli rásť a dozrievať v oblasti budovania vzťahov a prípravy na dobré manželstvo. Ich spoluúčasť pri úhrade nákladov bude preto 20 € na osobu. Ostatné prostriedky by sme pre nich radi získali prostredníctvom tohto grantu. Na jednej víkendovke Chodíme spolu sa môže zúčastniť stovka chlapcov a na druhej stovka dievčat. Pre ich realizáciu je preto potrebné získať 2 × 8 000 €.</p><p>Veríme, že aj s vašou pomocou sa nám to podarí a možno jedným z účastníkov bude práve vaše dospievajúce dieťa alebo krstný/birmovný syn alebo dcéra. Spoločne tak budeme mať podiel na tom, aby v našej diecéze vznikali dobré a stabilné manželstvá, po ktorých každý mladý človek v hĺbke srdca veľmi túži.</p><p>Ďakujeme Vám!</p>',
  recipient_name = 'Familiae Locum – Rodinkovo n.o.',
  recipient_address = 'Jána Kalinčiaka 1, 010 01 Žilina',
  guarantor_name = 'ThLic. Mgr. Roman Seko',
  legacy_variable_symbol = '11771417',
  legacy_collected_amount = 50,
  legacy_supporters_count = 1,
  sort_order = 40
WHERE slug = 'chodime-spolu';

-- Interné fondy nie sú verejné výzvy (visible_on_web sa doteraz nikde nečítal)
UPDATE public.projects SET visible_on_web = false
WHERE slug IN ('moj-krok', 'dve-percenta');
