-- Migration: 20261120113000_pii_masking_and_retention.sql
-- SR Industries BMS - PII Masking & 30-Day Application Document Retention

BEGIN;

-- ====================================================================
-- SECTION 1: Schema Updates for employee_applications & employee_identities
-- ====================================================================

-- 1. Add retention timestamp tracking to employee_applications
ALTER TABLE public.employee_applications
  ADD COLUMN IF NOT EXISTS decided_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS retention_deadline timestamptz NULL;

-- 2. Add last4 indexable columns to employee_identities for quick lookup
ALTER TABLE public.employee_identities
  ADD COLUMN IF NOT EXISTS aadhaar_last4 text NULL,
  ADD COLUMN IF NOT EXISTS pan_last4 text NULL,
  ADD COLUMN IF NOT EXISTS license_last4 text NULL;

-- Indexes for retention processing and ID lookups
CREATE INDEX IF NOT EXISTS idx_employee_apps_status_deadline
  ON public.employee_applications (status, retention_deadline);

CREATE INDEX IF NOT EXISTS idx_employee_identities_last4
  ON public.employee_identities (aadhaar_last4, pan_last4, license_last4);

-- ====================================================================
-- SECTION 2: Populate Last4 & Mask Existing Plaintext Rows in Database
-- ====================================================================

-- 1. Populate last4 columns on employee_identities BEFORE masking
UPDATE public.employee_identities
SET
  aadhaar_last4 = right(regexp_replace(COALESCE(aadhaar, ''), '\D', '', 'g'), 4),
  pan_last4 = right(regexp_replace(COALESCE(pan, ''), '\s', '', 'g'), 4),
  license_last4 = right(regexp_replace(COALESCE(license_no, ''), '[\s/-]', '', 'g'), 4)
WHERE aadhaar_last4 IS NULL OR pan_last4 IS NULL OR license_last4 IS NULL;

-- 2. Mask existing Aadhaar, PAN, and License in employee_applications
UPDATE public.employee_applications
SET
  aadhaar = CASE
    WHEN length(regexp_replace(COALESCE(aadhaar, ''), '\D', '', 'g')) >= 4
    THEN 'XXXX XXXX ' || right(regexp_replace(aadhaar, '\D', '', 'g'), 4)
    ELSE 'XXXX XXXX ****'
  END,
  pan = CASE
    WHEN length(trim(COALESCE(pan, ''))) >= 4
    THEN left(trim(pan), 2) || '*****' || right(trim(pan), 2)
    ELSE '*****'
  END,
  license_no = CASE
    WHEN length(trim(COALESCE(license_no, ''))) >= 4
    THEN 'XXXX-XXXX-' || right(regexp_replace(license_no, '\s', '', 'g'), 4)
    ELSE 'XXXX-XXXX-****'
  END
WHERE
  (aadhaar IS NOT NULL AND aadhaar NOT LIKE 'XXXX%')
  OR (pan IS NOT NULL AND pan != '' AND pan NOT LIKE '%*%')
  OR (license_no IS NOT NULL AND license_no != '' AND license_no NOT LIKE 'XXXX%');

-- 3. Mask existing Aadhaar, PAN, and License in employee_identities
UPDATE public.employee_identities
SET
  aadhaar = CASE
    WHEN length(regexp_replace(COALESCE(aadhaar, ''), '\D', '', 'g')) >= 4
    THEN 'XXXX XXXX ' || right(regexp_replace(aadhaar, '\D', '', 'g'), 4)
    ELSE 'XXXX XXXX ****'
  END,
  pan = CASE
    WHEN length(trim(COALESCE(pan, ''))) >= 4
    THEN left(trim(pan), 2) || '*****' || right(trim(pan), 2)
    ELSE '*****'
  END,
  license_no = CASE
    WHEN length(trim(COALESCE(license_no, ''))) >= 4
    THEN 'XXXX-XXXX-' || right(regexp_replace(license_no, '\s', '', 'g'), 4)
    ELSE 'XXXX-XXXX-****'
  END
WHERE
  (aadhaar IS NOT NULL AND aadhaar NOT LIKE 'XXXX%')
  OR (pan IS NOT NULL AND pan != '' AND pan NOT LIKE '%*%')
  OR (license_no IS NOT NULL AND license_no != '' AND license_no NOT LIKE 'XXXX%');

-- ====================================================================
-- SECTION 3: Trigger for Application Decision & 30-Day Retention Deadline
-- ====================================================================

CREATE OR REPLACE FUNCTION public.trg_set_application_retention()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When status transitions to Approved or Rejected
  IF (NEW.status IN ('Approved', 'Rejected')) AND (OLD.status IS DISTINCT FROM NEW.status OR NEW.decided_at IS NULL) THEN
    NEW.decided_at := COALESCE(NEW.decided_at, now());
    NEW.retention_deadline := NEW.decided_at + INTERVAL '30 days';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employee_apps_retention ON public.employee_applications;
CREATE TRIGGER trg_employee_apps_retention
BEFORE INSERT OR UPDATE OF status, decided_at ON public.employee_applications
FOR EACH ROW EXECUTE FUNCTION public.trg_set_application_retention();

-- ====================================================================
-- SECTION 4: Retention Cleanup RPC Function
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
  -- Authorization check: owner or backend system (service_role has auth.uid() IS NULL)
  IF auth.uid() IS NOT NULL AND NOT has_role('owner') THEN
    RAISE EXCEPTION 'Permission denied: only owner can run application retention cleanup';
  END IF;

  -- Select applications that are approved or rejected and past their 30-day retention
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

GRANT EXECUTE ON FUNCTION public.cleanup_expired_applications() TO authenticated;

COMMIT;
