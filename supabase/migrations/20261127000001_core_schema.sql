-- ====================================================================
-- SR Industries BMS - Relational Core Schema (Typed Columns, FKs RESTRICT, No Blobs)
-- Migration: 001_core_schema.sql
-- ====================================================================

BEGIN;

-- ====================================================================
-- SECTION 1: Sequences & ID Generation Helpers
-- ====================================================================

CREATE SEQUENCE IF NOT EXISTS public.seq_customers START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_payments START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_orders START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_trips START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_production_runs START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_fg_movements START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_deliveries START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_handovers START 1;

-- Indian Financial Year Invoice Sequence Helper: returns 'SR/26-27/0001'
CREATE OR REPLACE FUNCTION public.next_bill_no(p_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_date date := COALESCE(p_date, CURRENT_DATE);
  v_month int := EXTRACT(MONTH FROM v_date);
  v_year int := EXTRACT(YEAR FROM v_date);
  v_fy_start int;
  v_fy_end int;
  v_fy_str text;
  v_seq_name text;
  v_seq_num bigint;
BEGIN
  IF v_month >= 4 THEN
    v_fy_start := v_year % 100;
    v_fy_end := (v_year + 1) % 100;
  ELSE
    v_fy_start := (v_year - 1) % 100;
    v_fy_end := v_year % 100;
  END IF;

  v_fy_str := to_char(v_fy_start, 'FM00') || '-' || to_char(v_fy_end, 'FM00');
  v_seq_name := 'seq_bills_' || to_char(v_fy_start, 'FM00') || '_' || to_char(v_fy_end, 'FM00');

  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START 1;', v_seq_name);
  EXECUTE format('SELECT nextval(%L);', v_seq_name) INTO v_seq_num;

  RETURN 'SR/' || v_fy_str || '/' || lpad(v_seq_num::text, 4, '0');
END;
$$;

-- Payment ID Generator: returns 'PAY/YYMM/0001'
CREATE OR REPLACE FUNCTION public.next_payment_id(p_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_date date := COALESCE(p_date, CURRENT_DATE);
  v_num bigint;
BEGIN
  v_num := nextval('public.seq_payments');
  RETURN 'PAY/' || to_char(v_date, 'YYMM') || '/' || lpad(v_num::text, 4, '0');
END;
$$;

-- Customer ID Generator: returns 'C1', 'C2', etc.
CREATE OR REPLACE FUNCTION public.next_customer_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN 'C' || nextval('public.seq_customers')::text;
END;
$$;

-- ====================================================================
-- SECTION 2: Master Tables (Employees, Profiles, Vehicles)
-- ====================================================================

-- 1. Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
  id text PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'accountant', 'employee')),
  phone text NOT NULL UNIQUE,
  salary numeric(12,2) NOT NULL DEFAULT 0 CHECK (salary >= 0),
  address text DEFAULT '',
  photo_path text,
  portal_token text UNIQUE,
  joined_date date DEFAULT CURRENT_DATE,
  duties text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_phone ON public.employees(phone);
CREATE INDEX IF NOT EXISTS idx_employees_active ON public.employees(active);

