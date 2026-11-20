-- Migration: Roles and Row Level Security (RLS) Policies
-- Timestamp: 20261119125500

BEGIN;

-- ====================================================================
-- SECTION 1: Drop Old Blanket Policies
-- ====================================================================
DROP POLICY IF EXISTS "owner_authenticated_all" ON public.business_settings;
DROP POLICY IF EXISTS "owner_authenticated_all" ON public.customers;
DROP POLICY IF EXISTS "owner_authenticated_all" ON public.bills;
DROP POLICY IF EXISTS "owner_authenticated_all" ON public.bill_items;
DROP POLICY IF EXISTS "owner_authenticated_all" ON public.payments;
DROP POLICY IF EXISTS "owner_authenticated_all" ON public.stock_movements;
DROP POLICY IF EXISTS "owner_authenticated_all" ON public.expenses;
DROP POLICY IF EXISTS "owner_authenticated_all" ON public.employees;
DROP POLICY IF EXISTS "owner_authenticated_all" ON public.employee_invites;
DROP POLICY IF EXISTS "owner_authenticated_all" ON public.employee_applications;
DROP POLICY IF EXISTS "owner_authenticated_all" ON public.employee_hr_docs;
DROP POLICY IF EXISTS "owner_authenticated_all" ON public.attendance;
DROP POLICY IF EXISTS "owner_authenticated_all" ON public.advances;
DROP POLICY IF EXISTS "owner_authenticated_all" ON public.vehicles;
DROP POLICY IF EXISTS "owner_authenticated_all" ON public.vehicle_trips;

DROP POLICY IF EXISTS "owner_employee_docs_all" ON storage.objects;
DROP POLICY IF EXISTS "owner_vehicle_evidence_all" ON storage.objects;

-- ====================================================================
-- SECTION 2: Create Profiles Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','manager','accountant','billing_staff','driver')),
  employee_id text NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ====================================================================
-- SECTION 3: Create Security Definer Helper Functions
-- ====================================================================
CREATE OR REPLACE FUNCTION public.app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE user_id = auth.uid()
    AND active = true;
$$;

