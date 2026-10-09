-- 050: Web dcza.sk – dokumenty (vlastné + synchronizované z kbs.sk) a fotogaléria diecézy (§ 20, O75–O77).

-- 1. Dokumenty: sekcia (napr. dokumenty-papezov), skupina (napr. „Lev XIV.“), odkaz.
--    source = 'kbs' → otvorí sa na kbs.sk (synchronizácia); 'krok' → vlastný dokument (súbor na B2 alebo odkaz).
CREATE TABLE IF NOT EXISTS public.diocese_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL DEFAULT 'dokumenty-papezov',
  group_label TEXT,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  file_name TEXT,
  issued_on DATE,
  sort_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'krok' CHECK (source IN ('krok', 'kbs')),
  source_id TEXT,
  synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS diocese_documents_source_key ON public.diocese_documents (source, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diocese_documents_section ON public.diocese_documents (section, published, sort_order);

-- 2. Fotogaléria diecézy – rovnaká stavba ako albumy farností (044–046), bez farnosti
CREATE TABLE IF NOT EXISTS public.diocese_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  event_date DATE,
  cover_photo_id UUID,
  external_url TEXT,
  videos JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diocese_albums_date ON public.diocese_albums (published, event_date DESC);

CREATE TABLE IF NOT EXISTS public.diocese_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.diocese_albums(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_key TEXT,
  width INT,
  height INT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diocese_photos_album ON public.diocese_photos (album_id, sort_order);

ALTER TABLE public.diocese_albums DROP CONSTRAINT IF EXISTS diocese_albums_cover_photo_id_fkey;
ALTER TABLE public.diocese_albums
  ADD CONSTRAINT diocese_albums_cover_photo_id_fkey FOREIGN KEY (cover_photo_id) REFERENCES public.diocese_photos(id) ON DELETE SET NULL;

ALTER TABLE public.diocese_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_photos ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.diocese_documents IS 'Web dcza.sk – dokumenty: vlastné (source=krok) a synchronizované z kbs.sk (source=kbs, otvárajú sa na kbs.sk)';
COMMENT ON TABLE public.diocese_albums IS 'Web dcza.sk – fotogaléria diecézy (albumy, videá, externé odkazy)';
