-- 004_projects_data.sql
-- Import of initial projects from FileMaker XML

INSERT INTO projects (name, slug, target_amount, specific_symbol, status, visible_on_web) VALUES
('Môj Krok', 'moj-krok', NULL, '24001', 'active', true),
('Lectio divina', 'lectio-divina', 7200, '2402', 'active', true),
('Podpora mládeže', 'podpora-mladeze', 9000, '2403', 'active', true),
('Dve percenta', 'dve-percenta', NULL, '2404', 'active', true),
('S farskou charitou bližšie k vám', 's-farskou-charitou-blizsie-k-vam', 12000, '2405', 'active', true),
('Chodíme spolu...', 'chodime-spolu', 16000, '2406', 'active', true)
ON CONFLICT (slug) DO UPDATE 
SET 
  name = EXCLUDED.name,
  target_amount = EXCLUDED.target_amount,
  specific_symbol = EXCLUDED.specific_symbol;
