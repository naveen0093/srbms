-- ====================================================================
-- Larven Enterprises BMS: Demo & Sample Dataset
-- File: supabase/seed_demo_data.sql
--
-- Exact column matching against 20261127000001_core_schema.sql through
-- 20261127000008_attendance_and_hr.sql.
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
-- First delete any previous test users with these phones/emails to ensure clean IDs
DELETE FROM auth.users WHERE phone IN (
  '+919848000001', '+919848000002',
  '+919848000011', '+919848000012',
  '+919848000021', '+919848000022',
  '+919848000031', '+919848000032',
  '+919848000033', '+919848000034'
) OR email LIKE '%@larven.in';

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
-- Columns: id, name, role, phone, salary, address, duties, active
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
-- Columns: id, full_name, role, phone, employee_id, active
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
-- 4. VEHICLES (public.vehicles)
-- Columns: id, vehicle_number, vehicle_type, default_driver_id, active, notes
-- vehicle_type check in ('Auto', 'Pickup', 'Van', 'Truck')
-- --------------------------------------------------------------------
INSERT INTO public.vehicles (id, vehicle_number, vehicle_type, default_driver_id, active, notes)
VALUES
  ('VEH-01', 'AP 39 AB 1234', 'Pickup', 'EMP-001', true, 'Tata Ace (100 Cases)'),
  ('VEH-02', 'AP 39 CD 5678', 'Pickup', 'EMP-002', true, 'Bolero Maxi (150 Cases)'),
  ('VEH-03', 'AP 39 EF 9012', 'Truck', NULL, true, 'Eicher 14ft (300 Cases)')
ON CONFLICT (id) DO UPDATE SET
  vehicle_number = EXCLUDED.vehicle_number,
  vehicle_type = EXCLUDED.vehicle_type,
  default_driver_id = EXCLUDED.default_driver_id,
  active = EXCLUDED.active,
  notes = EXCLUDED.notes;


-- --------------------------------------------------------------------
-- 5. MASTER FINISHED GOODS PRICE LIST (public.price_list)
-- Columns: product, rate, effective_from
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
-- Columns: id, name, phone, area, lat, lng, accuracy_m, credit_limit
-- Coordinates around Madanapalle for realistic turn-by-turn navigation
-- --------------------------------------------------------------------
INSERT INTO public.customers (id, name, phone, area, lat, lng, accuracy_m, credit_limit)
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
  area = EXCLUDED.area,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  accuracy_m = EXCLUDED.accuracy_m,
  credit_limit = EXCLUDED.credit_limit;


