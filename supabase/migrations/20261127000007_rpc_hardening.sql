-- ====================================================================
-- SR Industries BMS - RPC Security Hardening & Business Rules
-- Migration: 20261127000007_rpc_hardening.sql
-- Enforces:
-- 1. Check auth and role BEFORE idempotency lookup in every RPC
-- 2. Scope idempotency keys to caller (key + user_id)
-- 3. Ownership and role checks in arrive_at_stop & log_order_from_stop (own trip or manager/owner, customer is a stop on that trip)
-- 4. GST flag on deliver_stop (5% tax computed pending CA advice)
-- 5. Local business day IST: (now() at time zone 'Asia/Kolkata')::date instead of UTC date
-- 6. Cap payment at bill total
-- ====================================================================

BEGIN;

-- ====================================================================
-- SECTION 1: Idempotency Keys Scoping to Caller (key + user_id)
-- ====================================================================

ALTER TABLE public.idempotency_keys ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.idempotency_keys DROP CONSTRAINT IF EXISTS idempotency_keys_pkey;
ALTER TABLE public.idempotency_keys ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (key, user_id);

-- ====================================================================
-- SECTION 2: IST Date Helper and Sequence Generators
-- ====================================================================

CREATE OR REPLACE FUNCTION public.ist_date()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date;
$$;

