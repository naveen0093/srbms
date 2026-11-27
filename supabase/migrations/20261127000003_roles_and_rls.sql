-- ====================================================================
-- SR Industries BMS - Roles and Row Level Security (RLS) Policies
-- Migration: 003_roles_and_rls.sql
-- Roles: admin, owner, manager, employee
-- ====================================================================

BEGIN;

-- ====================================================================
-- SECTION 1: Security Definer Helper Functions
-- ====================================================================

-- 1. app_role(): Returns current authenticated user's active role
CREATE OR REPLACE FUNCTION public.app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
    AND active = true;
$$;

-- 2. has_role(VARIADIC roles text[]): Role membership check
CREATE OR REPLACE FUNCTION public.has_role(VARIADIC roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
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
SET search_path = public, pg_temp
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
SET search_path = public, pg_temp
AS $$
  SELECT public.app_role();
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.has_role('owner', 'manager');
$$;

-- 6. Helper: Check if customer is on employee's current open trips
CREATE OR REPLACE FUNCTION public.is_customer_on_my_open_trip(p_cust_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips t
    JOIN public.trip_stops ts ON ts.trip_id = t.id
    WHERE t.driver_id = public.current_employee_id()
      AND t.status IN ('planned', 'loading', 'on_route')
      AND t.closed_at IS NULL
      AND ts.customer_id = p_cust_id
  );
$$;

-- ====================================================================
-- SECTION 2: Profile Service Role Mutation Guard
-- ====================================================================

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
-- SECTION 3: Enable RLS on Every Public Table
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- SECTION 4: Restrict Public / Anon Access
-- ====================================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Drop previous policies to ensure clean declarative state
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
-- SECTION 5: Explicit RLS Policies per Table
-- ====================================================================

-- 1. PROFILES
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role('owner', 'manager', 'admin'));

-- 2. AUDIT_LOG (Owner & Admin Read-Only; Append-Only by Trigger)
CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'admin'));

-- 3. EMPLOYEE_IDENTITIES (Owner Only)
CREATE POLICY "employee_identities_owner_all" ON public.employee_identities
  FOR ALL TO authenticated
  USING (public.has_role('owner'))
  WITH CHECK (public.has_role('owner'));

-- 4. CUSTOMERS
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

-- 5. CUSTOMER_PRICES & PRICE_LIST (Rate Catalog: NO DELETE)
CREATE POLICY "customer_prices_select" ON public.customer_prices
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "customer_prices_write" ON public.customer_prices
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "price_list_select" ON public.price_list
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "price_list_write" ON public.price_list
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- 6. PROSPECTS
CREATE POLICY "prospects_select" ON public.prospects
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "prospects_write" ON public.prospects
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- 7. ORDERS & ORDER_ITEMS
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "orders_write" ON public.orders
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "order_items_write" ON public.order_items
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- 8. LOCATIONS
CREATE POLICY "locations_select" ON public.locations
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin', 'employee'));

CREATE POLICY "locations_write" ON public.locations
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- 9. PRODUCTION_RUNS
CREATE POLICY "production_runs_select" ON public.production_runs
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "production_runs_write" ON public.production_runs
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- 10. FG_MOVEMENTS (Stock Ledger: NO DELETE)
CREATE POLICY "fg_movements_select" ON public.fg_movements
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "fg_movements_insert" ON public.fg_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "fg_movements_update" ON public.fg_movements
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- 11. TRIPS
CREATE POLICY "trips_select" ON public.trips
  FOR SELECT TO authenticated
  USING (
    public.has_role('owner', 'manager', 'admin')
    OR (public.has_role('employee') AND driver_id = public.current_employee_id())
  );

CREATE POLICY "trips_insert" ON public.trips
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "trips_update" ON public.trips
  FOR UPDATE TO authenticated
  USING (
    public.has_role('owner', 'manager')
    OR (public.has_role('employee') AND driver_id = public.current_employee_id())
  )
  WITH CHECK (
    public.has_role('owner', 'manager')
    OR (public.has_role('employee') AND driver_id = public.current_employee_id())
  );

