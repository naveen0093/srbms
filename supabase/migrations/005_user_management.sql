-- ====================================================================
-- SR Industries BMS - User Management & Rank Enforcement Migration
-- Migration: 005_user_management.sql
-- Enforces:
-- 1. Last active owner protection (cannot be deleted or deactivated)
-- 2. Decisions Block Rank Rules enforced in the database
-- 3. Dedicated user management verification helpers
-- ====================================================================

BEGIN;

-- ====================================================================
-- SECTION 1: Profile Rank & Last Active Owner Trigger
-- ====================================================================

CREATE OR REPLACE FUNCTION public.check_profile_rank_and_last_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_active_owners int;
  v_caller_uid uuid := auth.uid();
  v_caller_role text;
  v_caller_rank int;
  v_target_rank int;
BEGIN
  -- 1. Guard against deleting, deactivating or demoting the last active owner
  -- This check applies ALWAYS, even to service_role!
  IF (TG_OP = 'DELETE' AND OLD.role = 'owner') OR
     (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND (NEW.active = false OR NEW.role <> 'owner')) THEN
    SELECT COUNT(*) INTO v_active_owners
    FROM public.profiles
    WHERE role = 'owner' AND active = true AND id <> OLD.id;

    IF v_active_owners < 1 THEN
      RAISE EXCEPTION 'Cannot remove or deactivate the last active owner.';
    END IF;
  END IF;

  -- 2. If caller is an authenticated user (or passed context), enforce rank rules
  IF v_caller_uid IS NOT NULL AND auth.role() <> 'service_role' THEN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_uid;
    v_caller_rank := public.role_rank(v_caller_role);

    -- On INSERT: check creation hierarchy
    IF TG_OP = 'INSERT' THEN
      IF v_caller_role = 'admin' THEN
        -- Admin can create any role
        NULL;
      ELSIF v_caller_role = 'owner' THEN
        IF NEW.role NOT IN ('manager', 'employee') THEN
          RAISE EXCEPTION 'Owners can only create managers and employees.';
        END IF;
      ELSIF v_caller_role = 'manager' THEN
        IF NEW.role <> 'employee' THEN
          RAISE EXCEPTION 'Managers can only create employees.';
        END IF;
      ELSE
        RAISE EXCEPTION 'Employees cannot create user accounts.';
      END IF;
    END IF;

    -- On UPDATE / DELETE: check management hierarchy
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
      v_target_rank := public.role_rank(OLD.role);

      -- Special rule: Owner can deactivate admin accounts
      IF v_caller_role = 'owner' AND OLD.role = 'admin' AND TG_OP = 'UPDATE' AND NEW.active = false THEN
        NULL;
      ELSIF v_caller_role <> 'admin' AND v_caller_rank <= v_target_rank THEN
        RAISE EXCEPTION 'Cannot modify or deactivate an account of equal or higher rank.';
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_rank_and_last_owner ON public.profiles;
CREATE TRIGGER trg_profile_rank_and_last_owner
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_rank_and_last_owner();

-- ====================================================================
-- SECTION 2: Database Helper to Check User Management Permissions
-- ====================================================================

CREATE OR REPLACE FUNCTION public.can_manage_target_user(
  p_caller_role text,
  p_target_role text,
  p_action text DEFAULT 'manage'
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_caller_role = 'admin' THEN
    RETURN true;
  END IF;

  IF p_caller_role = 'owner' THEN
    -- Owner can deactivate admin accounts
    IF p_target_role = 'admin' AND p_action = 'deactivate' THEN
      RETURN true;
    END IF;
    -- Owner can manage managers and employees
    IF p_target_role IN ('manager', 'employee') THEN
      RETURN true;
    END IF;
    RETURN false;
  END IF;

  IF p_caller_role = 'manager' THEN
    -- Manager can only manage employees
    RETURN p_target_role = 'employee';
  END IF;

  -- Employee cannot manage anyone
  RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_target_user(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_target_user(text, text, text) TO authenticated, service_role;

COMMIT;
