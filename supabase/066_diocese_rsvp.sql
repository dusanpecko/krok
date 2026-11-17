-- 066: Podujatia webu diecézy – prihlášky na pozvánku (prvé: inaugurácia biskupa Petra Beňa).
-- Podujatie má vlastné otázky (JSON), pozvaní dostanú osobný odkaz /podujatia/<slug>?k=<token>,
-- odpoveď sa dá cez ten istý odkaz upraviť. Prístup len cez server (service role) – RLS bez politík.

CREATE TABLE IF NOT EXISTS public.diocese_rsvp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  event_when TEXT,                          -- dátum a miesto (voľný text, ide aj do e-mailov)
  intro TEXT,                               -- úvodný text nad prihláškou
  thanks_text TEXT,                         -- text po odoslaní prihlášky
  closes_at TIMESTAMPTZ,                    -- uzávierka prihlášok (NULL = do zatvorenia)
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  -- [{id, label, help, type: text|textarea|choice, options[], required, show_if: {question, equals} | null}]
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diocese_rsvp_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.diocese_rsvp_events(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  salutation TEXT,                          -- oslovenie v pozvánke (napr. „Vážený otec biskup“)
  first_name TEXT,
  last_name TEXT NOT NULL,
  email TEXT,
  group_name TEXT,                          -- skupina na triedenie (biskupi, kňazi, hostia…)
  note TEXT,                                -- interná poznámka
  sent_at TIMESTAMPTZ,                      -- posledné odoslanie pozvánky
  send_count INTEGER NOT NULL DEFAULT 0,
  opened_at TIMESTAMPTZ,                    -- prvé otvorenie osobného odkazu
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diocese_rsvp_invites_event ON public.diocese_rsvp_invites (event_id);

CREATE TABLE IF NOT EXISTS public.diocese_rsvp_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.diocese_rsvp_events(id) ON DELETE CASCADE,
  invite_id UUID UNIQUE REFERENCES public.diocese_rsvp_invites(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {question_id: odpoveď}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diocese_rsvp_responses_event ON public.diocese_rsvp_responses (event_id);

ALTER TABLE public.diocese_rsvp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_rsvp_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_rsvp_responses ENABLE ROW LEVEL SECURITY;

-- E-maily (kategória 'diocese' = hlavička a pätička Žilinskej diecézy)
INSERT INTO public.email_templates (template_key, name, description, category, subject, body, available_variables, from_email, from_name, is_active)
SELECT 'event_invite',
       'Pozvánka na podujatie',
       'Osobná pozvánka s odkazom na prihlášku (admin Web diecézy → Podujatia → Pozvaní).',
       'diocese',
       'Pozvánka: {{event_title}}',
       $b$<p>{{#salutation}}{{salutation}},{{/salutation}}{{^salutation}}Dobrý deň,{{/salutation}}</p>
<p>srdečne Vás pozývame na podujatie <strong>{{event_title}}</strong>{{#event_when}} – {{event_when}}{{/event_when}}.</p>
<p>Prosíme Vás o potvrdenie účasti prostredníctvom osobnej prihlášky:</p>
<p><a href="{{rsvp_url}}">Potvrdiť účasť / RSVP</a></p>
<p>Odkaz je určený len Vám – cez ten istý odkaz môžete odpoveď neskôr aj zmeniť.</p>
<p>S úctou</p>
<p>Biskupský úrad Žilina</p>$b$,
       '["{{salutation}}","{{first_name}}","{{last_name}}","{{event_title}}","{{event_when}}","{{rsvp_url}}"]'::jsonb,
       'mojkrok@dcza.sk', 'Žilinská diecéza', true
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE template_key = 'event_invite');

INSERT INTO public.email_templates (template_key, name, description, category, subject, body, available_variables, from_email, from_name, is_active)
SELECT 'event_confirmation',
       'Potvrdenie prihlášky na podujatie',
       'Príde hneď po odoslaní (aj zmene) prihlášky na podujatie.',
       'diocese',
       'Potvrdenie prihlášky: {{event_title}}',
       $b$<p>Dobrý deň{{#first_name}}, {{first_name}}{{/first_name}},</p>
<p>ďakujeme, Vašu prihlášku na podujatie <strong>{{event_title}}</strong>{{#event_when}} ({{event_when}}){{/event_when}} sme prijali.</p>
<p><strong>Vaše odpovede:</strong></p>
{{{answers_html}}}
<p>Ak potrebujete niečo zmeniť, použite svoj osobný odkaz: <a href="{{rsvp_url}}">upraviť prihlášku</a>.</p>
<p>S úctou</p>
<p>Biskupský úrad Žilina</p>$b$,
       '["{{first_name}}","{{last_name}}","{{event_title}}","{{event_when}}","{{rsvp_url}}","{{{answers_html}}}"]'::jsonb,
       'mojkrok@dcza.sk', 'Žilinská diecéza', true
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE template_key = 'event_confirmation');

-- Prvé podujatie: inaugurácia biskupa Petra Beňa (otázky prevzaté z formulára MS Forms; termín len pri ubytovaní)
INSERT INTO public.diocese_rsvp_events (slug, title, status, intro, questions)
SELECT 'inauguracia-biskupa',
       'Inaugurácia žilinského biskupa Mons. Petra Beňa',
       'draft',
       'Prosíme o potvrdenie účasti. / Kindly confirm your attendance (RSVP).',
       $q$[
  {"id":"omsa","label":"Účasť na sv. omši / Holy Mass attendance","help":null,"type":"choice","options":["ÁNO","NIE"],"required":true,"show_if":null},
  {"id":"obed","label":"Účasť na obede / Lunch attendance","help":null,"type":"choice","options":["ÁNO","NIE"],"required":true,"show_if":null},
  {"id":"strava","label":"Ak máte špeciálne stravovacie obmedzenia, uveďte aké / Special dietary requirements","help":null,"type":"textarea","options":[],"required":false,"show_if":null},
  {"id":"doprovod","label":"Doprovod / Plus guest","help":"Meno a priezvisko / Name and surname","type":"text","options":[],"required":false,"show_if":null},
  {"id":"ubytovanie","label":"Požiadavka na ubytovanie / Accommodation request","help":null,"type":"choice","options":["ÁNO","NIE"],"required":false,"show_if":null},
  {"id":"termin","label":"Termín ubytovania / Accommodation dates","help":null,"type":"choice","options":["27. - 28. november","28. - 29. november"],"required":true,"show_if":{"question":"ubytovanie","equals":"ÁNO"}}
]$q$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.diocese_rsvp_events WHERE slug = 'inauguracia-biskupa');
