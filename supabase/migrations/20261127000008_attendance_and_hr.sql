-- ====================================================================
-- SR Industries BMS - Attendance, Applications, Invites, Payslips & HR
-- Migration: 20261127000008_attendance_and_hr.sql
-- Dependencies: 20261127000001_core_schema.sql to 20261127000007_rpc_hardening.sql
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. ATTENDANCE SITES TABLE (Setup for QR Banners & Geofence)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_sites (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL,
  lat double precision,
  lng double precision,
  radius_m integer NOT NULL DEFAULT 100 CHECK (radius_m >= 10),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default primary site if none exists
INSERT INTO public.attendance_sites (id, name, code, lat, lng, radius_m)
VALUES ('ST-MAIN', 'Main Plant & Office', 'MAIN01', 17.385044, 78.486671, 150)
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 2. ENHANCE ATTENDANCE TABLE
-- --------------------------------------------------------------------
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS site_id text REFERENCES public.attendance_sites(id) ON DELETE SET NULL;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS site_name text;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS distance_m integer;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS photo_in_path text;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS photo_out_path text;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS accuracy_m numeric;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS late boolean DEFAULT false;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS source text DEFAULT 'banner' CHECK (source IN ('banner', 'manual'));

CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(att_date);

-- --------------------------------------------------------------------
-- 3. INVITES TABLE (Staff & Candidate Joining Links)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invites (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code text UNIQUE NOT NULL,
  department text NOT NULL DEFAULT 'Water Plant',
  target_phone text,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,
  used_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_code ON public.invites(code);

-- --------------------------------------------------------------------
-- 4. APPLICATIONS TABLE (Job Candidates & Onboarding)
-- Enforces Aadhaar masking before storing: must match masked pattern
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
  id text PRIMARY KEY,
  invite_code text REFERENCES public.invites(code) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  aadhaar_masked text NOT NULL CONSTRAINT check_masked_aadhaar CHECK (aadhaar_masked ~ '^[X*]{4}[ -]?[X*]{4}[ -]?[0-9]{4}$|^[0-9]{4}$'),
  photo_path text,
  docs jsonb DEFAULT '{}'::jsonb,
  details jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_applications_phone ON public.applications(phone);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);

-- --------------------------------------------------------------------
-- 5. PAYSLIPS TABLE (Employee Salary Slips & Private PDF Storage)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payslips (
  id text PRIMARY KEY,
  employee_id text NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  month_year text NOT NULL,
  gross_pay numeric(12,2) NOT NULL DEFAULT 0,
  deductions numeric(12,2) NOT NULL DEFAULT 0,
  net_pay numeric(12,2) NOT NULL DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  pdf_path text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_payslips_employee ON public.payslips(employee_id);

-- --------------------------------------------------------------------
-- 6. ENABLE ROW LEVEL SECURITY
-- --------------------------------------------------------------------
ALTER TABLE public.attendance_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies if any
DROP POLICY IF EXISTS "attendance_sites_select" ON public.attendance_sites;
DROP POLICY IF EXISTS "attendance_sites_write" ON public.attendance_sites;
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
DROP POLICY IF EXISTS "attendance_write" ON public.attendance;
DROP POLICY IF EXISTS "invites_all" ON public.invites;
DROP POLICY IF EXISTS "applications_select" ON public.applications;
DROP POLICY IF EXISTS "applications_update" ON public.applications;
DROP POLICY IF EXISTS "payslips_select" ON public.payslips;
DROP POLICY IF EXISTS "payslips_write" ON public.payslips;

-- Attendance Sites Policies
-- Everyone (authenticated) can view active sites to verify QR / check in
CREATE POLICY "attendance_sites_select"
ON public.attendance_sites FOR SELECT
TO authenticated
USING (public.has_role('owner', 'manager', 'admin', 'employee'));

-- Only Managers and Owner can manage sites
CREATE POLICY "attendance_sites_write"
ON public.attendance_sites FOR ALL
TO authenticated
USING (public.has_role('owner', 'manager', 'admin'))
WITH CHECK (public.has_role('owner', 'manager', 'admin'));

-- Attendance Policies
-- Managers and Owner see all attendance; employees see only their own
CREATE POLICY "attendance_select"
ON public.attendance FOR SELECT
TO authenticated
USING (
  public.has_role('owner', 'manager', 'admin')
  OR (public.has_role('employee') AND employee_id = public.current_employee_id())
);

-- Managers and Owner can record or edit attendance
CREATE POLICY "attendance_write"
ON public.attendance FOR ALL
TO authenticated
USING (public.has_role('owner', 'manager', 'admin'))
WITH CHECK (public.has_role('owner', 'manager', 'admin'));

-- Invites Policies
-- Managers and Owner manage candidate invites
CREATE POLICY "invites_all"
ON public.invites FOR ALL
TO authenticated
USING (public.has_role('owner', 'manager', 'admin'))
WITH CHECK (public.has_role('owner', 'manager', 'admin'));

-- Applications Policies
-- Managers and Owner can review applications
CREATE POLICY "applications_select"
ON public.applications FOR SELECT
TO authenticated
USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "applications_update"
ON public.applications FOR UPDATE
TO authenticated
USING (public.has_role('owner', 'manager', 'admin'))
WITH CHECK (public.has_role('owner', 'manager', 'admin'));

-- Payslips Policies
-- Managers and Owner see all payslips; employee sees only their own
CREATE POLICY "payslips_select"
ON public.payslips FOR SELECT
TO authenticated
USING (
  public.has_role('owner', 'manager', 'admin')
  OR (public.has_role('employee') AND employee_id = public.current_employee_id())
);

CREATE POLICY "payslips_write"
ON public.payslips FOR ALL
TO authenticated
USING (public.has_role('owner', 'manager', 'admin'))
WITH CHECK (public.has_role('owner', 'manager', 'admin'));

-- --------------------------------------------------------------------
-- 7. STORAGE POLICIES FOR EMPLOYEE-DOCS (PRIVATE BUCKET)
-- --------------------------------------------------------------------
-- Drop existing single-owner policy to allow managers to upload/view HR docs
DROP POLICY IF EXISTS "employee_docs_owner_all" ON storage.objects;
DROP POLICY IF EXISTS "employee_docs_manager_owner_all" ON storage.objects;
DROP POLICY IF EXISTS "employee_docs_employee_select" ON storage.objects;

-- Owner and Managers have full access to employee documents, photos, and payslips
CREATE POLICY "employee_docs_manager_owner_all"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'employee-docs'
  AND public.has_role('owner', 'manager', 'admin')
)
WITH CHECK (
  bucket_id = 'employee-docs'
  AND public.has_role('owner', 'manager', 'admin')
);

-- Employees can SELECT/download their own documents (scoped by employee folder)
CREATE POLICY "employee_docs_employee_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-docs'
  AND public.has_role('employee')
  AND (
    split_part(name, '/', 1) = public.current_employee_id()
    OR split_part(name, '/', 2) = public.current_employee_id()
  )
);

COMMIT;
