-- 002_donor_extensions.sql
-- Extension of donors table with missing fields and organization support

-- 1. Add new columns to donors
ALTER TABLE donors 
ADD COLUMN formal_addressing TEXT,
ADD COLUMN newsletter_opt_in BOOLEAN DEFAULT false,
ADD COLUMN confirmation_method TEXT,
ADD COLUMN company_name TEXT,
ADD COLUMN ico TEXT,
ADD COLUMN dic TEXT,
ADD COLUMN website TEXT;

-- 2. Create donor_projects join table for multi-project support
CREATE TABLE donor_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID REFERENCES donors(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(donor_id, project_id)
);

-- 3. Enable RLS for donor_projects
ALTER TABLE donor_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "donor_projects_admin_all" ON donor_projects
    FOR ALL USING (is_admin());

-- 4. Add specific_symbol to projects for later bank matching
ALTER TABLE projects ADD COLUMN specific_symbol TEXT UNIQUE;

COMMENT ON COLUMN donors.formal_addressing IS 'Položka Oslovenie (napr. Vážený pán)';
COMMENT ON TABLE donor_projects IS 'M:N vzťah medzi darcami a projektami, ktoré podporujú';
