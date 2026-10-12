-- 059: Digitálne celebrety (K6, § 16.9, O52–O58).
-- Celebret = záznam k osobe v registri kňazov; overenie cez QR na celebret.dcza.sk/<token> (náhodný kód, noindex).
-- Platnosť vždy 1 rok od vydania (O55), len kňazi (O53), latinčina (O54).
-- Logo, pečiatku a podpis nahrá kúria v nastaveniach; každý celebret si pamätá verziu nastavení (O57).
-- Fotku nahrá kúria pri vydaní alebo ju pošle kňaz z kňazskej zóny na schválenie.
-- Všetko číta a zapisuje server (service role) – RLS bez politík.

-- 1. nastavenia celebretu (verzie – nová verzia pri zmene podpisu, pečiatky, loga…)
CREATE TABLE IF NOT EXISTS public.celebret_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  stamp_url TEXT,
  signature_url TEXT,
  signer_name TEXT,                      -- napr. „Mons. Tomáš Galis“ (voliteľné)
  signer_function TEXT,                  -- napr. „Episcopus Žilinensis“
  curia_address TEXT NOT NULL DEFAULT 'Jána Kalinčiaka 1, 010 01 Žilina',
  curia_phone TEXT NOT NULL DEFAULT '+421 41 500 22 15',
  curia_email TEXT NOT NULL DEFAULT 'sekretariat@dcza.sk',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_celebret_settings_created ON public.celebret_settings (created_at DESC);

-- 2. celebrety
CREATE SEQUENCE IF NOT EXISTS public.celebret_number_seq;

CREATE TABLE IF NOT EXISTS public.clergy_celebrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clergy_id UUID NOT NULL REFERENCES public.clergy(id) ON DELETE CASCADE,
  number TEXT NOT NULL UNIQUE,                         -- „2026/0001“
  token TEXT NOT NULL UNIQUE CHECK (token ~ '^[a-z0-9]{16,40}$'),  -- overovacia adresa celebret.dcza.sk/<token>
  issued_on DATE NOT NULL DEFAULT current_date,
  valid_until DATE NOT NULL,
  confession_jurisdiction BOOLEAN NOT NULL DEFAULT true,   -- veta o spovednej jurisdikcii v texte
  photo_url TEXT,                                          -- snímka fotky v čase vydania
  settings_id UUID REFERENCES public.celebret_settings(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  note TEXT,
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valid_until >= issued_on)
);
CREATE INDEX IF NOT EXISTS idx_clergy_celebrets_clergy ON public.clergy_celebrets (clergy_id, issued_on DESC);
CREATE INDEX IF NOT EXISTS idx_clergy_celebrets_valid ON public.clergy_celebrets (valid_until) WHERE revoked_at IS NULL;

