-- Migration: Add tax_amount, payment_method, bills icon, household motto, and financial_accounts debt_status
-- Date: 2026-09-05

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('QRIS', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'VIRTUAL_ACCOUNT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS payment_method public.payment_method;

DO $$ BEGIN
  ALTER TABLE public.transactions 
    ADD CONSTRAINT chk_tax_amount CHECK (tax_amount >= 0 AND tax_amount <= amount);
EXCEPTION
  WHEN duplicate_table OR duplicate_object THEN null;
END $$;

ALTER TABLE public.bills 
  ADD COLUMN IF NOT EXISTS icon varchar(50);

ALTER TABLE public.households 
  ADD COLUMN IF NOT EXISTS motto varchar(255);

ALTER TABLE public.financial_accounts 
  ADD COLUMN IF NOT EXISTS debt_status varchar(30) DEFAULT 'active';
