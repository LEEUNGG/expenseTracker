-- ====================================================================
-- Debt Module Setup Script
-- 1. Creates the `debts` table (if not exists)
-- 2. Imports data from the provided CSV
-- ====================================================================

-- 1. Create Table
CREATE TABLE IF NOT EXISTS debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month_date DATE NOT NULL UNIQUE, -- Storing the first day of the month (e.g., 2026-01-01)
  ali_hua DECIMAL(10, 2) DEFAULT 0,
  ali_jie DECIMAL(10, 2) DEFAULT 0,
  cmb DECIMAL(10, 2) DEFAULT 0,
  jd_gold DECIMAL(10, 2) DEFAULT 0,
  jd_white DECIMAL(10, 2) DEFAULT 0,
  tiktok DECIMAL(10, 2) DEFAULT 0,
  salary DECIMAL(10, 2) DEFAULT 0,
  
  -- Calculated fields (Generated automatically)
  monthly_total_debt DECIMAL(10, 2) GENERATED ALWAYS AS (ali_hua + ali_jie + cmb + jd_gold + jd_white + tiktok) STORED,
  net_cash_flow DECIMAL(10, 2) GENERATED ALWAYS AS (salary - (ali_hua + ali_jie + cmb + jd_gold + jd_white + tiktok)) STORED,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Security
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON debts FOR ALL USING (true);

-- 2. Insert Data
-- Note: 'monthly_total_debt' and 'net_cash_flow' are skipped because they are generated columns.

INSERT INTO debts (month_date, ali_hua, ali_jie, cmb, jd_gold, jd_white, tiktok, salary) VALUES
('2026-01-01', 798.31, 3322.7, 5971.31, 373.83, 49.51, 190.08, 10720.09),
('2026-02-01', 798.31, 3322.7, 2823.31, 373.83, 49.51, 200.48, 11000),
('2026-03-01', 798.31, 3322.7, 2823.31, 373.83, 49.51, 213.61, 13000),
('2026-04-01', 798.31, 0, 2823.31, 373.83, 49.51, 241.56, 13000),
('2026-05-01', 798.31, 0, 2823.31, 373.83, 49.51, 241.56, 13000),
('2026-06-01', 224.02, 0, 928.53, 373.83, 49.51, 241.56, 13000),
('2026-07-01', 224.02, 0, 928.53, 373.83, 49.51, 241.56, 13000),
('2026-08-01', 224.02, 0, 928.53, 373.83, 49.51, 241.56, 13000),
('2026-09-01', 224.02, 0, 928.53, 0, 0, 241.56, 13000),
('2026-10-01', 224.02, 0, 928.53, 0, 0, 241.56, 13000),
('2026-11-01', 224.02, 0, 870.24, 0, 0, 241.56, 13000),
('2026-12-01', 224.02, 0, 870.24, 0, 0, 241.56, 13000),
('2027-01-01', 224.02, 0, 0, 0, 0, 0, 13000),
('2027-02-01', 224.02, 0, 0, 0, 0, 0, 13000),
('2027-03-01', 224.02, 0, 0, 0, 0, 0, 13000),
('2027-04-01', 224.02, 0, 0, 0, 0, 0, 13000),
('2027-05-01', 224.02, 0, 0, 0, 0, 0, 13000),
('2027-06-01', 224.02, 0, 0, 0, 0, 0, 13000)
ON CONFLICT (month_date) DO UPDATE SET
  ali_hua = EXCLUDED.ali_hua,
  ali_jie = EXCLUDED.ali_jie,
  cmb = EXCLUDED.cmb,
  jd_gold = EXCLUDED.jd_gold,
  jd_white = EXCLUDED.jd_white,
  tiktok = EXCLUDED.tiktok,
  salary = EXCLUDED.salary;
