-- Students RLS Hardening Migration
-- This migration hardens students table access to trusted Admins only using public.is_admin()
-- Custom-auth Teacher/Student/Parent flows continue through their secure RPCs

BEGIN;

-- ============================================================
-- 1. ENSURE RLS IS ENABLED
-- ============================================================

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Do not FORCE ROW LEVEL SECURITY - SECURITY DEFINER functions must continue working

-- ============================================================
-- 2. DROP EXACT OLD BROAD POLICIES
-- ============================================================

-- Drop the existing broad policies that allow any authenticated user to access students
DROP POLICY IF EXISTS "Authenticated可以 view students" ON public.students;
DROP POLICY IF EXISTS "Authenticated can insert students" ON public.students;
DROP POLICY IF EXISTS "Authenticated can update students" ON public.students;
DROP POLICY IF EXISTS "Authenticated can delete students" ON public.students;

-- ============================================================
-- 3. CREATE TRUSTED ADMIN POLICIES
-- ============================================================

-- Admins can view students
CREATE POLICY "Admins can view students"
ON public.students
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_admin())
);

-- Admins can insert students
CREATE POLICY "Admins can insert students"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT public.is_admin())
);

-- Admins can update students
CREATE POLICY "Admins can update students"
ON public.students
FOR UPDATE
TO authenticated
USING (
  (SELECT public.is_admin())
)
WITH CHECK (
  (SELECT public.is_admin())
);

-- Admins can delete students
CREATE POLICY "Admins can delete students"
ON public.students
FOR DELETE
TO authenticated
USING (
  (SELECT public.is_admin())
);

-- ============================================================
-- 4. HARDEN TABLE GRANTS
-- ============================================================

-- Remove all browser/client privileges
REVOKE ALL PRIVILEGES
ON TABLE public.students
FROM PUBLIC;

REVOKE ALL PRIVILEGES
ON TABLE public.students
FROM anon;

REVOKE ALL PRIVILEGES
ON TABLE public.students
FROM authenticated;

-- Grant CRUD to authenticated (protected entirely by Admin-only RLS policies above)
GRANT SELECT ON TABLE public.students TO authenticated;
GRANT INSERT ON TABLE public.students TO authenticated;
GRANT UPDATE ON TABLE public.students TO authenticated;
GRANT DELETE ON TABLE public.students TO authenticated;

-- Do NOT grant TRUNCATE, TRIGGER, REFERENCES

-- Preserve postgres and service_role administrative access

COMMIT;