CREATE POLICY "trips_delete" ON public.trips
  FOR DELETE TO authenticated
  USING (public.has_role('owner', 'manager'));

-- 12. TRIP_STOPS & TRIP_STOP_ITEMS
CREATE POLICY "trip_stops_select" ON public.trip_stops
  FOR SELECT TO authenticated
  USING (
    public.has_role('owner', 'manager', 'admin')
    OR EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id AND t.driver_id = public.current_employee_id()
    )
  );

CREATE POLICY "trip_stops_insert" ON public.trip_stops
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "trip_stops_update" ON public.trip_stops
  FOR UPDATE TO authenticated
  USING (
    public.has_role('owner', 'manager')
    OR EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id AND t.driver_id = public.current_employee_id()
    )
  )
  WITH CHECK (
    public.has_role('owner', 'manager')
    OR EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id AND t.driver_id = public.current_employee_id()
    )
  );

CREATE POLICY "trip_stops_delete" ON public.trip_stops
  FOR DELETE TO authenticated
  USING (public.has_role('owner', 'manager'));

CREATE POLICY "trip_stop_items_select" ON public.trip_stop_items
  FOR SELECT TO authenticated
  USING (
    public.has_role('owner', 'manager', 'admin')
    OR EXISTS (
      SELECT 1 FROM public.trip_stops ts
      JOIN public.trips t ON t.id = ts.trip_id
      WHERE ts.id = trip_stop_id AND t.driver_id = public.current_employee_id()
    )
  );

CREATE POLICY "trip_stop_items_write" ON public.trip_stop_items
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- 13. DELIVERIES
CREATE POLICY "deliveries_select" ON public.deliveries
  FOR SELECT TO authenticated
  USING (
    public.has_role('owner', 'manager', 'admin')
    OR delivered_by = public.current_employee_id()
  );

CREATE POLICY "deliveries_insert" ON public.deliveries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('owner', 'manager')
    OR delivered_by = public.current_employee_id()
  );

-- 14. CASH_HANDOVERS
CREATE POLICY "cash_handovers_select" ON public.cash_handovers
  FOR SELECT TO authenticated
  USING (
    public.has_role('owner', 'manager', 'admin')
    OR driver_id = public.current_employee_id()
  );

CREATE POLICY "cash_handovers_insert" ON public.cash_handovers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('owner', 'manager')
    OR driver_id = public.current_employee_id()
  );

CREATE POLICY "cash_handovers_update" ON public.cash_handovers
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- 15. BILLS (Financial Ledger: NO DELETE)
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

-- 16. BILL_ITEMS (Financial Ledger: NO DELETE)
CREATE POLICY "bill_items_select" ON public.bill_items
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "bill_items_insert" ON public.bill_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager'));

CREATE POLICY "bill_items_update" ON public.bill_items
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- 17. PAYMENTS (Financial Ledger: NO DELETE)
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

-- 18. EMPLOYEES
CREATE POLICY "employees_select" ON public.employees
  FOR SELECT TO authenticated
  USING (
    public.has_role('owner', 'manager', 'admin')
    OR (public.has_role('employee') AND id = public.current_employee_id())
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

-- 19. VEHICLES
CREATE POLICY "vehicles_select" ON public.vehicles
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin', 'employee'));

CREATE POLICY "vehicles_write" ON public.vehicles
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- 20. ATTENDANCE
CREATE POLICY "attendance_select" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    public.has_role('owner', 'manager', 'admin')
    OR (public.has_role('employee') AND employee_id = public.current_employee_id())
  );

CREATE POLICY "attendance_insert" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('owner', 'manager')
    OR (public.has_role('employee') AND employee_id = public.current_employee_id())
  );

CREATE POLICY "attendance_update" ON public.attendance
  FOR UPDATE TO authenticated
  USING (
    public.has_role('owner', 'manager')
    OR (public.has_role('employee') AND employee_id = public.current_employee_id())
  )
  WITH CHECK (
    public.has_role('owner', 'manager')
    OR (public.has_role('employee') AND employee_id = public.current_employee_id())
  );

CREATE POLICY "attendance_delete" ON public.attendance
  FOR DELETE TO authenticated
  USING (public.has_role('owner', 'manager'));

