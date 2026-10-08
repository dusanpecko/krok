-- 044: Fotogaléria farnosti (krok_navrh_farnosti.md § 17, rozhodnutia O59–O64).
-- Albumy: „Kostol a farnosť“ (kind = church, jeden na farnosť – pás fotiek hore na stránke)
-- a „Zo života farnosti“ (kind = life). Fotky sa na serveri zmenšia a prevedú do WebP;
-- kvótu úložiska určuje diecéza pre každú farnosť (predvolene 100 MB).
-- Čítanie aj zápis len cez server (service role) – verejné politiky nie sú.

ALTER TABLE public.parishes
  ADD COLUMN IF NOT EXISTS gallery_quota_bytes BIGINT NOT NULL DEFAULT 104857600;  -- 100 MB

CREATE TABLE IF NOT EXISTS public.parish_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES public.parishes(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'life' CHECK (kind IN ('church', 'life')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  cover_photo_id UUID,                        -- FK nižšie (kruhová väzba s parish_photos)
  published BOOLEAN NOT NULL DEFAULT true,
  taken_down_at TIMESTAMPTZ,                  -- diecéza album stiahla (§ 4.3)
  takedown_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parish_id, slug)
);
CREATE UNIQUE INDEX IF NOT EXISTS parish_albums_one_church ON public.parish_albums (parish_id) WHERE kind = 'church';
CREATE INDEX IF NOT EXISTS idx_parish_albums_parish ON public.parish_albums (parish_id, event_date DESC);

CREATE TABLE IF NOT EXISTS public.parish_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.parish_albums(id) ON DELETE CASCADE,
  parish_id UUID NOT NULL REFERENCES public.parishes(id) ON DELETE CASCADE,  -- kvôli súčtu kvóty
  url TEXT NOT NULL,
  storage_key TEXT,                           -- kľúč na B2 (zmazanie súboru)
  width INT,
  height INT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_parish_photos_album ON public.parish_photos (album_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_parish_photos_parish ON public.parish_photos (parish_id);

ALTER TABLE public.parish_albums
  DROP CONSTRAINT IF EXISTS parish_albums_cover_photo_id_fkey;
ALTER TABLE public.parish_albums
  ADD CONSTRAINT parish_albums_cover_photo_id_fkey FOREIGN KEY (cover_photo_id) REFERENCES public.parish_photos(id) ON DELETE SET NULL;

-- Aktualita môže mať pripojený album (kňaz nenahráva fotky dvakrát)
ALTER TABLE public.parish_posts
  ADD COLUMN IF NOT EXISTS album_id UUID REFERENCES public.parish_albums(id) ON DELETE SET NULL;

ALTER TABLE public.parish_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parish_photos ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.parish_albums IS 'Fotogaléria farnosti: church = Kostol a farnosť (pás hore), life = Zo života farnosti';
COMMENT ON COLUMN public.parishes.gallery_quota_bytes IS 'Kvóta úložiska fotogalérie (určuje diecéza)';
