-- Existing schema...
-- (I will append the new table here)

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  color VARCHAR(20) DEFAULT '#3b82f6', -- Added color field with a default blue
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  note TEXT,
  category_id UUID REFERENCES categories(id),
  is_essential BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budget_adjustments table
CREATE TABLE IF NOT EXISTS budget_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  budget_amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, emoji, color) VALUES
  ('Food', '🍜', '#34d399'),         -- Mint Emerald
  ('Commute', '🚗', '#60a5fa'),      -- Sky Blue
  ('Family', '👪', '#a78bfa'),       -- Soft Violet
  ('Fun', '🎮', '#fb7185'),          -- Rose Coral
  ('Utilities', '🏠', '#fbbf24'),    -- Warm Amber
  ('Connectivity', '🌐', '#22d3ee'), -- Tech Cyan
  ('Daily Necessities', '🧴', '#f472b6') -- Sakura Pink
ON CONFLICT DO NOTHING;

-- Add note column to categories table for category notes feature
ALTER TABLE categories ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expenses_datetime ON expenses(transaction_datetime);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_deleted ON categories(is_deleted);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_adjustments ENABLE ROW LEVEL SECURITY;

-- Allow public access (for demo purposes without auth)
CREATE POLICY "Enable read access for all users" ON categories FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON categories FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON categories FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON expenses FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON expenses FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON expenses FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON budget_adjustments FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON budget_adjustments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON budget_adjustments FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON budget_adjustments FOR DELETE USING (true);

-- ==========================================
-- 1. 创建节假日/调休表 (holidays)
-- ==========================================
CREATE TABLE IF NOT EXISTS holidays (
  date DATE PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('holiday', 'workday')), -- 'holiday' 放假, 'workday' 调休上班
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 开启安全策略 (RLS) 并允许公开读写 (开发便捷)
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON holidays FOR ALL USING (true);

-- ==========================================
-- 2. 导入 2026 年法定节假日数据 (Budget 150)
-- ==========================================
INSERT INTO holidays (date, type, name) VALUES
  ('2026-01-01', 'holiday', 'NYD'), ('2026-01-02', 'holiday', 'NYD'), ('2026-01-03', 'holiday', 'NYD'),
  ('2026-02-15', 'holiday', 'CNY'), ('2026-02-16', 'holiday', 'CNY'), ('2026-02-17', 'holiday', 'CNY'),
  ('2026-02-18', 'holiday', 'CNY'), ('2026-02-19', 'holiday', 'CNY'), ('2026-02-20', 'holiday', 'CNY'),
  ('2026-02-21', 'holiday', 'CNY'), ('2026-02-22', 'holiday', 'CNY'), ('2026-02-23', 'holiday', 'CNY'),
  ('2026-04-04', 'holiday', 'QMF'), ('2026-04-05', 'holiday', 'QMF'), ('2026-04-06', 'holiday', 'QMF'),
  ('2026-05-01', 'holiday', 'LAB'), ('2026-05-02', 'holiday', 'LAB'), ('2026-05-03', 'holiday', 'LAB'),
  ('2026-05-04', 'holiday', 'LAB'), ('2026-05-05', 'holiday', 'LAB'),
  ('2026-06-19', 'holiday', 'DBF'), ('2026-06-20', 'holiday', 'DBF'), ('2026-06-21', 'holiday', 'DBF'),
  ('2026-09-25', 'holiday', 'MAF'), ('2026-09-26', 'holiday', 'MAF'), ('2026-09-27', 'holiday', 'MAF'),
  ('2026-10-01', 'holiday', 'NAT'), ('2026-10-02', 'holiday', 'NAT'), ('2026-10-03', 'holiday', 'NAT'),
  ('2026-10-04', 'holiday', 'NAT'), ('2026-10-05', 'holiday', 'NAT'), ('2026-10-06', 'holiday', 'NAT'),
  ('2026-10-07', 'holiday', 'NAT')
ON CONFLICT (date) DO UPDATE SET type = EXCLUDED.type, name = EXCLUDED.name;

-- ==========================================
-- 3. 导入 2026 年调休上班日数据 (Budget 100)
-- ==========================================
INSERT INTO holidays (date, type, name) VALUES
  ('2026-01-04', 'workday', 'NYD+'),
  ('2026-02-14', 'workday', 'CNY+'),
  ('2026-02-28', 'workday', 'CNY+'),
  ('2026-05-09', 'workday', 'LAB+'),
  ('2026-09-20', 'workday', 'NAT+'),
  ('2026-10-10', 'workday', 'NAT+')
ON CONFLICT (date) DO UPDATE SET type = EXCLUDED.type, name = EXCLUDED.name;

-- ==========================================
-- 4. Debt Module Tables
-- ==========================================

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
  -- We can store derived fields if desired, or calculate them.
  -- User requested these in the table structure description.
  monthly_total_debt DECIMAL(10, 2) GENERATED ALWAYS AS (ali_hua + ali_jie + cmb + jd_gold + jd_white + tiktok) STORED,
  net_cash_flow DECIMAL(10, 2) GENERATED ALWAYS AS (salary - (ali_hua + ali_jie + cmb + jd_gold + jd_white + tiktok)) STORED,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for debts
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON debts FOR ALL USING (true);
