-- ====================================================================
-- Larven BMS: Automated Role × Table Permission & RLS Matrix Test Suite
-- File: tests/role_matrix.sql
-- 
-- Verifies authoritative permissions and RLS isolation across 5 roles:
-- 1. anon (Unauthenticated)
-- 2. employee (Driver / Field Staff: M2)
-- 3. manager (Branch / Operations Manager: M1)
-- 4. owner (Business Owner)
-- 5. admin (System Administrator)
--
-- This script runs inside a single transaction and concludes with ROLLBACK,
-- ensuring zero side-effects on the underlying database.
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- Test Harness & Helper Procedures
-- --------------------------------------------------------------------
CREATE TEMP TABLE IF NOT EXISTS test_results (
  id serial PRIMARY KEY,
  role_tested text NOT NULL,
  test_name text NOT NULL,
  status text NOT NULL, -- 'PASS' or 'FAIL'
  details text
);

CREATE OR REPLACE PROCEDURE log_assert(
  p_role text,
  p_name text,
  p_condition boolean,
  p_details text DEFAULT ''
)
LANGUAGE plpgsql AS $$
BEGIN
  IF p_condition THEN
    INSERT INTO test_results (role_tested, test_name, status, details)
    VALUES (p_role, p_name, 'PASS', p_details);
  ELSE
    INSERT INTO test_results (role_tested, test_name, status, details)
    VALUES (p_role, p_name, 'FAIL', COALESCE(p_details, 'Condition evaluated to false'));
    RAISE WARNING 'TEST FAILED [% - %]: %', p_role, p_name, p_details;
  END IF;
END;
$$;

