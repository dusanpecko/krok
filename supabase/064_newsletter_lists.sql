-- 064: Newsletter – viac zoznamov (stránka „Pripravujeme nový web“ na dcza.sk).
-- krok        = newsletter KROK (doterajšie prihlásenia z mojkrok.sk / pätičky)
-- dcza        = newsletter Žilinskej diecézy
-- dcza_launch = jednorazové upozornenie na spustenie nového webu dcza.sk
-- Každý zoznam je samostatný súhlas; v Brevo zodpovedá vlastnému zoznamu (BREVO_LIST_ID, BREVO_LIST_ID_DCZA, BREVO_LIST_ID_DCZA_LAUNCH).

ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS lists TEXT[] NOT NULL DEFAULT '{krok}';

ALTER TABLE public.newsletter_subscribers
  DROP CONSTRAINT IF EXISTS newsletter_subscribers_lists_check;
ALTER TABLE public.newsletter_subscribers
  ADD CONSTRAINT newsletter_subscribers_lists_check
  CHECK (lists <@ ARRAY['krok', 'dcza', 'dcza_launch']::TEXT[] AND cardinality(lists) > 0);

COMMENT ON COLUMN public.newsletter_subscribers.lists IS 'Odoberané zoznamy: krok, dcza (newsletter diecézy), dcza_launch (upozornenie na nový web)';