CREATE OR REPLACE FUNCTION public.has_role(VARIADIC roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND active = true
      AND role = ANY(roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employee_id
  FROM public.profiles
  WHERE user_id = auth.uid()
    AND active = true;
$$;

-- ====================================================================
-- SECTION 4: Schema Fixes (Nullable Attendance Timings, Payment Reversal Audit, FK Restrict)
-- ====================================================================

-- 1. Ensure attendance time_in and time_out are nullable
ALTER TABLE public.attendance
  ALTER COLUMN time_in DROP NOT NULL,
  ALTER COLUMN time_out DROP NOT NULL;

-- 2. Add payment reversal audit columns
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS reversed_by text NULL,
  ADD COLUMN IF NOT EXISTS reversal_reason text NULL;

-- 3. Change foreign keys on payments, attendance, advances, and employee_hr_docs to ON DELETE RESTRICT
-- Constraint names are dynamically queried from pg_constraint rather than assumed.
DO $$
DECLARE
  r RECORD;
  def text;
BEGIN
  FOR r IN
    SELECT
      c.conname,
      c.conrelid::regclass::text AS tablename,
      pg_get_constraintdef(c.oid) AS condef
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public'
      AND c.contype = 'f'
      AND c.conrelid::regclass::text IN (
        'payments', 'attendance', 'advances', 'employee_hr_docs',
        'public.payments', 'public.attendance', 'public.advances', 'public.employee_hr_docs'
      )
  LOOP
    -- Strip any existing ON DELETE clause
    def := regexp_replace(r.condef, '\s+ON\s+DELETE\s+[A-Za-z\s]+', '', 'gi');
    -- Append ON DELETE RESTRICT
    def := def || ' ON DELETE RESTRICT';

    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tablename, r.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', r.tablename, r.conname, def);
  END LOOP;
END $$;

-- ====================================================================
-- SECTION 5: Sensitive Columns Isolation (Aadhaar / PAN / Licence)
-- ====================================================================
-- Separate table holding confidential government IDs and ID documents.
-- Only the 'owner' role can query or mutate this table.
CREATE TABLE IF NOT EXISTS public.employee_identities (
  employee_id text PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  aadhaar text,
  pan text,
  license_no text,
  photo_path text,
  aadhaar_doc_path text,
  aadhaar_doc_type text,
  pan_doc_path text,
  pan_doc_type text,
  license_doc_path text,
  license_doc_type text,
  created_at timestamptz DEFAULT now()
);

-- Migrate existing sensitive data from employees to employee_identities if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'aadhaar'
  ) THEN
    INSERT INTO public.employee_identities (
      employee_id, aadhaar, pan, license_no, photo_path,
      aadhaar_doc_path, aadhaar_doc_type, pan_doc_path, pan_doc_type,
      license_doc_path, license_doc_type
    )
    SELECT
      id, aadhaar, pan, license_no, photo_path,
      aadhaar_doc_path, aadhaar_doc_type, pan_doc_path, pan_doc_type,
      license_doc_path, license_doc_type
    FROM public.employees
    ON CONFLICT (employee_id) DO UPDATE SET
      aadhaar = EXCLUDED.aadhaar,
      pan = EXCLUDED.pan,
      license_no = EXCLUDED.license_no,
      photo_path = EXCLUDED.photo_path,
      aadhaar_doc_path = EXCLUDED.aadhaar_doc_path,
      aadhaar_doc_type = EXCLUDED.aadhaar_doc_type,
      pan_doc_path = EXCLUDED.pan_doc_path,
      pan_doc_type = EXCLUDED.pan_doc_type,
      license_doc_path = EXCLUDED.license_doc_path,
      license_doc_type = EXCLUDED.license_doc_type;

    -- Drop sensitive columns from the general employees directory table
    ALTER TABLE public.employees
      DROP COLUMN IF EXISTS aadhaar,
      DROP COLUMN IF EXISTS pan,
      DROP COLUMN IF EXISTS license_no,
      DROP COLUMN IF EXISTS aadhaar_doc_path,
      DROP COLUMN IF EXISTS aadhaar_doc_type,
      DROP COLUMN IF EXISTS pan_doc_path,
      DROP COLUMN IF EXISTS pan_doc_type,
      DROP COLUMN IF EXISTS license_doc_path,
      DROP COLUMN IF EXISTS license_doc_type;
  END IF;
END $$;

-- View joining directory with identities.
-- security_invoker = true enforces caller RLS. Identity columns also use an explicit
-- CASE ON has_role('owner') guaranteeing non-owners (e.g. managers) strictly receive NULL.
CREATE OR REPLACE VIEW public.v_employees
WITH (security_invoker = true) AS
SELECT
  e.id,
  e.name,
  e.role,
  e.phone,
  e.salary,
  e.address,
  e.photo_path,
  e.portal_token,
  e.application_id,
  e.joined_date,
  e.joined_at,
  CASE WHEN public.has_role('owner') THEN i.aadhaar ELSE NULL END AS aadhaar,
  CASE WHEN public.has_role('owner') THEN i.pan ELSE NULL END AS pan,
  CASE WHEN public.has_role('owner') THEN i.license_no ELSE NULL END AS license_no,
  CASE WHEN public.has_role('owner') THEN i.aadhaar_doc_path ELSE NULL END AS aadhaar_doc_path,
  CASE WHEN public.has_role('owner') THEN i.aadhaar_doc_type ELSE NULL END AS aadhaar_doc_type,
  CASE WHEN public.has_role('owner') THEN i.pan_doc_path ELSE NULL END AS pan_doc_path,
  CASE WHEN public.has_role('owner') THEN i.pan_doc_type ELSE NULL END AS pan_doc_type,
  CASE WHEN public.has_role('owner') THEN i.license_doc_path ELSE NULL END AS license_doc_path,
  CASE WHEN public.has_role('owner') THEN i.license_doc_type ELSE NULL END AS license_doc_type
FROM public.employees e
LEFT JOIN public.employee_identities i ON e.id = i.employee_id;

-- ====================================================================
-- SECTION 6: Enable RLS and Restrict Anon/Public Access
-- ====================================================================
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_hr_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Revoke all default public/anon table permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- ====================================================================
-- SECTION 7: Role-Based Access Policies for Public Tables
-- ====================================================================

-- 1. PROFILES
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role('owner'));

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner'));

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (has_role('owner'))
  WITH CHECK (has_role('owner'));

CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (has_role('owner'));

-- 2. BUSINESS_SETTINGS
CREATE POLICY "business_settings_select" ON public.business_settings
  FOR SELECT TO authenticated
  USING (has_role('owner', 'manager', 'accountant', 'billing_staff'));

