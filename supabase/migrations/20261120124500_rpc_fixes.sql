-- Migration: 20261120124500_rpc_fixes.sql
-- SR Industries BMS - Fixes for reverse_payment, policy cleanup, and function privileges

BEGIN;

-- ====================================================================
-- SECTION 1: Policy Correction
-- Drop real policy "bill_items_delete" (previously missed due to wrong name)
-- ====================================================================
DROP POLICY IF EXISTS "bill_items_delete" ON public.bill_items;

-- ====================================================================
-- SECTION 2: Fix reverse_payment unassigned record bug on advance payments
-- ====================================================================
CREATE OR REPLACE FUNCTION public.reverse_payment(
  p_payment_id text,
  p_reason text DEFAULT 'User reversed payment',
  p_reversed_by text DEFAULT NULL
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
  -- Role authorization check: only owner, manager, accountant may reverse payments
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

  v_by := COALESCE(
    (SELECT full_name FROM public.profiles WHERE user_id = auth.uid()),
    NULLIF(TRIM(p_reversed_by), ''),
    'Authorized Staff'
  );

  -- 1. Mark payment as reversed (trigger automatically subtracts from bills.paid)
  UPDATE public.payments
  SET reversed_at = now(),
      reversed_by = v_by,
      reversal_reason = v_clean_reason
  WHERE id = p_payment_id;

  SELECT * INTO v_payment_row FROM public.payments WHERE id = p_payment_id;

  -- Check if payment has an associated bill using a boolean flag
  -- to avoid evaluating unassigned record v_bill_row on advance payments
  IF v_existing.bill_id IS NOT NULL AND v_existing.bill_id != '' AND v_existing.bill_id != '-' THEN
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
-- SECTION 3: Function Execution Privileges Lockdown
-- Revoke EXECUTE from PUBLIC and anon, configure default privileges,
-- and grant EXECUTE to authenticated and service_role.
-- ====================================================================
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

-- Grant EXECUTE to authenticated and service_role for all 8 application RPCs and role helpers
GRANT EXECUTE ON FUNCTION public.next_bill_no(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_payment_id(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_customer_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_bill(text, text, text, jsonb, date, text, numeric, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_bill(text, text, text, text, jsonb, date, text, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_bill(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_payment(text, text, numeric, text, date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reverse_payment(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ====================================================================
-- Verification Query: 8 RPC Functions with Argument Lists & Security Type
-- ====================================================================
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS argument_list,
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'next_bill_no',
    'next_payment_id',
    'next_customer_id',
    'create_bill',
    'update_bill',
    'cancel_bill',
    'record_payment',
    'reverse_payment'
  )
ORDER BY p.proname;
