-- ====================================================================
-- Larven Enterprises BMS: Demo & Sample Dataset
-- File: supabase/seed_demo_data.sql
--
-- Seeds 2 users for each role type (Admin, Owner, Manager, Employee),
-- with vehicles, master price list, customer coordinates, open trips,
-- finished stock, attendance sites, and payslips.
--
-- ALL DEMO USERS SHARE THE SAME PASSWORD:
-- Password: Larven@2026
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- --------------------------------------------------------------------
-- 1. AUTH USERS (auth.users) & CREDENTIALS
-- Passwords hashed via bcrypt: crypt('Larven@2026', gen_salt('bf'))
-- --------------------------------------------------------------------
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  -- 1. Admins (Rank 4)
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin1@larven.in', crypt('Larven@2026', gen_salt('bf')), now(), '+919848000001', now(), '{"provider":"phone","providers":["phone"]}', '{"full_name":"Chandra Sekhar (Admin 1)"}', now(), now()),
  ('a2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin2@larven.in', crypt('Larven@2026', gen_salt('bf')), now(), '+919848000002', now(), '{"provider":"phone","providers":["phone"]}', '{"full_name":"Priya Sharma (Admin 2)"}', now(), now()),

  -- 2. Owners (Rank 3)
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner1@larven.in', crypt('Larven@2026', gen_salt('bf')), now(), '+919848000011', now(), '{"provider":"phone","providers":["phone"]}', '{"full_name":"Muni Prasad (Owner 1)"}', now(), now()),
  ('b2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner2@larven.in', crypt('Larven@2026', gen_salt('bf')), now(), '+919848000012', now(), '{"provider":"phone","providers":["phone"]}', '{"full_name":"Lakshmi Devi (Owner 2)"}', now(), now()),

  -- 3. Managers (Rank 2)
  ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager1@larven.in', crypt('Larven@2026', gen_salt('bf')), now(), '+919848000021', now(), '{"provider":"phone","providers":["phone"]}', '{"full_name":"Suresh Kumar (Operations Manager)"}', now(), now()),
  ('c2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager2@larven.in', crypt('Larven@2026', gen_salt('bf')), now(), '+919848000022', now(), '{"provider":"phone","providers":["phone"]}', '{"full_name":"Venkatesh Rao (Plant Manager)"}', now(), now()),

  -- 4. Employees (Rank 1: Drivers, Operators, Godown)
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'driver1@larven.in', crypt('Larven@2026', gen_salt('bf')), now(), '+919848000031', now(), '{"provider":"phone","providers":["phone"]}', '{"full_name":"Ravi Varma (Driver 1)"}', now(), now()),
  ('d2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'driver2@larven.in', crypt('Larven@2026', gen_salt('bf')), now(), '+919848000032', now(), '{"provider":"phone","providers":["phone"]}', '{"full_name":"Kalyan Babu (Driver 2)"}', now(), now()),
  ('d3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'operator1@larven.in', crypt('Larven@2026', gen_salt('bf')), now(), '+919848000033', now(), '{"provider":"phone","providers":["phone"]}', '{"full_name":"Mahesh Goud (Plant Operator)"}', now(), now()),
  ('d4000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'godown1@larven.in', crypt('Larven@2026', gen_salt('bf')), now(), '+919848000034', now(), '{"provider":"phone","providers":["phone"]}', '{"full_name":"Naresh Reddy (Godown Staff)"}', now(), now())
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  phone = EXCLUDED.phone,
  phone_confirmed_at = now(),
  updated_at = now();


-- --------------------------------------------------------------------
-- 2. STAFF EMPLOYEES (public.employees)
-- --------------------------------------------------------------------
INSERT INTO public.employees (id, name, role, phone, salary, address, duties, active)
VALUES
  -- Managers
  ('MGR-001', 'Suresh Kumar', 'manager', '9848000021', 28000.00, 'Plant Operations Office, Madanapalle', ARRAY['godown', 'production'], true),
  ('MGR-002', 'Venkatesh Rao', 'manager', '9848000022', 26000.00, 'Quality & Plant Room, Madanapalle', ARRAY['production'], true),

  -- Field Employees with duty tags
  ('EMP-001', 'Ravi Varma', 'employee', '9848000031', 16000.00, 'Near RTC Bus Stand, Madanapalle', ARRAY['delivery'], true),
  ('EMP-002', 'Kalyan Babu', 'employee', '9848000032', 15000.00, 'Greamspet, Madanapalle', ARRAY['delivery'], true),
  ('EMP-003', 'Mahesh Goud', 'employee', '9848000033', 14000.00, 'Neerugattuvaripalli, Madanapalle', ARRAY['production'], true),
  ('EMP-004', 'Naresh Reddy', 'employee', '9848000034', 13500.00, 'Bypass Road, Madanapalle', ARRAY['godown'], true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  salary = EXCLUDED.salary,
  duties = EXCLUDED.duties,
  active = EXCLUDED.active;


-- --------------------------------------------------------------------
-- 3. USER PROFILES (public.profiles)
-- --------------------------------------------------------------------
INSERT INTO public.profiles (id, full_name, role, phone, employee_id, active)
VALUES
  -- Admins
  ('a1000000-0000-0000-0000-000000000001', 'Chandra Sekhar', 'admin', '9848000001', NULL, true),
  ('a2000000-0000-0000-0000-000000000002', 'Priya Sharma', 'admin', '9848000002', NULL, true),

  -- Owners
  ('b1000000-0000-0000-0000-000000000001', 'Muni Prasad', 'owner', '9848000011', NULL, true),
  ('b2000000-0000-0000-0000-000000000002', 'Lakshmi Devi', 'owner', '9848000012', NULL, true),

  -- Managers
  ('c1000000-0000-0000-0000-000000000001', 'Suresh Kumar', 'manager', '9848000021', 'MGR-001', true),
  ('c2000000-0000-0000-0000-000000000002', 'Venkatesh Rao', 'manager', '9848000022', 'MGR-002', true),

  -- Employees
  ('d1000000-0000-0000-0000-000000000001', 'Ravi Varma (Driver)', 'employee', '9848000031', 'EMP-001', true),
  ('d2000000-0000-0000-0000-000000000002', 'Kalyan Babu (Driver)', 'employee', '9848000032', 'EMP-002', true),
  ('d3000000-0000-0000-0000-000000000003', 'Mahesh Goud (Operator)', 'employee', '9848000033', 'EMP-003', true),
  ('d4000000-0000-0000-0000-000000000004', 'Naresh Reddy (Godown)', 'employee', '9848000034', 'EMP-004', true)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  employee_id = EXCLUDED.employee_id,
  active = EXCLUDED.active;


-- --------------------------------------------------------------------
-- 4. LOCATIONS & VEHICLES
-- --------------------------------------------------------------------
INSERT INTO public.locations (id, name, type)
VALUES
  ('LOC-P', 'Main Water Plant', 'plant'),
  ('LOC-G1', 'Godown 1 (SS Point 1 - Bypass)', 'godown'),
  ('LOC-G2', 'Godown 2 (SS Point 2 - Market)', 'godown')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type;

INSERT INTO public.vehicles (id, registration_no, model, is_active)
VALUES
  ('VEH-01', 'AP 39 AB 1234', 'Tata Ace (100 Cases)', true),
  ('VEH-02', 'AP 39 CD 5678', 'Bolero Maxi (150 Cases)', true),
  ('VEH-03', 'AP 39 EF 9012', 'Eicher 14ft (300 Cases)', true)
ON CONFLICT (id) DO UPDATE SET registration_no = EXCLUDED.registration_no, model = EXCLUDED.model, is_active = EXCLUDED.is_active;


-- --------------------------------------------------------------------
-- 5. MASTER FINISHED GOODS PRICE LIST (public.price_list)
-- Standard unit / crate rates
-- --------------------------------------------------------------------
INSERT INTO public.price_list (product, rate, effective_from)
VALUES
  ('20 L Can', 40.00, '2026-01-01'),
  ('10 L Can', 60.00, '2026-01-01'),
  ('5 L Pet', 45.00, '2026-01-01'),
  ('1 L Bottle', 108.00, '2026-01-01'),
  ('500 ml Bottle', 120.00, '2026-01-01'),
  ('250 ml Cup', 110.00, '2026-01-01')
ON CONFLICT DO NOTHING;


-- --------------------------------------------------------------------
-- 6. CUSTOMER DIRECTORY & GEOLOCATIONS (public.customers)
-- Coordinates around Madanapalle for realistic turn-by-turn navigation
-- --------------------------------------------------------------------
INSERT INTO public.customers (id, name, phone, address, lat, lng, accuracy_m, credit_limit)
VALUES
  ('CUST-001', 'Sri Lakshmi Hotel & Tiffins', '9848011111', 'Main Road, Near Old Bus Stand, Madanapalle', 13.558312, 78.502145, 8.4, 8000.00),
  ('CUST-002', 'Ramesh Enterprises Mart', '9848022222', 'Market Yard Complex, Shop #14, Madanapalle', 13.561200, 78.504300, 11.2, 5000.00),
  ('CUST-003', 'City Hospital Canteen', '9848033333', 'Hospital Road, 2nd Cross, Madanapalle', 13.565100, 78.508200, 9.1, 12000.00),
  ('CUST-004', 'Balaji Sweets & Bakery', '9848044444', 'Temple Street, Opposite Clock Tower', 13.559800, 78.503400, 14.0, 4000.00),
  ('CUST-005', 'Green Valley Public School', '9848055555', 'Colony Road, Extension Area, Madanapalle', 13.572100, 78.519000, 12.5, 15000.00),
  ('CUST-006', 'Anand Sweets & Snacks', '9848066666', 'Station Road, Madanapalle', 13.553400, 78.498800, 10.0, 6000.00),
  ('CUST-007', 'Venkat Traders (Wholesale)', '9848077777', 'Park Layout, SS Point 1 Road, Madanapalle', 13.549200, 78.491500, 15.0, 25000.00),
  -- Unmapped customer (lat/lng NULL) so driver can test 'Capture GPS Location' feature
  ('CUST-008', 'Sai Residency Lodge', '9848088888', 'Bazaar Street, Madanapalle', NULL, NULL, NULL, 5000.00)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  accuracy_m = EXCLUDED.accuracy_m,
  credit_limit = EXCLUDED.credit_limit;


-- --------------------------------------------------------------------
-- 7. FINISHED GOODS OPENING INVENTORY (public.fg_movements)
-- --------------------------------------------------------------------
INSERT INTO public.fg_movements (date, kind, size, qty, from_loc, to_loc, note, created_by)
VALUES
  ((now() at time zone 'Asia/Kolkata')::date, 'Production', '20 L Can', 450, NULL, 'LOC-P', 'Morning plant production shift', 'c2000000-0000-0000-0000-000000000002'),
  ((now() at time zone 'Asia/Kolkata')::date, 'Production', '1 L Bottle', 200, NULL, 'LOC-P', 'Morning plant bottling run', 'c2000000-0000-0000-0000-000000000002'),
  ((now() at time zone 'Asia/Kolkata')::date, 'Production', '500 ml Bottle', 150, NULL, 'LOC-P', 'Morning plant bottling run', 'c2000000-0000-0000-0000-000000000002'),
  ((now() at time zone 'Asia/Kolkata')::date, 'Transfer', '20 L Can', 120, 'LOC-P', 'LOC-G1', 'Transfer to Godown 1 stock', 'c1000000-0000-0000-0000-000000000001'),
  ((now() at time zone 'Asia/Kolkata')::date, 'Transfer', '1 L Bottle', 50, 'LOC-P', 'LOC-G2', 'Transfer to Godown 2 stock', 'c1000000-0000-0000-0000-000000000001');


-- --------------------------------------------------------------------
-- 8. PENDING ORDERS (public.orders & public.order_items)
-- --------------------------------------------------------------------
INSERT INTO public.orders (id, order_no, customer_id, order_date, requested_date, status, source, notes, total_amount, created_by)
VALUES
  ('ORD-001', 'ORD-26-101', 'CUST-001', (now() at time zone 'Asia/Kolkata')::date, (now() at time zone 'Asia/Kolkata')::date, 'planned', 'phone', 'Daily morning kitchen refill', 600.00, 'b1000000-0000-0000-0000-000000000001'),
  ('ORD-002', 'ORD-26-102', 'CUST-002', (now() at time zone 'Asia/Kolkata')::date, (now() at time zone 'Asia/Kolkata')::date, 'planned', 'sales_visit', 'General store weekly delivery', 1040.00, 'c1000000-0000-0000-0000-000000000001'),
  ('ORD-003', 'ORD-26-103', 'CUST-008', (now() at time zone 'Asia/Kolkata')::date, (now() at time zone 'Asia/Kolkata')::date, 'planned', 'phone', 'Lodge dining & rooms stock', 400.00, 'b1000000-0000-0000-0000-000000000001'),
  ('ORD-004', 'ORD-26-104', 'CUST-005', (now() at time zone 'Asia/Kolkata')::date, (now() at time zone 'Asia/Kolkata')::date + 1, 'new', 'phone', 'School event drinking water order', 2000.00, 'b1000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.order_items (id, order_id, product_name, cases, bottles, unit_rate, total_amount)
VALUES
  ('ITEM-001', 'ORD-001', '20 L Can', 15, 15, 40.00, 600.00),
  ('ITEM-002', 'ORD-002', '1 L Bottle', 5, 60, 108.00, 540.00),
  ('ITEM-003', 'ORD-002', '500 ml Bottle', 4, 96, 125.00, 500.00),
  ('ITEM-004', 'ORD-003', '20 L Can', 10, 10, 40.00, 400.00),
  ('ITEM-005', 'ORD-004', '20 L Can', 50, 50, 40.00, 2000.00)
ON CONFLICT (id) DO NOTHING;


-- --------------------------------------------------------------------
-- 9. ACTIVE DELIVERY TRIPS (public.trips, public.trip_stops, items)
-- Assigned to Driver 1: Ravi Varma (EMP-001)
-- When logging in as 9848000031, "My Route" immediately loads this trip!
-- --------------------------------------------------------------------
INSERT INTO public.trips (
  id,
  trip_no,
  vehicle_id,
  driver_id,
  trip_date,
  status,
  start_odometer,
  loaded_at,
  load_items
)
VALUES (
  'TR-DEMO-101',
  'TR-26-001',
  'VEH-01',
  'EMP-001',
  (now() at time zone 'Asia/Kolkata')::date,
  'on_route',
  45210,
  now() - interval '2 hours',
  '[{"product_name":"20 L Can","cases":35,"bottles":35},{"product_name":"1 L Bottle","cases":10,"bottles":120},{"product_name":"500 ml Bottle","cases":10,"bottles":240}]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  driver_id = EXCLUDED.driver_id,
  status = EXCLUDED.status,
  trip_date = EXCLUDED.trip_date;

-- Stops on Trip 101:
INSERT INTO public.trip_stops (
  id,
  trip_id,
  stop_no,
  customer_id,
  order_id,
  planned_cases,
  planned_bottles,
  status,
  items
)
VALUES
  -- Stop 1: Sri Lakshmi Hotel (Coordinates available, turn-by-turn ready)
  ('TS-101-1', 'TR-DEMO-101', 1, 'CUST-001', 'ORD-001', 15, 15, 'pending',
   '[{"product_name":"20 L Can","cases":15,"bottles":15,"rate":40.00}]'::jsonb),

  -- Stop 2: Ramesh Enterprises Mart (Coordinates available)
  ('TS-101-2', 'TR-DEMO-101', 2, 'CUST-002', 'ORD-002', 9, 156, 'pending',
   '[{"product_name":"1 L Bottle","cases":5,"bottles":60,"rate":108.00},{"product_name":"500 ml Bottle","cases":4,"bottles":96,"rate":125.00}]'::jsonb),

  -- Stop 3: Sai Residency (Unmapped coordinates -> tests "Capture GPS" flow)
  ('TS-101-3', 'TR-DEMO-101', 3, 'CUST-008', 'ORD-003', 10, 10, 'pending',
   '[{"product_name":"20 L Can","cases":10,"bottles":10,"rate":40.00}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  customer_id = EXCLUDED.customer_id;

-- Insert corresponding stop item records in trip_stop_items:
INSERT INTO public.trip_stop_items (id, trip_stop_id, product_name, planned_cases, planned_bottles, rate_per_case)
VALUES
  ('TSI-101-1-1', 'TS-101-1', '20 L Can', 15, 15, 40.00),
  ('TSI-101-2-1', 'TS-101-2', '1 L Bottle', 5, 60, 108.00),
  ('TSI-101-2-2', 'TS-101-2', '500 ml Bottle', 4, 96, 125.00),
  ('TSI-101-3-1', 'TS-101-3', '20 L Can', 10, 10, 40.00)
ON CONFLICT (id) DO NOTHING;


-- --------------------------------------------------------------------
-- 10. ATTENDANCE SITES & TODAY'S ATTENDANCE
-- --------------------------------------------------------------------
INSERT INTO public.attendance_sites (id, name, code, lat, lng, radius_m)
VALUES
  ('SITE-PLANT', 'Main RO Plant & Bottling Unit', 'PLANT01', 13.552400, 78.496200, 100),
  ('SITE-GODOWN1', 'Godown 1 (SS Point 1 - Bypass)', 'SSPT01', 13.548900, 78.490500, 80),
  ('SITE-GODOWN2', 'Godown 2 (SS Point 2 - Market)', 'SSPT02', 13.560500, 78.503800, 80)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  radius_m = EXCLUDED.radius_m;

INSERT INTO public.attendance (id, employee_id, date, status, check_in, site_id, site_name, distance_m, late, source)
VALUES
  ('ATT-TODAY-01', 'EMP-001', (now() at time zone 'Asia/Kolkata')::date, 'Present', '07:45:00', 'SITE-PLANT', 'Main RO Plant & Bottling Unit', 14.5, false, 'qr_geofence'),
  ('ATT-TODAY-02', 'EMP-002', (now() at time zone 'Asia/Kolkata')::date, 'Present', '07:55:00', 'SITE-PLANT', 'Main RO Plant & Bottling Unit', 22.0, false, 'qr_geofence'),
  ('ATT-TODAY-03', 'EMP-003', (now() at time zone 'Asia/Kolkata')::date, 'Present', '08:00:00', 'SITE-PLANT', 'Main RO Plant & Bottling Unit', 8.2, false, 'qr_geofence'),
  ('ATT-TODAY-04', 'EMP-004', (now() at time zone 'Asia/Kolkata')::date, 'Present', '08:15:00', 'SITE-GODOWN1', 'Godown 1 (SS Point 1 - Bypass)', 18.0, false, 'qr_geofence')
ON CONFLICT (id) DO NOTHING;


-- --------------------------------------------------------------------
-- 11. STAFF PAYSLIPS (For Employee Portal Verification)
-- --------------------------------------------------------------------
INSERT INTO public.payslips (id, employee_id, month_year, gross_pay, deductions, net_pay, details)
VALUES
  ('SLIP-2610-001', 'EMP-001', '2026-10', 16000.00, 500.00, 15500.00, '{"basic":12000,"allowances":4000,"esi":200,"advance_deduction":300}'::jsonb),
  ('SLIP-2610-002', 'EMP-002', '2026-10', 15000.00, 300.00, 14700.00, '{"basic":11000,"allowances":4000,"esi":300}'::jsonb),
  ('SLIP-2610-003', 'EMP-003', '2026-10', 14000.00, 250.00, 13750.00, '{"basic":10000,"allowances":4000,"esi":250}'::jsonb),
  ('SLIP-2610-004', 'EMP-004', '2026-10', 13500.00, 250.00, 13250.00, '{"basic":10000,"allowances":3500,"esi":250}'::jsonb)
ON CONFLICT (id) DO NOTHING;

COMMIT;
