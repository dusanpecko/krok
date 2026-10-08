-- 046: Videá (len odkazy YouTube / Vimeo, bez nahrávania) pri aktualitách a albumoch farností.
-- Pole objektov {provider: 'youtube'|'vimeo', id, hash?, url, title, thumbnail} – názov a náhľad
-- sa načítajú cez oEmbed pri uložení. Na stránke sa prehrávač načíta až po kliknutí (GDPR, rýchlosť).

ALTER TABLE public.parish_posts
  ADD COLUMN IF NOT EXISTS videos JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.parish_albums
  ADD COLUMN IF NOT EXISTS videos JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.parish_posts.videos IS 'Videá YouTube/Vimeo pod aktualitou: [{provider, id, hash?, url, title, thumbnail}]';
COMMENT ON COLUMN public.parish_albums.videos IS 'Videá YouTube/Vimeo v albume: [{provider, id, hash?, url, title, thumbnail}]';