CREATE POLICY "business_settings_insert" ON public.business_settings
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner'));

CREATE POLICY "business_settings_update" ON public.business_settings
  FOR UPDATE TO authenticated
  USING (has_role('owner'))
  WITH CHECK (has_role('owner'));
-- No DELETE policy on business_settings

-- 3. CUSTOMERS (No DELETE policy for anyone)
CREATE POLICY "customers_select" ON public.customers
  FOR SELECT TO authenticated
  USING (has_role('owner', 'manager', 'accountant', 'billing_staff'));

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner', 'manager', 'billing_staff'));

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (has_role('owner', 'manager', 'billing_staff'))
  WITH CHECK (has_role('owner', 'manager', 'billing_staff'));

-- 4. BILLS (No DELETE policy for anyone)
CREATE POLICY "bills_select" ON public.bills
  FOR SELECT TO authenticated
  USING (has_role('owner', 'manager', 'accountant', 'billing_staff'));

CREATE POLICY "bills_insert" ON public.bills
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner', 'manager', 'billing_staff'));

CREATE POLICY "bills_update" ON public.bills
  FOR UPDATE TO authenticated
  USING (has_role('owner', 'manager', 'billing_staff'))
  WITH CHECK (has_role('owner', 'manager', 'billing_staff'));

-- 5. BILL_ITEMS
CREATE POLICY "bill_items_select" ON public.bill_items
  FOR SELECT TO authenticated
  USING (has_role('owner', 'manager', 'accountant', 'billing_staff'));

CREATE POLICY "bill_items_insert" ON public.bill_items
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner', 'manager', 'billing_staff'));

CREATE POLICY "bill_items_update" ON public.bill_items
  FOR UPDATE TO authenticated
  USING (has_role('owner', 'manager', 'billing_staff'))
  WITH CHECK (has_role('owner', 'manager', 'billing_staff'));

-- TEMPORARY POLICY: Allow owner and manager to DELETE bill_items.
-- Current client edit-bill flow (sbUpsertBillWithItems) deletes existing bill items and re-inserts them.
-- TODO: remove after the create/update bill RPCs exist.
CREATE POLICY "bill_items_delete" ON public.bill_items
  FOR DELETE TO authenticated
  USING (has_role('owner', 'manager'));

-- 6. PAYMENTS (No DELETE policy for anyone)
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT TO authenticated
  USING (has_role('owner', 'manager', 'accountant', 'billing_staff'));

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner', 'manager', 'accountant', 'billing_staff'));

CREATE POLICY "payments_update" ON public.payments
  FOR UPDATE TO authenticated
  USING (has_role('owner', 'manager', 'accountant'))
  WITH CHECK (has_role('owner', 'manager', 'accountant'));

-- 7. STOCK_MOVEMENTS
CREATE POLICY "stock_movements_select" ON public.stock_movements
  FOR SELECT TO authenticated
  USING (has_role('owner', 'manager', 'accountant', 'billing_staff'));

CREATE POLICY "stock_movements_insert" ON public.stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner', 'manager'));

CREATE POLICY "stock_movements_update" ON public.stock_movements
  FOR UPDATE TO authenticated
  USING (has_role('owner', 'manager'))
  WITH CHECK (has_role('owner', 'manager'));

CREATE POLICY "stock_movements_delete" ON public.stock_movements
  FOR DELETE TO authenticated
  USING (has_role('owner', 'manager'));

-- 8. EXPENSES
CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT TO authenticated
  USING (has_role('owner', 'manager', 'accountant'));

CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner', 'manager', 'accountant'));

CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE TO authenticated
  USING (has_role('owner', 'manager', 'accountant'))
  WITH CHECK (has_role('owner', 'manager', 'accountant'));

CREATE POLICY "expenses_delete" ON public.expenses
  FOR DELETE TO authenticated
  USING (has_role('owner', 'manager', 'accountant'));

-- 9. EMPLOYEES (General directory)
CREATE POLICY "employees_select" ON public.employees
  FOR SELECT TO authenticated
  USING (has_role('owner', 'manager', 'accountant'));

CREATE POLICY "employees_insert" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner', 'manager'));

CREATE POLICY "employees_update" ON public.employees
  FOR UPDATE TO authenticated
  USING (has_role('owner', 'manager'))
  WITH CHECK (has_role('owner', 'manager'));

