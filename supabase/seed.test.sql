-- ====================================================================
-- TEST PROJECT SEED DATA: NEVER APPLY TO PRODUCTION DATABASES
-- Migration Target: Supabase Test Environment
-- Coverage: 4 Roles (admin, owner, manager, employee) & profiles.id
-- ====================================================================

-- 1. Mock Auth Users in auth.users (satisfies profiles.id foreign key constraint)
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
  created_at,
  updated_at
)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.com', '', now(), '9848000001', now(), now(), now()),
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@example.com', '', now(), '9848000002', now(), now(), now()),
  ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager@example.com', '', now(), '9848000003', now(), now(), now()),
  ('d0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'driver@example.com', '', now(), '9848000004', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2. Mock Employee Staff Records in public.employees (satisfies employee_id foreign key constraint)
INSERT INTO public.employees (id, name, role, phone, salary, address, duties, active)
VALUES
  ('M1', 'Suresh Kumar (Manager)', 'manager', '9848000003', 25000.00, 'Plant Office, Madanapalle', ARRAY['godown', 'production'], true),
  ('M2', 'Ravi Driver (Delivery Staff)', 'employee', '9848000004', 15000.00, 'Main Road, Madanapalle', ARRAY['delivery'], true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  salary = EXCLUDED.salary,
  duties = EXCLUDED.duties,
  active = EXCLUDED.active;

-- 3. Mock Profiles for the 4 Roles using public.profiles.id column
INSERT INTO public.profiles (id, full_name, role, phone, employee_id, active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'System Administrator (Admin)', 'admin', '9848000001', NULL, true),
  ('b0000000-0000-0000-0000-000000000002', 'Muni Prasad (Owner)', 'owner', '9848000002', NULL, true),
  ('c0000000-0000-0000-0000-000000000003', 'Suresh Kumar (Manager)', 'manager', '9848000003', 'M1', true),
  ('d0000000-0000-0000-0000-000000000004', 'Ravi Driver (Employee)', 'employee', '9848000004', 'M2', true)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  employee_id = EXCLUDED.employee_id,
  active = EXCLUDED.active;
