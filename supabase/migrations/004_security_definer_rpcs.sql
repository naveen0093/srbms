-- ====================================================================
-- SR Industries BMS - Security Definer RPCs (13 Operational & Financial Functions)
-- Migration: 004_security_definer_rpcs.sql
-- All identities derived from auth.uid(). Search_path locked.
-- Idempotency keys enforced. Offline provisional receipt sync handled.
-- ====================================================================

BEGIN;

-- ====================================================================
-- RPC 1: record_production
-- ====================================================================
CREATE OR REPLACE FUNCTION public.record_production(
  p_idempotency_key text,
  p_batch_no text,
  p_product_name text,
  p_cases numeric,
  p_bottles numeric,
  p_destination_location_id text DEFAULT 'PLANT',
  p_run_date date DEFAULT CURRENT_DATE,
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
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached FROM public.idempotency_keys WHERE key = p_idempotency_key;
    IF FOUND THEN RETURN v_cached; END IF;
  END IF;

  -- Role authorization check
  IF NOT public.has_role('owner', 'manager') THEN
    IF NOT (public.has_role('employee') AND EXISTS (
      SELECT 1 FROM public.employees WHERE id = v_emp_id AND 'production' = ANY(duties)
    )) THEN
      RAISE EXCEPTION 'Permission denied: unauthorized role to record production';
    END IF;
  END IF;

  IF COALESCE(p_cases, 0) < 0 OR COALESCE(p_bottles, 0) < 0 OR (COALESCE(p_cases, 0) = 0 AND COALESCE(p_bottles, 0) = 0) THEN
    RAISE EXCEPTION 'Production quantities must be greater than zero';
  END IF;

  SELECT full_name INTO v_caller_name FROM public.profiles WHERE id = v_uid;
  v_dest := COALESCE(p_destination_location_id, 'PLANT');
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = v_dest) THEN
    RAISE EXCEPTION 'Destination location % does not exist', v_dest;
  END IF;

  v_prd_id := 'PRD-' || to_char(COALESCE(p_run_date, CURRENT_DATE), 'YYMM') || '-' || lpad(nextval('public.seq_production_runs')::text, 4, '0');
  v_fgm_id := 'FGM-' || lpad(nextval('public.seq_fg_movements')::text, 6, '0');

  -- 1. Insert production run
  INSERT INTO public.production_runs (
    id, run_date, batch_no, product_name, cases_produced, bottles_produced,
    destination_location_id, supervisor_id, recorded_by, notes
  ) VALUES (
    v_prd_id, COALESCE(p_run_date, CURRENT_DATE), p_batch_no, p_product_name,
    COALESCE(p_cases, 0), COALESCE(p_bottles, 0), v_dest, v_emp_id, v_uid, TRIM(p_notes)
  );

  -- 2. Credit inventory in fg_movements ledger
  INSERT INTO public.fg_movements (
    id, move_date, product_name, from_location_id, to_location_id,
    cases, bottles, movement_type, reference_type, reference_id, notes, recorded_by
  ) VALUES (
    v_fgm_id, COALESCE(p_run_date, CURRENT_DATE), p_product_name, NULL, v_dest,
    COALESCE(p_cases, 0), COALESCE(p_bottles, 0), 'production', 'production_run', v_prd_id,
    'Manufactured batch ' || p_batch_no, v_uid
  );

  v_res := jsonb_build_object(
    'success', true,
    'production_run_id', v_prd_id,
    'batch_no', p_batch_no,
    'cases', p_cases,
    'bottles', p_bottles,
    'destination', v_dest
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'record_production', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- ====================================================================
-- RPC 2: transfer_stock
-- ====================================================================
CREATE OR REPLACE FUNCTION public.transfer_stock(
  p_idempotency_key text,
  p_from_location_id text,
  p_to_location_id text,
  p_product_name text,
  p_cases numeric,
  p_bottles numeric,
  p_move_date date DEFAULT CURRENT_DATE,
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
  v_res jsonb;
BEGIN
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached FROM public.idempotency_keys WHERE key = p_idempotency_key;
    IF FOUND THEN RETURN v_cached; END IF;
  END IF;

  IF NOT public.has_role('owner', 'manager') THEN
    IF NOT (public.has_role('employee') AND EXISTS (
      SELECT 1 FROM public.employees WHERE id = v_emp_id AND ('godown' = ANY(duties) OR 'delivery' = ANY(duties))
    )) THEN
      RAISE EXCEPTION 'Permission denied: unauthorized role to transfer stock';
    END IF;
  END IF;

  IF p_from_location_id = p_to_location_id THEN
    RAISE EXCEPTION 'From and To locations cannot be the same';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_from_location_id) THEN
    RAISE EXCEPTION 'Origin location % not found', p_from_location_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_to_location_id) THEN
    RAISE EXCEPTION 'Destination location % not found', p_to_location_id;
  END IF;

  IF COALESCE(p_cases, 0) < 0 OR COALESCE(p_bottles, 0) < 0 OR (COALESCE(p_cases, 0) = 0 AND COALESCE(p_bottles, 0) = 0) THEN
    RAISE EXCEPTION 'Transfer quantities must be greater than zero';
  END IF;

  v_fgm_id := 'FGM-' || lpad(nextval('public.seq_fg_movements')::text, 6, '0');

  INSERT INTO public.fg_movements (
    id, move_date, product_name, from_location_id, to_location_id,
    cases, bottles, movement_type, reference_type, reference_id, notes, recorded_by
  ) VALUES (
    v_fgm_id, COALESCE(p_move_date, CURRENT_DATE), p_product_name, p_from_location_id, p_to_location_id,
    COALESCE(p_cases, 0), COALESCE(p_bottles, 0), 'transfer', NULL, NULL,
    TRIM(p_notes), v_uid
  );

  v_res := jsonb_build_object(
    'success', true,
    'movement_id', v_fgm_id,
    'from', p_from_location_id,
    'to', p_to_location_id,
    'product', p_product_name,
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

-- ====================================================================
-- RPC 3: create_order
-- ====================================================================
CREATE OR REPLACE FUNCTION public.create_order(
  p_idempotency_key text,
  p_customer_id text,
  p_items jsonb,
  p_requested_date date DEFAULT CURRENT_DATE,
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
BEGIN
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached FROM public.idempotency_keys WHERE key = p_idempotency_key;
    IF FOUND THEN RETURN v_cached; END IF;
  END IF;

  IF NOT public.has_role('owner', 'manager', 'employee') THEN
    RAISE EXCEPTION 'Permission denied to create orders';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id) THEN
    RAISE EXCEPTION 'Customer % not found', p_customer_id;
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  v_order_id := 'ORD-' || to_char(CURRENT_DATE, 'YYMM') || '-' || lpad(nextval('public.seq_orders')::text, 4, '0');

  INSERT INTO public.orders (
    id, customer_id, order_date, requested_date, source, status, notes, created_by
  ) VALUES (
    v_order_id, p_customer_id, CURRENT_DATE, COALESCE(p_requested_date, CURRENT_DATE),
    COALESCE(p_source, 'phone'), 'new', TRIM(p_notes), v_uid
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF (v_item->>'rate_per_case')::numeric < 0 THEN
      RAISE EXCEPTION 'Item rate cannot be negative';
    END IF;
    INSERT INTO public.order_items (
      order_id, product_name, cases, qty_bottles, rate_per_case, case_size
    ) VALUES (
      v_order_id,
      v_item->>'product_name',
      COALESCE((v_item->>'cases')::numeric, 0),
      COALESCE((v_item->>'qty_bottles')::numeric, 0),
      COALESCE((v_item->>'rate_per_case')::numeric, 0),
      GREATEST(COALESCE((v_item->>'case_size')::numeric, 1), 1)
    );
  END LOOP;

  v_res := jsonb_build_object('success', true, 'order_id', v_order_id, 'customer_id', p_customer_id, 'status', 'new');

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'create_order', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- ====================================================================
-- RPC 4: log_order_from_stop
-- ====================================================================
CREATE OR REPLACE FUNCTION public.log_order_from_stop(
  p_idempotency_key text,
  p_trip_id text,
  p_customer_id text,
  p_items jsonb,
  p_requested_date date DEFAULT CURRENT_DATE + 1,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.create_order(
    p_idempotency_key := p_idempotency_key,
    p_customer_id := p_customer_id,
    p_items := p_items,
    p_requested_date := p_requested_date,
    p_source := 'stop_visit',
    p_notes := 'Booked during trip ' || p_trip_id || '. ' || TRIM(p_notes)
  );
END;
$$;

-- ====================================================================
-- RPC 5: plan_trip
-- ====================================================================
CREATE OR REPLACE FUNCTION public.plan_trip(
  p_idempotency_key text,
  p_vehicle_id text,
  p_driver_id text,
  p_stops jsonb, -- array of { customer_id, stop_sequence, order_id (optional), items: [{ product_name, planned_cases, planned_bottles, rate_per_case, case_size }] }
  p_trip_date date DEFAULT CURRENT_DATE,
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
  v_stop_id bigint;
  v_item jsonb;
  v_res jsonb;
BEGIN
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached FROM public.idempotency_keys WHERE key = p_idempotency_key;
    IF FOUND THEN RETURN v_cached; END IF;
  END IF;

  IF NOT public.has_role('owner', 'manager') THEN
    RAISE EXCEPTION 'Permission denied: only owner or manager can plan trips';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE id = p_vehicle_id AND active = true) THEN
    RAISE EXCEPTION 'Active vehicle % not found', p_vehicle_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = p_driver_id AND active = true) THEN
    RAISE EXCEPTION 'Active driver employee % not found', p_driver_id;
  END IF;

  v_trip_id := 'TR-' || to_char(COALESCE(p_trip_date, CURRENT_DATE), 'YYMM') || '-' || lpad(nextval('public.seq_trips')::text, 4, '0');

  INSERT INTO public.trips (
    id, vehicle_id, driver_id, trip_date, status, supervisor_id, notes, created_by
  ) VALUES (
    v_trip_id, p_vehicle_id, p_driver_id, COALESCE(p_trip_date, CURRENT_DATE),
    'planned', public.current_employee_id(), TRIM(p_notes), v_uid
  );

  FOR v_stop IN SELECT * FROM jsonb_array_elements(p_stops) LOOP
    INSERT INTO public.trip_stops (
      trip_id, stop_sequence, customer_id, order_id, result
    ) VALUES (
      v_trip_id,
      (v_stop->>'stop_sequence')::int,
      v_stop->>'customer_id',
      NULLIF(v_stop->>'order_id', ''),
      'pending'
    ) RETURNING id INTO v_stop_id;

    IF v_stop ? 'items' AND jsonb_typeof(v_stop->'items') = 'array' THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_stop->'items') LOOP
        INSERT INTO public.trip_stop_items (
          trip_stop_id, product_name, planned_cases, planned_bottles, rate_per_case, case_size
        ) VALUES (
          v_stop_id,
          v_item->>'product_name',
          COALESCE((v_item->>'planned_cases')::numeric, 0),
          COALESCE((v_item->>'planned_bottles')::numeric, 0),
          COALESCE((v_item->>'rate_per_case')::numeric, 0),
          GREATEST(COALESCE((v_item->>'case_size')::numeric, 1), 1)
        );
      END LOOP;
    END IF;

    -- Update linked order if provided
    IF v_stop ? 'order_id' AND NULLIF(v_stop->>'order_id', '') IS NOT NULL THEN
      UPDATE public.orders SET status = 'planned' WHERE id = v_stop->>'order_id';
    END IF;
  END LOOP;

  v_res := jsonb_build_object(
    'success', true,
    'trip_id', v_trip_id,
    'vehicle_id', p_vehicle_id,
    'driver_id', p_driver_id,
    'stops_count', jsonb_array_length(p_stops),
    'status', 'planned'
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'plan_trip', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- ====================================================================
-- RPC 6: confirm_loading
-- ====================================================================
CREATE OR REPLACE FUNCTION public.confirm_loading(
  p_idempotency_key text,
  p_trip_id text,
  p_start_odometer numeric,
  p_loaded_items jsonb, -- array of { product_name, cases, bottles }
  p_godown_location_id text DEFAULT 'PLANT'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_trip record;
  v_cached jsonb;
  v_item jsonb;
  v_veh_loc text;
  v_fgm_id text;
  v_res jsonb;
BEGIN
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached FROM public.idempotency_keys WHERE key = p_idempotency_key;
    IF FOUND THEN RETURN v_cached; END IF;
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF NOT (public.has_role('owner', 'manager') OR (public.has_role('employee') AND v_trip.driver_id = public.current_employee_id())) THEN
    RAISE EXCEPTION 'Permission denied to confirm loading on trip %', p_trip_id;
  END IF;

  IF v_trip.status NOT IN ('planned', 'loading') THEN
    RAISE EXCEPTION 'Trip % cannot be loaded in status %', p_trip_id, v_trip.status;
  END IF;

  v_veh_loc := v_trip.vehicle_id;

  -- Ensure vehicle location exists in locations
  INSERT INTO public.locations (id, name, type, vehicle_id)
  VALUES (v_veh_loc, 'Vehicle ' || v_veh_loc, 'vehicle', v_veh_loc)
  ON CONFLICT (id) DO NOTHING;

  -- Record transfer from godown to vehicle
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_loaded_items) LOOP
    v_fgm_id := 'FGM-' || lpad(nextval('public.seq_fg_movements')::text, 6, '0');
    INSERT INTO public.fg_movements (
      id, move_date, product_name, from_location_id, to_location_id,
      cases, bottles, movement_type, reference_type, reference_id, notes, recorded_by
    ) VALUES (
      v_fgm_id, CURRENT_DATE, v_item->>'product_name', p_godown_location_id, v_veh_loc,
      COALESCE((v_item->>'cases')::numeric, 0), COALESCE((v_item->>'bottles')::numeric, 0),
      'dispatch', 'trip', p_trip_id, 'Loaded onto vehicle for trip ' || p_trip_id, v_uid
    );
  END LOOP;

  -- Update trip status to on_route
  UPDATE public.trips
  SET status = 'on_route',
      loaded_at = now(),
      start_odometer = p_start_odometer,
      updated_at = now()
  WHERE id = p_trip_id;

  v_res := jsonb_build_object(
    'success', true,
    'trip_id', p_trip_id,
    'status', 'on_route',
    'loaded_at', now(),
    'start_odometer', p_start_odometer
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'confirm_loading', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- ====================================================================
-- RPC 7: arrive_at_stop
-- ====================================================================
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
  v_cached jsonb;
  v_cust record;
  v_dist_m numeric(10,2) := NULL;
  v_dlat numeric;
  v_dlon numeric;
  v_a numeric;
  v_c numeric;
  v_res jsonb;
BEGIN
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached FROM public.idempotency_keys WHERE key = p_idempotency_key;
    IF FOUND THEN RETURN v_cached; END IF;
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
    'trip_id', p_trip_id,
    'customer_id', p_customer_id,
    'arrived_at', now(),
    'distance_m', v_dist_m
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'arrive_at_stop', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- ====================================================================
-- RPC 8: deliver_stop (Atomic Delivery Transaction)
-- ====================================================================
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
  v_subtotal numeric(12,2) := 0;
  v_line_amt numeric(12,2);
  v_tax numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_paid numeric(12,2) := COALESCE(p_amount_received, 0);
  v_current_dues numeric(12,2) := 0;
  v_credit_warn boolean := false;
  v_credit_warn_msg text := NULL;
  v_res jsonb;
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached FROM public.idempotency_keys WHERE key = p_idempotency_key;
    IF FOUND THEN RETURN v_cached; END IF;
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
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

  SELECT COALESCE(full_name, 'Staff') INTO v_caller_name FROM public.profiles WHERE id = v_uid;

  -- 1. Validate items and calculate subtotal
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Delivery must contain at least one item';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF (v_item->>'rate_per_case')::numeric < 0 THEN
      RAISE EXCEPTION 'Rate per case cannot be negative';
    END IF;
    IF COALESCE((v_item->>'cases')::numeric, 0) < 0 OR COALESCE((v_item->>'bottles')::numeric, 0) < 0 THEN
      RAISE EXCEPTION 'Item quantities cannot be negative';
    END IF;
    -- Line amount = (bottles / case_size) * rate_per_case
    v_line_amt := ROUND(
      ((COALESCE((v_item->>'bottles')::numeric, 0) / GREATEST(COALESCE((v_item->>'case_size')::numeric, 1), 1))
      * COALESCE((v_item->>'rate_per_case')::numeric, 0)), 2
    );
    v_subtotal := v_subtotal + v_line_amt;
  END LOOP;

  v_total := v_subtotal; -- normal non-tax invoice

  -- 2. Credit limit check (warning only)
  IF v_cust.credit_limit > 0 THEN
    SELECT COALESCE(SUM(b.total - b.paid), 0) INTO v_current_dues
    FROM public.bills b
    WHERE b.customer_id = p_customer_id AND b.status = 'active';

    IF (v_current_dues + (v_total - v_paid)) > v_cust.credit_limit THEN
      v_credit_warn := true;
      v_credit_warn_msg := format('Credit limit warning: Total dues of ₹%s exceed limit of ₹%s', (v_current_dues + (v_total - v_paid)), v_cust.credit_limit);
    END IF;
  END IF;

  -- 3. Mint Indian FY Invoice Number
  v_bill_id := public.next_bill_no(CURRENT_DATE);

  -- 4. Insert Bill
  INSERT INTO public.bills (
    id, bill_date, customer_id, customer_name, mobile, address, gst,
    subtotal, tax, total, paid, payment_mode, status, provisional_id, created_by
  ) VALUES (
    v_bill_id, CURRENT_DATE, p_customer_id, v_cust.name, v_cust.phone, v_cust.area, false,
    v_subtotal, 0, v_total, v_paid, COALESCE(p_payment_mode, 'Cash'), 'active',
    CASE WHEN p_offline THEN p_provisional_id ELSE NULL END, v_uid
  );

  -- 5. Insert Bill Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.bill_items (
      bill_id, product_name, qty_bottles, rate_per_case, case_size, rate_source, entered_by
    ) VALUES (
      v_bill_id,
      v_item->>'product_name',
      COALESCE((v_item->>'bottles')::numeric, 0),
      COALESCE((v_item->>'rate_per_case')::numeric, 0),
      GREATEST(COALESCE((v_item->>'case_size')::numeric, 1), 1),
      'manual',
      v_caller_name
    );

    -- 6. Stock deduction from vehicle location
    v_fgm_id := 'FGM-' || lpad(nextval('public.seq_fg_movements')::text, 6, '0');
    INSERT INTO public.fg_movements (
      id, move_date, product_name, from_location_id, to_location_id,
      cases, bottles, movement_type, reference_type, reference_id, notes, recorded_by
    ) VALUES (
      v_fgm_id, CURRENT_DATE, v_item->>'product_name', v_trip.vehicle_id, NULL,
      COALESCE((v_item->>'cases')::numeric, 0), COALESCE((v_item->>'bottles')::numeric, 0),
      'dispatch', 'delivery', v_bill_id, 'Delivered to ' || v_cust.name || ' on trip ' || p_trip_id, v_uid
    );
  END LOOP;

  -- 7. Insert Payment record if amount received
  IF v_paid > 0 THEN
    v_pay_id := public.next_payment_id(CURRENT_DATE);
    INSERT INTO public.payments (
      id, payment_date, customer_id, bill_id, amount, mode, notes, created_by
    ) VALUES (
      v_pay_id, CURRENT_DATE, p_customer_id, v_bill_id, v_paid,
      COALESCE(p_payment_mode, 'Cash'), 'Received against bill ' || v_bill_id, v_uid
    );
  END IF;

  -- 8. Insert Delivery record
  v_del_id := 'DEL-' || to_char(CURRENT_DATE, 'YYMM') || '-' || lpad(nextval('public.seq_deliveries')::text, 4, '0');
  INSERT INTO public.deliveries (
    id, trip_stop_id, trip_id, customer_id, bill_id, payment_id,
    delivery_time, provisional_id, empty_cans_returned, delivered_by
  ) VALUES (
    v_del_id, v_stop.id, p_trip_id, p_customer_id, v_bill_id, v_pay_id,
    now(), p_provisional_id, COALESCE(p_empty_cans_returned, 0), v_trip.driver_id
  );

  -- 9. Update Trip Stop status
  UPDATE public.trip_stops
  SET result = 'delivered',
      delivered_at = now()
  WHERE id = v_stop.id;

  -- Update stop items delivered quantities
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    UPDATE public.trip_stop_items
    SET delivered_cases = COALESCE((v_item->>'cases')::numeric, 0),
        delivered_bottles = COALESCE((v_item->>'bottles')::numeric, 0),
        rate_per_case = COALESCE((v_item->>'rate_per_case')::numeric, 0)
    WHERE trip_stop_id = v_stop.id AND product_name = v_item->>'product_name';
  END LOOP;

  v_res := jsonb_build_object(
    'success', true,
    'bill_id', v_bill_id,
    'payment_id', v_pay_id,
    'delivery_id', v_del_id,
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

-- ====================================================================
-- RPC 9: skip_stop
-- ====================================================================
CREATE OR REPLACE FUNCTION public.skip_stop(
  p_idempotency_key text,
  p_trip_id text,
  p_customer_id text,
  p_reason text,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_trip record;
  v_cached jsonb;
  v_res jsonb;
BEGIN
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached FROM public.idempotency_keys WHERE key = p_idempotency_key;
    IF FOUND THEN RETURN v_cached; END IF;
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF NOT (public.has_role('owner', 'manager') OR (public.has_role('employee') AND v_trip.driver_id = public.current_employee_id())) THEN
    RAISE EXCEPTION 'Permission denied to skip stop on trip %', p_trip_id;
  END IF;

  UPDATE public.trip_stops
  SET result = 'skipped',
      skip_reason = TRIM(p_reason || ' ' || COALESCE(p_notes, ''))
  WHERE trip_id = p_trip_id AND customer_id = p_customer_id;

  v_res := jsonb_build_object(
    'success', true,
    'trip_id', p_trip_id,
    'customer_id', p_customer_id,
    'result', 'skipped',
    'reason', p_reason
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'skip_stop', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- ====================================================================
-- RPC 10: set_customer_location
-- ====================================================================
CREATE OR REPLACE FUNCTION public.set_customer_location(
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
  v_cust record;
  v_is_emp boolean := public.has_role('employee');
BEGIN
  SELECT * INTO v_cust FROM public.customers WHERE id = p_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer % not found', p_customer_id;
  END IF;

  -- Employee can only set initial location when empty; Manager/Owner can change anytime
  IF v_is_emp THEN
    IF v_cust.lat IS NOT NULL AND v_cust.lng IS NOT NULL THEN
      RAISE EXCEPTION 'Permission denied: Employees can only set initial customer location when empty. Contact a manager to update existing coordinates.';
    END IF;
  ELSE
    IF NOT public.has_role('owner', 'manager') THEN
      RAISE EXCEPTION 'Permission denied to update customer location';
    END IF;
  END IF;

  UPDATE public.customers
  SET lat = p_lat,
      lng = p_lng,
      accuracy_m = p_accuracy_m,
      location_set_by = v_uid,
      location_set_at = now(),
      updated_at = now()
  WHERE id = p_customer_id;

  RETURN jsonb_build_object(
    'success', true,
    'customer_id', p_customer_id,
    'lat', p_lat,
    'lng', p_lng,
    'accuracy_m', p_accuracy_m,
    'set_at', now()
  );
END;
$$;

-- ====================================================================
-- RPC 11: close_trip
-- ====================================================================
CREATE OR REPLACE FUNCTION public.close_trip(
  p_idempotency_key text,
  p_trip_id text,
  p_end_odometer numeric,
  p_returned_stock jsonb, -- array of { product_name, cases, bottles }
  p_godown_location_id text DEFAULT 'PLANT',
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_trip record;
  v_cached jsonb;
  v_item jsonb;
  v_fgm_id text;
  v_res jsonb;
BEGIN
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached FROM public.idempotency_keys WHERE key = p_idempotency_key;
    IF FOUND THEN RETURN v_cached; END IF;
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF NOT (public.has_role('owner', 'manager') OR (public.has_role('employee') AND v_trip.driver_id = public.current_employee_id())) THEN
    RAISE EXCEPTION 'Permission denied to close trip %', p_trip_id;
  END IF;

  IF v_trip.closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Trip % is already closed', p_trip_id;
  END IF;

  -- Re-credit returned stock back to plant/godown
  IF p_returned_stock IS NOT NULL AND jsonb_array_length(p_returned_stock) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_returned_stock) LOOP
      IF COALESCE((v_item->>'cases')::numeric, 0) > 0 OR COALESCE((v_item->>'bottles')::numeric, 0) > 0 THEN
        v_fgm_id := 'FGM-' || lpad(nextval('public.seq_fg_movements')::text, 6, '0');
        INSERT INTO public.fg_movements (
          id, move_date, product_name, from_location_id, to_location_id,
          cases, bottles, movement_type, reference_type, reference_id, notes, recorded_by
        ) VALUES (
          v_fgm_id, CURRENT_DATE, v_item->>'product_name', v_trip.vehicle_id, p_godown_location_id,
          COALESCE((v_item->>'cases')::numeric, 0), COALESCE((v_item->>'bottles')::numeric, 0),
          'return', 'trip', p_trip_id, 'Returned from trip ' || p_trip_id, v_uid
        );
      END IF;
    END LOOP;
  END IF;

  UPDATE public.trips
  SET status = 'completed',
      end_odometer = p_end_odometer,
      closed_at = now(),
      notes = TRIM(COALESCE(notes, '') || ' ' || COALESCE(p_notes, '')),
      updated_at = now()
  WHERE id = p_trip_id;

  v_res := jsonb_build_object(
    'success', true,
    'trip_id', p_trip_id,
    'status', 'completed',
    'closed_at', now(),
    'end_odometer', p_end_odometer
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'close_trip', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- ====================================================================
-- RPC 12: handover_cash
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handover_cash(
  p_idempotency_key text,
  p_trip_id text,
  p_cash_amount numeric,
  p_online_amount numeric DEFAULT 0,
  p_expenses_amount numeric DEFAULT 0,
  p_handed_to_id text DEFAULT NULL,
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
  v_cho_id text;
  v_handed_to text;
  v_net numeric(12,2);
  v_res jsonb;
BEGIN
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response INTO v_cached FROM public.idempotency_keys WHERE key = p_idempotency_key;
    IF FOUND THEN RETURN v_cached; END IF;
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip % not found', p_trip_id;
  END IF;

  IF NOT (public.has_role('owner', 'manager') OR (public.has_role('employee') AND v_trip.driver_id = v_emp_id)) THEN
    RAISE EXCEPTION 'Permission denied to submit cash handover for trip %', p_trip_id;
  END IF;

  v_handed_to := COALESCE(p_handed_to_id, v_trip.supervisor_id, (SELECT id FROM public.employees WHERE role IN ('owner', 'manager') LIMIT 1));
  v_net := COALESCE(p_cash_amount, 0) - COALESCE(p_expenses_amount, 0);
  IF v_net < 0 THEN
    RAISE EXCEPTION 'Net cash handed cannot be negative';
  END IF;

  v_cho_id := 'CHO-' || to_char(CURRENT_DATE, 'YYMM') || '-' || lpad(nextval('public.seq_handovers')::text, 4, '0');

  INSERT INTO public.cash_handovers (
    id, trip_id, driver_id, handed_to_id, cash_amount, online_amount,
    expenses_amount, net_cash_handed, status, notes
  ) VALUES (
    v_cho_id, p_trip_id, v_trip.driver_id, v_handed_to,
    COALESCE(p_cash_amount, 0), COALESCE(p_online_amount, 0),
    COALESCE(p_expenses_amount, 0), v_net, 'submitted', TRIM(p_notes)
  );

  UPDATE public.trips SET status = 'settled', updated_at = now() WHERE id = p_trip_id;

  v_res := jsonb_build_object(
    'success', true,
    'handover_id', v_cho_id,
    'trip_id', p_trip_id,
    'cash_amount', p_cash_amount,
    'online_amount', p_online_amount,
    'net_cash', v_net,
    'status', 'submitted'
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (key, user_id, action, response)
    VALUES (p_idempotency_key, v_uid, 'handover_cash', v_res);
  END IF;

  RETURN v_res;
END;
$$;

-- ====================================================================
-- RPC 13: production_plan
-- ====================================================================
CREATE OR REPLACE FUNCTION public.production_plan(
  p_target_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_balances jsonb;
  v_orders jsonb;
BEGIN
  IF NOT public.has_role('owner', 'manager', 'admin', 'employee') THEN
    RAISE EXCEPTION 'Permission denied to view production plan';
  END IF;

  -- 1. Get current finished goods inventory
  SELECT jsonb_agg(to_jsonb(b)) INTO v_balances
  FROM public.v_fg_balances b;

  -- 2. Get pending requested orders for target date
  SELECT jsonb_agg(
    jsonb_build_object(
      'order_id', o.id,
      'customer', c.name,
      'product', oi.product_name,
      'cases', oi.cases,
      'bottles', oi.qty_bottles
    )
  ) INTO v_orders
  FROM public.orders o
  JOIN public.customers c ON c.id = o.customer_id
  JOIN public.order_items oi ON oi.order_id = o.id
  WHERE o.requested_date = COALESCE(p_target_date, CURRENT_DATE)
    AND o.status IN ('new', 'planned');

  RETURN jsonb_build_object(
    'target_date', COALESCE(p_target_date, CURRENT_DATE),
    'current_balances', COALESCE(v_balances, '[]'::jsonb),
    'pending_orders', COALESCE(v_orders, '[]'::jsonb)
  );
END;
$$;

-- ====================================================================
-- Grant EXECUTE to authenticated and service_role ONLY
-- ====================================================================

GRANT EXECUTE ON FUNCTION public.record_production(text, text, text, numeric, numeric, text, date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_stock(text, text, text, text, numeric, numeric, date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_order(text, text, jsonb, date, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_order_from_stop(text, text, text, jsonb, date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.plan_trip(text, text, text, jsonb, date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_loading(text, text, numeric, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arrive_at_stop(text, text, text, numeric, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.deliver_stop(text, text, text, jsonb, numeric, text, int, boolean, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.skip_stop(text, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_customer_location(text, numeric, numeric, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.close_trip(text, text, numeric, jsonb, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handover_cash(text, text, numeric, numeric, numeric, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.production_plan(date) TO authenticated, service_role;

COMMIT;
