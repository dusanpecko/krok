-- 055: Pomoc – voliteľné video k návodu (YouTube / Vimeo), zobrazí sa navrchu návodu.
ALTER TABLE public.help_articles ADD COLUMN IF NOT EXISTS video_url TEXT;
COMMENT ON COLUMN public.help_articles.video_url IS 'Odkaz na video k návodu (YouTube alebo Vimeo) – prehrávač navrchu návodu';
