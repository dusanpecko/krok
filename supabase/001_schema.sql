-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Supabase / PostgreSQL Schema v1.0
-- ============================================================

-- 1. Vlastné ENUM typy
-- ============================================================

CREATE TYPE donor_type AS ENUM ('individual', 'organization', 'parish');
CREATE TYPE donor_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE payment_method AS ENUM ('bank_transfer', 'postal_order', 'card_24pay', 'cash');
CREATE TYPE transaction_direction AS ENUM ('credit', 'debit');
CREATE TYPE transaction_category AS ENUM (
  'donation',
  'expense_salary',
  'expense_tax',
  'expense_supplier',
  'expense_other',
  '24pay_payout',
  'unmatched'
);
CREATE TYPE project_category AS ENUM (
  'charity',
  'education',
  'parish',
  'evangelization',
  'youth',
  'liturgy',
  'other'
);
CREATE TYPE project_status AS ENUM ('active', 'completed', 'draft');
CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'viewer');


-- ============================================================
-- 2. Tabuľky
-- ============================================================

-- 2.1 Farnosti
-- ============================================================
CREATE TABLE parishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  deanery TEXT,
  city TEXT,
  postal_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE parishes IS 'Farnosti Žilinskej diecézy';


-- 2.2 Projekty a grantové výzvy
-- ============================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category project_category DEFAULT 'other',
  status project_status DEFAULT 'draft',
  target_amount DECIMAL(12,2),
  start_date DATE,
  end_date DATE,
  image_url TEXT,
  visible_on_web BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE projects IS 'Podporené projekty a grantové výzvy (Lectio divina, DAŠ, Farská charita…)';


-- 2.3 Darcovia
-- ============================================================
CREATE TABLE donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  legacy_id TEXT,
  variable_symbol TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title_before TEXT,
  title_after TEXT,
  email TEXT,
  phone TEXT,
  street TEXT,
  city TEXT,
  postal_code TEXT,
  iban TEXT,
  parish_id UUID REFERENCES parishes(id) ON DELETE SET NULL,
  donor_type donor_type DEFAULT 'individual',
  status donor_status DEFAULT 'active',
  notes TEXT,
  registered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE donors IS 'Centrálna tabuľka darcov – nahradí FM tabuľku donator';

CREATE INDEX idx_donors_variable_symbol ON donors(variable_symbol);
CREATE INDEX idx_donors_email ON donors(email);
CREATE INDEX idx_donors_parish ON donors(parish_id);
CREATE INDEX idx_donors_last_name ON donors(last_name);
CREATE INDEX idx_donors_status ON donors(status);


-- 2.4 Admin používatelia
-- ============================================================
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'viewer',
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE admin_users IS 'Zamestnanci KROK s prístupom do admin zóny';


-- 2.5 Importy bankových výpisov (batch)
-- ============================================================
CREATE TABLE bank_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  iban TEXT,
  period_from DATE,
  period_to DATE,
  opening_balance DECIMAL(12,2),
  closing_balance DECIMAL(12,2),
  total_entries INT,
  total_credit DECIMAL(12,2),
  total_debit DECIMAL(12,2),
  imported_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  imported_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE bank_import_batches IS 'Evidencia každého importu XML bankového výpisu';


-- 2.6 Bankové transakcie
-- ============================================================
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_ref TEXT UNIQUE NOT NULL,
  message_id TEXT,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  direction transaction_direction NOT NULL,
  booking_date DATE NOT NULL,
  value_date DATE,
  counterparty_iban TEXT,
  counterparty_bic TEXT,
  counterparty_name TEXT,
  variable_symbol TEXT,
  specific_symbol TEXT,
  constant_symbol TEXT,
  remittance_info TEXT,
  bank_tx_code TEXT,
  donor_id UUID REFERENCES donors(id) ON DELETE SET NULL,
  matched BOOLEAN DEFAULT false,
  category transaction_category DEFAULT 'unmatched',
  import_batch_id UUID REFERENCES bank_import_batches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE bank_transactions IS 'Importované bankové transakcie z camt.053 XML (FIO banka)';

CREATE INDEX idx_bank_tx_booking_date ON bank_transactions(booking_date);
CREATE INDEX idx_bank_tx_direction ON bank_transactions(direction);
CREATE INDEX idx_bank_tx_vs ON bank_transactions(variable_symbol);
CREATE INDEX idx_bank_tx_donor ON bank_transactions(donor_id);
CREATE INDEX idx_bank_tx_matched ON bank_transactions(matched);
CREATE INDEX idx_bank_tx_category ON bank_transactions(category);
CREATE INDEX idx_bank_tx_batch ON bank_transactions(import_batch_id);


