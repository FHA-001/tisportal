-- ============================================================
-- A8.6C — PAYMENT PROOF STORAGE HARDENING
-- ============================================================
-- PURPOSE:
--   Remove insecure anon access to payment-proofs bucket and replace
--   with ownership-scoped policies using Supabase Auth identity.
--
-- CONTEXT:
--   - Parent now uses Supabase Auth (A8.4 completed)
--   - Accountant now uses Supabase Auth (A8.3 completed)
--   - Student remains on custom session auth (DO NOT migrate)
--   - Current path format: <parent_id>/<student_id>_<timestamp>_<uuid>.<ext>
--   - First path segment is parent_id, enabling ownership verification
--
-- VULNERABILITY BEING FIXED:
--   Previous policies (20240907_storage_security_hardening.sql) allowed
--   anon INSERT/SELECT/DELETE with only bucket_id check, enabling
--   cross-parent access (Parent A could read Parent B's proofs).
--
-- SECURITY OUTCOMES:
--   - anon: No access to payment-proofs
--   - Student: No access (custom auth does not grant storage access)
--   - Parent: Can only access own proofs (ownership scoped by path)
--   - Accountant: Can access all proofs for review
--   - Admin: Can access all proofs for administrative purposes
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. REMOVE INSECURE ANON POLICIES
-- ------------------------------------------------------------
-- These policies from 20240907_storage_security_hardening.sql
-- allowed broad anon access without ownership verification.

DROP POLICY IF EXISTS payment_proofs_anon_insert ON storage.objects;
DROP POLICY IF EXISTS payment_proofs_anon_select ON storage.objects;
DROP POLICY IF EXISTS payment_proofs_anon_delete_own_folder ON storage.objects;

-- ------------------------------------------------------------
-- 2. REMOVE OLD BROAD AUTHENTICATED POLICIES (if any)
-- ------------------------------------------------------------
-- Ensure no legacy broad policies remain from earlier migrations.

DROP POLICY IF EXISTS "Allow Uploads w1pnpy_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads w1pnpy_1" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

-- ------------------------------------------------------------
-- 3. PARENT POLICIES (OWNERSHIP-SCOPED)
-- ------------------------------------------------------------
-- Parent may only access objects in their own folder.
-- Path format: <parent_id>/<filename>
-- storage.foldername(name)[1] extracts the first path segment.

CREATE POLICY payment_proofs_parent_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND public.current_parent_id() IS NOT NULL
  AND (storage.foldername(name))[1]::text = public.current_parent_id()::text
);

CREATE POLICY payment_proofs_parent_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.current_parent_id() IS NOT NULL
  AND (storage.foldername(name))[1]::text = public.current_parent_id()::text
);

-- Parent may delete only their own uploaded files (for cleanup on RPC failure)
CREATE POLICY payment_proofs_parent_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.current_parent_id() IS NOT NULL
  AND (storage.foldername(name))[1]::text = public.current_parent_id()::text
);

-- ------------------------------------------------------------
-- 4. ACCOUNTANT POLICIES (FULL ACCESS FOR REVIEW)
-- ------------------------------------------------------------
-- Accountants need full access to all payment proofs for review.
-- They use createSignedUrl to generate temporary access URLs.

CREATE POLICY payment_proofs_accountant_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.current_accountant_id() IS NOT NULL
);

-- ------------------------------------------------------------
-- 5. ADMIN POLICIES (FULL ACCESS FOR ADMINISTRATION)
-- ------------------------------------------------------------
-- Admins need full access for administrative purposes.

CREATE POLICY payment_proofs_admin_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.is_admin()
);

CREATE POLICY payment_proofs_admin_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND public.is_admin()
);

CREATE POLICY payment_proofs_admin_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.is_admin()
);

-- ------------------------------------------------------------
-- 6. SERVICE ROLE ACCESS (PRESERVED)
-- ------------------------------------------------------------
-- Service role retains full access for backend operations.
-- No explicit policy needed; service role bypasses RLS.
DROP POLICY IF EXISTS payment_proofs_authenticated_insert ON storage.objects;
DROP POLICY IF EXISTS payment_proofs_authenticated_select ON storage.objects;
DROP POLICY IF EXISTS payment_proofs_authenticated_delete ON storage.objects;

COMMIT;
