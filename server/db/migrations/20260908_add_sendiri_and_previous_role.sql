-- Migration: Add 'sendiri' to ownership_type enum and 'previous_role' column to transactions
ALTER TYPE ownership_type ADD VALUE IF NOT EXISTS 'sendiri';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS previous_role varchar(30);