-- 3. fotka od kňaza (kňazská zóna) – čaká na schválenie kúriou; schválená prejde do clergy.photo_url
CREATE TABLE IF NOT EXISTS public.clergy_photo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clergy_id UUID NOT NULL REFERENCES public.clergy(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clergy_photo_requests_pending ON public.clergy_photo_requests (created_at) WHERE status = 'pending';

COMMENT ON COLUMN public.clergy.photo_url IS 'Portrét kňaza – len pre celebret (neverejný v schematizme, O47); nahrá kúria alebo schváli návrh kňaza';

ALTER TABLE public.celebret_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clergy_celebrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clergy_photo_requests ENABLE ROW LEVEL SECURITY;

-- 4. číslo celebretu „RRRR/NNNN“ (poradie cez sekvenciu, server ho volá pri vydaní)
CREATE OR REPLACE FUNCTION public.next_celebret_number(p_year INT)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p_year::text || '/' || lpad(nextval('public.celebret_number_seq')::text, 4, '0')
$$;
REVOKE ALL ON FUNCTION public.next_celebret_number(INT) FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.clergy_celebrets IS 'Digitálne celebrety kňazov (K6) – overenie celebret.dcza.sk/<token>';
COMMENT ON TABLE public.celebret_settings IS 'Logo, pečiatka, podpis a kontakt kúrie pre celebrety – verzie (celebret si pamätá použitú verziu)';
COMMENT ON TABLE public.clergy_photo_requests IS 'Fotky na celebret poslané kňazom z kňazskej zóny – schvaľuje kúria';

-- 5. Pomoc – návod pre admin (odkaz „Návod k tejto stránke“ na /admin/knazi/celebrety)
INSERT INTO public.help_articles (zone, slug, title, summary, sort_order, content) VALUES
('admin', 'celebrety', 'Celebrety', 'Vydanie, tlač karty a overenie celebretu kňaza, hromadné vydanie, fotky a podpis.', 330, $h$
<p><strong>Celebret</strong> potvrdzuje, že kňaz je v riadnom postavení a môže sláviť. V Kroku je to záznam pri kňazovi v registri s vlastným <strong>QR kódom</strong>: po naskenovaní sa otvorí overovacia stránka <strong>celebret.dcza.sk</strong> s veľkým <strong>VALET</strong> (platný) alebo <strong>NON VALET</strong> (vypršaný alebo zrušený). Platnosť je vždy <strong>1 rok</strong> od vydania.</p>
<h2>Pred prvým vydaním</h2>
<p>V Schematizmus → <strong>Celebrety</strong> → <strong>Logo, pečiatka, podpis</strong> nahrajte logo diecézy, pečiatku a podpis (najlepšie PNG s priehľadným pozadím) a skontrolujte kontakt kúrie. Pri každom uložení vznikne nová verzia – už vydané celebrety si nechajú podpis, s ktorým boli vydané (napr. pri zmene biskupa).</p>
<h2>Vydanie jednému kňazovi</h2>
<ol>
<li>Otvorte kňaza v registri a záložku <strong>Celebret</strong>.</li>
<li>Nahrajte <strong>fotku</strong> (portrét – oreže sa na štvorec). Fotka sa zobrazí len na celebrete, nie v schematizme.</li>
<li>Skontrolujte <strong>Dátum vydania</strong> a políčko <strong>Má spovednú jurisdikciu</strong> (mení latinský text).</li>
<li>Kliknite na <strong>Vydať celebret</strong>.</li>
<li>Pri celebrete potom: <strong>Overenie</strong> (stránka z QR), <strong>Karta</strong> (tlač 85 × 54 mm) alebo <strong>A4</strong>.</li>
</ol>
<h2>Hromadne – všetkým naraz</h2>
<ol>
<li>Schematizmus → <strong>Celebrety</strong>. Filtre ukážu, kto celebret nemá, komu končí do 30 dní, komu chýba fotka.</li>
<li>Zaškrtnite kňazov (alebo všetkých v zozname), zvoľte dátum a kliknite na <strong>Vydať vybraným</strong>.</li>
<li>Potom <strong>Tlačiť karty</strong> – hárok A4 s 10 kartami. Tlačte <strong>obojstranne, otočenie po dlhšej strane, mierka 100 %, bez okrajov</strong>; za každým hárkom líca nasleduje hárok rubu.</li>
</ol>
<h2>Fotky od kňazov</h2>
<p>Kňaz si môže v kňazskej zóne (<strong>Môj celebret</strong>) poslať novú fotku. Zobrazí sa v Celebretoch v časti <strong>Fotky od kňazov na schválenie</strong> aj v záložke Celebret pri kňazovi – schválená sa použije pri ďalšom vydaní.</p>
<h2>Zrušenie</h2>
<p>Pri platnom celebrete kliknite na <strong>Zrušiť</strong> a napíšte dôvod. Overovacia stránka potom ukáže <strong>NON VALET</strong>. Starší celebret sa pri vydaní nového nezruší sám – vyprší, prípadne ho zrušte.</p>
<p>Staré adresy <strong>celebret.dcza.sk/meno-priezvisko</strong> z predchádzajúcej aplikácie presmerujú na najnovší celebret kňaza.</p>
$h$)
ON CONFLICT (zone, slug) DO NOTHING;