-- 2.7 Dary (konsolidované – nahradia ročné tabuľky)
-- ============================================================
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  bank_transaction_id UUID REFERENCES bank_transactions(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  donation_date DATE NOT NULL,
  year INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM donation_date)::INT) STORED,
  month INT GENERATED ALWAYS AS (EXTRACT(MONTH FROM donation_date)::INT) STORED,
  payment_method payment_method DEFAULT 'bank_transfer',
  matched BOOLEAN DEFAULT false,
  matched_at TIMESTAMPTZ,
  matched_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE donations IS 'Všetky dary – jedna tabuľka namiesto ročných tabuliek z FM';

CREATE INDEX idx_donations_donor ON donations(donor_id);
CREATE INDEX idx_donations_date ON donations(donation_date);
CREATE INDEX idx_donations_year ON donations(year);
CREATE INDEX idx_donations_project ON donations(project_id);
CREATE INDEX idx_donations_matched ON donations(matched);


-- ============================================================
-- 3. Automatický updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_donors_updated_at
  BEFORE UPDATE ON donors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 4. Row Level Security (RLS)
-- ============================================================

-- Zapnúť RLS na všetkých tabuľkách
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE parishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Helper: Je aktuálny user admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- === DONORS ===
-- Darca vidí len seba
CREATE POLICY "donors_select_own" ON donors
  FOR SELECT USING (auth_user_id = auth.uid() OR is_admin());

-- Darca môže meniť len svoje údaje
CREATE POLICY "donors_update_own" ON donors
  FOR UPDATE USING (auth_user_id = auth.uid() OR is_admin());

-- Vložiť darcu môže len admin
CREATE POLICY "donors_insert_admin" ON donors
  FOR INSERT WITH CHECK (is_admin());

-- Zmazať darcu môže len admin
CREATE POLICY "donors_delete_admin" ON donors
  FOR DELETE USING (is_admin());


-- === DONATIONS ===
-- Darca vidí len svoje dary
CREATE POLICY "donations_select_own" ON donations
  FOR SELECT USING (
    donor_id IN (SELECT id FROM donors WHERE auth_user_id = auth.uid())
    OR is_admin()
  );

-- Vložiť/upraviť/zmazať dar môže len admin
CREATE POLICY "donations_insert_admin" ON donations
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "donations_update_admin" ON donations
  FOR UPDATE USING (is_admin());

CREATE POLICY "donations_delete_admin" ON donations
  FOR DELETE USING (is_admin());


-- === BANK TRANSACTIONS ===
-- Len admin vidí bankové transakcie
CREATE POLICY "bank_tx_admin_only" ON bank_transactions
  FOR ALL USING (is_admin());


-- === BANK IMPORT BATCHES ===
-- Len admin
CREATE POLICY "bank_batches_admin_only" ON bank_import_batches
  FOR ALL USING (is_admin());


-- === PROJECTS ===
-- Projekty vidí každý prihlásený (na webe cez anon key), ale meniť môže len admin
CREATE POLICY "projects_select_all" ON projects
  FOR SELECT USING (true);

CREATE POLICY "projects_modify_admin" ON projects
  FOR ALL USING (is_admin());


-- === PARISHES ===
-- Farnosti vidí každý, meniť môže len admin
CREATE POLICY "parishes_select_all" ON parishes
  FOR SELECT USING (true);

CREATE POLICY "parishes_modify_admin" ON parishes
  FOR ALL USING (is_admin());


-- === ADMIN USERS ===
-- Admin tabuľku vidí len admin
CREATE POLICY "admin_users_admin_only" ON admin_users
  FOR ALL USING (is_admin());


-- ============================================================
-- 5. Pohľady (Views) pre dashboard a štatistiky
-- ============================================================

-- Súhrn darov podľa darcu (pre admin dashboard)
CREATE OR REPLACE VIEW v_donor_summary AS
SELECT
  d.id,
  d.first_name,
  d.last_name,
  d.email,
  d.variable_symbol,
  d.status,
  p.name AS parish_name,
  COUNT(dn.id) AS total_donations,
  COALESCE(SUM(dn.amount), 0) AS total_amount,
  MAX(dn.donation_date) AS last_donation_date
FROM donors d
LEFT JOIN donations dn ON dn.donor_id = d.id
LEFT JOIN parishes p ON p.id = d.parish_id
GROUP BY d.id, d.first_name, d.last_name, d.email, d.variable_symbol, d.status, p.name;

-- Mesačný prehľad príjmov a výdajov
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
  EXTRACT(YEAR FROM booking_date)::INT AS year,
  EXTRACT(MONTH FROM booking_date)::INT AS month,
  SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END) -
  SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) AS net,
  COUNT(*) FILTER (WHERE direction = 'credit') AS credit_count,
  COUNT(*) FILTER (WHERE direction = 'debit') AS debit_count,
  COUNT(*) FILTER (WHERE direction = 'credit' AND matched = false) AS unmatched_count
FROM bank_transactions
GROUP BY year, month
ORDER BY year DESC, month DESC;


-- ============================================================
-- HOTOVO! Schema pripravená. 🎉
-- ============================================================