-- --------------------------------------------------------------------
-- Mock Auth & Data Setup (as service_role / superuser)
-- --------------------------------------------------------------------
-- Ensure auth users exist
INSERT INTO auth.users (id, aud, role, email, phone, created_at, updated_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@example.com', '9848000001', now(), now()),
  ('b0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'owner@example.com', '9848000002', now(), now()),
  ('c0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'manager@example.com', '9848000003', now(), now()),
  ('d0000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'driver@example.com', '9848000004', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Ensure staff employees exist
INSERT INTO public.employees (id, name, role, phone, salary, address, duties, active)
VALUES
  ('M1', 'Suresh Kumar (Manager)', 'manager', '9848000003', 25000.00, 'Plant Office', ARRAY['godown', 'production'], true),
  ('M2', 'Ravi Driver (Employee)', 'employee', '9848000004', 15000.00, 'Main Road', ARRAY['delivery'], true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  salary = EXCLUDED.salary,
  duties = EXCLUDED.duties,
  active = EXCLUDED.active;

-- Ensure profiles exist
INSERT INTO public.profiles (id, full_name, role, phone, employee_id, active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'System Administrator', 'admin', '9848000001', NULL, true),
  ('b0000000-0000-0000-0000-000000000002', 'Muni Prasad', 'owner', '9848000002', NULL, true),
  ('c0000000-0000-0000-0000-000000000003', 'Suresh Kumar', 'manager', '9848000003', 'M1', true),
  ('d0000000-0000-0000-0000-000000000004', 'Ravi Driver', 'employee', '9848000004', 'M2', true)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  employee_id = EXCLUDED.employee_id,
  active = EXCLUDED.active;

-- Create Test Locations
INSERT INTO public.locations (id, name, type)
VALUES
  ('LOC-P', 'Test Plant', 'plant'),
  ('LOC-G1', 'Test Godown 1', 'godown')
ON CONFLICT (id) DO NOTHING;

-- Create Test Vehicles
INSERT INTO public.vehicles (id, vehicle_number, vehicle_type, active)
VALUES
  ('VEH-1', 'AP 39 AB 1234', 'Pickup', true)
ON CONFLICT (id) DO NOTHING;

-- Create Test Customers:
-- CUST-TEST-1 will be on M2's open trip
-- CUST-TEST-2 will NOT be on M2's trip
INSERT INTO public.customers (id, name, phone, area, lat, lng, accuracy_m, credit_limit)
VALUES
  ('CUST-TEST-1', 'Open Route Customer', '9848011111', 'Market Yard', 13.558312, 78.502145, 10.0, 5000.00),
  ('CUST-TEST-2', 'Unrelated Customer', '9848022222', 'Station Road', 13.561200, 78.504300, 15.0, 3000.00),
  ('CUST-TEST-3', 'Unmapped Customer', '9848033333', 'Bazaar Street', NULL, NULL, NULL, 2000.00)
ON CONFLICT (id) DO UPDATE SET
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  accuracy_m = EXCLUDED.accuracy_m,
  credit_limit = EXCLUDED.credit_limit;

-- Create Open Trip for M2 (driver_id = 'M2')
INSERT INTO public.trips (id, vehicle_id, driver_id, trip_date, status, start_odometer)
VALUES
  ('TRIP-TEST-M2', 'VEH-1', 'M2', (now() at time zone 'Asia/Kolkata')::date, 'on_route', 10000)
ON CONFLICT (id) DO UPDATE SET
  driver_id = EXCLUDED.driver_id,
  status = EXCLUDED.status;

-- Add Trip Stop for CUST-TEST-1 on TRIP-TEST-M2
INSERT INTO public.trip_stops (trip_id, stop_sequence, customer_id, result)
VALUES
  ('TRIP-TEST-M2', 1, 'CUST-TEST-1', 'pending')
ON CONFLICT (trip_id, stop_sequence) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  result = EXCLUDED.result;

-- Create Attendance Records
INSERT INTO public.attendance (id, employee_id, att_date, status, time_in)
VALUES
  ('ATT-TEST-M1', 'M1', (now() at time zone 'Asia/Kolkata')::date, 'Present', '08:00'),
  ('ATT-TEST-M2', 'M2', (now() at time zone 'Asia/Kolkata')::date, 'Present', '08:30')
ON CONFLICT (id) DO NOTHING;

-- Create Payslip Records
INSERT INTO public.payslips (id, employee_id, month_year, gross_pay, deductions, net_pay)
VALUES
  ('SLIP-TEST-M1', 'M1', '2026-11', 25000.00, 500.00, 24500.00),
  ('SLIP-TEST-M2', 'M2', '2026-11', 15000.00, 200.00, 14800.00)
ON CONFLICT (id) DO NOTHING;

-- Create Staff Invite & Application
INSERT INTO public.invites (code, department, target_phone, created_by)
VALUES
  ('INV-TEST-99', 'Water Plant', '9848099999', 'b0000000-0000-0000-0000-000000000002')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.applications (id, invite_code, full_name, phone, aadhaar_masked, department, status)
VALUES
  ('APP-TEST-1', 'INV-TEST-99', 'Candidate One', '9848099999', 'XXXX-XXXX-1234', 'Water Plant', 'Pending')
ON CONFLICT (id) DO NOTHING;

-- Create Audit Log Entry
INSERT INTO public.audit_log (action, entity_type, entity_id, actor_id, changes)
VALUES
  ('test_seed', 'system', '0', 'a0000000-0000-0000-0000-000000000001', '{"seed": true}')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- SECTION 1: ANON (Unauthenticated Public User)
-- ====================================================================
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '{}';

DO $$
DECLARE
  v_cnt int;
  v_err boolean := false;
BEGIN
  -- 1.1 anon CANNOT read customers
  SELECT count(*) INTO v_cnt FROM public.customers;
  CALL log_assert('anon', 'deny_select_customers', v_cnt = 0, 'anon sees ' || v_cnt || ' customers');

  -- 1.2 anon CANNOT read trips
  SELECT count(*) INTO v_cnt FROM public.trips;
  CALL log_assert('anon', 'deny_select_trips', v_cnt = 0, 'anon sees ' || v_cnt || ' trips');

  -- 1.3 anon CANNOT read bills
  SELECT count(*) INTO v_cnt FROM public.bills;
  CALL log_assert('anon', 'deny_select_bills', v_cnt = 0, 'anon sees ' || v_cnt || ' bills');

  -- 1.4 anon CANNOT read attendance
  SELECT count(*) INTO v_cnt FROM public.attendance;
  CALL log_assert('anon', 'deny_select_attendance', v_cnt = 0, 'anon sees ' || v_cnt || ' attendance');

  -- 1.5 anon CANNOT read applications
  SELECT count(*) INTO v_cnt FROM public.applications;
  CALL log_assert('anon', 'deny_select_applications', v_cnt = 0, 'anon sees ' || v_cnt || ' applications');

  -- 1.6 anon CANNOT read invites
  SELECT count(*) INTO v_cnt FROM public.invites;
  CALL log_assert('anon', 'deny_select_invites', v_cnt = 0, 'anon sees ' || v_cnt || ' invites');

  -- 1.7 anon CANNOT read payslips
  SELECT count(*) INTO v_cnt FROM public.payslips;
  CALL log_assert('anon', 'deny_select_payslips', v_cnt = 0, 'anon sees ' || v_cnt || ' payslips');

  -- 1.8 anon CANNOT insert customers
  BEGIN
    INSERT INTO public.customers (id, name) VALUES ('CUST-ANON', 'Anon Cust');
    v_err := false;
  EXCEPTION WHEN OTHERS THEN
    v_err := true;
  END;
  CALL log_assert('anon', 'deny_insert_customers', v_err, 'Direct insert must throw permission error');

  -- 1.9 anon CANNOT execute record_production RPC
  BEGIN
    PERFORM public.record_production('k_anon', 'LOC-P', '20L', 10, 0, 'M', 'note');
    v_err := false;
  EXCEPTION WHEN OTHERS THEN
    v_err := true;
  END;
  CALL log_assert('anon', 'deny_execute_rpc', v_err, 'anon cannot execute SECURITY DEFINER write RPCs');
END $$;


-- ====================================================================
-- SECTION 2: EMPLOYEE (Driver M2: 'd0000000-0000-0000-0000-000000000004')
-- ====================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "d0000000-0000-0000-0000-000000000004", "role": "authenticated"}';

DO $$
DECLARE
  v_cnt int;
  v_err boolean := false;
  v_cust text;
  v_role text;
BEGIN
  -- Verify app_role() helper recognizes employee
  v_role := public.app_role();
  CALL log_assert('employee', 'verify_app_role', v_role = 'employee', 'app_role() returned ' || COALESCE(v_role, 'NULL'));

  -- 2.1 Employee sees own open trip
  SELECT count(*) INTO v_cnt FROM public.trips WHERE id = 'TRIP-TEST-M2';
  CALL log_assert('employee', 'allow_select_own_open_trip', v_cnt = 1, 'Employee should see assigned open trip');

  -- 2.2 Employee sees trip stop on own open trip
  SELECT count(*) INTO v_cnt FROM public.trip_stops WHERE trip_id = 'TRIP-TEST-M2';
  CALL log_assert('employee', 'allow_select_own_trip_stops', v_cnt = 1, 'Employee should see stops on own open trip');

  -- 2.3 Employee CAN see customer on own open trip (CUST-TEST-1)
  SELECT name INTO v_cust FROM public.customers WHERE id = 'CUST-TEST-1';
  CALL log_assert('employee', 'allow_select_customer_on_open_trip', v_cust IS NOT NULL, 'Customer on open trip must be visible');

  -- 2.4 Employee CANNOT see customer NOT on open trip (CUST-TEST-2)
  SELECT name INTO v_cust FROM public.customers WHERE id = 'CUST-TEST-2';
  CALL log_assert('employee', 'deny_select_customer_not_on_trip', v_cust IS NULL, 'Customer not on open trip must be hidden by RLS');

  -- 2.5 Employee sees OWN attendance (M2) but NOT M1's
  SELECT count(*) INTO v_cnt FROM public.attendance WHERE employee_id = 'M2';
  CALL log_assert('employee', 'allow_select_own_attendance', v_cnt >= 1, 'Employee sees own attendance');
  SELECT count(*) INTO v_cnt FROM public.attendance WHERE employee_id = 'M1';
  CALL log_assert('employee', 'deny_select_other_attendance', v_cnt = 0, 'Employee cannot see other staff attendance');

  -- 2.6 Employee sees OWN payslip (M2) but NOT M1's
  SELECT count(*) INTO v_cnt FROM public.payslips WHERE employee_id = 'M2';
  CALL log_assert('employee', 'allow_select_own_payslip', v_cnt = 1, 'Employee sees own payslips');
  SELECT count(*) INTO v_cnt FROM public.payslips WHERE employee_id = 'M1';
  CALL log_assert('employee', 'deny_select_other_payslip', v_cnt = 0, 'Employee cannot see other employee payslips');

  -- 2.7 Employee CANNOT see HR applications or invites
  SELECT count(*) INTO v_cnt FROM public.applications;
  CALL log_assert('employee', 'deny_select_applications', v_cnt = 0, 'Employee cannot browse applicant records');
  SELECT count(*) INTO v_cnt FROM public.invites;
  CALL log_assert('employee', 'deny_select_invites', v_cnt = 0, 'Employee cannot browse invites');

  -- 2.8 Employee CANNOT see audit log
  SELECT count(*) INTO v_cnt FROM public.audit_log;
  CALL log_assert('employee', 'deny_select_audit_log', v_cnt = 0, 'Employee cannot view system audit log');

  -- 2.9 Direct DELETE on bills is DENIED (immutable ledger)
  BEGIN
    DELETE FROM public.bills WHERE id = 'B999';
    v_err := false;
  EXCEPTION WHEN OTHERS THEN
    v_err := true;
  END;
  CALL log_assert('employee', 'deny_delete_bills', v_err, 'Financial bills cannot be deleted directly');

  -- 2.10 Cannot mutate profile role directly
  BEGIN
    UPDATE public.profiles SET role = 'owner' WHERE id = 'd0000000-0000-0000-0000-000000000004';
    v_err := false;
  EXCEPTION WHEN OTHERS THEN
    v_err := true;
  END;
  CALL log_assert('employee', 'deny_profile_privilege_escalation', v_err, 'Profile mutations guarded by service-role check');
END $$;


-- ====================================================================
-- SECTION 3: MANAGER (M1: 'c0000000-0000-0000-0000-000000000003')
-- ====================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "c0000000-0000-0000-0000-000000000003", "role": "authenticated"}';

DO $$
DECLARE
  v_cnt int;
  v_err boolean := false;
  v_role text;
BEGIN
  -- Verify app_role() helper recognizes manager
  v_role := public.app_role();
  CALL log_assert('manager', 'verify_app_role', v_role = 'manager', 'app_role() returned ' || COALESCE(v_role, 'NULL'));

  -- 3.1 Manager sees ALL customers (not restricted to open trip)
  SELECT count(*) INTO v_cnt FROM public.customers WHERE id IN ('CUST-TEST-1', 'CUST-TEST-2', 'CUST-TEST-3');
  CALL log_assert('manager', 'allow_select_all_customers', v_cnt = 3, 'Manager must see all customers');

  -- 3.2 Manager sees ALL trips
  SELECT count(*) INTO v_cnt FROM public.trips WHERE id = 'TRIP-TEST-M2';
  CALL log_assert('manager', 'allow_select_all_trips', v_cnt >= 1, 'Manager must see all delivery trips');

  -- 3.3 Manager can INSERT a new trip
  BEGIN
    INSERT INTO public.trips (id, vehicle_id, driver_id, trip_date, status)
    VALUES ('TRIP-TEST-MGR-NEW', 'VEH-1', 'M2', (now() at time zone 'Asia/Kolkata')::date, 'planned');
    v_err := false;
  EXCEPTION WHEN OTHERS THEN
    v_err := true;
  END;
  CALL log_assert('manager', 'allow_insert_trip', NOT v_err, 'Manager can plan new trips');

  -- 3.4 Manager can update customer GPS location even if already populated
  BEGIN
    UPDATE public.customers
    SET lat = 13.559000, lng = 78.503000, accuracy_m = 12.0
    WHERE id = 'CUST-TEST-1';
    v_err := false;
  EXCEPTION WHEN OTHERS THEN
    v_err := true;
  END;
  CALL log_assert('manager', 'allow_update_customer_location', NOT v_err, 'Manager has authority to update customer coordinates');

  -- 3.5 Manager sees ALL attendance records
  SELECT count(*) INTO v_cnt FROM public.attendance WHERE id IN ('ATT-TEST-M1', 'ATT-TEST-M2');
  CALL log_assert('manager', 'allow_select_all_attendance', v_cnt = 2, 'Manager sees attendance for all staff');

  -- 3.6 Manager sees HR applications & invites
  SELECT count(*) INTO v_cnt FROM public.applications;
  CALL log_assert('manager', 'allow_select_applications', v_cnt >= 1, 'Manager reviews candidate applications');
  SELECT count(*) INTO v_cnt FROM public.invites;
  CALL log_assert('manager', 'allow_select_invites', v_cnt >= 1, 'Manager reviews joining invites');

  -- 3.7 Manager sees ALL payslips
  SELECT count(*) INTO v_cnt FROM public.payslips WHERE id IN ('SLIP-TEST-M1', 'SLIP-TEST-M2');
  CALL log_assert('manager', 'allow_select_all_payslips', v_cnt = 2, 'Manager sees staff payslips');

  -- 3.8 Manager CANNOT view audit log (reserved for owner & admin)
  SELECT count(*) INTO v_cnt FROM public.audit_log;
  CALL log_assert('manager', 'deny_select_audit_log', v_cnt = 0, 'Audit log is reserved for owner/admin');

  -- 3.9 Manager CANNOT delete bills (immutable ledger)
  BEGIN
    DELETE FROM public.bills WHERE id = 'B999';
    v_err := false;
  EXCEPTION WHEN OTHERS THEN
    v_err := true;
  END;
  CALL log_assert('manager', 'deny_delete_bills', v_err, 'Financial bills cannot be deleted directly');
END $$;


-- ====================================================================
-- SECTION 4: OWNER ('b0000000-0000-0000-0000-000000000002')
-- ====================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "b0000000-0000-0000-0000-000000000002", "role": "authenticated"}';

DO $$
DECLARE
  v_cnt int;
  v_err boolean := false;
  v_role text;
BEGIN
  -- Verify app_role() helper recognizes owner
  v_role := public.app_role();
  CALL log_assert('owner', 'verify_app_role', v_role = 'owner', 'app_role() returned ' || COALESCE(v_role, 'NULL'));

  -- 4.1 Owner sees ALL customers, trips, bills, payments
  SELECT count(*) INTO v_cnt FROM public.customers;
  CALL log_assert('owner', 'allow_select_all_customers', v_cnt >= 3, 'Owner sees all customer records');

  SELECT count(*) INTO v_cnt FROM public.trips;
  CALL log_assert('owner', 'allow_select_all_trips', v_cnt >= 1, 'Owner sees all trips');

  -- 4.2 Owner can read audit log
  SELECT count(*) INTO v_cnt FROM public.audit_log;
  CALL log_assert('owner', 'allow_select_audit_log', v_cnt >= 1, 'Owner has access to system audit trail');

  -- 4.3 Owner can view & manage HR invites and applications
  SELECT count(*) INTO v_cnt FROM public.invites;
  CALL log_assert('owner', 'allow_select_invites', v_cnt >= 1, 'Owner manages invites');
  SELECT count(*) INTO v_cnt FROM public.applications;
  CALL log_assert('owner', 'allow_select_applications', v_cnt >= 1, 'Owner manages candidate applications');

  -- 4.4 Owner CANNOT delete from financial or stock ledgers (immutability rule)
  BEGIN
    DELETE FROM public.bills WHERE id = 'B999';
    v_err := false;
  EXCEPTION WHEN OTHERS THEN
    v_err := true;
  END;
  CALL log_assert('owner', 'deny_delete_bills', v_err, 'Bills table has NO delete policy even for Owner');

  BEGIN
    DELETE FROM public.payments WHERE id = 'P999';
    v_err := false;
  EXCEPTION WHEN OTHERS THEN
    v_err := true;
  END;
  CALL log_assert('owner', 'deny_delete_payments', v_err, 'Payments table has NO delete policy even for Owner');

  BEGIN
    DELETE FROM public.fg_movements WHERE id = 999999;
    v_err := false;
  EXCEPTION WHEN OTHERS THEN
    v_err := true;
  END;
  CALL log_assert('owner', 'deny_delete_fg_movements', v_err, 'Stock movement table has NO delete policy even for Owner');
END $$;


-- ====================================================================
-- SECTION 5: ADMIN ('a0000000-0000-0000-0000-000000000001')
-- ====================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

DO $$
DECLARE
  v_cnt int;
  v_role text;
  v_err boolean := false;
BEGIN
  -- Verify app_role() helper recognizes admin
  v_role := public.app_role();
  CALL log_assert('admin', 'verify_app_role', v_role = 'admin', 'app_role() returned ' || COALESCE(v_role, 'NULL'));

  -- 5.1 Admin has access to audit log
  SELECT count(*) INTO v_cnt FROM public.audit_log;
  CALL log_assert('admin', 'allow_select_audit_log', v_cnt >= 1, 'Admin has access to audit trail');

  -- 5.2 Admin can view profiles
  SELECT count(*) INTO v_cnt FROM public.profiles;
  CALL log_assert('admin', 'allow_select_profiles', v_cnt >= 4, 'Admin views all user profiles');

  -- 5.3 Admin CANNOT delete from financial or stock ledgers (immutability rule)
  BEGIN
    DELETE FROM public.bills WHERE id = 'B999';
    v_err := false;
  EXCEPTION WHEN OTHERS THEN
    v_err := true;
  END;
  CALL log_assert('admin', 'deny_delete_bills', v_err, 'Bills table has NO delete policy even for Admin');
END $$;


-- ====================================================================
-- SECTION 6: Test Summary & Verification
-- ====================================================================
DO $$
DECLARE
  v_total int;
  v_passed int;
  v_failed int;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE status = 'PASS'),
         count(*) FILTER (WHERE status = 'FAIL')
  INTO v_total, v_passed, v_failed
  FROM test_results;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'ROLE MATRIX TEST SUMMARY: % Tests, % Passed, % Failed', v_total, v_passed, v_failed;
  RAISE NOTICE '==================================================';

  IF v_failed > 0 THEN
    RAISE EXCEPTION 'ROLE MATRIX FAILED: % assertion(s) failed!', v_failed;
  END IF;
END $$;

-- Rollback entire transaction to leave database pristine
ROLLBACK;