CREATE POLICY "employees_delete" ON public.employees
  FOR DELETE TO authenticated
  USING (has_role('owner'));

-- 10. EMPLOYEE_IDENTITIES (Confidential: Owner Only)
CREATE POLICY "employee_identities_select" ON public.employee_identities
  FOR SELECT TO authenticated
  USING (has_role('owner'));

CREATE POLICY "employee_identities_insert" ON public.employee_identities
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner'));

CREATE POLICY "employee_identities_update" ON public.employee_identities
  FOR UPDATE TO authenticated
  USING (has_role('owner'))
  WITH CHECK (has_role('owner'));

CREATE POLICY "employee_identities_delete" ON public.employee_identities
  FOR DELETE TO authenticated
  USING (has_role('owner'));

-- 11. EMPLOYEE_INVITES (Owner Only for all commands)
CREATE POLICY "employee_invites_select" ON public.employee_invites
  FOR SELECT TO authenticated
  USING (has_role('owner'));

CREATE POLICY "employee_invites_insert" ON public.employee_invites
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner'));

CREATE POLICY "employee_invites_update" ON public.employee_invites
  FOR UPDATE TO authenticated
  USING (has_role('owner'))
  WITH CHECK (has_role('owner'));

CREATE POLICY "employee_invites_delete" ON public.employee_invites
  FOR DELETE TO authenticated
  USING (has_role('owner'));

-- 12. EMPLOYEE_APPLICATIONS (Owner Only for all commands)
CREATE POLICY "employee_applications_select" ON public.employee_applications
  FOR SELECT TO authenticated
  USING (has_role('owner'));

CREATE POLICY "employee_applications_insert" ON public.employee_applications
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner'));

CREATE POLICY "employee_applications_update" ON public.employee_applications
  FOR UPDATE TO authenticated
  USING (has_role('owner'))
  WITH CHECK (has_role('owner'));

CREATE POLICY "employee_applications_delete" ON public.employee_applications
  FOR DELETE TO authenticated
  USING (has_role('owner'));

-- 13. EMPLOYEE_HR_DOCS
CREATE POLICY "employee_hr_docs_select" ON public.employee_hr_docs
  FOR SELECT TO authenticated
  USING (has_role('owner', 'manager', 'accountant'));

CREATE POLICY "employee_hr_docs_insert" ON public.employee_hr_docs
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner', 'accountant'));

CREATE POLICY "employee_hr_docs_update" ON public.employee_hr_docs
  FOR UPDATE TO authenticated
  USING (has_role('owner', 'accountant'))
  WITH CHECK (has_role('owner', 'accountant'));

CREATE POLICY "employee_hr_docs_delete" ON public.employee_hr_docs
  FOR DELETE TO authenticated
  USING (has_role('owner'));

-- 14. ATTENDANCE
CREATE POLICY "attendance_select" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    has_role('owner', 'manager', 'accountant') OR
    (has_role('driver') AND employee_id = current_employee_id())
  );

CREATE POLICY "attendance_insert" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner', 'manager'));

CREATE POLICY "attendance_update" ON public.attendance
  FOR UPDATE TO authenticated
  USING (has_role('owner', 'manager'))
  WITH CHECK (has_role('owner', 'manager'));

CREATE POLICY "attendance_delete" ON public.attendance
  FOR DELETE TO authenticated
  USING (has_role('owner', 'manager'));

-- 15. ADVANCES
CREATE POLICY "advances_select" ON public.advances
  FOR SELECT TO authenticated
  USING (has_role('owner', 'manager', 'accountant'));

CREATE POLICY "advances_insert" ON public.advances
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner', 'manager', 'accountant'));

CREATE POLICY "advances_update" ON public.advances
  FOR UPDATE TO authenticated
  USING (has_role('owner', 'manager', 'accountant'))
  WITH CHECK (has_role('owner', 'manager', 'accountant'));

CREATE POLICY "advances_delete" ON public.advances
  FOR DELETE TO authenticated
  USING (has_role('owner'));

-- 16. VEHICLES
CREATE POLICY "vehicles_select" ON public.vehicles
  FOR SELECT TO authenticated
  USING (has_role('owner', 'manager', 'accountant', 'driver'));

CREATE POLICY "vehicles_insert" ON public.vehicles
  FOR INSERT TO authenticated
  WITH CHECK (has_role('owner', 'manager'));

