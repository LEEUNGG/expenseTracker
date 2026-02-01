-- Add review column to monthly_plans table
ALTER TABLE monthly_plans ADD COLUMN IF NOT EXISTS review TEXT;