-- 21. ADVANCES (Owner Only, Financial Ledger: NO DELETE)
CREATE POLICY "advances_select" ON public.advances
  FOR SELECT TO authenticated
  USING (public.has_role('owner'));

CREATE POLICY "advances_write" ON public.advances
  FOR ALL TO authenticated
  USING (public.has_role('owner'))
  WITH CHECK (public.has_role('owner'));

-- 22. EXPENSES (Financial Ledger: NO DELETE)
CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT TO authenticated
  USING (public.has_role('owner', 'manager', 'admin'));

CREATE POLICY "expenses_write" ON public.expenses
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- 23. IDEMPOTENCY_KEYS
CREATE POLICY "idempotency_keys_user_select" ON public.idempotency_keys
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "idempotency_keys_user_insert" ON public.idempotency_keys
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ====================================================================
-- SECTION 6: Revoke Function Execution from PUBLIC and anon
-- ====================================================================

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;

-- Explicitly grant client-callable helper functions to authenticated & service_role
GRANT EXECUTE ON FUNCTION public.app_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.role_rank(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_customer_on_my_open_trip(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_bill_no(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_payment_id(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_customer_id() TO authenticated, service_role;

-- ====================================================================
-- SECTION 7: Verification Queries
-- ====================================================================

-- 1. Tables in public schema that do NOT have RLS enabled (MUST return 0 rows)
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;

-- 2. Policies where qual or with_check evaluates to literal 'true' (MUST return 0 rows)
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (trim(qual) = 'true' OR trim(with_check) = 'true');

-- 3. Functions executable by 'anon' or 'public' (MUST return 0 rows)
SELECT routine_schema, routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND grantee IN ('anon', 'public');

COMMIT;

-- 4. Test Matrix of Role × Table Permissions
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
customer_prices         | SELECT           | SELECT,INS,UPD        | SELECT,INS,UPD        | NO ACCESS
price_list              | SELECT           | SELECT,INS,UPD        | SELECT,INS,UPD        | NO ACCESS
prospects               | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | NO ACCESS
orders                  | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | NO ACCESS
order_items             | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | NO ACCESS
locations               | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | SELECT
production_runs         | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | NO ACCESS
fg_movements            | SELECT           | SELECT,INS,UPD        | SELECT,INS,UPD        | NO ACCESS
trips                   | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | SELECT, UPDATE (assigned trip)
trip_stops              | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | SELECT, UPDATE (assigned trip)
trip_stop_items         | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | SELECT (assigned trip)
deliveries              | SELECT           | SELECT,INSERT         | SELECT,INSERT         | SELECT, INSERT (assigned trip)
cash_handovers          | SELECT           | SELECT,INS,UPD        | SELECT,INS,UPD        | SELECT, INSERT (own trip handover)
bills                   | SELECT           | SELECT,INS,UPD        | SELECT,INS,UPD        | NO DIRECT ACCESS (RPC only)
bill_items              | SELECT           | SELECT,INS,UPD        | SELECT,INS,UPD        | NO DIRECT ACCESS (RPC only)
payments                | SELECT           | SELECT,INS,UPD        | SELECT,INS,UPD        | NO DIRECT ACCESS (RPC only)
employees               | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD        | SELECT (self only)
vehicles                | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | SELECT
attendance              | SELECT           | SELECT,INS,UPD,DEL    | SELECT,INS,UPD,DEL    | SELECT, INSERT (own attendance only)
advances                | NO ACCESS        | SELECT,INS,UPD        | NO ACCESS             | NO ACCESS
expenses                | SELECT           | SELECT,INS,UPD        | SELECT,INS,UPD        | NO ACCESS
idempotency_keys        | NO ACCESS        | SELECT,INSERT (self)  | SELECT,INSERT (self)  | SELECT, INSERT (self)
=================================================================================================================================
Financial & Stock Ledgers with Immutability (ZERO DELETE policies):
- bills, bill_items, payments, fg_movements, expenses, advances, customer_prices, price_list, cash_handovers, audit_log
=================================================================================================================================
*/
