-- 074: „Správa farnosti“ / „zóna farnosti“ → „správa farskej stránky“ (pripomienka kňaza 2026-11-25:
-- „správa farnosti“ znie ako úrad farára; spravuje sa len stránka). Správca farnosti (farár) ostáva.
-- Mení e-mailové šablóny farností a návody v Pomocníkovi zóny farnosti (admin návody nechávame).

CREATE OR REPLACE FUNCTION pg_temp.fs(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $f$
  SELECT replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(t,
    'Správa farnosti', 'Správa farskej stránky'),
    'správa farnosti', 'správa farskej stránky'),
    'správy farnosti', 'správy farskej stránky'),
    'správe farnosti', 'správe farskej stránky'),
    'správu farnosti', 'správu farskej stránky'),
    'Zóna farnosti', 'Správa farskej stránky'),
    'zóna farnosti', 'správa farskej stránky'),
    'zóny farnosti', 'správy farskej stránky'),
    'zóne farnosti', 'správe farskej stránky'),
    'zónu farnosti', 'správu farskej stránky'),
    'v zóne nájdete', 'v správe farskej stránky nájdete')
$f$;

UPDATE public.email_templates
SET subject = CASE WHEN template_key = 'parish_access_clergy_granted'
                   THEN 'Stránka farnosti {{parishes}} na dcza.sk'
                   ELSE pg_temp.fs(subject) END,
    name = pg_temp.fs(name),
    body = pg_temp.fs(body),
    updated_at = now()
WHERE template_key LIKE 'parish_%';

UPDATE public.help_articles
SET title = pg_temp.fs(title),
    summary = pg_temp.fs(summary),
    content = pg_temp.fs(content),
    updated_at = now()
WHERE zone = 'parish';

-- zvyšné „zóna“ bez „farnosti“
UPDATE public.help_articles
SET content = replace(replace(replace(replace(content,
      '<h2>Menu zóny</h2>', '<h2>Menu správy farskej stránky</h2>'),
      'Časti zóny sú v', 'Jednotlivé časti sú v'),
      'Mená darcov sa v zóne nikde', 'Mená darcov sa v správe farskej stránky nikde'),
      'Otvorí sa zóna vašej farnosti.', 'Otvorí sa správa stránky vašej farnosti.'),
    updated_at = now()
WHERE zone = 'parish' AND slug IN ('ako-funguje-zona-farnosti', 'prve-prihlasenie');