-- 2. Profiles Table (Auth Users Link)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'owner', 'manager', 'employee')),
  phone text UNIQUE,
  employee_id text REFERENCES public.employees(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles(employee_id);

-- 3. Vehicles Table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id text PRIMARY KEY,
  vehicle_number text NOT NULL UNIQUE,
  vehicle_type text CHECK (vehicle_type IN ('Auto', 'Pickup', 'Van', 'Truck')),
  default_driver_id text REFERENCES public.employees(id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ====================================================================
-- SECTION 3: Locations & Inventory Master
-- ====================================================================

-- 4. Locations Table
CREATE TABLE IF NOT EXISTS public.locations (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('plant', 'godown', 'vehicle')),
  vehicle_id text REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed static locations
INSERT INTO public.locations (id, name, type) VALUES
  ('PLANT', 'Plant', 'plant'),
  ('G1', 'Godown 1', 'godown'),
  ('G2', 'Godown 2', 'godown')
ON CONFLICT (id) DO NOTHING;

-- 5. Production Runs Table
CREATE TABLE IF NOT EXISTS public.production_runs (
  id text PRIMARY KEY,
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  batch_no text NOT NULL,
  product_name text NOT NULL,
  cases_produced numeric(10,2) NOT NULL DEFAULT 0 CHECK (cases_produced >= 0),
  bottles_produced numeric(10,2) NOT NULL DEFAULT 0 CHECK (bottles_produced >= 0),
  destination_location_id text NOT NULL DEFAULT 'PLANT' REFERENCES public.locations(id) ON DELETE RESTRICT,
  supervisor_id text REFERENCES public.employees(id) ON DELETE RESTRICT,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_production_runs_date ON public.production_runs(run_date);
CREATE INDEX IF NOT EXISTS idx_production_runs_product ON public.production_runs(product_name);

-- 6. Finished Goods Movements Ledger (No JSONB blobs)
CREATE TABLE IF NOT EXISTS public.fg_movements (
  id text PRIMARY KEY,
  move_date date NOT NULL DEFAULT CURRENT_DATE,
  product_name text NOT NULL,
  from_location_id text REFERENCES public.locations(id) ON DELETE RESTRICT,
  to_location_id text REFERENCES public.locations(id) ON DELETE RESTRICT,
  cases numeric(10,2) NOT NULL CHECK (cases >= 0),
  bottles numeric(10,2) NOT NULL CHECK (bottles >= 0),
  movement_type text NOT NULL CHECK (movement_type IN ('production', 'transfer', 'dispatch', 'return', 'adjustment', 'breakage')),
  reference_type text CHECK (reference_type IN ('production_run', 'trip', 'delivery', 'adjustment')),
  reference_id text,
  notes text DEFAULT '',
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fg_movements_date ON public.fg_movements(move_date);
CREATE INDEX IF NOT EXISTS idx_fg_movements_product ON public.fg_movements(product_name);
CREATE INDEX IF NOT EXISTS idx_fg_movements_from ON public.fg_movements(from_location_id);
CREATE INDEX IF NOT EXISTS idx_fg_movements_to ON public.fg_movements(to_location_id);

-- ====================================================================
-- SECTION 4: Customers, Pricing & Orders
-- ====================================================================

-- 7. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id text PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  area text DEFAULT '',
  lat numeric(10,7),
  lng numeric(10,7),
  accuracy_m numeric(6,2),
  location_set_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  location_set_at timestamptz,
  credit_limit numeric(12,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  created_date date DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

-- 8. Customer Prices Table
CREATE TABLE IF NOT EXISTS public.customer_prices (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id text REFERENCES public.customers(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  rate numeric(12,2) NOT NULL CHECK (rate >= 0),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_prices_lookup ON public.customer_prices(customer_id, product_name);

-- Alias Table for compatibility with earlier migration definitions
CREATE TABLE IF NOT EXISTS public.price_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product text NOT NULL,
  customer_id text REFERENCES public.customers(id) ON DELETE RESTRICT,
  rate numeric not null check (rate >= 0),
  effective_from date not null default current_date,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) ON DELETE SET NULL
);

-- 9. Prospects Table
CREATE TABLE IF NOT EXISTS public.prospects (
  id text PRIMARY KEY,
  name text NOT NULL,
  phone text DEFAULT '',
  area text DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'converted', 'dropped')),
  converted_customer_id text REFERENCES public.customers(id) ON DELETE RESTRICT,
  visited_by text REFERENCES public.employees(id) ON DELETE RESTRICT,
  notes text DEFAULT '',
  visited_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  requested_date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'phone' CHECK (source IN ('phone', 'stop_visit', 'whatsapp', 'driver', 'salesman')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'planned', 'dispatched', 'delivered', 'cancelled')),
  notes text DEFAULT '',
  created_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_req_date ON public.orders(requested_date);

-- 11. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  cases numeric(10,2) NOT NULL DEFAULT 0 CHECK (cases >= 0),
  qty_bottles numeric(10,2) NOT NULL DEFAULT 0 CHECK (qty_bottles >= 0),
  rate_per_case numeric(12,2) NOT NULL DEFAULT 0 CHECK (rate_per_case >= 0),
  case_size numeric(10,2) NOT NULL DEFAULT 1 CHECK (case_size >= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- ====================================================================
-- SECTION 5: Financial Invoices & Collection Ledgers (Immutability)
-- ====================================================================

-- 12. Bills Table
CREATE TABLE IF NOT EXISTS public.bills (
  id text PRIMARY KEY,
  bill_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  customer_name text NOT NULL,
  mobile text DEFAULT '',
  address text DEFAULT '',
  gst boolean NOT NULL DEFAULT false,
  subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  paid numeric(12,2) NOT NULL DEFAULT 0 CHECK (paid >= 0),
  payment_mode text NOT NULL DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'PhonePe', 'GPay', 'Bank Transfer', 'Cheque')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  provisional_id text,
  cancelled_reason text,
  cancelled_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  cancelled_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bills_customer ON public.bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_date ON public.bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_prov_id ON public.bills(provisional_id);

-- 13. Bill Items Table
CREATE TABLE IF NOT EXISTS public.bill_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bill_id text NOT NULL REFERENCES public.bills(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  qty_bottles numeric(10,2) NOT NULL DEFAULT 0 CHECK (qty_bottles >= 0),
  rate_per_case numeric(12,2) NOT NULL DEFAULT 0 CHECK (rate_per_case >= 0),
  case_size numeric(10,2) NOT NULL DEFAULT 1 CHECK (case_size >= 1),
  rate_source text NOT NULL DEFAULT 'manual' CHECK (rate_source IN ('manual', 'price_list')),
  entered_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON public.bill_items(bill_id);

-- 14. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id text PRIMARY KEY,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  bill_id text REFERENCES public.bills(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  mode text NOT NULL DEFAULT 'Cash' CHECK (mode IN ('Cash', 'PhonePe', 'GPay', 'Bank Transfer', 'Cheque')),
  reversed_at timestamptz,
  reversed_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reversal_reason text,
  notes text DEFAULT '',
  created_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill ON public.payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

-- ====================================================================
-- SECTION 6: Trips, Stops, Deliveries & Cash Handovers
-- ====================================================================

-- 15. Trips Table
CREATE TABLE IF NOT EXISTS public.trips (
  id text PRIMARY KEY,
  vehicle_id text NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  driver_id text NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  trip_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'loading', 'on_route', 'completed', 'settled', 'cancelled')),
  start_odometer numeric(10,2),
  end_odometer numeric(10,2),
  loaded_at timestamptz,
  closed_at timestamptz,
  supervisor_id text REFERENCES public.employees(id) ON DELETE RESTRICT,
  notes text DEFAULT '',
  created_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trips_driver ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_date ON public.trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);

-- 16. Trip Stops Table
CREATE TABLE IF NOT EXISTS public.trip_stops (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id text NOT NULL REFERENCES public.trips(id) ON DELETE RESTRICT,
  stop_sequence int NOT NULL,
  customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  order_id text REFERENCES public.orders(id) ON DELETE RESTRICT,
  arrival_lat numeric(10,7),
  arrival_lng numeric(10,7),
  arrival_time timestamptz,
  distance_m numeric(10,2),
  result text NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'arrived', 'delivered', 'skipped')),
  skip_reason text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_trip_stop UNIQUE (trip_id, stop_sequence)
);

CREATE INDEX IF NOT EXISTS idx_trip_stops_trip ON public.trip_stops(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_stops_customer ON public.trip_stops(customer_id);

-- 17. Trip Stop Items Table
CREATE TABLE IF NOT EXISTS public.trip_stop_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_stop_id bigint NOT NULL REFERENCES public.trip_stops(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  planned_cases numeric(10,2) NOT NULL DEFAULT 0 CHECK (planned_cases >= 0),
  planned_bottles numeric(10,2) NOT NULL DEFAULT 0 CHECK (planned_bottles >= 0),
  delivered_cases numeric(10,2) NOT NULL DEFAULT 0 CHECK (delivered_cases >= 0),
  delivered_bottles numeric(10,2) NOT NULL DEFAULT 0 CHECK (delivered_bottles >= 0),
  rate_per_case numeric(12,2) NOT NULL DEFAULT 0 CHECK (rate_per_case >= 0),
  case_size numeric(10,2) NOT NULL DEFAULT 1 CHECK (case_size >= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 18. Deliveries Table
CREATE TABLE IF NOT EXISTS public.deliveries (
  id text PRIMARY KEY,
  trip_stop_id bigint NOT NULL REFERENCES public.trip_stops(id) ON DELETE RESTRICT,
  trip_id text NOT NULL REFERENCES public.trips(id) ON DELETE RESTRICT,
  customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  bill_id text NOT NULL REFERENCES public.bills(id) ON DELETE RESTRICT,
  payment_id text REFERENCES public.payments(id) ON DELETE RESTRICT,
  delivery_time timestamptz NOT NULL DEFAULT now(),
  provisional_id text,
  empty_cans_returned int NOT NULL DEFAULT 0 CHECK (empty_cans_returned >= 0),
  delivered_by text NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_trip ON public.deliveries(trip_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer ON public.deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_bill ON public.deliveries(bill_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_prov ON public.deliveries(provisional_id);

-- 19. Cash Handovers Table
CREATE TABLE IF NOT EXISTS public.cash_handovers (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES public.trips(id) ON DELETE RESTRICT,
  driver_id text NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  handed_to_id text NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  cash_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (cash_amount >= 0),
  online_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (online_amount >= 0),
  expenses_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (expenses_amount >= 0),
  net_cash_handed numeric(12,2) NOT NULL CHECK (net_cash_handed >= 0),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified', 'discrepancy')),
  verified_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  verified_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_handovers_trip ON public.cash_handovers(trip_id);

-- ====================================================================
-- SECTION 7: Supporting HR, Attendance & Expenses
-- ====================================================================

-- 20. Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
  id text PRIMARY KEY,
  att_date date NOT NULL DEFAULT CURRENT_DATE,
  employee_id text NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Absent', 'Half day')),
  time_in text,
  time_out text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON public.attendance(employee_id, att_date);

-- 21. Advances Table
CREATE TABLE IF NOT EXISTS public.advances (
  id text PRIMARY KEY,
  adv_date date NOT NULL DEFAULT CURRENT_DATE,
  employee_id text NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 22. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id text PRIMARY KEY,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL CHECK (category IN ('Diesel', 'Electricity', 'Repairs', 'Salary', 'Packaging', 'Chemicals', 'Rent', 'Other')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 23. Idempotency Keys Table
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user ON public.idempotency_keys(user_id);

-- 24. Employee Identities Table (Sensitive PII)
CREATE TABLE IF NOT EXISTS public.employee_identities (
  employee_id text PRIMARY KEY REFERENCES public.employees(id) ON DELETE RESTRICT,
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
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 25. Audit Log Table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text,
  table_name text NOT NULL,
  row_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old jsonb,
  new jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_log_at ON public.audit_log(at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);

COMMIT;
