-- ====================================================================
-- FIRST-OWNER / ADMIN BOOTSTRAP INSTRUCTIONS & SCRIPT
-- ====================================================================
-- In a new empty Supabase project:
-- 1. Create the user in Supabase Dashboard > Authentication > Users > Add User
--    (Or via Supabase Admin API / _worker.js service role with phone/password)
-- 2. Obtain the newly created user's UUID
-- 3. Run the appropriate INSERT statement below:

-- --------------------------------------------------------------------
-- (A) Bootstrap First Owner Profile:
-- --------------------------------------------------------------------
-- Replace 'PASTE-OWNER-UUID-HERE' and '9848012345' with the actual owner credentials:
INSERT INTO public.profiles (id, full_name, role, phone, active)
VALUES (
  'PASTE-OWNER-UUID-HERE',
  'Muni Prasad',
  'owner',
  '9848012345',
  true
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = 'owner',
  phone = EXCLUDED.phone,
  active = true;

-- --------------------------------------------------------------------
-- (B) Bootstrap First Admin Profile (Optional):
-- --------------------------------------------------------------------
-- Replace 'PASTE-ADMIN-UUID-HERE' and '9848099999' with the actual admin credentials:
-- INSERT INTO public.profiles (id, full_name, role, phone, active)
-- VALUES (
--   'PASTE-ADMIN-UUID-HERE',
--   'System Administrator',
--   'admin',
--   '9848099999',
--   true
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   full_name = EXCLUDED.full_name,
--   role = 'admin',
--   phone = EXCLUDED.phone,
--   active = true;
