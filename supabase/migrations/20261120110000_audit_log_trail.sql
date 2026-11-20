-- Migration: 20261120110000_audit_log_trail.sql
-- SR Industries BMS - Audit Trail Table, Triggers & Owner RLS

BEGIN;

-- ====================================================================
-- SECTION 1: Audit Log Table
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NULL,
  role text NULL,
  table_name text NOT NULL,
  row_id text NOT NULL,
  action text NOT NULL,
  old jsonb NULL,
  new jsonb NULL
);

-- Indexes for efficient querying and filter performance
CREATE INDEX IF NOT EXISTS idx_audit_log_at ON public.audit_log (at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log (action);

-- ====================================================================
-- SECTION 2: Masking Function for Aadhaar and PAN
-- ====================================================================

CREATE OR REPLACE FUNCTION public.mask_sensitive_audit_data(p_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_res jsonb := p_data;
  v_key text;
  v_val text;
BEGIN
  IF p_data IS NULL THEN
    RETURN NULL;
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_data) LOOP
    IF lower(v_key) IN ('aadhaar', 'pan', 'aadhaar_number', 'pan_number') THEN
      v_val := p_data->>v_key;
      IF v_val IS NOT NULL AND length(trim(v_val)) > 0 THEN
        IF lower(v_key) LIKE '%aadhaar%' THEN
          -- Mask 12-digit Aadhaar to 'XXXX XXXX 1234'
          v_res := jsonb_set(
            v_res,
            ARRAY[v_key],
            to_jsonb('XXXX XXXX ' || right(regexp_replace(v_val, '\D', '', 'g'), 4))
          );
        ELSE
          -- Mask PAN (10 chars e.g. ABCDE1234F -> AB*****4F)
          v_res := jsonb_set(
            v_res,
            ARRAY[v_key],
            to_jsonb(
              CASE
                WHEN length(v_val) >= 4 THEN
                  left(v_val, 2) || repeat('*', greatest(length(v_val) - 4, 3)) || right(v_val, 2)
                ELSE '*****'
              END
            )
          );
        END IF;
      END IF;
    ELSIF lower(v_key) IN ('aadhaar_doc', 'pan_doc', 'aadhaar_doc_path', 'pan_doc_path') THEN
      v_val := p_data->>v_key;
      IF v_val IS NOT NULL AND length(trim(v_val)) > 0 THEN
        v_res := jsonb_set(v_res, ARRAY[v_key], to_jsonb('[REDACTED_DOC_PATH]'));
      END IF;
    END IF;
  END LOOP;

  RETURN v_res;
END;
$$;

-- ====================================================================
-- SECTION 3: Trigger Function
-- ====================================================================

CREATE OR REPLACE FUNCTION public.trg_audit_logger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_row_json jsonb;
  v_row_id text;
  v_old jsonb := NULL;
  v_new jsonb := NULL;
BEGIN
  -- Determine role of the actor
  IF v_uid IS NOT NULL THEN
    SELECT p.role INTO v_role FROM public.profiles p WHERE p.user_id = v_uid LIMIT 1;
  END IF;

  IF v_role IS NULL THEN
    BEGIN
      v_role := COALESCE(
        current_setting('request.jwt.claims', true)::jsonb->>'role',
        auth.jwt()->>'role',
        'authenticated'
      );
    EXCEPTION WHEN OTHERS THEN
      v_role := 'authenticated';
    END;
  END IF;

  -- Prepare masked old and new JSON objects
  IF TG_OP = 'DELETE' THEN
    v_row_json := to_jsonb(OLD);
    v_old := public.mask_sensitive_audit_data(v_row_json);
    v_new := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_row_json := to_jsonb(NEW);
    v_old := NULL;
    v_new := public.mask_sensitive_audit_data(v_row_json);
  ELSE -- UPDATE
    v_row_json := to_jsonb(NEW);
    v_old := public.mask_sensitive_audit_data(to_jsonb(OLD));
    v_new := public.mask_sensitive_audit_data(v_row_json);
  END IF;

  -- Extract row_id
  v_row_id := COALESCE(
    v_row_json->>'id',
    v_row_json->>'user_id',
    (v_row_json->>'bill_id' || ':' || COALESCE(v_row_json->>'product_name', 'item')),
    'unknown'
  );

  -- Record audit entry
  INSERT INTO public.audit_log (
    at, user_id, role, table_name, row_id, action, old, new
  ) VALUES (
    now(), v_uid, v_role, TG_TABLE_NAME, v_row_id, TG_OP, v_old, v_new
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ====================================================================
-- SECTION 4: Attach Audit Triggers to All 10 Target Tables
-- ====================================================================

-- 1. bills
DROP TRIGGER IF EXISTS trg_audit_bills ON public.bills;
CREATE TRIGGER trg_audit_bills
AFTER INSERT OR UPDATE OR DELETE ON public.bills
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

-- 2. bill_items
DROP TRIGGER IF EXISTS trg_audit_bill_items ON public.bill_items;
CREATE TRIGGER trg_audit_bill_items
AFTER INSERT OR UPDATE OR DELETE ON public.bill_items
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

-- 3. payments
DROP TRIGGER IF EXISTS trg_audit_payments ON public.payments;
CREATE TRIGGER trg_audit_payments
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

-- 4. customers
DROP TRIGGER IF EXISTS trg_audit_customers ON public.customers;
CREATE TRIGGER trg_audit_customers
AFTER INSERT OR UPDATE OR DELETE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

-- 5. employees
DROP TRIGGER IF EXISTS trg_audit_employees ON public.employees;
CREATE TRIGGER trg_audit_employees
AFTER INSERT OR UPDATE OR DELETE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

-- 6. attendance
DROP TRIGGER IF EXISTS trg_audit_attendance ON public.attendance;
CREATE TRIGGER trg_audit_attendance
AFTER INSERT OR UPDATE OR DELETE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

-- 7. advances
DROP TRIGGER IF EXISTS trg_audit_advances ON public.advances;
CREATE TRIGGER trg_audit_advances
AFTER INSERT OR UPDATE OR DELETE ON public.advances
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

-- 8. expenses
DROP TRIGGER IF EXISTS trg_audit_expenses ON public.expenses;
CREATE TRIGGER trg_audit_expenses
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

-- 9. business_settings
DROP TRIGGER IF EXISTS trg_audit_business_settings ON public.business_settings;
CREATE TRIGGER trg_audit_business_settings
AFTER INSERT OR UPDATE OR DELETE ON public.business_settings
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

-- 10. profiles
DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

-- ====================================================================
-- SECTION 5: Row Level Security & Access Control
-- ====================================================================

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Owner can select
DROP POLICY IF EXISTS "audit_log_owner_select" ON public.audit_log;
CREATE POLICY "audit_log_owner_select"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (has_role('owner'));

-- Nobody can update or delete
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_log FROM authenticated, anon, public;

-- Grant select to authenticated (RLS policy restricts access to owner)
GRANT SELECT ON public.audit_log TO authenticated;

COMMIT;