-- Invoice Sequence Helper using IST date
CREATE OR REPLACE FUNCTION public.next_bill_no(p_date date DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_date date := COALESCE(p_date, (now() AT TIME ZONE 'Asia/Kolkata')::date);
  v_month int := EXTRACT(MONTH FROM v_date);
  v_year int := EXTRACT(YEAR FROM v_date);
  v_fy_start int;
  v_fy_end int;
  v_prefix text;
  v_seq_name text;
  v_seq_val bigint;
BEGIN
  IF v_month >= 4 THEN
    v_fy_start := v_year % 100;
    v_fy_end := (v_year + 1) % 100;
  ELSE
    v_fy_start := (v_year - 1) % 100;
    v_fy_end := v_year % 100;
  END IF;

  v_prefix := 'SR/' || lpad(v_fy_start::text, 2, '0') || '-' || lpad(v_fy_end::text, 2, '0') || '/';
  v_seq_name := 'seq_bills_' || lpad(v_fy_start::text, 2, '0') || '_' || lpad(v_fy_end::text, 2, '0');

  EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.' || quote_ident(v_seq_name) || ' START 1';
  EXECUTE 'SELECT nextval(''public.' || quote_ident(v_seq_name) || ''')' INTO v_seq_val;

  RETURN v_prefix || lpad(v_seq_val::text, 4, '0');
END;
$$;

-- Payment Sequence Helper using IST date
CREATE OR REPLACE FUNCTION public.next_payment_id(p_date date DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_date date := COALESCE(p_date, (now() AT TIME ZONE 'Asia/Kolkata')::date);
  v_yymm text := to_char(v_date, 'YYMM');
  v_val bigint;
BEGIN
  v_val := nextval('public.seq_payments');
  RETURN 'PAY-' || v_yymm || '-' || lpad(v_val::text, 4, '0');
END;
$$;

-- ====================================================================
-- SECTION 3: All 13 Hardened SECURITY DEFINER RPCs
-- ====================================================================

-- --------------------------------------------------------------------
-- RPC 1: record_production
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_production(
  p_idempotency_key text,
  p_batch_no text,
  p_product_name text,
  p_cases numeric,
  p_bottles numeric,
  p_run_date date DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  p_destination_location_id text DEFAULT 'PLANT',
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := public.app_role();
  v_emp_id text := public.current_employee_id();
  v_caller_name text;
  v_cached jsonb;
  v_prd_id text;
  v_fgm_id text;
  v_dest text;
  v_res jsonb;
  v_run_date date := COALESCE(p_run_date, (now() AT TIME ZONE 'Asia/Kolkata')::date);
BEGIN
  -- 1. Authentication check BEFORE idempotency lookup
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated: caller must be authenticated';
  END IF;

  -- 2. Role authorization check BEFORE idempotency lookup
  IF NOT public.has_role('owner', 'manager') THEN
    IF NOT (public.has_role('employee') AND EXISTS (
      SELECT 1 FROM public.employees WHERE id = v_emp_id AND 'production' = ANY(duties)
    )) THEN
      RAISE EXCEPTION 'Permission denied: unauthorized role to record production';
    END IF;
  END IF;

  -- 3. Idempotency check scoped to caller (key + user_id)
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = v_uid;
    IF FOUND THEN
      RETURN v_cached;
    END IF;
  END IF;

  IF COALESCE(p_cases, 0) < 0 OR COALESCE(p_bottles, 0) < 0 OR (COALESCE(p_cases, 0) = 0 AND COALESCE(p_bottles, 0) = 0) THEN
    RAISE EXCEPTION 'Production quantities must be greater than zero';
  END IF;

  SELECT COALESCE(full_name, 'Staff') INTO v_caller_name FROM public.profiles WHERE id = v_uid;
  v_dest := COALESCE(p_destination_location_id, 'PLANT');
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = v_dest) THEN
    RAISE EXCEPTION 'Destination location % does not exist', v_dest;
  END IF;

  v_prd_id := 'PRD-' || to_char(v_run_date, 'YYMM') || '-' || lpad(nextval('public.seq_production_runs')::text, 4, '0');
  INSERT INTO public.production_runs (
    id, run_date, batch_no, product_name,
    cases_produced, bottles_produced, destination_location_id, recorded_by, notes
  ) VALUES (
    v_prd_id, v_run_date, p_batch_no, p_product_name,
    COALESCE(p_cases, 0), COALESCE(p_bottles, 0), v_dest, v_uid, p_notes
  );

  v_fgm_id := 'FGM-' || lpad(nextval('public.seq_fg_movements')::text, 6, '0');
  INSERT INTO public.fg_movements (
    id, move_date, product_name, from_location_id, to_location_id,
    cases, bottles, movement_type, reference_type, reference_id, notes, recorded_by
  ) VALUES (
    v_fgm_id, v_run_date, p_product_name, NULL, v_dest,
    COALESCE(p_cases, 0), COALESCE(p_bottles, 0), 'production', 'production_run', v_prd_id, p_notes, v_uid
  );

  v_res := jsonb_build_object(
    'success', true,
    'ok', true,
    'production_id', v_prd_id,
    'movement_id', v_fgm_id,
    'batch_no', p_batch_no,
    'product_name', p_product_name,
    'cases', p_cases,
    'bottles', p_bottles
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'record_production', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- --------------------------------------------------------------------
-- RPC 2: transfer_stock
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_stock(
  p_idempotency_key text,
  p_product_name text,
  p_from_location_id text,
  p_to_location_id text,
  p_cases numeric,
  p_bottles numeric,
  p_move_date date DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_emp_id text := public.current_employee_id();
  v_cached jsonb;
  v_fgm_id text;
  v_avail_bottles numeric;
  v_req_bottles numeric;
  v_case_size int;
  v_res jsonb;
  v_move_date date := COALESCE(p_move_date, (now() AT TIME ZONE 'Asia/Kolkata')::date);
BEGIN
  -- 1. Authentication check BEFORE idempotency lookup
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated: caller must be authenticated';
  END IF;

  -- 2. Role authorization check BEFORE idempotency lookup
  IF NOT public.has_role('owner', 'manager') THEN
    IF NOT (public.has_role('employee') AND EXISTS (
      SELECT 1 FROM public.employees WHERE id = v_emp_id AND 'godown' = ANY(duties)
    )) THEN
      RAISE EXCEPTION 'Permission denied: unauthorized role to transfer stock';
    END IF;
  END IF;

  -- 3. Idempotency check scoped to caller (key + user_id)
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = v_uid;
    IF FOUND THEN
      RETURN v_cached;
    END IF;
  END IF;

  IF p_from_location_id = p_to_location_id THEN
    RAISE EXCEPTION 'Source and destination locations must be different';
  END IF;

  SELECT default_case_size INTO v_case_size FROM public.products WHERE name = p_product_name;
  IF v_case_size IS NULL OR v_case_size < 1 THEN v_case_size := 1; END IF;
  v_req_bottles := (COALESCE(p_cases, 0) * v_case_size) + COALESCE(p_bottles, 0);

  SELECT COALESCE(current_bottles, 0) INTO v_avail_bottles
  FROM public.v_fg_balances
  WHERE location_id = p_from_location_id AND product_name = p_product_name;

  IF COALESCE(v_avail_bottles, 0) < v_req_bottles THEN
    RAISE EXCEPTION 'Insufficient stock at %: required % bottles, available % bottles',
      p_from_location_id, v_req_bottles, COALESCE(v_avail_bottles, 0);
  END IF;

  v_fgm_id := 'FGM-' || lpad(nextval('public.seq_fg_movements')::text, 6, '0');
  INSERT INTO public.fg_movements (
    id, move_date, product_name, from_location_id, to_location_id,
    cases, bottles, movement_type, reference_type, reference_id, notes, recorded_by
  ) VALUES (
    v_fgm_id, v_move_date, p_product_name, p_from_location_id, p_to_location_id,
    COALESCE(p_cases, 0), COALESCE(p_bottles, 0), 'transfer', 'manual', NULL, p_notes, v_uid
  );

  v_res := jsonb_build_object(
    'success', true,
    'ok', true,
    'movement_id', v_fgm_id,
    'from_location', p_from_location_id,
    'to_location', p_to_location_id,
    'product_name', p_product_name,
    'cases', p_cases,
    'bottles', p_bottles
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'transfer_stock', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- --------------------------------------------------------------------
-- RPC 3: create_order
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order(
  p_idempotency_key text,
  p_customer_id text,
  p_items jsonb, -- array of { product_name, cases, bottles, rate_per_case }
  p_requested_date date DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  p_source text DEFAULT 'phone',
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cached jsonb;
  v_order_id text;
  v_item jsonb;
  v_res jsonb;
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_req_date date := COALESCE(p_requested_date, v_today);
BEGIN
  -- 1. Authentication check BEFORE idempotency lookup
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated: caller must be authenticated';
  END IF;

  -- 2. Role authorization check BEFORE idempotency lookup
  IF NOT (public.has_role('owner', 'manager', 'employee', 'admin')) THEN
    RAISE EXCEPTION 'Permission denied: unauthorized role to create order';
  END IF;

  -- 3. Idempotency check scoped to caller (key + user_id)
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = v_uid;
    IF FOUND THEN
      RETURN v_cached;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id) THEN
    RAISE EXCEPTION 'Customer % not found', p_customer_id;
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  v_order_id := 'ORD-' || to_char(v_today, 'YYMM') || '-' || lpad(nextval('public.seq_orders')::text, 4, '0');
  INSERT INTO public.orders (
    id, customer_id, order_date, requested_date, source, notes, status, created_by
  ) VALUES (
    v_order_id, p_customer_id, v_today, v_req_date, p_source, p_notes, 'new', v_uid
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.order_items (
      order_id, product_name, cases, qty_bottles, rate_per_case, case_size
    ) VALUES (
      v_order_id,
      COALESCE(v_item->>'product_name', v_item->>'p'),
      COALESCE(NULLIF(v_item->>'cases', '')::numeric, NULLIF(v_item->>'q', '')::numeric, 0),
      COALESCE(NULLIF(v_item->>'qty_bottles', '')::numeric, NULLIF(v_item->>'bottles', '')::numeric, 0),
      COALESCE(NULLIF(v_item->>'rate_per_case', '')::numeric, NULLIF(v_item->>'rate', '')::numeric, NULLIF(v_item->>'r', '')::numeric, 0),
      GREATEST(COALESCE(NULLIF(v_item->>'case_size', '')::numeric, 1), 1)
    );
  END LOOP;

  v_res := jsonb_build_object(
    'success', true,
    'ok', true,
    'order_id', v_order_id,
    'customer_id', p_customer_id,
    'status', 'new'
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'create_order', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- --------------------------------------------------------------------
-- RPC 4: log_order_from_stop
-- Ownership / role checks: caller must own trip OR be manager/owner; customer must be on that trip
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_order_from_stop(
  p_idempotency_key text,
  p_trip_id text,
  p_customer_id text,
  p_items jsonb,
  p_requested_date date DEFAULT ((now() AT TIME ZONE 'Asia/Kolkata')::date + 1),
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_emp_id text := public.current_employee_id();
  v_trip record;
  v_cached jsonb;
  v_res jsonb;
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  -- 1. Authentication check BEFORE idempotency lookup
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated: caller must be authenticated';
  END IF;

  -- 2. Ownership and role checks BEFORE idempotency lookup
  -- Must be owner, manager, or assigned driver on this trip
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF NOT (public.has_role('owner', 'manager') OR (public.has_role('employee') AND v_trip.driver_id = v_emp_id)) THEN
    RAISE EXCEPTION 'Permission denied: caller does not own trip %', p_trip_id;
  END IF;

  -- Customer must be a stop on that trip
  IF NOT EXISTS (SELECT 1 FROM public.trip_stops WHERE trip_id = p_trip_id AND customer_id = p_customer_id) THEN
    RAISE EXCEPTION 'Customer % is not assigned as a stop on trip %', p_customer_id, p_trip_id;
  END IF;

  -- 3. Idempotency check scoped to caller (key + user_id)
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = v_uid;
    IF FOUND THEN
      RETURN v_cached;
    END IF;
  END IF;

  -- 4. Delegate creation to create_order with IST default date
  v_res := public.create_order(
    p_idempotency_key := p_idempotency_key,
    p_customer_id := p_customer_id,
    p_items := p_items,
    p_requested_date := COALESCE(p_requested_date, v_today + 1),
    p_source := 'stop_visit',
    p_notes := 'Booked during trip ' || p_trip_id || '. ' || TRIM(p_notes)
  );

  RETURN v_res;
END;
$$;

-- --------------------------------------------------------------------
-- RPC 5: plan_trip
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.plan_trip(
  p_idempotency_key text,
  p_vehicle_id text,
  p_driver_id text,
  p_trip_date date DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  p_stops jsonb DEFAULT '[]'::jsonb,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cached jsonb;
  v_trip_id text;
  v_stop jsonb;
  v_stop_id text;
  v_item jsonb;
  v_seq int := 1;
  v_res jsonb;
  v_trip_date date := COALESCE(p_trip_date, (now() AT TIME ZONE 'Asia/Kolkata')::date);
BEGIN
  -- 1. Authentication check BEFORE idempotency lookup
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated: caller must be authenticated';
  END IF;

  -- 2. Role authorization check BEFORE idempotency lookup
  IF NOT public.has_role('owner', 'manager') THEN
    RAISE EXCEPTION 'Permission denied: only managers and owners can plan trips';
  END IF;

  -- 3. Idempotency check scoped to caller (key + user_id)
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = v_uid;
    IF FOUND THEN
      RETURN v_cached;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE id = p_vehicle_id) THEN
    RAISE EXCEPTION 'Vehicle % not found', p_vehicle_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = p_driver_id) THEN
    RAISE EXCEPTION 'Driver employee % not found', p_driver_id;
  END IF;

  v_trip_id := 'TR-' || to_char(v_trip_date, 'YYMM') || '-' || lpad(nextval('public.seq_trips')::text, 4, '0');
  INSERT INTO public.trips (
    id, vehicle_id, driver_id, trip_date, status, notes, created_by
  ) VALUES (
    v_trip_id, p_vehicle_id, p_driver_id, v_trip_date, 'planned', p_notes, v_uid
  );

  FOR v_stop IN SELECT * FROM jsonb_array_elements(p_stops) LOOP
    v_stop_id := v_trip_id || '-' || lpad(v_seq::text, 2, '0');
    INSERT INTO public.trip_stops (
      id, trip_id, sequence_no, customer_id, order_id, planned_cases
    ) VALUES (
      v_stop_id,
      v_trip_id,
      v_seq,
      v_stop->>'customer_id',
      v_stop->>'order_id',
      COALESCE((v_stop->>'planned_cases')::numeric, 0)
    );

    IF v_stop->'items' IS NOT NULL AND jsonb_typeof(v_stop->'items') = 'array' THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_stop->'items') LOOP
        INSERT INTO public.trip_stop_items (
          trip_stop_id, product_name, planned_cases, planned_bottles, rate_per_case
        ) VALUES (
          v_stop_id,
          v_item->>'product_name',
          COALESCE((v_item->>'cases')::numeric, 0),
          COALESCE((v_item->>'bottles')::numeric, 0),
          (v_item->>'rate_per_case')::numeric
        );
      END LOOP;
    END IF;

    IF v_stop->>'order_id' IS NOT NULL AND v_stop->>'order_id' <> '' THEN
      UPDATE public.orders SET status = 'planned' WHERE id = v_stop->>'order_id';
    END IF;

    v_seq := v_seq + 1;
  END LOOP;

  v_res := jsonb_build_object(
    'success', true,
    'ok', true,
    'trip_id', v_trip_id,
    'status', 'planned',
    'stops_count', v_seq - 1
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'plan_trip', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- --------------------------------------------------------------------
-- RPC 6: confirm_loading
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_loading(
  p_idempotency_key text,
  p_trip_id text,
  p_start_odometer numeric,
  p_godown_location_id text DEFAULT 'PLANT'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_emp_id text := public.current_employee_id();
  v_cached jsonb;
  v_trip record;
  v_item record;
  v_fgm_id text;
  v_veh_loc text;
  v_res jsonb;
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  -- 1. Authentication check BEFORE idempotency lookup
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated: caller must be authenticated';
  END IF;

  -- 2. Role / ownership authorization check BEFORE idempotency lookup
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF NOT (public.has_role('owner', 'manager') OR (public.has_role('employee') AND v_trip.driver_id = v_emp_id)) THEN
    RAISE EXCEPTION 'Permission denied: caller cannot confirm loading for trip %', p_trip_id;
  END IF;

  -- 3. Idempotency check scoped to caller (key + user_id)
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = v_uid;
    IF FOUND THEN
      RETURN v_cached;
    END IF;
  END IF;

  IF v_trip.status = 'cancelled' THEN
    RAISE EXCEPTION 'trip_cancelled: trip has been cancelled';
  END IF;

  IF v_trip.status <> 'planned' THEN
    RAISE EXCEPTION 'Trip % is already in status %', p_trip_id, v_trip.status;
  END IF;

  IF p_start_odometer IS NULL OR p_start_odometer < 0 THEN
    RAISE EXCEPTION 'Start odometer must be valid positive number';
  END IF;

  v_veh_loc := v_trip.vehicle_id;

  FOR v_item IN
    SELECT tsi.product_name, SUM(tsi.planned_cases) AS tot_cases, SUM(tsi.planned_bottles) AS tot_bottles
    FROM public.trip_stop_items tsi
    JOIN public.trip_stops ts ON ts.id = tsi.trip_stop_id
    WHERE ts.trip_id = p_trip_id
    GROUP BY tsi.product_name
  LOOP
    v_fgm_id := 'FGM-' || lpad(nextval('public.seq_fg_movements')::text, 6, '0');
    INSERT INTO public.fg_movements (
      id, move_date, product_name, from_location_id, to_location_id,
      cases, bottles, movement_type, reference_type, reference_id, notes, recorded_by
    ) VALUES (
      v_fgm_id, v_today, v_item.product_name, p_godown_location_id, v_veh_loc,
      v_item.tot_cases, v_item.tot_bottles, 'loading', 'trip', p_trip_id, 'Loaded for trip ' || p_trip_id, v_uid
    );
  END LOOP;

  UPDATE public.trips
  SET status = 'on_route',
      start_odometer = p_start_odometer,
      loaded_at = now()
  WHERE id = p_trip_id;

  UPDATE public.orders
  SET status = 'dispatched'
  WHERE id IN (SELECT order_id FROM public.trip_stops WHERE trip_id = p_trip_id AND order_id IS NOT NULL);

  v_res := jsonb_build_object(
    'success', true,
    'ok', true,
    'trip_id', p_trip_id,
    'status', 'on_route',
    'start_odometer', p_start_odometer,
    'loaded_at', now()
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'confirm_loading', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- --------------------------------------------------------------------
-- RPC 7: arrive_at_stop
-- Ownership / role checks: caller must own trip OR be manager/owner; customer must be on that trip
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.arrive_at_stop(
  p_idempotency_key text,
  p_trip_id text,
  p_customer_id text,
  p_arrival_lat numeric,
  p_arrival_lng numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_emp_id text := public.current_employee_id();
  v_trip record;
  v_cached jsonb;
  v_cust record;
  v_dist_m numeric(10,2) := NULL;
  v_dlat numeric;
  v_dlon numeric;
  v_a numeric;
  v_c numeric;
  v_res jsonb;
BEGIN
  -- 1. Authentication check BEFORE idempotency lookup
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated: caller must be authenticated';
  END IF;

  -- 2. Ownership and role checks BEFORE idempotency lookup
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF NOT (public.has_role('owner', 'manager') OR (public.has_role('employee') AND v_trip.driver_id = v_emp_id)) THEN
    RAISE EXCEPTION 'Permission denied: caller does not own trip %', p_trip_id;
  END IF;

  -- Customer must be a stop on that trip
  IF NOT EXISTS (SELECT 1 FROM public.trip_stops WHERE trip_id = p_trip_id AND customer_id = p_customer_id) THEN
    RAISE EXCEPTION 'Customer % is not assigned as a stop on trip %', p_customer_id, p_trip_id;
  END IF;

  -- 3. Idempotency check scoped to caller (key + user_id)
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = v_uid;
    IF FOUND THEN
      RETURN v_cached;
    END IF;
  END IF;

  IF v_trip.status = 'cancelled' THEN
    RAISE EXCEPTION 'trip_cancelled: trip has been cancelled';
  END IF;

  SELECT lat, lng INTO v_cust FROM public.customers WHERE id = p_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer % not found', p_customer_id;
  END IF;

  -- Calculate Haversine distance if customer has saved coordinates
  IF v_cust.lat IS NOT NULL AND v_cust.lng IS NOT NULL AND p_arrival_lat IS NOT NULL AND p_arrival_lng IS NOT NULL THEN
    v_dlat := radians(p_arrival_lat - v_cust.lat);
    v_dlon := radians(p_arrival_lng - v_cust.lng);
    v_a := sin(v_dlat/2)^2 + cos(radians(v_cust.lat)) * cos(radians(p_arrival_lat)) * sin(v_dlon/2)^2;
    v_c := 2 * atan2(sqrt(v_a), sqrt(1 - v_a));
    v_dist_m := ROUND((6371000 * v_c)::numeric, 2);
  END IF;

  -- Update trip stop
  UPDATE public.trip_stops
  SET arrival_lat = p_arrival_lat,
      arrival_lng = p_arrival_lng,
      arrival_time = now(),
      distance_m = v_dist_m,
      result = 'arrived'
  WHERE trip_id = p_trip_id AND customer_id = p_customer_id;

  v_res := jsonb_build_object(
    'success', true,
    'ok', true,
    'trip_id', p_trip_id,
    'customer_id', p_customer_id,
    'distance_m', v_dist_m,
    'arrived_at', now()
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'arrive_at_stop', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- --------------------------------------------------------------------
-- RPC 8: deliver_stop (Atomic Delivery Transaction with GST & Capped Payment)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deliver_stop(
  p_idempotency_key text,
  p_trip_id text,
  p_customer_id text,
  p_items jsonb, -- array of { product_name, cases, bottles, rate_per_case, case_size }
  p_amount_received numeric DEFAULT 0,
  p_payment_mode text DEFAULT 'Cash',
  p_empty_cans_returned int DEFAULT 0,
  p_offline boolean DEFAULT false,
  p_provisional_id text DEFAULT NULL,
  p_notes text DEFAULT '',
  p_gst boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_emp_id text := public.current_employee_id();
  v_caller_name text;
  v_cached jsonb;
  v_trip record;
  v_cust record;
  v_stop record;
  v_bill_id text;
  v_pay_id text := NULL;
  v_del_id text;
  v_fgm_id text;
  v_item jsonb;
  v_prod_name text;
  v_cases numeric(12,2);
  v_bottles numeric(12,2);
  v_rate numeric(12,2);
  v_case_size numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_line_amt numeric(12,2);
  v_tax numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_paid numeric(12,2) := 0;
  v_current_dues numeric(12,2) := 0;
  v_credit_warn boolean := false;
  v_credit_warn_msg text := NULL;
  v_res jsonb;
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  -- 1. Authentication check BEFORE idempotency lookup
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated: caller must be authenticated';
  END IF;

  -- 2. Role and trip ownership check BEFORE idempotency lookup
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF v_trip.status = 'cancelled' THEN
    RAISE EXCEPTION 'trip_cancelled: trip has been cancelled';
  END IF;

  IF NOT (public.has_role('owner', 'manager') OR (public.has_role('employee') AND v_trip.driver_id = v_emp_id)) THEN
    RAISE EXCEPTION 'Permission denied to complete delivery for trip %', p_trip_id;
  END IF;

  SELECT * INTO v_cust FROM public.customers WHERE id = p_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer % not found', p_customer_id;
  END IF;

  SELECT * INTO v_stop FROM public.trip_stops WHERE trip_id = p_trip_id AND customer_id = p_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stop for customer % not found on trip %', p_customer_id, p_trip_id;
  END IF;

  -- 3. Idempotency check scoped to caller (key + user_id)
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = v_uid;
    IF FOUND THEN
      RETURN v_cached;
    END IF;
  END IF;

  SELECT COALESCE(full_name, 'Staff') INTO v_caller_name FROM public.profiles WHERE id = v_uid;

  -- 4. Validate items and calculate subtotal
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Delivery must contain at least one item';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_rate := COALESCE(NULLIF(v_item->>'rate_per_case', '')::numeric, NULLIF(v_item->>'rate', '')::numeric, NULLIF(v_item->>'r', '')::numeric, 0);
    IF v_rate < 0 THEN
      RAISE EXCEPTION 'Rate per case cannot be negative';
    END IF;
    v_cases := COALESCE(NULLIF(v_item->>'cases', '')::numeric, NULLIF(v_item->>'q', '')::numeric, 0);
    v_case_size := GREATEST(COALESCE(NULLIF(v_item->>'case_size', '')::numeric, 1), 1);
    v_bottles := COALESCE(NULLIF(v_item->>'bottles', '')::numeric, NULLIF(v_item->>'qty_bottles', '')::numeric, (v_cases * v_case_size));
    IF v_cases < 0 OR v_bottles < 0 THEN
      RAISE EXCEPTION 'Item quantities cannot be negative';
    END IF;
    IF v_cases = 0 AND v_bottles > 0 THEN
      v_cases := (v_bottles / v_case_size);
    END IF;
    -- Line amount = cases * rate
    v_line_amt := ROUND((v_cases * v_rate)::numeric, 2);
    v_subtotal := v_subtotal + v_line_amt;
  END LOOP;

  -- 5. GST computation pending CA advice (5% tax when p_gst is true)
  IF p_gst THEN
    v_tax := ROUND((v_subtotal * 0.05)::numeric, 2);
    v_total := v_subtotal + v_tax;
  ELSE
    v_tax := 0;
    v_total := v_subtotal;
  END IF;

  -- 6. Cap payment at bill total
  v_paid := LEAST(GREATEST(COALESCE(p_amount_received, 0), 0), v_total);

  -- 7. Credit limit check (warning only)
  IF v_cust.credit_limit > 0 THEN
    SELECT COALESCE(SUM(b.total - b.paid), 0) INTO v_current_dues
    FROM public.bills b
    WHERE b.customer_id = p_customer_id AND b.status = 'active';

    IF (v_current_dues + (v_total - v_paid)) > v_cust.credit_limit THEN
      v_credit_warn := true;
      v_credit_warn_msg := format('Credit limit warning: Total dues of ₹%s exceed limit of ₹%s', (v_current_dues + (v_total - v_paid)), v_cust.credit_limit);
    END IF;
  END IF;

  -- 8. Mint Indian FY Invoice Number using IST date
  v_bill_id := public.next_bill_no(v_today);

  -- 9. Insert Bill
  INSERT INTO public.bills (
    id, bill_date, customer_id, customer_name, mobile, address, gst,
    subtotal, tax, total, paid, payment_mode, status, provisional_id, created_by
  ) VALUES (
    v_bill_id, v_today, p_customer_id, v_cust.name, v_cust.phone, v_cust.area, p_gst,
    v_subtotal, v_tax, v_total, v_paid, COALESCE(p_payment_mode, 'Cash'), 'active',
    CASE WHEN p_offline THEN p_provisional_id ELSE NULL END, v_uid
  );

  -- 10. Insert Bill Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_prod_name := COALESCE(v_item->>'product_name', v_item->>'p');
    v_rate := COALESCE(NULLIF(v_item->>'rate_per_case', '')::numeric, NULLIF(v_item->>'rate', '')::numeric, NULLIF(v_item->>'r', '')::numeric, 0);
    v_cases := COALESCE(NULLIF(v_item->>'cases', '')::numeric, NULLIF(v_item->>'q', '')::numeric, 0);
    v_case_size := GREATEST(COALESCE(NULLIF(v_item->>'case_size', '')::numeric, 1), 1);
    v_bottles := COALESCE(NULLIF(v_item->>'bottles', '')::numeric, NULLIF(v_item->>'qty_bottles', '')::numeric, (v_cases * v_case_size));
    IF v_cases = 0 AND v_bottles > 0 THEN
      v_cases := (v_bottles / v_case_size);
    END IF;

    INSERT INTO public.bill_items (
      bill_id, product_name, qty_bottles, rate_per_case, case_size, rate_source, entered_by
    ) VALUES (
      v_bill_id,
      v_prod_name,
      v_bottles,
      v_rate,
      v_case_size,
      'manual',
      v_caller_name
    );

    -- 11. Stock deduction from vehicle location
    v_fgm_id := 'FGM-' || lpad(nextval('public.seq_fg_movements')::text, 6, '0');
    INSERT INTO public.fg_movements (
      id, move_date, product_name, from_location_id, to_location_id,
      cases, bottles, movement_type, reference_type, reference_id, notes, recorded_by
    ) VALUES (
      v_fgm_id, v_today, v_prod_name, v_trip.vehicle_id, NULL,
      v_cases, v_bottles,
      'dispatch', 'delivery', v_bill_id, 'Delivered to ' || v_cust.name || ' on trip ' || p_trip_id, v_uid
    );
  END LOOP;

  -- 12. Insert Payment record if amount received (capped at bill total)
  IF v_paid > 0 THEN
    v_pay_id := public.next_payment_id(v_today);
    INSERT INTO public.payments (
      id, payment_date, customer_id, bill_id, amount, mode, notes, created_by
    ) VALUES (
      v_pay_id, v_today, p_customer_id, v_bill_id, v_paid,
      COALESCE(p_payment_mode, 'Cash'), 'Received against bill ' || v_bill_id, v_uid
    );
  END IF;

  -- 13. Insert Delivery record
  v_del_id := 'DEL-' || to_char(v_today, 'YYMM') || '-' || lpad(nextval('public.seq_deliveries')::text, 4, '0');
  INSERT INTO public.deliveries (
    id, trip_stop_id, trip_id, customer_id, bill_id, payment_id,
    delivery_time, provisional_id, empty_cans_returned, delivered_by
  ) VALUES (
    v_del_id, v_stop.id, p_trip_id, p_customer_id, v_bill_id, v_pay_id,
    now(), p_provisional_id, COALESCE(p_empty_cans_returned, 0), v_trip.driver_id
  );

  -- 14. Update Trip Stop status
  UPDATE public.trip_stops
  SET result = 'delivered',
      delivered_at = now()
  WHERE id = v_stop.id;

  -- Update stop items delivered quantities
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_prod_name := COALESCE(v_item->>'product_name', v_item->>'p');
    v_rate := COALESCE(NULLIF(v_item->>'rate_per_case', '')::numeric, NULLIF(v_item->>'rate', '')::numeric, NULLIF(v_item->>'r', '')::numeric, 0);
    v_cases := COALESCE(NULLIF(v_item->>'cases', '')::numeric, NULLIF(v_item->>'q', '')::numeric, 0);
    v_case_size := GREATEST(COALESCE(NULLIF(v_item->>'case_size', '')::numeric, 1), 1);
    v_bottles := COALESCE(NULLIF(v_item->>'bottles', '')::numeric, NULLIF(v_item->>'qty_bottles', '')::numeric, (v_cases * v_case_size));
    IF v_cases = 0 AND v_bottles > 0 THEN
      v_cases := (v_bottles / v_case_size);
    END IF;

    UPDATE public.trip_stop_items
    SET delivered_cases = v_cases,
        delivered_bottles = v_bottles,
        rate_per_case = v_rate
    WHERE trip_stop_id = v_stop.id AND product_name = v_prod_name;
  END LOOP;

  v_res := jsonb_build_object(
    'success', true,
    'ok', true,
    'bill_id', v_bill_id,
    'official_invoice_no', v_bill_id,
    'payment_id', v_pay_id,
    'delivery_id', v_del_id,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'gst', p_gst,
    'total_amount', v_total,
    'amount_paid', v_paid,
    'balance_due', v_total - v_paid,
    'provisional_id', p_provisional_id,
    'credit_limit_warning', v_credit_warn,
    'warning_message', v_credit_warn_msg
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'deliver_stop', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- --------------------------------------------------------------------
-- RPC 9: skip_stop
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.skip_stop(
  p_idempotency_key text,
  p_trip_id text,
  p_customer_id text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_emp_id text := public.current_employee_id();
  v_trip record;
  v_cached jsonb;
  v_res jsonb;
BEGIN
  -- 1. Authentication check BEFORE idempotency lookup
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated: caller must be authenticated';
  END IF;

  -- 2. Role / trip ownership check BEFORE idempotency lookup
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF NOT (public.has_role('owner', 'manager') OR (public.has_role('employee') AND v_trip.driver_id = v_emp_id)) THEN
    RAISE EXCEPTION 'Permission denied: caller cannot skip stop for trip %', p_trip_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.trip_stops WHERE trip_id = p_trip_id AND customer_id = p_customer_id) THEN
    RAISE EXCEPTION 'Customer % is not assigned as a stop on trip %', p_customer_id, p_trip_id;
  END IF;

  -- 3. Idempotency check scoped to caller (key + user_id)
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = v_uid;
    IF FOUND THEN
      RETURN v_cached;
    END IF;
  END IF;

  IF v_trip.status = 'cancelled' THEN
    RAISE EXCEPTION 'trip_cancelled: trip has been cancelled';
  END IF;

  UPDATE public.trip_stops
  SET result = 'skipped',
      skip_reason = p_reason
  WHERE trip_id = p_trip_id AND customer_id = p_customer_id;

  v_res := jsonb_build_object(
    'success', true,
    'ok', true,
    'trip_id', p_trip_id,
    'customer_id', p_customer_id,
    'status', 'skipped',
    'reason', p_reason
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'skip_stop', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- --------------------------------------------------------------------
-- RPC 10: set_customer_location
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_customer_location(
  p_idempotency_key text,
  p_customer_id text,
  p_lat numeric,
  p_lng numeric,
  p_accuracy_m numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := public.app_role();
  v_cached jsonb;
  v_cust record;
  v_res jsonb;
BEGIN
  -- 1. Authentication check BEFORE idempotency lookup
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated: caller must be authenticated';
  END IF;

  -- 2. Role authorization check BEFORE idempotency lookup
  SELECT lat, lng INTO v_cust FROM public.customers WHERE id = p_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer % not found', p_customer_id;
  END IF;

  IF v_role = 'employee' AND v_cust.lat IS NOT NULL AND v_cust.lng IS NOT NULL THEN
    RAISE EXCEPTION 'Permission denied: employees can only capture location when empty. Contact a manager to modify coordinates.';
  END IF;

  IF NOT (public.has_role('owner', 'manager', 'employee', 'admin')) THEN
    RAISE EXCEPTION 'Permission denied to update customer location';
  END IF;

  -- 3. Idempotency check scoped to caller (key + user_id)
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = v_uid;
    IF FOUND THEN
      RETURN v_cached;
    END IF;
  END IF;

  IF p_lat IS NULL OR p_lng IS NULL THEN
    RAISE EXCEPTION 'Latitude and longitude coordinates are required';
  END IF;

  UPDATE public.customers
  SET lat = p_lat,
      lng = p_lng,
      accuracy_m = p_accuracy_m,
      location_set_by = v_uid,
      location_set_at = now()
  WHERE id = p_customer_id;

  v_res := jsonb_build_object(
    'success', true,
    'ok', true,
    'customer_id', p_customer_id,
    'lat', p_lat,
    'lng', p_lng,
    'accuracy_m', p_accuracy_m,
    'set_at', now()
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'set_customer_location', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- --------------------------------------------------------------------
-- RPC 11: close_trip
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_trip(
  p_idempotency_key text,
  p_trip_id text,
  p_end_odometer numeric,
  p_notes text DEFAULT '',
  p_godown_location_id text DEFAULT 'PLANT'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_emp_id text := public.current_employee_id();
  v_cached jsonb;
  v_trip record;
  v_item record;
  v_fgm_id text;
  v_res jsonb;
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  -- 1. Authentication check BEFORE idempotency lookup
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated: caller must be authenticated';
  END IF;

  -- 2. Role / ownership authorization check BEFORE idempotency lookup
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF NOT (public.has_role('owner', 'manager') OR (public.has_role('employee') AND v_trip.driver_id = v_emp_id)) THEN
    RAISE EXCEPTION 'Permission denied: caller cannot close trip %', p_trip_id;
  END IF;

  -- 3. Idempotency check scoped to caller (key + user_id)
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = v_uid;
    IF FOUND THEN
      RETURN v_cached;
    END IF;
  END IF;

  IF v_trip.status = 'cancelled' THEN
    RAISE EXCEPTION 'trip_cancelled: trip has been cancelled';
  END IF;

  IF v_trip.status <> 'on_route' THEN
    RAISE EXCEPTION 'Trip % cannot be closed from status %', p_trip_id, v_trip.status;
  END IF;

  IF p_end_odometer IS NOT NULL AND v_trip.start_odometer IS NOT NULL AND p_end_odometer < v_trip.start_odometer THEN
    RAISE EXCEPTION 'End odometer (%) cannot be less than start odometer (%)', p_end_odometer, v_trip.start_odometer;
  END IF;

  -- Reconcile leftover inventory on vehicle
  FOR v_item IN
    SELECT product_name, current_cases, current_bottles
    FROM public.v_fg_balances
    WHERE location_id = v_trip.vehicle_id AND (current_cases > 0 OR current_bottles > 0)
  LOOP
    IF v_item.current_cases > 0 OR v_item.current_bottles > 0 THEN
      v_fgm_id := 'FGM-' || lpad(nextval('public.seq_fg_movements')::text, 6, '0');
      INSERT INTO public.fg_movements (
        id, move_date, product_name, from_location_id, to_location_id,
        cases, bottles, movement_type, reference_type, reference_id, notes, recorded_by
      ) VALUES (
        v_fgm_id, v_today, v_item.product_name, v_trip.vehicle_id, p_godown_location_id,
        v_item.current_cases, v_item.current_bottles, 'unload', 'trip_close', p_trip_id,
        'Returned stock to godown on trip close ' || p_trip_id, v_uid
      );
    END IF;
  END LOOP;

  UPDATE public.trips
  SET status = 'completed',
      end_odometer = p_end_odometer,
      closed_at = now(),
      notes = TRIM(COALESCE(notes, '') || ' ' || COALESCE(p_notes, ''))
  WHERE id = p_trip_id;

  v_res := jsonb_build_object(
    'success', true,
    'ok', true,
    'trip_id', p_trip_id,
    'status', 'completed',
    'end_odometer', p_end_odometer,
    'closed_at', now()
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'close_trip', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- --------------------------------------------------------------------
-- RPC 12: handover_cash
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handover_cash(
  p_idempotency_key text,
  p_trip_id text,
  p_supervisor_id text,
  p_gross_cash numeric,
  p_expenses numeric,
  p_net_cash numeric,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_emp_id text := public.current_employee_id();
  v_cached jsonb;
  v_trip record;
  v_cho_id text;
  v_res jsonb;
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  -- 1. Authentication check BEFORE idempotency lookup
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated: caller must be authenticated';
  END IF;

  -- 2. Role / ownership authorization check BEFORE idempotency lookup
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF NOT (public.has_role('owner', 'manager') OR (public.has_role('employee') AND v_trip.driver_id = v_emp_id)) THEN
    RAISE EXCEPTION 'Permission denied: caller cannot handover cash for trip %', p_trip_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = p_supervisor_id) THEN
    RAISE EXCEPTION 'Supervisor % not found in employees', p_supervisor_id;
  END IF;

  -- 3. Idempotency check scoped to caller (key + user_id)
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = v_uid;
    IF FOUND THEN
      RETURN v_cached;
    END IF;
  END IF;

  IF (COALESCE(p_gross_cash, 0) - COALESCE(p_expenses, 0)) <> COALESCE(p_net_cash, 0) THEN
    RAISE EXCEPTION 'Net cash calculation mismatch: gross (%) - expenses (%) must equal net (%)',
      p_gross_cash, p_expenses, p_net_cash;
  END IF;

  v_cho_id := 'CHO-' || to_char(v_today, 'YYMM') || '-' || lpad(nextval('public.seq_handovers')::text, 4, '0');
  INSERT INTO public.cash_handovers (
    id, trip_id, driver_id, supervisor_id, handover_time,
    gross_cash, expenses, net_cash, status, notes
  ) VALUES (
    v_cho_id, p_trip_id, v_trip.driver_id, p_supervisor_id, now(),
    p_gross_cash, p_expenses, p_net_cash, 'submitted', p_notes
  );

  v_res := jsonb_build_object(
    'success', true,
    'ok', true,
    'handover_id', v_cho_id,
    'trip_id', p_trip_id,
    'net_cash', p_net_cash,
    'status', 'submitted'
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'handover_cash', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- --------------------------------------------------------------------
-- RPC 13: production_plan
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.production_plan(
  p_target_date date DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_tgt_date date := COALESCE(p_target_date, v_today);
  v_demand jsonb;
  v_stock jsonb;
  v_res jsonb;
BEGIN
  -- 1. Authentication check
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated: caller must be authenticated';
  END IF;

  -- 2. Role authorization check
  IF NOT public.has_role('owner', 'manager') THEN
    RAISE EXCEPTION 'Permission denied: only managers and owners can access production plan';
  END IF;

  -- 3. Calculate order demand for requested target date
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'product_name', oi.product_name,
    'total_cases_demanded', SUM(oi.cases),
    'total_bottles_demanded', SUM(oi.bottles)
  )), '[]'::jsonb) INTO v_demand
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.requested_date = v_tgt_date AND o.status IN ('new', 'planned')
  GROUP BY oi.product_name;

  -- 4. Get current stock at Plant
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'product_name', bal.product_name,
    'current_cases', bal.current_cases,
    'current_bottles', bal.current_bottles
  )), '[]'::jsonb) INTO v_stock
  FROM public.v_fg_balances bal
  WHERE bal.location_id = 'PLANT';

  v_res := jsonb_build_object(
    'success', true,
    'ok', true,
    'target_date', v_tgt_date,
    'plant_stock', v_stock,
    'order_demand', v_demand
  );

  RETURN v_res;
END;
$$;

-- ====================================================================
-- SECTION 4: Function Execution Privileges
-- ====================================================================

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

COMMIT;
