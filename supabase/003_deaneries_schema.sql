-- 003_deaneries_schema.sql
-- Introduction of formal deaneries table and parish relationship

-- 1. Create deaneries table
CREATE TABLE deaneries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Insert initial list provided by the user
INSERT INTO deaneries (name) VALUES 
('Bytča'),
('Čadca'),
('Ilava'),
('Krásno nad Kysucou'),
('Kysucké Nové Mesto'),
('Martin'),
('Považská Bystrica'),
('Púchov'),
('Rajec'),
('Turzovka'),
('Varín'),
('Žilina');

-- 3. Update parishes table
-- Move existing deanery text to a temporary column if needed, or just add the new FK
ALTER TABLE parishes ADD COLUMN deanery_id UUID REFERENCES deaneries(id) ON DELETE SET NULL;

-- 4. Attempt to migrate existing text data to the new FK
UPDATE parishes p
SET deanery_id = d.id
FROM deaneries d
WHERE p.deanery = d.name;

-- 5. Cleanup (optional: keep the text column for a while or drop it now)
-- ALTER TABLE parishes DROP COLUMN deanery;

-- 6. RLS for deaneries
ALTER TABLE deaneries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deaneries_admin_all" ON deaneries
    FOR ALL USING (is_admin());

COMMENT ON TABLE deaneries IS 'Dekanáty Žilinskej diecézy';