CREATE POLICY "vehicles_update" ON public.vehicles
  FOR UPDATE TO authenticated
  USING (has_role('owner', 'manager'))
  WITH CHECK (has_role('owner', 'manager'));

CREATE POLICY "vehicles_delete" ON public.vehicles
  FOR DELETE TO authenticated
  USING (has_role('owner'));

-- 17. VEHICLE_TRIPS
CREATE POLICY "vehicle_trips_select" ON public.vehicle_trips
  FOR SELECT TO authenticated
  USING (
    has_role('owner', 'manager', 'accountant') OR
    (has_role('driver') AND employee_id = current_employee_id())
  );

CREATE POLICY "vehicle_trips_insert" ON public.vehicle_trips
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('owner', 'manager') OR
    (has_role('driver') AND employee_id = current_employee_id())
  );

CREATE POLICY "vehicle_trips_update" ON public.vehicle_trips
  FOR UPDATE TO authenticated
  USING (
    has_role('owner', 'manager') OR
    (has_role('driver') AND employee_id = current_employee_id())
  )
  WITH CHECK (
    has_role('owner', 'manager') OR
    (has_role('driver') AND employee_id = current_employee_id())
  );

CREATE POLICY "vehicle_trips_delete" ON public.vehicle_trips
  FOR DELETE TO authenticated
  USING (has_role('owner', 'manager'));

-- ====================================================================
-- SECTION 8: Storage Bucket Policies
-- ====================================================================

-- Bucket 1: 'employee-docs' (Confidential: Owner Only)
CREATE POLICY "employee_docs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'employee-docs' AND has_role('owner'));

CREATE POLICY "employee_docs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'employee-docs' AND has_role('owner'));

CREATE POLICY "employee_docs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'employee-docs' AND has_role('owner'))
  WITH CHECK (bucket_id = 'employee-docs' AND has_role('owner'));

CREATE POLICY "employee_docs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'employee-docs' AND has_role('owner'));

-- Bucket 2: 'vehicle-evidence' (Owner, Manager, and Drivers under own folder)
CREATE POLICY "vehicle_evidence_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'vehicle-evidence' AND (
      has_role('owner', 'manager') OR (
        has_role('driver') AND (
          (storage.foldername(name))[1] = current_employee_id() OR
          (storage.foldername(name))[2] = current_employee_id() OR
          name LIKE current_employee_id() || '/%' OR
          name LIKE 'trips/' || current_employee_id() || '/%'
        )
      )
    )
  );

CREATE POLICY "vehicle_evidence_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-evidence' AND (
      has_role('owner', 'manager') OR (
        has_role('driver') AND (
          (storage.foldername(name))[1] = current_employee_id() OR
          (storage.foldername(name))[2] = current_employee_id() OR
          name LIKE current_employee_id() || '/%' OR
          name LIKE 'trips/' || current_employee_id() || '/%'
        )
      )
    )
  );

CREATE POLICY "vehicle_evidence_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'vehicle-evidence' AND has_role('owner', 'manager'))
  WITH CHECK (bucket_id = 'vehicle-evidence' AND has_role('owner', 'manager'));

CREATE POLICY "vehicle_evidence_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'vehicle-evidence' AND has_role('owner', 'manager'));

COMMIT;

-- ====================================================================
-- SECTION 9: Bootstrap: First Owner Profile (Run manually after signup)
-- ====================================================================
-- Replace 'owner@example.com' with the email address of the registered owner user.
--
-- INSERT INTO public.profiles (user_id, full_name, role, active)
-- SELECT id, 'Owner Name', 'owner', true
-- FROM auth.users
-- WHERE email = 'owner@example.com'
-- ON CONFLICT (user_id) DO UPDATE SET
--   role = 'owner',
--   active = true;

-- ====================================================================
-- SECTION 10: Verification Queries
-- ====================================================================
-- Run these queries after applying the migration to confirm complete hardening.

-- 1. Active policies in public and storage schemas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;

-- 2. Tables in public schema that do NOT have RLS enabled (should return 0 rows)
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;

-- 3. Any policy where qual or with_check evaluates to 'true' (should return 0 rows)
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
  AND (trim(qual) = 'true' OR trim(with_check) = 'true');

-- 4. Public functions and their security properties
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security,
  p.proconfig AS search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('app_role', 'has_role', 'current_employee_id')
ORDER BY p.proname;
