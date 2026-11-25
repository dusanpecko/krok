-- 073: „Sviatosti“ → „Sviatosti a sväteniny“ (požehnania a pohreb nie sú sviatosti) – názov návodu v Pomocníkovi
UPDATE public.help_articles
SET title = 'Sviatosti a sväteniny',
    content = replace(content, 'V záložke <strong>Sviatosti</strong>', 'V záložke <strong>Sviatosti a sväteniny</strong>'),
    updated_at = now()
WHERE zone = 'parish' AND slug = 'sviatosti';
