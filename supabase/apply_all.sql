-- ====================================================================
-- SR Industries BMS - Master Migration Chain Runner
-- Applies all migrations in dependency order to an EMPTY Supabase database
-- One transaction per file. DO NOT RUN AUTOMATICALLY WITHOUT APPROVAL.
-- ====================================================================

-- ====================================================================
-- FIRST-OWNER / ADMIN BOOTSTRAP INSTRUCTIONS (Commented)
-- ====================================================================
-- Once this migration chain has been applied to a fresh database:
-- 1. Create the user in Supabase Dashboard -> Authentication -> Users
--    or via the worker admin API.
-- 2. Obtain the created user's UUID.
-- 3. Execute:
--    INSERT INTO public.profiles (id, full_name, role, phone, active)
--    VALUES ('<OWNER_AUTH_UUID>', 'Muni Prasad', 'owner', '9848012345', true)
--    ON CONFLICT (id) DO UPDATE SET role = 'owner', active = true;
-- ====================================================================

\set ON_ERROR_STOP on

-- File 1: Core Relational Schema (Tables, Constraints, Indexes)
\ir migrations/20261127000001_core_schema.sql

-- File 2: Views and Audit Logging Triggers
\ir migrations/20261127000002_views_and_audit.sql

-- File 3: Roles and Row Level Security (RLS)
\ir migrations/20261127000003_roles_and_rls.sql

-- File 4: Security Definer RPCs (13 Operational & Financial Functions)
\ir migrations/20261127000004_rpcs.sql

-- File 5: User Management & Rank Enforcement Triggers
\ir migrations/20261127000005_user_management.sql

-- File 6: Storage Buckets & Policies (Private Buckets)
\ir migrations/20261127000006_storage.sql
