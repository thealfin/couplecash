-- Migration: Budget auto-generated categories & Goals passive accounts
-- Date: 2026-09-04

-- 1. Financial Accounts updates
ALTER TABLE financial_accounts ALTER COLUMN owner_type DROP NOT NULL;
ALTER TABLE financial_accounts ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;
ALTER TABLE financial_accounts ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES goals(id) ON DELETE CASCADE;

-- 2. Budgets updates
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS name varchar(150);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS generated_category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

-- 3. Goals updates
ALTER TABLE goals ADD COLUMN IF NOT EXISTS passive_account_id uuid REFERENCES financial_accounts(id) ON DELETE SET NULL;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS generated_category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
