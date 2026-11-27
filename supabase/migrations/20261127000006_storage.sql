-- ====================================================================
-- SR Industries BMS - Storage Buckets and RLS Security Policies
-- Migration: 20261127000006_storage.sql
-- Buckets: employee-docs, vehicle-evidence (Both Private)
-- Policies:
-- 1. employee-docs: Owner-only (ALL operations)
-- 2. vehicle-evidence:
--    - Managers & Owner: Full access (ALL operations)
--    - Employees: INSERT ONLY into their own assigned trip folder
-- Standardized security: Uses public.has_role and public.current_employee_id
-- ====================================================================

BEGIN;

-- 1. Create Private Buckets in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('employee-docs', 'employee-docs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('vehicle-evidence', 'vehicle-evidence', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Clean up any existing policies for these buckets
DROP POLICY IF EXISTS "employee_docs_owner_all" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_evidence_manager_owner_all" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_evidence_employee_insert" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_evidence_employee_select" ON storage.objects;
DROP POLICY IF EXISTS "docs_staff" ON storage.objects;
DROP POLICY IF EXISTS "veh_emp_upload" ON storage.objects;

-- 4. Policy: employee-docs is strictly Owner-only (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "employee_docs_owner_all"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'employee-docs'
  AND public.has_role('owner')
)
WITH CHECK (
  bucket_id = 'employee-docs'
  AND public.has_role('owner')
);

-- 5. Policy: vehicle-evidence - Managers & Owner have full access (ALL operations)
CREATE POLICY "vehicle_evidence_manager_owner_all"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'vehicle-evidence'
  AND public.has_role('owner', 'manager')
)
WITH CHECK (
  bucket_id = 'vehicle-evidence'
  AND public.has_role('owner', 'manager')
);

-- 6. Policy: vehicle-evidence - Employees can INSERT ONLY into their own trip folder
-- Folder convention: <trip_id>/<filename> (e.g., 'TR-101/odometer_start.jpg')
CREATE POLICY "vehicle_evidence_employee_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-evidence'
  AND public.has_role('employee')
  AND EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = split_part(name, '/', 1)
      AND t.driver_id = public.current_employee_id()
  )
);

-- 7. Policy: vehicle-evidence - Employees can view files within their own trip folder
CREATE POLICY "vehicle_evidence_employee_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'vehicle-evidence'
  AND public.has_role('employee')
  AND EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = split_part(name, '/', 1)
      AND t.driver_id = public.current_employee_id()
  )
);

COMMIT;