-- --------------------------------------------------------------------
-- 7. FINISHED GOODS OPENING INVENTORY (public.fg_movements)
-- Columns: id, move_date, product_name, from_location_id, to_location_id, cases, bottles, movement_type, notes, recorded_by
-- --------------------------------------------------------------------
INSERT INTO public.fg_movements (
  id, move_date, product_name, from_location_id, to_location_id, cases, bottles, movement_type, notes, recorded_by
)
VALUES
  ('FGM-001', (now() at time zone 'Asia/Kolkata')::date, '20 L Can', NULL, 'PLANT', 450, 450, 'production', 'Morning plant production shift', 'c2000000-0000-0000-0000-000000000002'),
  ('FGM-002', (now() at time zone 'Asia/Kolkata')::date, '1 L Bottle', NULL, 'PLANT', 200, 2400, 'production', 'Morning plant bottling run', 'c2000000-0000-0000-0000-000000000002'),
  ('FGM-003', (now() at time zone 'Asia/Kolkata')::date, '500 ml Bottle', NULL, 'PLANT', 150, 3600, 'production', 'Morning plant bottling run', 'c2000000-0000-0000-0000-000000000002'),
  ('FGM-004', (now() at time zone 'Asia/Kolkata')::date, '20 L Can', 'PLANT', 'G1', 120, 120, 'transfer', 'Transfer to Godown 1 stock', 'c1000000-0000-0000-0000-000000000001'),
  ('FGM-005', (now() at time zone 'Asia/Kolkata')::date, '1 L Bottle', 'PLANT', 'G2', 50, 600, 'transfer', 'Transfer to Godown 2 stock', 'c1000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;


-- --------------------------------------------------------------------
-- 8. PENDING ORDERS (public.orders & public.order_items)
-- Columns: id, customer_id, order_date, requested_date, source, status, notes, created_by
-- --------------------------------------------------------------------
INSERT INTO public.orders (id, customer_id, order_date, requested_date, source, status, notes, created_by)
VALUES
  ('ORD-001', 'CUST-001', (now() at time zone 'Asia/Kolkata')::date, (now() at time zone 'Asia/Kolkata')::date, 'phone', 'planned', 'Daily morning kitchen refill', 'b1000000-0000-0000-0000-000000000001'),
  ('ORD-002', 'CUST-002', (now() at time zone 'Asia/Kolkata')::date, (now() at time zone 'Asia/Kolkata')::date, 'salesman', 'planned', 'General store weekly delivery', 'c1000000-0000-0000-0000-000000000001'),
  ('ORD-003', 'CUST-008', (now() at time zone 'Asia/Kolkata')::date, (now() at time zone 'Asia/Kolkata')::date, 'phone', 'planned', 'Lodge dining & rooms stock', 'b1000000-0000-0000-0000-000000000001'),
  ('ORD-004', 'CUST-005', (now() at time zone 'Asia/Kolkata')::date, (now() at time zone 'Asia/Kolkata')::date + 1, 'phone', 'new', 'School event drinking water order', 'b1000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.order_items WHERE order_id IN ('ORD-001', 'ORD-002', 'ORD-003', 'ORD-004');

INSERT INTO public.order_items (order_id, product_name, cases, qty_bottles, rate_per_case, case_size)
VALUES
  ('ORD-001', '20 L Can', 15, 15, 40.00, 1),
  ('ORD-002', '1 L Bottle', 5, 60, 108.00, 12),
  ('ORD-002', '500 ml Bottle', 4, 96, 125.00, 24),
  ('ORD-003', '20 L Can', 10, 10, 40.00, 1),
  ('ORD-004', '20 L Can', 50, 50, 40.00, 1);


-- --------------------------------------------------------------------
-- 9. ACTIVE DELIVERY TRIPS (public.trips, public.trip_stops, items)
-- Assigned to Driver 1: Ravi Varma (EMP-001)
-- When logging in as 9848000031, "My Route" immediately loads this trip!
-- --------------------------------------------------------------------
INSERT INTO public.trips (
  id,
  vehicle_id,
  driver_id,
  trip_date,
  status,
  start_odometer,
  loaded_at,
  supervisor_id,
  notes,
  created_by
)
VALUES (
  'TR-DEMO-101',
  'VEH-01',
  'EMP-001',
  (now() at time zone 'Asia/Kolkata')::date,
  'on_route',
  45210,
  now() - interval '2 hours',
  'MGR-001',
  'Morning town delivery circle',
  'c1000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO UPDATE SET
  driver_id = EXCLUDED.driver_id,
  status = EXCLUDED.status,
  trip_date = EXCLUDED.trip_date;

-- Stops on Trip 101:
INSERT INTO public.trip_stops (trip_id, stop_sequence, customer_id, order_id, result)
VALUES
  ('TR-DEMO-101', 1, 'CUST-001', 'ORD-001', 'pending'),
  ('TR-DEMO-101', 2, 'CUST-002', 'ORD-002', 'pending'),
  ('TR-DEMO-101', 3, 'CUST-008', 'ORD-003', 'pending')
ON CONFLICT (trip_id, stop_sequence) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  order_id = EXCLUDED.order_id,
  result = EXCLUDED.result;

-- Stop items linked to trip_stops:
DELETE FROM public.trip_stop_items WHERE trip_stop_id IN (
  SELECT id FROM public.trip_stops WHERE trip_id = 'TR-DEMO-101'
);

INSERT INTO public.trip_stop_items (trip_stop_id, product_name, planned_cases, planned_bottles, rate_per_case)
SELECT s.id, '20 L Can', 15, 15, 40.00
FROM public.trip_stops s WHERE s.trip_id = 'TR-DEMO-101' AND s.stop_sequence = 1;

INSERT INTO public.trip_stop_items (trip_stop_id, product_name, planned_cases, planned_bottles, rate_per_case)
SELECT s.id, '1 L Bottle', 5, 60, 108.00
FROM public.trip_stops s WHERE s.trip_id = 'TR-DEMO-101' AND s.stop_sequence = 2;

INSERT INTO public.trip_stop_items (trip_stop_id, product_name, planned_cases, planned_bottles, rate_per_case)
SELECT s.id, '500 ml Bottle', 4, 96, 125.00
FROM public.trip_stops s WHERE s.trip_id = 'TR-DEMO-101' AND s.stop_sequence = 2;

INSERT INTO public.trip_stop_items (trip_stop_id, product_name, planned_cases, planned_bottles, rate_per_case)
SELECT s.id, '20 L Can', 10, 10, 40.00
FROM public.trip_stops s WHERE s.trip_id = 'TR-DEMO-101' AND s.stop_sequence = 3;


-- --------------------------------------------------------------------
-- 10. ATTENDANCE SITES & TODAY'S ATTENDANCE
-- Columns: id, att_date, employee_id, status, time_in, site_id, site_name, distance_m, late, source
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

INSERT INTO public.attendance (id, att_date, employee_id, status, time_in, site_id, site_name, distance_m, late, source)
VALUES
  ('ATT-TODAY-01', (now() at time zone 'Asia/Kolkata')::date, 'EMP-001', 'Present', '07:45', 'SITE-PLANT', 'Main RO Plant & Bottling Unit', 14, false, 'banner'),
  ('ATT-TODAY-02', (now() at time zone 'Asia/Kolkata')::date, 'EMP-002', 'Present', '07:55', 'SITE-PLANT', 'Main RO Plant & Bottling Unit', 22, false, 'banner'),
  ('ATT-TODAY-03', (now() at time zone 'Asia/Kolkata')::date, 'EMP-003', 'Present', '08:00', 'SITE-PLANT', 'Main RO Plant & Bottling Unit', 8, false, 'banner'),
  ('ATT-TODAY-04', (now() at time zone 'Asia/Kolkata')::date, 'EMP-004', 'Present', '08:15', 'SITE-GODOWN1', 'Godown 1 (SS Point 1 - Bypass)', 18, false, 'banner')
ON CONFLICT (id) DO UPDATE SET
  att_date = EXCLUDED.att_date,
  employee_id = EXCLUDED.employee_id,
  status = EXCLUDED.status,
  time_in = EXCLUDED.time_in;


-- --------------------------------------------------------------------
-- 11. STAFF PAYSLIPS (For Employee Portal Verification)
-- Columns: id, employee_id, month_year, gross_pay, deductions, net_pay, details
-- --------------------------------------------------------------------
INSERT INTO public.payslips (id, employee_id, month_year, gross_pay, deductions, net_pay, details)
VALUES
  ('SLIP-2610-001', 'EMP-001', '2026-10', 16000.00, 500.00, 15500.00, '{"basic":12000,"allowances":4000,"esi":200,"advance_deduction":300}'::jsonb),
  ('SLIP-2610-002', 'EMP-002', '2026-10', 15000.00, 300.00, 14700.00, '{"basic":11000,"allowances":4000,"esi":300}'::jsonb),
  ('SLIP-2610-003', 'EMP-003', '2026-10', 14000.00, 250.00, 13750.00, '{"basic":10000,"allowances":4000,"esi":250}'::jsonb),
  ('SLIP-2610-004', 'EMP-004', '2026-10', 13500.00, 250.00, 13250.00, '{"basic":10000,"allowances":3500,"esi":250}'::jsonb)
ON CONFLICT (employee_id, month_year) DO UPDATE SET
  gross_pay = EXCLUDED.gross_pay,
  deductions = EXCLUDED.deductions,
  net_pay = EXCLUDED.net_pay,
  details = EXCLUDED.details;

COMMIT;
