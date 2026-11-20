-- SR Industries BMS - Atomic Writes, Postgres Sequences & Role-Checked RPCs
-- Migration: 20261120102500_atomic_rpcs_sequences.sql

BEGIN;

-- ====================================================================
-- SECTION 1: Sequences & ID Generation
-- ====================================================================

-- Sequence for payments
CREATE SEQUENCE IF NOT EXISTS public.seq_payments START 1;

-- Sequence for customers (for server-side ID minting)
CREATE SEQUENCE IF NOT EXISTS public.seq_customers START 1;

-- Function: next_customer_id() -> returns 'C1', 'C2', etc.
CREATE OR REPLACE FUNCTION public.next_customer_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'C' || nextval('public.seq_customers')::text;
END;
$$;

-- Function: next_payment_id(p_date) -> returns 'PAY/YYMM/0001'
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
  v_num := nextval('public.seq_payments');
  RETURN 'PAY/' || to_char(v_date, 'YYMM') || '/' || lpad(v_num::text, 4, '0');
END;
$$;

-- Function: next_bill_no(p_date) -> returns Indian Financial Year sequence 'SR/26-27/0001'
-- Indian FY runs April 1 to March 31.
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
  IF v_month >= 4 THEN
    v_fy_start := v_year % 100;
    v_fy_end := (v_year + 1) % 100;
  ELSE
    v_fy_start := (v_year - 1) % 100;
    v_fy_end := v_year % 100;
  END IF;

  v_fy_str := to_char(v_fy_start, 'FM00') || '-' || to_char(v_fy_end, 'FM00');
  v_seq_name := 'seq_bills_' || to_char(v_fy_start, 'FM00') || '_' || to_char(v_fy_end, 'FM00');

  -- Create financial year sequence dynamically if it does not exist yet
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START 1;', v_seq_name);
  EXECUTE format('SELECT nextval(%L);', v_seq_name) INTO v_seq_num;

  RETURN 'SR/' || v_fy_str || '/' || lpad(v_seq_num::text, 4, '0');
END;
$$;

-- ====================================================================
-- SECTION 2: Unique Constraints & Schema Hardening
-- ====================================================================

