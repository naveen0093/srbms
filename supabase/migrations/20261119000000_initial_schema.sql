-- Migration: 20261119000000_initial_schema.sql
-- SR Industries BMS - Base Schema (15 Tables, Storage Buckets & Initial Blanket Policies)

BEGIN;

-- ====================================================================
-- SECTION 1: Base Application Tables (15 Tables)
-- ====================================================================

-- 1. business_settings
CREATE TABLE IF NOT EXISTS public.business_settings (
  id integer PRIMARY KEY DEFAULT 1,
  name text NOT NULL DEFAULT 'SR Industries',
  owner text NOT NULL DEFAULT 'Owner',
  phone text DEFAULT '',
  gst text DEFAULT '',
  address text DEFAULT '',
  products jsonb DEFAULT '[]'::jsonb,
  categories jsonb DEFAULT '[]'::jsonb,
  low_stock_threshold numeric DEFAULT 100,
  vehicle_video_max_mb numeric DEFAULT 25,
  bill_delete_pin_salt text,
  bill_delete_pin_hash text,
  bill_delete_pin_updated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. customers
CREATE TABLE IF NOT EXISTS public.customers (
  id text PRIMARY KEY,
  name text NOT NULL,
  phone text DEFAULT '',
  area text DEFAULT '',
  created_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- 3. bills
CREATE TABLE IF NOT EXISTS public.bills (
  id text PRIMARY KEY,
  bill_date date DEFAULT CURRENT_DATE,
  customer_id text REFERENCES public.customers(id),
  customer_name text NOT NULL,
  mobile text DEFAULT '',
  address text DEFAULT '',
  gst boolean DEFAULT false,
  subtotal numeric(12,2) DEFAULT 0,
  tax numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  paid numeric(12,2) DEFAULT 0,
  payment_mode text DEFAULT 'Cash',
  status text DEFAULT 'active',
  action_reason text,
  action_by text,
  action_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 4. bill_items
CREATE TABLE IF NOT EXISTS public.bill_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bill_id text NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  qty_bottles numeric(10,2) DEFAULT 0,
  rate_per_case numeric(10,2) DEFAULT 0,
  case_size numeric(10,2) DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- 5. payments
CREATE TABLE IF NOT EXISTS public.payments (
  id text PRIMARY KEY,
  payment_date date DEFAULT CURRENT_DATE,
  customer_id text REFERENCES public.customers(id),
  bill_id text,
  amount numeric(12,2) NOT NULL,
  mode text DEFAULT 'Cash',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- 6. stock_movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id text PRIMARY KEY,
  move_date date DEFAULT CURRENT_DATE,
  move_type text DEFAULT 'In',
  item_name text NOT NULL,
  qty numeric(12,2) NOT NULL,
  note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- 7. expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id text PRIMARY KEY,
  expense_date date DEFAULT CURRENT_DATE,
  category text DEFAULT 'Other',
  amount numeric(12,2) NOT NULL,
  note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- 8. employees
CREATE TABLE IF NOT EXISTS public.employees (
  id text PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL,
  phone text NOT NULL,
  salary numeric(12,2) DEFAULT 0,
  address text DEFAULT '',
  photo_path text,
  portal_token text,
  application_id text,
  joined_date date,
  joined_at timestamptz,
  aadhaar text,
  pan text,
  license_no text,
  aadhaar_doc_path text,
  aadhaar_doc_type text,
  pan_doc_path text,
  pan_doc_type text,
  license_doc_path text,
  license_doc_type text,
  created_at timestamptz DEFAULT now()
);

-- 9. employee_invites
CREATE TABLE IF NOT EXISTS public.employee_invites (
  token text PRIMARY KEY,
  created_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'open',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 10. employee_applications
CREATE TABLE IF NOT EXISTS public.employee_applications (
  id text PRIMARY KEY,
  invite_token text,
  applied_date date DEFAULT CURRENT_DATE,
  name text NOT NULL,
  mobile text NOT NULL,
  role text,
  salary numeric(12,2),
  address text,
  photo_path text,
  doc_path text,
  doc_type text,
  aadhaar text,
  pan text,
  pan_doc_path text,
  pan_doc_type text,
  license_no text,
  license_doc_path text,
  license_doc_type text,
  status text DEFAULT 'Pending',
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 11. employee_hr_docs
CREATE TABLE IF NOT EXISTS public.employee_hr_docs (
  id text PRIMARY KEY,
  employee_id text REFERENCES public.employees(id),
  doc_kind text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- 12. attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id text PRIMARY KEY,
  att_date date DEFAULT CURRENT_DATE,
  employee_id text REFERENCES public.employees(id),
  status text DEFAULT 'Present',
  time_in text,
  time_out text,
  created_at timestamptz DEFAULT now()
);

-- 13. advances
CREATE TABLE IF NOT EXISTS public.advances (
  id text PRIMARY KEY,
  adv_date date DEFAULT CURRENT_DATE,
  employee_id text REFERENCES public.employees(id),
  amount numeric(12,2) NOT NULL,
  note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- 14. vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
  id text PRIMARY KEY,
  vehicle_number text NOT NULL,
  vehicle_type text,
  model text,
  default_driver_id text REFERENCES public.employees(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 15. vehicle_trips
CREATE TABLE IF NOT EXISTS public.vehicle_trips (
  id text PRIMARY KEY,
  vehicle_id text REFERENCES public.vehicles(id),
  employee_id text REFERENCES public.employees(id),
  start_reading numeric(12,2) DEFAULT 0,
  fuel_type text,
  fuel_percent numeric(5,2) DEFAULT 0,
  battery_percent numeric(5,2),
  start_condition text,
  safety_check text,
  start_notes text,
  start_media jsonb DEFAULT '[]'::jsonb,
  start_at timestamptz DEFAULT now(),
  end_reading numeric(12,2),
  end_fuel numeric(5,2),
  end_battery numeric(5,2),
  supervisor text,
  handover_condition text,
  damage text,
  end_media jsonb DEFAULT '[]'::jsonb,
  handover_at timestamptz,
  status text DEFAULT 'Active',
  created_at timestamptz DEFAULT now()
);

-- ====================================================================
-- SECTION 2: Storage Buckets
-- ====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('employee-docs', 'employee-docs', false),
  ('vehicle-evidence', 'vehicle-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- SECTION 3: Initial Blanket RLS Policies (Dropped in roles_rls.sql)
-- ====================================================================
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_hr_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_authenticated_all" ON public.business_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_authenticated_all" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_authenticated_all" ON public.bills FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_authenticated_all" ON public.bill_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_authenticated_all" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_authenticated_all" ON public.stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_authenticated_all" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_authenticated_all" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_authenticated_all" ON public.employee_invites FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_authenticated_all" ON public.employee_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_authenticated_all" ON public.employee_hr_docs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_authenticated_all" ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_authenticated_all" ON public.advances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_authenticated_all" ON public.vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_authenticated_all" ON public.vehicle_trips FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "owner_employee_docs_all" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'employee-docs') WITH CHECK (bucket_id = 'employee-docs');
CREATE POLICY "owner_vehicle_evidence_all" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'vehicle-evidence') WITH CHECK (bucket_id = 'vehicle-evidence');

COMMIT;
