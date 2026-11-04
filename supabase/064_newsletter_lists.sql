-- 064: Newsletter – zoznamy (stránka „Pripravujeme nový web“ na dcza.sk). Každý zoznam je samostatný súhlas.
-- krok        = newsletter KROK (jediný newsletter, Brevo BREVO_LIST_ID; posiela aj v mene diecézy)
-- dcza_launch = jednorazové upozornenie na spustenie nového webu dcza.sk (len u nás, do Brevo nejde)

ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS lists TEXT[] NOT NULL DEFAULT '{krok}';

ALTER TABLE public.newsletter_subscribers
  DROP CONSTRAINT IF EXISTS newsletter_subscribers_lists_check;
ALTER TABLE public.newsletter_subscribers
  ADD CONSTRAINT newsletter_subscribers_lists_check
  CHECK (lists <@ ARRAY['krok', 'dcza_launch']::TEXT[] AND cardinality(lists) > 0);

COMMENT ON COLUMN public.newsletter_subscribers.lists IS 'Odoberané zoznamy: krok (newsletter KROK), dcza_launch (upozornenie na nový web)';
