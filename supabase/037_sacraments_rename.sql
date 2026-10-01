-- 037: Sviatosti – „Eucharistia“ namiesto „Prvé sväté prijímanie“, „Sviatosť zmierenia“ namiesto
-- „Svätá spoveď“, poradie podľa Katechizmu (krst, birmovanie, eucharistia, zmierenie, pomazanie,
-- manželstvo). Pohreb nie je sviatosť – na stránke je za oddeľovačom (kód: NON_SACRAMENT_TYPES).
-- Kľúče sa premenujú, vlastné texty farností idú s nimi (ON UPDATE CASCADE).

UPDATE public.sacrament_texts SET type = 'eucharistia' WHERE type = 'prve-sv-prijimanie';
UPDATE public.sacrament_texts SET type = 'zmierenie' WHERE type = 'spoved';

UPDATE public.sacrament_texts SET sort_order = 10 WHERE type = 'krst';
UPDATE public.sacrament_texts SET sort_order = 20 WHERE type = 'birmovka';
UPDATE public.sacrament_texts SET sort_order = 30, title = 'Eucharistia',
  content = '<p>Eucharistia je prameň a vrchol celého kresťanského života – v nej sa nám Kristus dáva za pokrm.</p><p>Na prvú svätú spoveď a prvé sväté prijímanie sa deti pripravujú spravidla v 3. ročníku základnej školy, v spolupráci farnosti, rodiny a školy. Informácie o príprave a prihlasovaní vyhlási farnosť v oznamoch na začiatku školského roka.</p><p>Dospelí, ktorí ešte neprijali prvé sväté prijímanie, sa môžu prihlásiť na farskom úrade.</p>'
  WHERE type = 'eucharistia' AND updated_by IS NULL;
UPDATE public.sacrament_texts SET sort_order = 30, title = 'Eucharistia' WHERE type = 'eucharistia';
UPDATE public.sacrament_texts SET sort_order = 40, title = 'Sviatosť zmierenia',
  content = '<p>Vo sviatosti zmierenia (vo svätej spovedi) nám Boh odpúšťa hriechy a zmieruje nás so sebou i s Cirkvou.</p><p>Príležitosť na svätú spoveď je pred svätými omšami a v časoch uvedených v rozpise bohoslužieb. Pred prvým piatkom v mesiaci a pred veľkými sviatkami býva spovedanie rozšírené – sledujte farské oznamy.</p>'
  WHERE type = 'zmierenie' AND updated_by IS NULL;
UPDATE public.sacrament_texts SET sort_order = 40, title = 'Sviatosť zmierenia' WHERE type = 'zmierenie';
UPDATE public.sacrament_texts SET sort_order = 50 WHERE type = 'pomazanie';
UPDATE public.sacrament_texts SET sort_order = 60 WHERE type = 'manzelstvo';
UPDATE public.sacrament_texts SET sort_order = 90 WHERE type = 'pohreb';
