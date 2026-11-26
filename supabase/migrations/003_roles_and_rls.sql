-- Migration: 003_roles_and_rls.sql
-- Roles and Row Level Security (RLS) Policies for Decisions Block
-- Roles: admin, owner, manager, employee

BEGIN;

-- ====================================================================
-- SECTION 1: Schema Updates on Profiles and Employees
-- ====================================================================

-- 1. Profiles Table: Add phone (unique), created_by, and enforce role check
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
  END IF;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'owner', 'manager', 'employee'));

-- 2. Employees Table: Add duties text[]
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS duties text[] DEFAULT '{}';

-- 3. Ensure employee_id column exists on vehicle_trips and attendance for fast indexing
ALTER TABLE public.vehicle_trips ADD COLUMN IF NOT EXISTS employee_id text;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS employee_id text;

-- ====================================================================
-- SECTION 2: Ensure Audit Log & Employee Identities Tables Exist
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text NULL,
  table_name text NOT NULL,
  row_id text NOT NULL,
  action text NOT NULL,
  old jsonb NULL,
  new jsonb NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_at ON public.audit_log (at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON public.audit_log (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log (user_id);

CREATE TABLE IF NOT EXISTS public.employee_identities (
  employee_id text PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  aadhaar text NULL,
  pan text NULL,
  license_no text NULL,
  photo_path text NULL,
  aadhaar_doc_path text NULL,
  aadhaar_doc_type text NULL,
  pan_doc_path text NULL,
  pan_doc_type text NULL,
  license_doc_path text NULL,
  license_doc_type text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ====================================================================
-- SECTION 3: Helper Functions
-- ====================================================================

-- 1. app_role(): Returns current authenticated user's role from profiles
CREATE OR REPLACE FUNCTION public.app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
    AND active = true;
$$;

-- 2. has_role(VARIADIC roles text[]): Checks if caller matches any of the roles
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
    WHERE id = auth.uid()
      AND active = true
      AND role = ANY(roles)
  );
$$;

-- 3. current_employee_id(): Returns employee_id linked to caller's profile
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employee_id
  FROM public.profiles
  WHERE id = auth.uid()
    AND active = true;
$$;

-- 4. role_rank(r text): Numeric hierarchy rank for privilege evaluation
CREATE OR REPLACE FUNCTION public.role_rank(r text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE r
    WHEN 'admin' THEN 4
    WHEN 'owner' THEN 3
    WHEN 'manager' THEN 2
    WHEN 'employee' THEN 1
    ELSE 0
  END;
$$;

-- 5. Backward compatibility helpers (my_role, is_staff)
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.app_role();
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role('owner', 'manager');
$$;

-- 6. Helper: Check if customer is on employee's current open trips
CREATE OR REPLACE FUNCTION public.is_customer_on_my_open_trip(p_cust_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vehicle_trips vt
    WHERE (
      vt.data->>'employee' = public.current_employee_id()
      OR vt.employee_id = public.current_employee_id()
    )
    AND (
      vt.data->>'handoverAt' IS NULL
      AND vt.data->>'handover_at' IS NULL
    )
    AND (
      (vt.data->'customers') ? p_cust_id
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(vt.data->'stops', '[]'::jsonb)) stop
        WHERE stop->>'cust' = p_cust_id OR stop->>'customer_id' = p_cust_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.fg f
        WHERE (f.data->>'trip' = vt.id OR f.data->>'trip_id' = vt.id)
          AND (f.data->>'cust' = p_cust_id OR f.data->>'customer' = p_cust_id)
      )
    )
  );
$$;

-- ====================================================================
-- SECTION 4: Profile Service Role Mutation Guard
-- ====================================================================

-- Profile changes only through the worker's service role
CREATE OR REPLACE FUNCTION public.check_profile_service_role_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Profile changes are only permitted through the worker service role.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_service_role_only ON public.profiles;
CREATE TRIGGER trg_profile_service_role_only
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_service_role_only();

-- ====================================================================
-- SECTION 5: Enable RLS on Every Table
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancelled_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.att_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- SECTION 6: Restrict Public / Anon Access
-- ====================================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Drop any previous blanket policies across all tables
DO $$
DECLARE
  t text;
  pol text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    END LOOP;
  END LOOP;
END $$;

-- ====================================================================
-- SECTION 7: Row-Level Security Policies per Table
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. PROFILES
-- --------------------------------------------------------------------
-- Users may read their own profile; Owner, Manager, Admin can read profiles.
-- Mutation is restricted to the worker's service role (no INSERT/UPDATE/DELETE policies).
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role('owner', 'manager', 'admin'));

