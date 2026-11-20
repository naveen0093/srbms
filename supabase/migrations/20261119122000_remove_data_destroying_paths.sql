-- Migration: Remove data-destroying paths and add customer active status

-- 1. Add active status flag to customers table
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- 2. Drop obsolete bill deletion PIN columns from business_settings
ALTER TABLE public.business_settings
  DROP COLUMN IF EXISTS bill_delete_pin_salt,
  DROP COLUMN IF EXISTS bill_delete_pin_hash,
  DROP COLUMN IF EXISTS bill_delete_pin_updated_at;