-- Ensure unique constraints on bill IDs and payment IDs
CREATE UNIQUE INDEX IF NOT EXISTS uq_bills_id ON public.bills (id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_id ON public.payments (id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_id ON public.customers (id);

-- Ensure notes column exists on payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS notes text NULL;

-- ====================================================================
-- SECTION 3: Trigger for Server-Computed bills.paid
-- ====================================================================

-- Function to recalculate bills.paid directly from non-reversed payments
CREATE OR REPLACE FUNCTION public.trg_recalculate_bill_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bill_id text;
BEGIN
  v_bill_id := COALESCE(NEW.bill_id, OLD.bill_id);
  IF v_bill_id IS NOT NULL AND v_bill_id != '' AND v_bill_id != '-' THEN
    UPDATE public.bills b
    SET paid = COALESCE((
      SELECT ROUND(SUM(p.amount)::numeric, 2)
      FROM public.payments p
      WHERE p.bill_id = v_bill_id
        AND p.reversed_at IS NULL
    ), 0)
    WHERE b.id = v_bill_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_sync_bill_paid ON public.payments;
CREATE TRIGGER trg_payments_sync_bill_paid
AFTER INSERT OR UPDATE OF amount, bill_id, reversed_at OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_bill_paid();

-- ====================================================================
-- SECTION 4: Close Temporary DELETE Policy on bill_items
-- ====================================================================
-- Now that update_bill runs inside a security definer RPC, direct client DELETE
-- is no longer permitted.
DROP POLICY IF EXISTS "bill_items_delete_temp" ON public.bill_items;

-- ====================================================================
-- SECTION 5: RPC Functions
-- ====================================================================

-- 1. create_bill
CREATE OR REPLACE FUNCTION public.create_bill(
  p_customer_name text,
  p_mobile text,
  p_address text,
  p_items jsonb,
  p_bill_date date DEFAULT CURRENT_DATE,
  p_payment_mode text DEFAULT 'Cash',
  p_initial_payment numeric DEFAULT 0,
  p_is_gst boolean DEFAULT false,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id text;
  v_clean_mobile text;
  v_clean_name text;
  v_clean_addr text;
  v_bill_id text;
  v_subtotal numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_initial_pay numeric(12,2) := COALESCE(p_initial_payment, 0);
  v_payment_id text;
  v_bill_row record;
  v_customer_row record;
  v_payment_row record;
BEGIN
  -- Role authorization check
  IF NOT has_role('owner', 'manager', 'billing_staff') THEN
    RAISE EXCEPTION 'Permission denied: unauthorized role to create bills';
  END IF;

  v_clean_name := TRIM(COALESCE(p_customer_name, ''));
  v_clean_mobile := regexp_replace(COALESCE(p_mobile, ''), '\D', '', 'g');
  v_clean_addr := TRIM(COALESCE(p_address, ''));

  IF LENGTH(v_clean_name) < 2 THEN
    RAISE EXCEPTION 'Customer name must be at least 2 characters';
  END IF;
  IF LENGTH(v_clean_mobile) != 10 THEN
    RAISE EXCEPTION 'Mobile number must be exactly 10 digits';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one line item is required';
  END IF;

  -- 1. Find or create customer
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE regexp_replace(phone, '\D', '', 'g') = v_clean_mobile
  LIMIT 1;

  IF v_customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET name = v_clean_name,
        area = CASE WHEN LENGTH(v_clean_addr) > 0 THEN v_clean_addr ELSE area END
    WHERE id = v_customer_id;
  ELSE
    v_customer_id := next_customer_id();
    INSERT INTO public.customers (id, name, phone, area, created_date)
    VALUES (v_customer_id, v_clean_name, v_clean_mobile, v_clean_addr, COALESCE(p_bill_date, CURRENT_DATE));
  END IF;

  SELECT * INTO v_customer_row FROM public.customers WHERE id = v_customer_id;

  -- 2. Compute subtotal from items
  -- item schema: { product_name, qty_bottles, rate_per_case, case_size }
  SELECT
    ROUND(SUM(
      ( (item->>'qty_bottles')::numeric / GREATEST((item->>'case_size')::numeric, 1) ) * (item->>'rate_per_case')::numeric
    )::numeric, 2)
  INTO v_subtotal
  FROM jsonb_array_elements(p_items) AS item;

  v_subtotal := COALESCE(v_subtotal, 0);
  IF p_is_gst THEN
    v_tax := ROUND(v_subtotal * 0.05, 2);
  ELSE
    v_tax := 0;
  END IF;
  v_total := ROUND(v_subtotal + v_tax, 2);

  IF v_initial_pay < 0 THEN
    RAISE EXCEPTION 'Initial payment cannot be negative';
  END IF;
  IF v_initial_pay > v_total THEN
    RAISE EXCEPTION 'Initial payment cannot exceed bill total';
  END IF;

  -- 3. Mint sequential bill number
  v_bill_id := next_bill_no(p_bill_date);

  -- 4. Insert bill
  INSERT INTO public.bills (
    id, bill_date, customer_id, customer_name, mobile, address, gst,
    subtotal, tax, total, paid, payment_mode, status
  ) VALUES (
    v_bill_id, COALESCE(p_bill_date, CURRENT_DATE), v_customer_id, v_clean_name,
    v_clean_mobile, v_clean_addr, COALESCE(p_is_gst, false),
    v_subtotal, v_tax, v_total, 0, COALESCE(p_payment_mode, 'Cash'), 'active'
  );

  -- 5. Insert bill items
  INSERT INTO public.bill_items (bill_id, product_name, qty_bottles, rate_per_case, case_size)
  SELECT
    v_bill_id,
    item->>'product_name',
    (item->>'qty_bottles')::numeric,
    (item->>'rate_per_case')::numeric,
    GREATEST((item->>'case_size')::numeric, 1)
  FROM jsonb_array_elements(p_items) AS item;

  -- 6. Record initial payment if specified (trigger automatically updates bills.paid)
  IF v_initial_pay > 0 THEN
    v_payment_id := next_payment_id(p_bill_date);
    INSERT INTO public.payments (
      id, payment_date, customer_id, bill_id, amount, mode, notes
    ) VALUES (
      v_payment_id, COALESCE(p_bill_date, CURRENT_DATE), v_customer_id, v_bill_id,
      v_initial_pay, COALESCE(p_payment_mode, 'Cash'), 'Initial payment'
    );
    SELECT * INTO v_payment_row FROM public.payments WHERE id = v_payment_id;
  END IF;

  SELECT * INTO v_bill_row FROM public.bills WHERE id = v_bill_id;

  RETURN jsonb_build_object(
    'bill', to_jsonb(v_bill_row),
    'items', (SELECT jsonb_agg(to_jsonb(bi)) FROM public.bill_items bi WHERE bi.bill_id = v_bill_id),
    'customer', to_jsonb(v_customer_row),
    'payment', CASE WHEN v_payment_id IS NOT NULL THEN to_jsonb(v_payment_row) ELSE NULL END
  );
END;
$$;

-- 2. update_bill
CREATE OR REPLACE FUNCTION public.update_bill(
  p_bill_id text,
  p_customer_name text,
  p_mobile text,
  p_address text,
  p_items jsonb,
  p_bill_date date DEFAULT CURRENT_DATE,
  p_payment_mode text DEFAULT 'Cash',
  p_is_gst boolean DEFAULT false,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing record;
  v_customer_id text;
  v_clean_mobile text;
  v_clean_name text;
  v_clean_addr text;
  v_subtotal numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_bill_row record;
  v_customer_row record;
BEGIN
  -- Role authorization check: only owner and manager may edit existing bills
  IF NOT has_role('owner', 'manager') THEN
    RAISE EXCEPTION 'Permission denied: only owner or manager can edit bills';
  END IF;

  SELECT * INTO v_existing FROM public.bills WHERE id = p_bill_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill % not found', p_bill_id;
  END IF;
  IF v_existing.status != 'active' THEN
    RAISE EXCEPTION 'Cannot edit a cancelled or deleted bill';
  END IF;

  v_clean_name := TRIM(COALESCE(p_customer_name, ''));
  v_clean_mobile := regexp_replace(COALESCE(p_mobile, ''), '\D', '', 'g');
  v_clean_addr := TRIM(COALESCE(p_address, ''));

  IF LENGTH(v_clean_name) < 2 THEN
    RAISE EXCEPTION 'Customer name must be at least 2 characters';
  END IF;
  IF LENGTH(v_clean_mobile) != 10 THEN
    RAISE EXCEPTION 'Mobile number must be exactly 10 digits';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one line item is required';
  END IF;

  -- 1. Update customer details
  v_customer_id := v_existing.customer_id;
  IF v_customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET name = v_clean_name,
        phone = v_clean_mobile,
        area = v_clean_addr
    WHERE id = v_customer_id;
  END IF;
  SELECT * INTO v_customer_row FROM public.customers WHERE id = v_customer_id;

  -- 2. Recalculate subtotal, tax, total
  SELECT
    ROUND(SUM(
      ( (item->>'qty_bottles')::numeric / GREATEST((item->>'case_size')::numeric, 1) ) * (item->>'rate_per_case')::numeric
    )::numeric, 2)
  INTO v_subtotal
  FROM jsonb_array_elements(p_items) AS item;

  v_subtotal := COALESCE(v_subtotal, 0);
  IF p_is_gst THEN
    v_tax := ROUND(v_subtotal * 0.05, 2);
  ELSE
    v_tax := 0;
  END IF;
  v_total := ROUND(v_subtotal + v_tax, 2);

  -- 3. Update bill header
  UPDATE public.bills
  SET bill_date = COALESCE(p_bill_date, bill_date),
      customer_name = v_clean_name,
      mobile = v_clean_mobile,
      address = v_clean_addr,
      gst = COALESCE(p_is_gst, false),
      subtotal = v_subtotal,
      tax = v_tax,
      total = v_total,
      payment_mode = COALESCE(p_payment_mode, payment_mode)
  WHERE id = p_bill_id;

  -- 4. Replace bill items in same transaction
  DELETE FROM public.bill_items WHERE bill_id = p_bill_id;

  INSERT INTO public.bill_items (bill_id, product_name, qty_bottles, rate_per_case, case_size)
  SELECT
    p_bill_id,
    item->>'product_name',
    (item->>'qty_bottles')::numeric,
    (item->>'rate_per_case')::numeric,
    GREATEST((item->>'case_size')::numeric, 1)
  FROM jsonb_array_elements(p_items) AS item;

  SELECT * INTO v_bill_row FROM public.bills WHERE id = p_bill_id;

  RETURN jsonb_build_object(
    'bill', to_jsonb(v_bill_row),
    'items', (SELECT jsonb_agg(to_jsonb(bi)) FROM public.bill_items bi WHERE bi.bill_id = p_bill_id),
    'customer', to_jsonb(v_customer_row)
  );
END;
$$;

-- 3. cancel_bill
CREATE OR REPLACE FUNCTION public.cancel_bill(
  p_bill_id text,
  p_reason text,
  p_action_by text DEFAULT NULL
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
  -- Role authorization check: only owner and manager may cancel bills
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

  v_by := COALESCE(
    NULLIF(TRIM(p_action_by), ''),
    (SELECT full_name FROM public.profiles WHERE user_id = auth.uid()),
    'Authorized Staff'
  );

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

-- 4. record_payment
CREATE OR REPLACE FUNCTION public.record_payment(
  p_customer_id text,
  p_bill_id text DEFAULT NULL,
  p_amount numeric DEFAULT 0,
  p_mode text DEFAULT 'Cash',
  p_payment_date date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id text;
  v_pay_amount numeric(12,2) := COALESCE(p_amount, 0);
  v_bill_id_clean text;
  v_payment_row record;
  v_bill_row record;
BEGIN
  -- Role authorization check
  IF NOT has_role('owner', 'manager', 'accountant', 'billing_staff') THEN
    RAISE EXCEPTION 'Permission denied: unauthorized role to record payments';
  END IF;

  IF v_pay_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id) THEN
    RAISE EXCEPTION 'Customer % not found', p_customer_id;
  END IF;

  v_bill_id_clean := NULLIF(NULLIF(TRIM(COALESCE(p_bill_id, '')), '-'), '');
  IF v_bill_id_clean IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.bills WHERE id = v_bill_id_clean) THEN
      RAISE EXCEPTION 'Bill % not found', v_bill_id_clean;
    END IF;
  END IF;

  -- 1. Mint payment ID
  v_payment_id := next_payment_id(p_payment_date);

  -- 2. Insert payment (trigger automatically updates linked bills.paid)
  INSERT INTO public.payments (
    id, payment_date, customer_id, bill_id, amount, mode, notes
  ) VALUES (
    v_payment_id, COALESCE(p_payment_date, CURRENT_DATE), p_customer_id,
    v_bill_id_clean, v_pay_amount, COALESCE(p_mode, 'Cash'), TRIM(COALESCE(p_notes, ''))
  );

  SELECT * INTO v_payment_row FROM public.payments WHERE id = v_payment_id;

  IF v_bill_id_clean IS NOT NULL THEN
    SELECT * INTO v_bill_row FROM public.bills WHERE id = v_bill_id_clean;
  END IF;

  RETURN jsonb_build_object(
    'payment', to_jsonb(v_payment_row),
    'bill', CASE WHEN v_bill_id_clean IS NOT NULL THEN to_jsonb(v_bill_row) ELSE NULL END
  );
END;
$$;

-- 5. reverse_payment
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
    NULLIF(TRIM(p_reversed_by), ''),
    (SELECT full_name FROM public.profiles WHERE user_id = auth.uid()),
    'Authorized Staff'
  );

  -- 1. Mark payment as reversed (trigger automatically subtracts from bills.paid)
  UPDATE public.payments
  SET reversed_at = now(),
      reversed_by = v_by,
      reversal_reason = v_clean_reason
  WHERE id = p_payment_id;

  SELECT * INTO v_payment_row FROM public.payments WHERE id = p_payment_id;

  IF v_existing.bill_id IS NOT NULL AND v_existing.bill_id != '' AND v_existing.bill_id != '-' THEN
    SELECT * INTO v_bill_row FROM public.bills WHERE id = v_existing.bill_id;
  END IF;

  RETURN jsonb_build_object(
    'payment', to_jsonb(v_payment_row),
    'bill', CASE WHEN v_bill_row.id IS NOT NULL THEN to_jsonb(v_bill_row) ELSE NULL END
  );
END;
$$;

-- Grant EXECUTE to authenticated role on all newly created functions
GRANT EXECUTE ON FUNCTION public.next_bill_no(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_payment_id(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_customer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_bill(text, text, text, jsonb, date, text, numeric, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_bill(text, text, text, text, jsonb, date, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_bill(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment(text, text, numeric, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_payment(text, text, text) TO authenticated;

COMMIT;

-- ====================================================================
-- SECTION 6: Verification Queries
-- ====================================================================
SELECT
  routine_name,
  routine_type,
  security_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('next_bill_no', 'next_payment_id', 'next_customer_id', 'create_bill', 'update_bill', 'cancel_bill', 'record_payment', 'reverse_payment')
ORDER BY routine_name;