-- --------------------------------------------------------------------
-- 2. AUDIT_LOG
-- --------------------------------------------------------------------
-- Append-only audit trail: Owner and Admin can SELECT. No role can mutate/delete.
CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'admin'));

-- --------------------------------------------------------------------
-- 3. EMPLOYEE_IDENTITIES
-- --------------------------------------------------------------------
-- Highly confidential PII (Aadhaar, PAN, Licence). Owner only.
CREATE POLICY "employee_identities_owner_select" ON public.employee_identities
  FOR SELECT TO authenticated
  USING (public.has_role('owner'));

CREATE POLICY "employee_identities_owner_insert" ON public.employee_identities
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner'));

CREATE POLICY "employee_identities_owner_update" ON public.employee_identities
  FOR UPDATE TO authenticated
  USING (public.has_role('owner'))
  WITH CHECK (public.has_role('owner'));

CREATE POLICY "employee_identities_owner_delete" ON public.employee_identities
  FOR DELETE TO authenticated
  USING (public.has_role('owner'));

-- --------------------------------------------------------------------
-- 4. CUSTOMERS
-- --------------------------------------------------------------------
-- Admin, Owner, Manager see all; Employees see only customers on their open trips.
-- Owner and Manager can write. Owner can delete.
CREATE POLICY "customers_select" ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.has_role('owner', 'manager', 'admin')
    OR (public.has_role('employee') AND public.is_customer_on_my_open_trip(id))
  );

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE TO authenticated
  USING (public.has_role('owner'));

-- --------------------------------------------------------------------
-- 5. BILLS (Financial Ledger: NO DELETE)
-- --------------------------------------------------------------------
CREATE POLICY "bills_select" ON public.bills
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "bills_insert" ON public.bills
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "bills_update" ON public.bills
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- --------------------------------------------------------------------
-- 6. PAYMENTS (Financial Ledger: NO DELETE)
-- --------------------------------------------------------------------
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "payments_update" ON public.payments
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- --------------------------------------------------------------------
-- 7. STOCK (Stock Ledger: NO DELETE)
-- --------------------------------------------------------------------
CREATE POLICY "stock_select" ON public.stock
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "stock_insert" ON public.stock
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "stock_update" ON public.stock
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- --------------------------------------------------------------------
-- 8. FG (Finished Goods Stock Ledger: NO DELETE)
-- --------------------------------------------------------------------
CREATE POLICY "fg_select" ON public.fg
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "fg_insert" ON public.fg
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "fg_update" ON public.fg
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- --------------------------------------------------------------------
-- 9. EXPENSES (Financial Ledger: NO DELETE)
-- --------------------------------------------------------------------
CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- --------------------------------------------------------------------
-- 10. ATTENDANCE
-- --------------------------------------------------------------------
-- Staff sees all; Employees see and mark their own attendance
CREATE POLICY "attendance_select" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    public.has_role('owner', 'manager', 'admin')
    OR (public.has_role('employee') AND (data->>'emp' = public.current_employee_id() OR employee_id = public.current_employee_id()))
  );

CREATE POLICY "attendance_insert" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('owner', 'manager')
    OR (public.has_role('employee') AND (data->>'emp' = public.current_employee_id() OR employee_id = public.current_employee_id()))
  );

CREATE POLICY "attendance_update" ON public.attendance
  FOR UPDATE TO authenticated
  USING (
    public.has_role('owner', 'manager')
    OR (public.has_role('employee') AND (data->>'emp' = public.current_employee_id() OR employee_id = public.current_employee_id()))
  )
  WITH CHECK (
    public.has_role('owner', 'manager')
    OR (public.has_role('employee') AND (data->>'emp' = public.current_employee_id() OR employee_id = public.current_employee_id()))
  );

CREATE POLICY "attendance_delete" ON public.attendance
  FOR DELETE TO authenticated
  USING (public.has_role('owner', 'manager'));

-- --------------------------------------------------------------------
-- 11. ADVANCES (Salary / Payroll: Owner Only, Financial Ledger: NO DELETE)
-- --------------------------------------------------------------------
CREATE POLICY "advances_select" ON public.advances
  FOR SELECT TO authenticated
  USING (public.has_role('owner'));

CREATE POLICY "advances_insert" ON public.advances
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner'));

CREATE POLICY "advances_update" ON public.advances
  FOR UPDATE TO authenticated
  USING (public.has_role('owner'))
  WITH CHECK (public.has_role('owner'));

-- --------------------------------------------------------------------
-- 12. PAYSLIPS (Salary / Payroll: Owner Only, Financial Ledger: NO DELETE)
-- --------------------------------------------------------------------
CREATE POLICY "payslips_select" ON public.payslips
  FOR SELECT TO authenticated
  USING (public.has_role('owner'));

