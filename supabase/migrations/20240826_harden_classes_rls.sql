-- Classes RLS Hardening Migration
-- This migration hardens classes table write access to trusted Admins only
-- while preserving read access for public/custom-auth users

BEGIN;

-- ============================================================
-- 1. REMOVE BROAD WRITE POLICY
-- ============================================================

-- Drop the existing broad write policy that allows any authenticated user to write
DROP POLICY IF EXISTS "classes_write_admin" ON public.classes;

-- ============================================================
-- 2. CREATE TRUSTED ADMIN WRITE POLICIES
-- ============================================================

-- Admins can insert classes
CREATE POLICY "Admins can insert classes"
ON public.classes
FOR INSERT
TO authenticated
WITH CHECK ((SELECT public.is_admin()));

-- Admins can update classes
CREATE POLICY "Admins can update classes"
ON public.classes
FOR UPDATE
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- Admins can delete classes
CREATE POLICY "Admins can delete classes"
ON public.classes
FOR DELETE
TO authenticated
USING ((SELECT public.is_admin()));

-- ============================================================
-- 3. PRESERVE PUBLIC READ ACCESS
-- ============================================================

-- The existing SELECT policy (if any) should allow read access
-- This is needed by:
-- - public/student signup class dropdown
-- - Teacher custom-auth pages
-- - Admin pages

-- Note: If a classes_select_all policy exists with USING (true), it remains
-- as it provides safe read-only access

-- ============================================================
-- 4. HARDEN TABLE GRANTS
-- ============================================================

-- Revoke all excessive privileges
REVOKE ALL ON TABLE public.classes FROM PUBLIC;
REVOKE ALL ON TABLE public.classes FROM anon;
REVOKE ALL ON TABLE public.classes FROM authenticated;

-- Grant read-only access to anon (for public/student signup)
GRANT SELECT ON TABLE public.classes TO anon;

-- Grant CRUD to authenticated (protected by RLS policies above)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.classes TO authenticated;

-- Preserve postgres/service_role administrative access

-- ============================================================
-- 5. ENSURE RLS IS ENABLED
-- ============================================================

ALTER TABLE public.classes
ENABLE ROW LEVEL SECURITY;

-- Do not FORCE RLS - SECURITY DEFINER functions must continue working

COMMIT;
