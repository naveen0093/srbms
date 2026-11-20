-- Migration: 20261120130000_security_review_hardening.sql
-- SR Industries BMS - Security Hardening: Direct Mutation Policies Drop, Actor Derivation, Sequence Guards & Retention Permissions

BEGIN;

-- ====================================================================
-- SECTION 1: Drop Direct Mutation Policies on Ledger Tables (RPC-Only)
-- ====================================================================
DROP POLICY IF EXISTS "bills_insert" ON public.bills;
DROP POLICY IF EXISTS "bills_update" ON public.bills;
DROP POLICY IF EXISTS "bill_items_insert" ON public.bill_items;
DROP POLICY IF EXISTS "bill_items_update" ON public.bill_items;
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_update" ON public.payments;

-- ====================================================================
-- SECTION 2: Sequence Alignment for Customers
-- ====================================================================
SELECT setval(
  'public.seq_customers',
  GREATEST(
    COALESCE((SELECT MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint) FROM public.customers), 1),
    1
  )
);

-- ====================================================================
-- SECTION 3: Add Role Checks to Sequence Minting Functions
-- ====================================================================
CREATE OR REPLACE FUNCTION public.next_customer_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT has_role('owner', 'manager', 'billing_staff') THEN
    RAISE EXCEPTION 'Permission denied: insufficient privileges to generate customer id';
  END IF;
  RETURN 'C' || nextval('public.seq_customers')::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_payment_id(p_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date := COALESCE(p_date, CURRENT_DATE);
  v_num bigint;
BEGIN
  IF auth.role() <> 'service_role' AND NOT has_role('owner', 'manager', 'accountant', 'billing_staff') THEN
    RAISE EXCEPTION 'Permission denied: insufficient privileges to generate payment id';
  END IF;
  v_num := nextval('public.seq_payments');
  RETURN 'PAY/' || to_char(v_date, 'YYMM') || '/' || lpad(v_num::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.next_bill_no(p_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  IF auth.role() <> 'service_role' AND NOT has_role('owner', 'manager', 'billing_staff') THEN
    RAISE EXCEPTION 'Permission denied: insufficient privileges to generate bill number';
  END IF;

  IF v_month >= 4 THEN
    v_fy_start := v_year % 100;
    v_fy_end := (v_year + 1) % 100;
  ELSE
    v_fy_start := (v_year - 1) % 100;
    v_fy_end := v_year % 100;
  END IF;

  v_fy_str := lpad(v_fy_start::text, 2, '0') || '-' || lpad(v_fy_end::text, 2, '0');
  v_seq_name := 'seq_bills_' || lpad(v_fy_start::text, 2, '0') || '_' || lpad(v_fy_end::text, 2, '0');

  PERFORM 1
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'S'
    AND n.nspname = 'public'
    AND c.relname = v_seq_name;

  IF NOT FOUND THEN
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS public.%I START WITH 1', v_seq_name);
  END IF;

  EXECUTE format('SELECT nextval(%L)', 'public.' || v_seq_name) INTO v_seq_num;
  RETURN 'SR/' || v_fy_str || '/' || lpad(v_seq_num::text, 4, '0');
END;
$$;

-- ====================================================================
-- SECTION 4: cancel_bill and reverse_payment (Remove Actor Spoofing Parameters)
-- ====================================================================

-- 1. cancel_bill
DROP FUNCTION IF EXISTS public.cancel_bill(text, text, text);
DROP FUNCTION IF EXISTS public.cancel_bill(text, text);

CREATE OR REPLACE FUNCTION public.cancel_bill(
  p_bill_id text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing record;
  v_by text;
  v_clean_reason text;
  v_bill_row record;
BEGIN
  IF NOT has_role('owner', 'manager') THEN
    RAISE EXCEPTION 'Permission denied: only owner or manager can cancel bills';
  END IF;

  v_clean_reason := TRIM(COALESCE(p_reason, ''));
  IF LENGTH(v_clean_reason) < 5 THEN
    RAISE EXCEPTION 'Cancellation reason must be at least 5 characters';
  END IF;

  SELECT * INTO v_existing FROM public.bills WHERE id = p_bill_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill % not found', p_bill_id;
  END IF;
  IF v_existing.status != 'active' THEN
    RAISE EXCEPTION 'Bill is already %', v_existing.status;
  END IF;

  -- Derive actor name strictly from authenticated session profile
  SELECT COALESCE(full_name, 'Authorized Staff') INTO v_by
  FROM public.profiles
  WHERE user_id = auth.uid();
  IF v_by IS NULL OR TRIM(v_by) = '' THEN
    v_by := COALESCE(auth.jwt() ->> 'email', 'Authorized Staff');
  END IF;

  UPDATE public.bills
  SET status = 'cancelled',
      action_reason = v_clean_reason,
      action_by = v_by,
      action_at = now()
  WHERE id = p_bill_id;

  SELECT * INTO v_bill_row FROM public.bills WHERE id = p_bill_id;

  RETURN jsonb_build_object('bill', to_jsonb(v_bill_row));
END;
$$;

-- 2. reverse_payment
DROP FUNCTION IF EXISTS public.reverse_payment(text, text, text);
DROP FUNCTION IF EXISTS public.reverse_payment(text, text);

CREATE OR REPLACE FUNCTION public.reverse_payment(
  p_payment_id text,
  p_reason text DEFAULT 'User reversed payment'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing record;
  v_by text;
  v_clean_reason text;
  v_payment_row record;
  v_bill_row record;
  v_has_bill boolean := false;
BEGIN
  IF NOT has_role('owner', 'manager', 'accountant') THEN
    RAISE EXCEPTION 'Permission denied: unauthorized role to reverse payments';
  END IF;

  v_clean_reason := TRIM(COALESCE(p_reason, 'User reversed payment'));

  SELECT * INTO v_existing FROM public.payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;
  IF v_existing.reversed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Payment % has already been reversed', p_payment_id;
  END IF;

  -- Derive actor name strictly from authenticated session profile
  SELECT COALESCE(full_name, 'Authorized Staff') INTO v_by
  FROM public.profiles
  WHERE user_id = auth.uid();
  IF v_by IS NULL OR TRIM(v_by) = '' THEN
    v_by := COALESCE(auth.jwt() ->> 'email', 'Authorized Staff');
  END IF;

  UPDATE public.payments
  SET reversed_at = now(),
      reversed_by = v_by,
      reversal_reason = v_clean_reason
  WHERE id = p_payment_id;

  SELECT * INTO v_payment_row FROM public.payments WHERE id = p_payment_id;

  IF v_existing.bill_id IS NOT NULL AND v_existing.bill_id <> '' AND v_existing.bill_id <> '-' THEN
    SELECT * INTO v_bill_row FROM public.bills WHERE id = v_existing.bill_id;
    IF FOUND THEN
      v_has_bill := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'payment', to_jsonb(v_payment_row),
    'bill', CASE WHEN v_has_bill THEN to_jsonb(v_bill_row) ELSE NULL END
  );
END;
$$;

-- ====================================================================
-- SECTION 5: cleanup_expired_applications (service_role or owner Guard)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_applications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_deleted_ids text[];
  v_doc_paths text[];
BEGIN
  -- Strict authorization: service_role or owner
  IF auth.role() <> 'service_role' AND NOT has_role('owner') THEN
    RAISE EXCEPTION 'Permission denied: only owner or service_role can run retention cleanup';
  END IF;

  WITH expired AS (
    SELECT id, photo_path, doc_path, pan_doc_path, license_doc_path
    FROM public.employee_applications
    WHERE status IN ('Approved', 'Rejected')
      AND (
        (retention_deadline IS NOT NULL AND retention_deadline <= now())
        OR (decided_at IS NOT NULL AND decided_at <= now() - INTERVAL '30 days')
        OR (decided_at IS NULL AND submitted_at <= now() - INTERVAL '30 days')
      )
  ),
  active_emp_paths AS (
    SELECT photo_path AS p FROM public.employees WHERE photo_path IS NOT NULL AND photo_path <> ''
    UNION
    SELECT photo_path AS p FROM public.employee_identities WHERE photo_path IS NOT NULL AND photo_path <> ''
    UNION
    SELECT aadhaar_doc_path AS p FROM public.employee_identities WHERE aadhaar_doc_path IS NOT NULL AND aadhaar_doc_path <> ''
    UNION
    SELECT pan_doc_path AS p FROM public.employee_identities WHERE pan_doc_path IS NOT NULL AND pan_doc_path <> ''
    UNION
    SELECT license_doc_path AS p FROM public.employee_identities WHERE license_doc_path IS NOT NULL AND license_doc_path <> ''
  ),
  paths AS (
    SELECT photo_path AS p FROM expired WHERE photo_path IS NOT NULL AND photo_path <> ''
    UNION ALL
    SELECT doc_path AS p FROM expired WHERE doc_path IS NOT NULL AND doc_path <> ''
    UNION ALL
    SELECT pan_doc_path AS p FROM expired WHERE pan_doc_path IS NOT NULL AND pan_doc_path <> ''
    UNION ALL
    SELECT license_doc_path AS p FROM expired WHERE license_doc_path IS NOT NULL AND license_doc_path <> ''
  )
  SELECT
    COALESCE((SELECT array_agg(id) FROM expired), ARRAY[]::text[]),
    COALESCE((SELECT array_agg(DISTINCT p) FROM paths WHERE p NOT IN (SELECT p FROM active_emp_paths)), ARRAY[]::text[])
  INTO v_deleted_ids, v_doc_paths;

  IF v_deleted_ids IS NOT NULL AND array_length(v_deleted_ids, 1) > 0 THEN
    DELETE FROM public.employee_applications
    WHERE id = ANY(v_deleted_ids);

    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'deleted_count', v_count,
    'deleted_ids', COALESCE(v_deleted_ids, ARRAY[]::text[]),
    'storage_paths', COALESCE(v_doc_paths, ARRAY[]::text[])
  );
END;
$$;

-- ====================================================================
-- SECTION 6: Explicit Function Grants
-- ====================================================================
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.next_customer_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_payment_id(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_bill_no(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_bill(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reverse_payment(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_applications() TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