CREATE POLICY "payslips_insert" ON public.payslips
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner'));

CREATE POLICY "payslips_update" ON public.payslips
  FOR UPDATE TO authenticated
  USING (public.has_role('owner'))
  WITH CHECK (public.has_role('owner'));

-- --------------------------------------------------------------------
-- 13. APPLICATIONS (Recruitment / Identities: Owner Only)
-- --------------------------------------------------------------------
CREATE POLICY "applications_owner_all" ON public.applications
  FOR ALL TO authenticated
  USING (public.has_role('owner'))
  WITH CHECK (public.has_role('owner'));

-- --------------------------------------------------------------------
-- 14. INVITES (Recruitment: Owner Only)
-- --------------------------------------------------------------------
CREATE POLICY "invites_owner_all" ON public.invites
  FOR ALL TO authenticated
  USING (public.has_role('owner'))
  WITH CHECK (public.has_role('owner'));

-- --------------------------------------------------------------------
-- 15. VEHICLES (Fleet Directory)
-- --------------------------------------------------------------------
CREATE POLICY "vehicles_select" ON public.vehicles
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin', 'employee'));

CREATE POLICY "vehicles_insert" ON public.vehicles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "vehicles_update" ON public.vehicles
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "vehicles_delete" ON public.vehicles
  FOR DELETE TO authenticated
  USING (public.has_role('owner', 'manager'));

-- --------------------------------------------------------------------
-- 16. VEHICLE_TRIPS
-- --------------------------------------------------------------------
-- Staff sees all; Drivers see and update their own trips / stops
CREATE POLICY "vehicle_trips_select" ON public.vehicle_trips
  FOR SELECT TO authenticated
  USING (
    public.has_role('owner', 'manager', 'admin')
    OR (public.has_role('employee') AND (data->>'employee' = public.current_employee_id() OR employee_id = public.current_employee_id()))
  );

CREATE POLICY "vehicle_trips_insert" ON public.vehicle_trips
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "vehicle_trips_update" ON public.vehicle_trips
  FOR UPDATE TO authenticated
  USING (
    public.has_role('owner', 'manager')
    OR (public.has_role('employee') AND (data->>'employee' = public.current_employee_id() OR employee_id = public.current_employee_id()))
  )
  WITH CHECK (
    public.has_role('owner', 'manager')
    OR (public.has_role('employee') AND (data->>'employee' = public.current_employee_id() OR employee_id = public.current_employee_id()))
  );

CREATE POLICY "vehicle_trips_delete" ON public.vehicle_trips
  FOR DELETE TO authenticated
  USING (public.has_role('owner', 'manager'));

-- --------------------------------------------------------------------
-- 17. VISITS (Salesman Visits & Orders)
-- --------------------------------------------------------------------
CREATE POLICY "visits_select" ON public.visits
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "visits_insert" ON public.visits
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "visits_update" ON public.visits
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "visits_delete" ON public.visits
  FOR DELETE TO authenticated
  USING (public.has_role('owner', 'manager'));

-- --------------------------------------------------------------------
-- 18. CONTACTS (Contacts Directory)
-- --------------------------------------------------------------------
CREATE POLICY "contacts_select" ON public.contacts
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "contacts_insert" ON public.contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "contacts_update" ON public.contacts
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "contacts_delete" ON public.contacts
  FOR DELETE TO authenticated
  USING (public.has_role('owner', 'manager'));

-- --------------------------------------------------------------------
-- 19. DELETED_BILLS (Audit Archive: NO DELETE)
-- --------------------------------------------------------------------
CREATE POLICY "deleted_bills_select" ON public.deleted_bills
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "deleted_bills_insert" ON public.deleted_bills
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

-- --------------------------------------------------------------------
-- 20. CANCELLED_BILLS (Audit Archive: NO DELETE)
-- --------------------------------------------------------------------
CREATE POLICY "cancelled_bills_select" ON public.cancelled_bills
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "cancelled_bills_insert" ON public.cancelled_bills
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

-- --------------------------------------------------------------------
-- 21. ATT_SITES (Attendance Geofence Banners / QR Sites)
-- --------------------------------------------------------------------
CREATE POLICY "att_sites_select" ON public.att_sites
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "att_sites_insert" ON public.att_sites
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "att_sites_update" ON public.att_sites
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "att_sites_delete" ON public.att_sites
  FOR DELETE TO authenticated
  USING (public.has_role('owner', 'manager'));

