-- ====================================================================
-- SR Industries BMS - Inventory Balances View & Tamper-Evident Audit Triggers
-- Migration: 002_views_and_audit.sql
-- ====================================================================

BEGIN;

-- ====================================================================
-- SECTION 1: Finished Goods Real-time Balance View
-- ====================================================================

CREATE OR REPLACE VIEW public.v_fg_balances AS
WITH movements_in AS (
  SELECT
    to_location_id AS location_id,
    product_name,
    SUM(cases) AS in_cases,
    SUM(bottles) AS in_bottles
  FROM public.fg_movements
  WHERE to_location_id IS NOT NULL
  GROUP BY to_location_id, product_name
),
movements_out AS (
  SELECT
    from_location_id AS location_id,
    product_name,
    SUM(cases) AS out_cases,
    SUM(bottles) AS out_bottles
  FROM public.fg_movements
  WHERE from_location_id IS NOT NULL
  GROUP BY from_location_id, product_name
),
all_pairs AS (
  SELECT location_id, product_name FROM movements_in
  UNION
  SELECT location_id, product_name FROM movements_out
)
SELECT
  p.location_id,
  l.name AS location_name,
  l.type AS location_type,
  p.product_name,
  COALESCE(mi.in_cases, 0) - COALESCE(mo.out_cases, 0) AS balance_cases,
  COALESCE(mi.in_bottles, 0) - COALESCE(mo.out_bottles, 0) AS balance_bottles
FROM all_pairs p
JOIN public.locations l ON l.id = p.location_id
LEFT JOIN movements_in mi ON mi.location_id = p.location_id AND mi.product_name = p.product_name
LEFT JOIN movements_out mo ON mo.location_id = p.location_id AND mo.product_name = p.product_name;

-- ====================================================================
-- SECTION 2: Trigger to Automatically Sync bills.paid from payments
-- ====================================================================

CREATE OR REPLACE FUNCTION public.trg_sync_bill_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bill_id text;
BEGIN
  v_bill_id := COALESCE(NEW.bill_id, OLD.bill_id);
  IF v_bill_id IS NOT NULL AND v_bill_id <> '' AND v_bill_id <> '-' THEN
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
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_bill_paid();

-- ====================================================================
-- SECTION 3: PII Masking Helper for Audit Logging
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
          v_res := jsonb_set(
            v_res,
            ARRAY[v_key],
            to_jsonb('XXXX XXXX ' || right(regexp_replace(v_val, '\D', '', 'g'), 4))
          );
        ELSE
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
-- SECTION 4: Tamper-Evident Audit Trigger Function
-- ====================================================================

CREATE OR REPLACE FUNCTION public.trg_audit_logger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_row_json jsonb;
  v_row_id text;
  v_old jsonb := NULL;
  v_new jsonb := NULL;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT role INTO v_role FROM public.profiles WHERE id = v_uid LIMIT 1;
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

  v_row_id := COALESCE(
    v_row_json->>'id',
    v_row_json->>'employee_id',
    v_row_json->>'user_id',
    'unknown'
  );

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

-- Attach Audit Triggers to Key Operational & Financial Tables
DROP TRIGGER IF EXISTS trg_audit_bills ON public.bills;
CREATE TRIGGER trg_audit_bills
AFTER INSERT OR UPDATE OR DELETE ON public.bills
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

DROP TRIGGER IF EXISTS trg_audit_payments ON public.payments;
CREATE TRIGGER trg_audit_payments
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

DROP TRIGGER IF EXISTS trg_audit_customers ON public.customers;
CREATE TRIGGER trg_audit_customers
AFTER INSERT OR UPDATE OR DELETE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

DROP TRIGGER IF EXISTS trg_audit_employees ON public.employees;
CREATE TRIGGER trg_audit_employees
AFTER INSERT OR UPDATE OR DELETE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

DROP TRIGGER IF EXISTS trg_audit_fg_movements ON public.fg_movements;
CREATE TRIGGER trg_audit_fg_movements
AFTER INSERT OR UPDATE OR DELETE ON public.fg_movements
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

DROP TRIGGER IF EXISTS trg_audit_trips ON public.trips;
CREATE TRIGGER trg_audit_trips
AFTER INSERT OR UPDATE OR DELETE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

DROP TRIGGER IF EXISTS trg_audit_cash_handovers ON public.cash_handovers;
CREATE TRIGGER trg_audit_cash_handovers
AFTER INSERT OR UPDATE OR DELETE ON public.cash_handovers
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

COMMIT;
