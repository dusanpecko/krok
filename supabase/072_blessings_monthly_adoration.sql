-- 072: Požiadavky farností (R. Folučka, Rajec, 2026-11-25)
-- 1. „Požehnania“ v sekcii Sviatosti – čo treba vybaviť (sväteniny, na stránke za oddeľovačom ako pohreb; kód NON_SACRAMENT_TYPES)
-- 2. Pravidelná (napr. mesačná) celodenná poklona – voľný text, zobrazí sa vedľa hodov a výročnej poklony

-- 1. Požehnania – spoločný text diecézy (farnosť si ho upraví alebo skryje v správe farnosti)
INSERT INTO public.sacrament_texts (type, title, sort_order, content) VALUES
('pozehnania', 'Požehnania', 80,
 '<p>Požehnania patria medzi sväteniny – Cirkev nimi prosí o Božiu ochranu pre ľudí, ich domovy a predmety, ktoré slúžia viere.</p><h3>Požehnanie a posvätenie devocionálií</h3><p>Kríže, obrazy, sochy, ružence či medailóniky Vám kňaz posvätí po svätej omši alebo na farskom úrade.</p><h3>Požehnanie domu a bytu</h3><p>Domy a byty sa tradične požehnávajú v období sviatku Zjavenia Pána (Troch kráľov, 6. januára). O požehnanie nového domu, bytu či iných priestorov môžete požiadať aj počas roka na farskom úrade.</p>')
ON CONFLICT (type) DO NOTHING;

-- vlastný text farnosti Rajec (podľa e-mailu p. dekana)
INSERT INTO public.parish_sacrament_texts (parish_id, type, content)
SELECT p.id, 'pozehnania',
 '<h3>Požehnanie a posvätenie devocionálií</h3><p>Posvätiť kríže, obrazy, sochy, ružence a medailóny Pána Ježiša, Panny Márie a svätých môžete požiadať v kostole po každej svätej omši.</p><h3>Požehnanie domu</h3><p>Domy sa požehnávajú v období sviatku Zjavenia Pána (Troch kráľov), ktorý sa slávi 6. januára.</p>'
FROM public.parishes p WHERE p.slug = 'rajec'
ON CONFLICT (parish_id, type) DO NOTHING;

-- 2. Pravidelná celodenná poklona
ALTER TABLE public.parishes ADD COLUMN IF NOT EXISTS monthly_adoration TEXT;

UPDATE public.parishes
SET monthly_adoration = '2. štvrtok v mesiaci, po rannej svätej omši do 19.00'
WHERE slug = 'rajec' AND monthly_adoration IS NULL;

-- 3. Pomocník zóny farnosti: požehnania, pravidelná poklona, prístupy podľa schematizmu (069/070), stránka na dcza.sk
UPDATE public.help_articles SET content = replace(content,
  '<p>Sviatosti sa na stránke zobrazia až po zapnutí verejnej stránky v záložke Prezentácia.</p>',
  '<p>Za oddeľovačom sú <strong>Požehnania</strong> (posvätenie devocionálií, požehnanie domu) a <strong>Pohreb</strong> – nie sú to sviatosti, ale ľudia ich hľadajú na tom istom mieste. Upravujú sa rovnako.</p>
<p>Sviatosti sa na stránke zobrazia až po zapnutí verejnej stránky v záložke Prezentácia.</p>'), updated_at = now()
WHERE zone = 'parish' AND slug = 'sviatosti' AND content NOT LIKE '%Požehnania%';

UPDATE public.help_articles SET content = replace(replace(content,
  'Vyplňte <strong>Hody</strong> a <strong>Výročnú celodennú poklonu</strong> (dátum alebo poznámku, napríklad „1. septembrová nedeľa“).</li>',
  'Vyplňte <strong>Hody</strong> a <strong>Výročnú celodennú poklonu</strong> (dátum alebo poznámku, napríklad „1. septembrová nedeľa“). Ak má farnosť aj <strong>pravidelnú celodennú poklonu</strong> (napríklad každý mesiac), napíšte ju do poľa Pravidelná celodenná poklona, napríklad „2. štvrtok v mesiaci, po rannej svätej omši do 19.00“.</li>'),
  'stránka farnosti na mojkrok.sk', 'stránka farnosti na dcza.sk'), updated_at = now()
WHERE zone = 'parish' AND slug = 'prezentacia-a-verejna-stranka';

UPDATE public.help_articles SET content = replace(replace(replace(replace(content,
  'stránku svojej farnosti na mojkrok.sk', 'stránku svojej farnosti na dcza.sk'),
  '<strong>mojkrok.sk/moja-farnost</strong>', '<strong>dcza.sk/moja-farnost</strong>'),
  'Farnosť má jedného <strong>správcu účtu</strong> (zvyčajne správca farnosti) a môže mať viac <strong>editorov</strong> (napríklad farníka, ktorý píše oznamy).',
  'Farnosť má jedného <strong>správcu</strong> (farár alebo administrátor) a môže mať viac <strong>editorov</strong> (farský vikár, ale aj kostolník či farník, ktorý píše oznamy).'),
  'Prístupy prideľuje biskupský úrad.',
  'Kňazi majú prístup automaticky podľa schematizmu – pri preložení sa zmení sám. Ďalších editorov pridáva správca v časti <strong>Ľudia s prístupom</strong>.'), updated_at = now()
WHERE zone = 'parish' AND slug = 'ako-funguje-zona-farnosti';

UPDATE public.help_articles SET content = replace(replace(content,
  'Prístup do zóny farnosti prideľuje biskupský úrad – vždy na diecéznu adresu <strong>@dcza.sk</strong>. Na ňu príde e-mail „Prístup do správy farnosti“.',
  'Kňazi majú prístup do správy farnosti automaticky podľa schematizmu – farár a administrátor ako správca, farský vikár ako editor – na diecéznu adresu <strong>@dcza.sk</strong>. Ďalších ľudí (kostolník, ministrant) pridáva správca farnosti na akúkoľvek adresu; tým príde e-mail s pozvánkou.'),
  '(alebo otvorte <strong>mojkrok.sk/prihlasenie</strong>)', '(alebo napíšte do prehliadača <strong>www.dcza.sk</strong> a kliknite na Prihlásiť sa)'), updated_at = now()
WHERE zone = 'parish' AND slug = 'prve-prihlasenie';