-- --------------------------------------------------------------------
-- 22. APP_STATE (Business Configuration Snapshot)
-- --------------------------------------------------------------------
CREATE POLICY "app_state_select" ON public.app_state
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "app_state_update" ON public.app_state
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- --------------------------------------------------------------------
-- 23. PRICE_LIST (Rate Catalog: NO DELETE)
-- --------------------------------------------------------------------
CREATE POLICY "price_list_select" ON public.price_list
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "price_list_insert" ON public.price_list
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "price_list_update" ON public.price_list
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- --------------------------------------------------------------------
-- 24. EMPLOYEES (General Employee Records)
-- --------------------------------------------------------------------
CREATE POLICY "employees_select" ON public.employees
  FOR SELECT TO authenticated
  USING (
    public.has_role('owner', 'manager', 'admin')
    OR (public.has_role('employee') AND (id = public.current_employee_id() OR data->>'emp' = public.current_employee_id()))
  );

CREATE POLICY "employees_insert" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "employees_update" ON public.employees
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "employees_delete" ON public.employees
  FOR DELETE TO authenticated
  USING (public.has_role('owner'));

-- ====================================================================
-- SECTION 8: Revoke Function Execution from PUBLIC and anon
-- ====================================================================

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;

-- Explicitly grant execution on client-callable helper functions to authenticated & service_role
GRANT EXECUTE ON FUNCTION public.app_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.role_rank(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_customer_on_my_open_trip(text) TO authenticated, service_role;

COMMIT;

-- ====================================================================
-- SECTION 9: Verification Queries
-- ====================================================================

-- Query 1: Tables in public schema that do NOT have RLS enabled (MUST return 0 rows)
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;

-- Query 2: Any policy where qual or with_check evaluates to literal 'true' (MUST return 0 rows)
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (trim(qual) = 'true' OR trim(with_check) = 'true');

-- Query 3: Functions executable by 'anon' or 'public' (MUST return 0 rows)
SELECT
  routine_schema,
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND grantee IN ('anon', 'public');

-- Query 4: Test Matrix of Role × Table Permissions
/*
=================================================================================================================================
                                            ROLE × TABLE PERMISSIONS MATRIX
=================================================================================================================================
Table                   | Admin            | Owner                 | Manager               | Employee
------------------------|------------------|-----------------------|-----------------------|-------------------------------------
profiles                | SELECT           | SELECT                | SELECT                | SELECT (self only)
audit_log               | SELECT           | SELECT                | NO ACCESS             | NO ACCESS
employee_identities     | NO ACCESS        | SELECT,INS,UPD,DEL    | NO ACCESS             | NO ACCESS
customers               | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD        | SELECT (open trips only)
bills                   | SELECT           | SELECT,INS,UPD        | SELECT,INS,UPD        | NO DIRECT ACCESS (RPC only)
payments                | SELECT           | SELECT,INS,UPD        | SELECT,INS,UPD        | NO DIRECT ACCESS (RPC only)
stock                   | SELECT           | SELECT,INS,UPD        | SELECT,INS,UPD        | NO DIRECT ACCESS (RPC only)
fg                      | SELECT           | SELECT,INS,UPD        | SELECT,INS,UPD        | NO DIRECT ACCESS (RPC only)
expenses                | SELECT           | SELECT,INS,UPD        | SELECT,INS,UPD        | NO ACCESS
attendance              | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | SELECT, INSERT (own attendance only)
advances                | NO ACCESS        | SELECT,INS,UPD        | NO ACCESS             | NO ACCESS
payslips                | NO ACCESS        | SELECT,INS,UPD        | NO ACCESS             | NO ACCESS
applications            | NO ACCESS        | SELECT,INS,UPD,DEL    | NO ACCESS             | NO ACCESS
invites                 | NO ACCESS        | SELECT,INS,UPD,DEL    | NO ACCESS             | NO ACCESS
vehicles                | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | SELECT (fleet reference)
vehicle_trips           | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | SELECT, UPDATE (own trips only)
visits                  | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | NO ACCESS
contacts                | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | NO ACCESS
deleted_bills           | SELECT           | SELECT,INSERT         | SELECT,INSERT         | NO ACCESS
cancelled_bills         | SELECT           | SELECT,INSERT         | SELECT,INSERT         | NO ACCESS
att_sites               | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | NO ACCESS
app_state               | SELECT           | SELECT,UPDATE         | SELECT,UPDATE         | NO ACCESS
price_list              | SELECT           | SELECT,INS,UPD        | SELECT,INS,UPD        | NO ACCESS
employees               | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD        | SELECT (self only)
=================================================================================================================================
Financial & Stock Ledgers with Immutability (ZERO DELETE policies):
- bills, payments, stock, fg, expenses, advances, payslips, price_list, deleted_bills, cancelled_bills, audit_log
=================================================================================================================================
*/

-- Live query validating all active policies across the public schema
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
